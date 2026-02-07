from __future__ import annotations

import hashlib
import os
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import bindparam, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.services.extraction import extract_first_page_text, run_extraction


def _ensure_storage_dir() -> Path:
    settings = get_settings()
    d = Path(settings.pdf_storage_dir)
    d.mkdir(parents=True, exist_ok=True)
    return d


def _write_upload_and_hash(upload: UploadFile, target_path: Path) -> str:
    h = hashlib.sha256()
    with target_path.open("wb") as f:
        while True:
            chunk = upload.file.read(1024 * 1024)
            if not chunk:
                break
            h.update(chunk)
            f.write(chunk)
    return h.hexdigest()


def ingest_pdf_and_extract(db: Session, user_id: str, upload: UploadFile) -> dict[str, Any]:
    storage_dir = _ensure_storage_dir()

    # Store PDF on disk: sha256 prefix + uuid name (auditable + collision-resistant)
    tmp_name = f"{uuid4()}.pdf"
    tmp_path = storage_dir / tmp_name

    try:
        sha256 = _write_upload_and_hash(upload, tmp_path)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Could not read upload: {e}") from e

    final_name = f"{sha256[:12]}_{uuid4()}.pdf"
    final_path = storage_dir / final_name
    try:
        os.replace(tmp_path, final_path)
    except Exception:
        # best-effort cleanup
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            pass
        raise

    # Basic PDF info + first page text
    try:
        _raw_text, page_count = extract_first_page_text(str(final_path))
    except Exception as e:
        try:
            final_path.unlink(missing_ok=True)
        except Exception:
            pass
        raise HTTPException(status_code=400, detail=f"Invalid PDF: {e}") from e

    extraction = run_extraction(str(final_path))
    extracted = extraction.extracted
    confidence = extraction.confidence

    # Create paper (draft)
    paper_row = db.execute(
        text(
            """
            INSERT INTO papers (
              doi, title, authors, journal, publication_year, volume, issue, page_range, corresponding_email, source
            )
            VALUES (
              :doi, :title, :authors, :journal, :publication_year, :volume, :issue, :page_range, :corresponding_email, 'upload'
            )
            RETURNING id::text;
            """
        ),
        {
            "doi": extracted.get("doi"),
            "title": extracted.get("title"),
            "authors": extracted.get("authors"),
            "journal": extracted.get("journal"),
            "publication_year": extracted.get("publication_year"),
            "volume": extracted.get("volume"),
            "issue": extracted.get("issue"),
            "page_range": extracted.get("page_range"),
            "corresponding_email": extracted.get("corresponding_email"),
        },
    ).mappings().one()
    paper_id = paper_row["id"]

    pdf_row = db.execute(
        text(
            """
            INSERT INTO pdf_files (
              paper_id, original_filename, storage_path, sha256, page_count, uploaded_by
            )
            VALUES (
              :paper_id, :original_filename, :storage_path, :sha256, :page_count, :uploaded_by
            )
            RETURNING id::text;
            """
        ),
        {
            "paper_id": paper_id,
            "original_filename": upload.filename or "upload.pdf",
            "storage_path": str(final_path),
            "sha256": sha256,
            "page_count": page_count,
            "uploaded_by": user_id,
        },
    ).mappings().one()
    pdf_file_id = pdf_row["id"]

    db.execute(
        text(
            """
            INSERT INTO extraction_runs (
              paper_id, pdf_file_id, created_by,
              raw_first_page_text, extracted_json, confidence_json,
              crossref_used, crossref_raw
            )
            VALUES (
              :paper_id, :pdf_file_id, :created_by,
              :raw_first_page_text, :extracted_json, :confidence_json,
              :crossref_used, :crossref_raw
            );
            """
        ).bindparams(
            bindparam("extracted_json", type_=JSONB),
            bindparam("confidence_json", type_=JSONB),
            bindparam("crossref_raw", type_=JSONB),
        ),
        {
            "paper_id": paper_id,
            "pdf_file_id": pdf_file_id,
            "created_by": user_id,
            "raw_first_page_text": extraction.raw_first_page_text,
            "extracted_json": extracted,
            "confidence_json": confidence,
            "crossref_used": extraction.crossref_used,
            "crossref_raw": extraction.crossref_raw,
        },
    )

    return {
        "paper_id": paper_id,
        "extracted": extracted,
        "confidence": confidence,
    }

