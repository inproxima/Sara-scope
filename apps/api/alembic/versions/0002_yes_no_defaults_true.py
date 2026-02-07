"""Default yes/no codes booleans to TRUE

Revision ID: 0002_yes_no_defaults_true
Revises: 0001_init
Create Date: 2026-02-07
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "0002_yes_no_defaults_true"
down_revision = "0001_init"
branch_labels = None
depends_on = None


_BOOL_COLS = [
    "self_report_used_as_learning_proxy",
    "effectiveness_claim_present",
    "construct_slippage_present",
    "theory_present",
    "teacher_labor_discussed",
    "student_labor_discussed",
    "institutional_constraints_discussed",
    "data_infrastructure_discussed",
    "power_equity_discussed",
]


def upgrade() -> None:
    # Backfill existing rows where fields were previously nullable.
    for col in _BOOL_COLS:
        op.execute(f"UPDATE codes SET {col} = true WHERE {col} IS NULL;")

    # Ensure DB-level default + constraint: TRUE unless explicitly set to FALSE.
    for col in _BOOL_COLS:
        op.execute(f"ALTER TABLE codes ALTER COLUMN {col} SET DEFAULT true;")
        op.execute(f"ALTER TABLE codes ALTER COLUMN {col} SET NOT NULL;")


def downgrade() -> None:
    # Revert to nullable with no default.
    for col in _BOOL_COLS:
        op.execute(f"ALTER TABLE codes ALTER COLUMN {col} DROP NOT NULL;")
        op.execute(f"ALTER TABLE codes ALTER COLUMN {col} DROP DEFAULT;")

