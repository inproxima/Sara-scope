from __future__ import annotations

from pathlib import Path
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.db import get_db
from app.schemas.codes import CodeCreate, CodeOut
from app.schemas.papers import PaperDetail, PaperListItem, PaperUpdate, UploadPdfResponse
from app.services.ingest import ingest_pdf_and_extract

router = APIRouter(prefix="/papers", tags=["papers"])


def _paper_detail(db: Session, paper_id: str) -> PaperDetail:
    paper = db.execute(
        text(
            """
            SELECT
              id::text, doi, title, authors, journal, publication_year,
              volume, issue, page_range, corresponding_email, abstract, source,
              created_at::text, updated_at::text
            FROM papers
            WHERE id = :id
            """
        ),
        {"id": paper_id},
    ).mappings().first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    pdf = db.execute(
        text(
            """
            SELECT id::text, storage_path
            FROM pdf_files
            WHERE paper_id = :paper_id
            ORDER BY uploaded_at DESC
            LIMIT 1
            """
        ),
        {"paper_id": paper_id},
    ).mappings().first()

    latest_code = db.execute(
        text(
            """
            SELECT
              c.id::text,
              c.paper_id::text,
              c.coded_by::text,
              u.email AS coded_by_email,
              c.coded_at::text,

              c.evidence_primary,
              c.self_report_used_as_learning_proxy,
              c.outcome_distance,

              c.effectiveness_claim_present,
              c.claim_strength,
              c.construct_learning_clarity,
              c.construct_engagement_clarity,
              c.construct_slippage_present,

              c.theory_present,
              c.theory_named,
              c.theory_function,

              c.teacher_labor_discussed,
              c.student_labor_discussed,
              c.institutional_constraints_discussed,
              c.data_infrastructure_discussed,
              c.power_equity_discussed,

              c.coding_notes_20w,
              c.coding_confidence,
              c.codebook_version
            FROM codes c
            LEFT JOIN users u ON u.id = c.coded_by
            WHERE c.paper_id = :paper_id
            ORDER BY c.coded_at DESC
            LIMIT 1;
            """
        ),
        {"paper_id": paper_id},
    ).mappings().first()

    out = dict(paper)
    out["pdf_available"] = bool(pdf)
    out["latest_code"] = dict(latest_code) if latest_code else None
    return PaperDetail(**out)


@router.post("/upload-pdf", response_model=UploadPdfResponse)
def upload_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
) -> UploadPdfResponse:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please upload a PDF file")

    try:
        result = ingest_pdf_and_extract(db=db, user_id=user["id"], upload=file)
        db.commit()
        return UploadPdfResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}") from e


@router.get("/", response_model=List[PaperListItem])
def list_papers(
    q: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    coded: Optional[bool] = Query(default=None),
    journal: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
) -> list[PaperListItem]:
    where = []
    params: dict[str, Any] = {}

    if q:
        where.append(
            "(doi ILIKE :q OR title ILIKE :q OR authors ILIKE :q OR journal ILIKE :q)"
        )
        params["q"] = f"%{q}%"

    if year is not None:
        where.append("publication_year = :year")
        params["year"] = year

    if journal:
        where.append("journal ILIKE :journal")
        params["journal"] = f"%{journal}%"

    if coded is True:
        where.append("EXISTS (SELECT 1 FROM codes c WHERE c.paper_id = papers.id)")
    elif coded is False:
        where.append("NOT EXISTS (SELECT 1 FROM codes c WHERE c.paper_id = papers.id)")

    where_sql = ("WHERE " + " AND ".join(where)) if where else ""

    rows = db.execute(
        text(
            f"""
            SELECT
              papers.id::text,
              papers.doi,
              papers.title,
              papers.authors,
              papers.journal,
              papers.publication_year,
              papers.created_at::text,
              papers.updated_at::text,
              EXISTS (SELECT 1 FROM codes c WHERE c.paper_id = papers.id) AS coded
            FROM papers
            {where_sql}
            ORDER BY papers.created_at DESC
            LIMIT 500;
            """
        ),
        params,
    ).mappings().all()

    return [PaperListItem(**dict(r)) for r in rows]


@router.get("/{paper_id}", response_model=PaperDetail)
def get_paper(
    paper_id: str,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
) -> PaperDetail:
    return _paper_detail(db=db, paper_id=paper_id)


@router.put("/{paper_id}", response_model=PaperDetail)
def update_paper(
    paper_id: str,
    payload: PaperUpdate,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
) -> PaperDetail:
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        return _paper_detail(db=db, paper_id=paper_id)

    set_parts = []
    params: dict[str, Any] = {"id": paper_id}
    for k, v in fields.items():
        set_parts.append(f"{k} = :{k}")
        params[k] = v

    db.execute(
        text(
            f"""
            UPDATE papers
            SET {", ".join(set_parts)}
            WHERE id = :id
            """
        ),
        params,
    )
    db.commit()
    return _paper_detail(db=db, paper_id=paper_id)


@router.delete(
    "/{paper_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
)
def delete_paper(
    paper_id: str,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
) -> Response:
    # Grab PDF storage paths before deleting (DB rows will cascade away).
    pdf_paths = db.execute(
        text(
            """
            SELECT storage_path
            FROM pdf_files
            WHERE paper_id = :paper_id
            """
        ),
        {"paper_id": paper_id},
    ).mappings().all()

    res = db.execute(
        text(
            """
            DELETE FROM papers
            WHERE id = :id
            """
        ),
        {"id": paper_id},
    )
    if res.rowcount == 0:
        db.rollback()
        raise HTTPException(status_code=404, detail="Paper not found")

    db.commit()

    # Best-effort cleanup of stored PDFs on disk.
    settings = get_settings()
    storage_root = Path(settings.pdf_storage_dir).resolve()
    for r in pdf_paths:
        try:
            path = Path(r["storage_path"]).resolve()
            if storage_root not in path.parents and storage_root != path.parent:
                continue
            if path.exists():
                path.unlink()
        except Exception:
            # Don't fail the API call if disk cleanup fails.
            pass

    # 204 must not include a response body.
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{paper_id}/pdf")
def stream_pdf(
    paper_id: str,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
) -> FileResponse:
    row = db.execute(
        text(
            """
            SELECT storage_path, original_filename
            FROM pdf_files
            WHERE paper_id = :paper_id
            ORDER BY uploaded_at DESC
            LIMIT 1
            """
        ),
        {"paper_id": paper_id},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="PDF not found")

    settings = get_settings()
    storage_root = Path(settings.pdf_storage_dir).resolve()
    path = Path(row["storage_path"]).resolve()
    if storage_root not in path.parents and storage_root != path.parent:
        raise HTTPException(status_code=403, detail="Invalid storage path")
    if not path.exists():
        raise HTTPException(status_code=404, detail="PDF missing on disk")

    return FileResponse(
        path=str(path),
        media_type="application/pdf",
        filename=row["original_filename"],
    )


@router.post("/{paper_id}/codes", response_model=CodeOut)
def create_code(
    paper_id: str,
    payload: CodeCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
) -> CodeOut:
    data = payload.model_dump()
    row = db.execute(
        text(
            """
            INSERT INTO codes (
              paper_id, coded_by,
              evidence_primary, self_report_used_as_learning_proxy, outcome_distance,
              effectiveness_claim_present, claim_strength, construct_learning_clarity, construct_engagement_clarity, construct_slippage_present,
              theory_present, theory_named, theory_function,
              teacher_labor_discussed, student_labor_discussed, institutional_constraints_discussed, data_infrastructure_discussed, power_equity_discussed,
              coding_notes_20w, coding_confidence, codebook_version
            )
            VALUES (
              :paper_id, :coded_by,
              :evidence_primary, :self_report_used_as_learning_proxy, :outcome_distance,
              :effectiveness_claim_present, :claim_strength, :construct_learning_clarity, :construct_engagement_clarity, :construct_slippage_present,
              :theory_present, :theory_named, :theory_function,
              :teacher_labor_discussed, :student_labor_discussed, :institutional_constraints_discussed, :data_infrastructure_discussed, :power_equity_discussed,
              :coding_notes_20w, :coding_confidence, :codebook_version
            )
            RETURNING
              id::text,
              paper_id::text,
              coded_by::text,
              coded_at::text;
            """
        ),
        {"paper_id": paper_id, "coded_by": user["id"], **data},
    ).mappings().one()
    db.commit()

    out = {**data, **dict(row), "coded_by_email": user["email"]}
    return CodeOut(**out)


@router.get("/{paper_id}/codes", response_model=List[CodeOut])
def list_codes(
    paper_id: str,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
) -> list[CodeOut]:
    rows = db.execute(
        text(
            """
            SELECT
              c.id::text,
              c.paper_id::text,
              c.coded_by::text,
              u.email AS coded_by_email,
              c.coded_at::text,

              c.evidence_primary,
              c.self_report_used_as_learning_proxy,
              c.outcome_distance,

              c.effectiveness_claim_present,
              c.claim_strength,
              c.construct_learning_clarity,
              c.construct_engagement_clarity,
              c.construct_slippage_present,

              c.theory_present,
              c.theory_named,
              c.theory_function,

              c.teacher_labor_discussed,
              c.student_labor_discussed,
              c.institutional_constraints_discussed,
              c.data_infrastructure_discussed,
              c.power_equity_discussed,

              c.coding_notes_20w,
              c.coding_confidence,
              c.codebook_version
            FROM codes c
            LEFT JOIN users u ON u.id = c.coded_by
            WHERE c.paper_id = :paper_id
            ORDER BY c.coded_at DESC
            LIMIT 200;
            """
        ),
        {"paper_id": paper_id},
    ).mappings().all()
    return [CodeOut(**dict(r)) for r in rows]

