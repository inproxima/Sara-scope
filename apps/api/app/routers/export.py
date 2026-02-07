from __future__ import annotations

import csv
import io
from typing import Iterator, List

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db

router = APIRouter(prefix="/export", tags=["export"])


PAPER_COLS = [
    "paper_id",
    "doi",
    "title",
    "authors",
    "journal",
    "publication_year",
    "volume",
    "issue",
    "page_range",
    "corresponding_email",
    "source",
]

CODE_COLS = [
    "code_id",
    "coded_at",
    "coded_by_email",
    "evidence_primary",
    "self_report_used_as_learning_proxy",
    "outcome_distance",
    "effectiveness_claim_present",
    "claim_strength",
    "construct_learning_clarity",
    "construct_engagement_clarity",
    "construct_slippage_present",
    "theory_present",
    "theory_named",
    "theory_function",
    "teacher_labor_discussed",
    "student_labor_discussed",
    "institutional_constraints_discussed",
    "data_infrastructure_discussed",
    "power_equity_discussed",
    "coding_notes_20w",
    "coding_confidence",
    "codebook_version",
]


def _stream_csv(rows: list[dict], columns: list[str], filename: str) -> StreamingResponse:
    def gen() -> Iterator[bytes]:
        buf = io.StringIO()
        w = csv.DictWriter(buf, fieldnames=columns, extrasaction="ignore")
        w.writeheader()
        yield buf.getvalue().encode("utf-8")
        buf.seek(0)
        buf.truncate(0)

        for r in rows:
            w.writerow(r)
            yield buf.getvalue().encode("utf-8")
            buf.seek(0)
            buf.truncate(0)

    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(gen(), media_type="text/csv; charset=utf-8", headers=headers)


@router.get("/latest.csv")
def export_latest(
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
) -> StreamingResponse:
    rows = db.execute(
        text(
            """
            SELECT
              p.id::text AS paper_id,
              p.doi, p.title, p.authors, p.journal, p.publication_year,
              p.volume, p.issue, p.page_range, p.corresponding_email, p.source,

              c.id::text AS code_id,
              c.coded_at::text AS coded_at,
              u.email AS coded_by_email,

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
            FROM papers p
            LEFT JOIN LATERAL (
              SELECT *
              FROM codes c
              WHERE c.paper_id = p.id
              ORDER BY c.coded_at DESC
              LIMIT 1
            ) c ON true
            LEFT JOIN users u ON u.id = c.coded_by
            ORDER BY p.created_at DESC;
            """
        )
    ).mappings().all()

    return _stream_csv(
        rows=[dict(r) for r in rows],
        columns=PAPER_COLS + CODE_COLS,
        filename="latest_codes.csv",
    )


@router.get("/all.csv")
def export_all(
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
) -> StreamingResponse:
    rows = db.execute(
        text(
            """
            SELECT
              p.id::text AS paper_id,
              p.doi, p.title, p.authors, p.journal, p.publication_year,
              p.volume, p.issue, p.page_range, p.corresponding_email, p.source,

              c.id::text AS code_id,
              c.coded_at::text AS coded_at,
              u.email AS coded_by_email,

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
            JOIN papers p ON p.id = c.paper_id
            LEFT JOIN users u ON u.id = c.coded_by
            ORDER BY c.coded_at DESC;
            """
        )
    ).mappings().all()

    return _stream_csv(
        rows=[dict(r) for r in rows],
        columns=PAPER_COLS + CODE_COLS,
        filename="all_codes.csv",
    )

