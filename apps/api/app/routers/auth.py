from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.db import get_db
from app.core.security import create_access_token
from app.repositories.users import upsert_invited_user
from app.schemas.auth import LoginRequest, TokenResponse, UserOut


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    settings = get_settings()
    email = payload.email.strip().lower()

    if email not in settings.invite_email_set:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not invited")

    if settings.invite_code and settings.invite_code.strip():
        if (payload.invite_code or "").strip() != settings.invite_code.strip():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid invite code")

    user = upsert_invited_user(db, email=email)
    db.commit()

    token = create_access_token(subject=user["id"], extra_claims={"email": user["email"], "role": user["role"]})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
def me(user: dict = Depends(get_current_user)) -> UserOut:
    return UserOut(**user)

