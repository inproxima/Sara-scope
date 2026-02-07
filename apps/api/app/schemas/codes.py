from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


EvidencePrimary = Literal[
    "self_report",
    "performance_artifact",
    "log_or_trace_data",
    "grades_or_test_scores",
    "qualitative_data",
    "mixed",
]
OutcomeDistance = Literal["proximal", "distal", "unclear"]
ClaimStrength = Literal["descriptive", "correlational", "causal_language"]
Clarity = Literal["clear", "partial", "absent"]
EngagementClarity = Literal["clear", "partial", "absent", "not_applicable"]
TheoryFunction = Literal["instrumental", "interpretive", "critical", "unclear", "not_applicable"]
CodingConfidence = Literal["high", "medium", "low"]


class CodeCreate(BaseModel):
    evidence_primary: Optional[EvidencePrimary] = None
    self_report_used_as_learning_proxy: Optional[bool] = None
    outcome_distance: Optional[OutcomeDistance] = None

    effectiveness_claim_present: Optional[bool] = None
    claim_strength: Optional[ClaimStrength] = None
    construct_learning_clarity: Optional[Clarity] = None
    construct_engagement_clarity: Optional[EngagementClarity] = None
    construct_slippage_present: Optional[bool] = None

    theory_present: Optional[bool] = None
    theory_named: Optional[str] = None
    theory_function: Optional[TheoryFunction] = None

    teacher_labor_discussed: Optional[bool] = None
    student_labor_discussed: Optional[bool] = None
    institutional_constraints_discussed: Optional[bool] = None
    data_infrastructure_discussed: Optional[bool] = None
    power_equity_discussed: Optional[bool] = None

    coding_notes_20w: Optional[str] = Field(default=None, max_length=2000)
    coding_confidence: Optional[CodingConfidence] = None
    codebook_version: str = "v1"


class CodeOut(CodeCreate):
    id: str
    paper_id: str
    coded_by: str | None = None
    coded_by_email: str | None = None
    coded_at: str

