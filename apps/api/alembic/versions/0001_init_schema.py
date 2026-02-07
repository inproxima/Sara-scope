"""init schema

Revision ID: 0001_init
Revises: 
Create Date: 2026-02-06
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # UUID generation
    op.execute('CREATE EXTENSION IF NOT EXISTS pgcrypto;')

    # Users (invite-only MVP -> password_hash nullable)
    op.execute(
        """
        CREATE TABLE users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text UNIQUE NOT NULL,
          password_hash text,
          display_name text,
          role text NOT NULL DEFAULT 'member',
          created_at timestamptz NOT NULL DEFAULT now()
        );
        """
    )

    # Papers
    op.execute(
        """
        CREATE TABLE papers (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          doi text UNIQUE,
          title text,
          authors text,
          journal text,
          publication_year int,
          volume text,
          issue text,
          page_range text,
          corresponding_email text,
          abstract text,
          source text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );
        """
    )
    op.execute("CREATE INDEX idx_papers_year ON papers(publication_year);")
    op.execute("CREATE INDEX idx_papers_journal ON papers(journal);")

    # updated_at trigger for papers
    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS trigger AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_papers_updated_at
        BEFORE UPDATE ON papers
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        """
    )

    # Uploaded PDFs
    op.execute(
        """
        CREATE TABLE pdf_files (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          paper_id uuid REFERENCES papers(id) ON DELETE CASCADE,
          original_filename text NOT NULL,
          storage_path text NOT NULL,
          sha256 text,
          page_count int,
          uploaded_by uuid REFERENCES users(id),
          uploaded_at timestamptz NOT NULL DEFAULT now()
        );
        """
    )
    op.execute("CREATE INDEX idx_pdf_files_paper ON pdf_files(paper_id);")

    # Extraction audit runs
    op.execute(
        """
        CREATE TABLE extraction_runs (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          paper_id uuid REFERENCES papers(id) ON DELETE CASCADE,
          pdf_file_id uuid REFERENCES pdf_files(id) ON DELETE CASCADE,
          extracted_at timestamptz NOT NULL DEFAULT now(),
          created_by uuid REFERENCES users(id),

          extractor_version text NOT NULL DEFAULT 'v1',
          raw_first_page_text text,
          extracted_json jsonb NOT NULL DEFAULT '{}'::jsonb,
          confidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,

          crossref_used boolean NOT NULL DEFAULT false,
          crossref_raw jsonb
        );
        """
    )
    op.execute("CREATE INDEX idx_extraction_runs_paper ON extraction_runs(paper_id);")
    op.execute("CREATE INDEX idx_extraction_runs_pdf ON extraction_runs(pdf_file_id);")

    # Codes (from docs/sgl.md)
    op.execute(
        """
        CREATE TABLE codes (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          paper_id uuid REFERENCES papers(id) ON DELETE CASCADE,
          coded_by uuid REFERENCES users(id),
          coded_at timestamptz NOT NULL DEFAULT now(),

          evidence_primary text CHECK (evidence_primary IN (
            'self_report',
            'performance_artifact',
            'log_or_trace_data',
            'grades_or_test_scores',
            'qualitative_data',
            'mixed'
          )),
          self_report_used_as_learning_proxy boolean NOT NULL DEFAULT true,
          outcome_distance text CHECK (outcome_distance IN ('proximal','distal','unclear')),

          effectiveness_claim_present boolean NOT NULL DEFAULT true,
          claim_strength text CHECK (claim_strength IN ('descriptive','correlational','causal_language')),
          construct_learning_clarity text CHECK (construct_learning_clarity IN ('clear','partial','absent')),
          construct_engagement_clarity text CHECK (construct_engagement_clarity IN ('clear','partial','absent','not_applicable')),
          construct_slippage_present boolean NOT NULL DEFAULT true,

          theory_present boolean NOT NULL DEFAULT true,
          theory_named text,
          theory_function text CHECK (theory_function IN ('instrumental','interpretive','critical','unclear','not_applicable')),

          teacher_labor_discussed boolean NOT NULL DEFAULT true,
          student_labor_discussed boolean NOT NULL DEFAULT true,
          institutional_constraints_discussed boolean NOT NULL DEFAULT true,
          data_infrastructure_discussed boolean NOT NULL DEFAULT true,
          power_equity_discussed boolean NOT NULL DEFAULT true,

          coding_notes_20w text,
          coding_confidence text CHECK (coding_confidence IN ('high','medium','low')),

          codebook_version text NOT NULL DEFAULT 'v1'
        );
        """
    )
    op.execute("CREATE INDEX idx_codes_paper ON codes(paper_id);")
    op.execute("CREATE INDEX idx_codes_coder ON codes(coded_by);")
    op.execute("CREATE INDEX idx_codes_time ON codes(coded_at);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS codes;")
    op.execute("DROP TABLE IF EXISTS extraction_runs;")
    op.execute("DROP TABLE IF EXISTS pdf_files;")
    op.execute("DROP TRIGGER IF EXISTS trg_papers_updated_at ON papers;")
    op.execute("DROP FUNCTION IF EXISTS set_updated_at;")
    op.execute("DROP TABLE IF EXISTS papers;")
    op.execute("DROP TABLE IF EXISTS users;")

