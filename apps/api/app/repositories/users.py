from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session


def upsert_invited_user(db: Session, email: str) -> dict:
    row = db.execute(
        text(
            """
            INSERT INTO users (email, password_hash)
            VALUES (:email, NULL)
            ON CONFLICT (email)
            DO UPDATE SET email = EXCLUDED.email
            RETURNING id::text, email, role;
            """
        ),
        {"email": email},
    ).mappings().one()
    return dict(row)


def get_user_by_id(db: Session, user_id: str) -> dict | None:
    row = db.execute(
        text("SELECT id::text, email, role FROM users WHERE id = :id"),
        {"id": user_id},
    ).mappings().first()
    return dict(row) if row else None

