export type FieldType = "select" | "boolean" | "text" | "textarea";

export type CodebookField = {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  hint?: string;
};

import type { CodeDefinition, CodebookDefinitionSet } from "./AI_Education_Diagnostic_MetaReview_v1";
import { AI_Education_Diagnostic_MetaReview_v1 } from "./AI_Education_Diagnostic_MetaReview_v1";

export const codebookByVersion: Record<string, CodebookDefinitionSet> = {
  v1: AI_Education_Diagnostic_MetaReview_v1,
};

export function getCodebookDefinitionSet(codebookVersion: string | null | undefined): CodebookDefinitionSet | null {
  const version = codebookVersion || "v1";
  return codebookByVersion[version] || null;
}

export function getCodeDefinition(codebookVersion: string | null | undefined, key: string): CodeDefinition | null {
  const version = codebookVersion || "v1";
  return codebookByVersion[version]?.definitions?.[key] || null;
}

export const codebookV1: CodebookField[] = [
  {
    key: "evidence_primary",
    label: "Evidence primary",
    type: "select",
    options: [
      { value: "self_report", label: "Self-report" },
      { value: "performance_artifact", label: "Performance artifact" },
      { value: "log_or_trace_data", label: "Log / trace data" },
      { value: "grades_or_test_scores", label: "Grades / test scores" },
      { value: "qualitative_data", label: "Qualitative data" },
      { value: "mixed", label: "Mixed" },
    ],
  },
  {
    key: "self_report_used_as_learning_proxy",
    label: "Self-report used as learning proxy",
    type: "boolean",
  },
  {
    key: "outcome_distance",
    label: "Outcome distance",
    type: "select",
    options: [
      { value: "proximal", label: "Proximal" },
      { value: "distal", label: "Distal" },
      { value: "unclear", label: "Unclear" },
    ],
  },

  { key: "effectiveness_claim_present", label: "Effectiveness claim present", type: "boolean" },
  {
    key: "claim_strength",
    label: "Claim strength",
    type: "select",
    options: [
      { value: "descriptive", label: "Descriptive" },
      { value: "correlational", label: "Correlational" },
      { value: "causal_language", label: "Causal language" },
    ],
  },
  {
    key: "construct_learning_clarity",
    label: "Construct clarity: Learning",
    type: "select",
    options: [
      { value: "clear", label: "Clear" },
      { value: "partial", label: "Partial" },
      { value: "absent", label: "Absent" },
    ],
  },
  {
    key: "construct_engagement_clarity",
    label: "Construct clarity: Engagement",
    type: "select",
    options: [
      { value: "clear", label: "Clear" },
      { value: "partial", label: "Partial" },
      { value: "absent", label: "Absent" },
      { value: "not_applicable", label: "Not applicable" },
    ],
  },
  { key: "construct_slippage_present", label: "Construct slippage present", type: "boolean" },

  { key: "theory_present", label: "Theory present", type: "boolean" },
  { key: "theory_named", label: "Theory named", type: "text" },
  {
    key: "theory_function",
    label: "Theory function",
    type: "select",
    options: [
      { value: "instrumental", label: "Instrumental" },
      { value: "interpretive", label: "Interpretive" },
      { value: "critical", label: "Critical" },
      { value: "unclear", label: "Unclear" },
      { value: "not_applicable", label: "Not applicable" },
    ],
  },

  { key: "teacher_labor_discussed", label: "Teacher labor discussed", type: "boolean" },
  { key: "student_labor_discussed", label: "Student labor discussed", type: "boolean" },
  { key: "institutional_constraints_discussed", label: "Institutional constraints discussed", type: "boolean" },
  { key: "data_infrastructure_discussed", label: "Data infrastructure discussed", type: "boolean" },
  { key: "power_equity_discussed", label: "Power / equity discussed", type: "boolean" },

  {
    key: "coding_notes_20w",
    label: "Notes (~20 words)",
    type: "textarea",
    hint: "Short justification or memo for your coding.",
  },
  {
    key: "coding_confidence",
    label: "Coding confidence",
    type: "select",
    options: [
      { value: "high", label: "High" },
      { value: "medium", label: "Medium" },
      { value: "low", label: "Low" },
    ],
  },
];

