from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


Confidence = Literal["high", "medium", "low"]


class ExtractedMetadata(BaseModel):
    doi: Optional[str] = None
    title: Optional[str] = None
    authors: Optional[str] = None
    journal: Optional[str] = None
    publication_year: Optional[int] = None
    volume: Optional[str] = None
    issue: Optional[str] = None
    page_range: Optional[str] = None
    corresponding_email: Optional[str] = None


class UploadPdfResponse(BaseModel):
    paper_id: str
    extracted: ExtractedMetadata
    confidence: dict[str, Confidence] = Field(default_factory=dict)


class PaperListItem(BaseModel):
    id: str
    doi: Optional[str] = None
    title: Optional[str] = None
    authors: Optional[str] = None
    journal: Optional[str] = None
    publication_year: Optional[int] = None
    created_at: str
    updated_at: str
    coded: bool = False


class PaperDetail(BaseModel):
    id: str
    doi: Optional[str] = None
    title: Optional[str] = None
    authors: Optional[str] = None
    journal: Optional[str] = None
    publication_year: Optional[int] = None
    volume: Optional[str] = None
    issue: Optional[str] = None
    page_range: Optional[str] = None
    corresponding_email: Optional[str] = None
    abstract: Optional[str] = None
    source: Optional[str] = None
    created_at: str
    updated_at: str
    pdf_available: bool
    latest_code: dict | None = None


class PaperUpdate(BaseModel):
    doi: Optional[str] = None
    title: Optional[str] = None
    authors: Optional[str] = None
    journal: Optional[str] = None
    publication_year: Optional[int] = None
    volume: Optional[str] = None
    issue: Optional[str] = None
    page_range: Optional[str] = None
    corresponding_email: Optional[str] = None
    abstract: Optional[str] = None
    source: Optional[str] = None

