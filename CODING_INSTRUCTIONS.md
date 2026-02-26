# CODING_INSTRUCTIONS.md

This document lists **all user-input fields in the web UI** and how to fill them, including **coding-form instructions** (definitions, allowed values, decision rules).

## Sources of truth (authoritative)

- **Web UI pages**
  - `apps/web/app/login/page.tsx`
  - `apps/web/app/papers/page.tsx`
  - `apps/web/app/papers/upload/page.tsx`
  - `apps/web/app/papers/[id]/page.tsx`
- **Coding codebook (v1)**
  - `apps/web/src/codebook/v1.ts` (field keys/labels/types/options used by the UI)
  - `apps/web/src/codebook/AI_Education_Diagnostic_MetaReview_v1.ts` (definitions, allowed values, decision rules)
- **Backend request validation**
  - `apps/api/app/schemas/auth.py` (`LoginRequest`)
  - `apps/api/app/schemas/papers.py` (`PaperUpdate`, `UploadPdfResponse`)
  - `apps/api/app/schemas/codes.py` (`CodeCreate`)
  - `apps/api/app/routers/papers.py` (query param types for `/papers`)

When the UI and backend differ, **backend validation wins** (you may see a 4xx error if inputs don’t match).

## Global conventions

- **Authentication**: most pages redirect to `/login` if you don’t have a token.
- **Optional vs unset**:
  - Text inputs send `""` (empty string) unless you clear the field; backend accepts `null`/missing/strings for most metadata fields.
  - Coding **select** fields have an explicit `**(unset)`** option; the UI sends `null` when unset.
- **Boolean defaults in the coding form**: checkbox fields default to **Yes** (`true`) in both UI initialization and backend schema defaults.
- **Year parsing**
  - `/papers` filter `year` must be parseable as an integer (backend query param is `int`).
  - Paper metadata `publication_year` is typed as an integer in the backend, but the UI collects it as text and converts via `Number(...)` on save. Use digits (e.g. `2024`) or leave blank.

## Routes/screens with no input fields

- `**/` (Home)**: no editable fields (only navigation buttons).
- `**/export`**: no editable fields (only export buttons).

## `/login` — Sign In

**UI file**: `apps/web/app/login/page.tsx`  
**Backend DTO**: `apps/api/app/schemas/auth.py` → `LoginRequest`


| UI field (state) | UI label      | Input type | Required | Backend field | Rules / instructions                                |
| ---------------- | ------------- | ---------- | -------- | ------------- | --------------------------------------------------- |
| `email`          | Email address | email      | Yes      | `email`       | Must be a valid email address (backend `EmailStr`). |
| `inviteCode`     | Invite code   | text       | No       | `invite_code` | Optional invite code; leave blank if not provided.  |


## `/papers` — Browse/Search papers

**UI file**: `apps/web/app/papers/page.tsx`  
**Backend endpoint**: `apps/api/app/routers/papers.py` → `GET /papers` (`q: str`, `year: int`, `coded: bool`, `journal: str`)

These inputs are stored in the URL query string.


| Query param | UI label | Input type | Accepted values                                          | Rules / instructions                                                     |
| ----------- | -------- | ---------- | -------------------------------------------------------- | ------------------------------------------------------------------------ |
| `q`         | Search   | text       | any string                                               | Searches DOI/title/authors/journal (case-insensitive, partial match).    |
| `year`      | Year     | text       | integer string (e.g. `2024`)                             | Must parse as an integer, otherwise the backend will reject the request. |
| `coded`     | Status   | select     | `""` (All papers), `"true"` (Coded), `"false"` (Uncoded) | Filters by whether any coding records exist for the paper.               |
| `journal`   | Journal  | text       | any string                                               | Case-insensitive, partial match.                                         |


## `/papers/upload` — Upload PDF + review extracted metadata

**UI file**: `apps/web/app/papers/upload/page.tsx`  
**Backend endpoints/DTOs**: `POST /papers/upload-pdf` and `PUT /papers/{id}` (`apps/api/app/schemas/papers.py`)

### Upload field


| Field  | UI label | Input type | Required | Rules / instructions                                                                                                          |
| ------ | -------- | ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `file` | PDF file | file       | Yes      | Choose a `.pdf`. The backend rejects non-`.pdf` filenames. The UI also limits selection to PDFs (`accept="application/pdf"`). |


### Extracted metadata review fields

After upload, the UI pre-fills fields and shows a **confidence** pill per field (`high`/`medium`/`low`). Treat confidence as a heuristic: **you should still verify/correct values**.

**Backend model**: `PaperUpdate` (`apps/api/app/schemas/papers.py`)  
**Save behavior**: `publication_year` is converted to `Number(form.publication_year)` or `null` on save.


| Key                   | UI label            | Input type | Backend type    | Rules / instructions                                                     |
| --------------------- | ------------------- | ---------- | --------------- | ------------------------------------------------------------------------ |
| `doi`                 | DOI                 | text       | optional string | Use the canonical DOI (often like `10.xxxx/xxxxx`).                      |
| `title`               | Title               | text       | optional string | Full paper title.                                                        |
| `authors`             | Authors             | text       | optional string | Free text; typically “Last, First; Last, First; …” (no strict schema).   |
| `journal`             | Journal             | text       | optional string | Journal/conference name.                                                 |
| `publication_year`    | Year                | text       | optional int    | Digits only (e.g. `2023`). Leave blank if unknown.                       |
| `volume`              | Volume              | text       | optional string | As printed.                                                              |
| `issue`               | Issue               | text       | optional string | As printed.                                                              |
| `page_range`          | Pages               | text       | optional string | As printed (e.g. `123–145`).                                             |
| `corresponding_email` | Corresponding email | text       | optional string | Email address if available (backend does not enforce email format here). |


## `/papers/[id]` — Paper detail (metadata edit + coding)

**UI file**: `apps/web/app/papers/[id]/page.tsx`

### Metadata fields

**Backend model**: `PaperUpdate` (`apps/api/app/schemas/papers.py`)  
**Save behavior**: `publication_year` is converted to `Number(meta.publication_year)` or `null` on save.


| Key                   | UI label            | Input type | Backend type    | Rules / instructions                                           |
| --------------------- | ------------------- | ---------- | --------------- | -------------------------------------------------------------- |
| `doi`                 | DOI                 | text       | optional string | Canonical DOI.                                                 |
| `title`               | Title               | text       | optional string | Full paper title.                                              |
| `authors`             | Authors             | text       | optional string | Free text.                                                     |
| `journal`             | Journal             | text       | optional string | Free text.                                                     |
| `publication_year`    | Year                | text       | optional int    | Digits only; leave blank if unknown.                           |
| `volume`              | Volume              | text       | optional string | Free text.                                                     |
| `issue`               | Issue               | text       | optional string | Free text.                                                     |
| `page_range`          | Pages               | text       | optional string | Free text.                                                     |
| `corresponding_email` | Corresponding email | text       | optional string | Free text.                                                     |
| `source`              | Source              | text       | optional string | Where the paper came from (e.g., database/export/source link). |
| `abstract`            | Abstract            | textarea   | optional string | Paste/edit the abstract (plain text).                          |


### Coding form (codebook `v1`)

Submitting creates a **new** coding record; it **does not overwrite** previous codes.

- **Backend model**: `CodeCreate` (`apps/api/app/schemas/codes.py`)
- **Codebook version**: `codebook_version` defaults to `v1` and is not user-editable in the current UI.
- **Unset behavior**: select fields can be `(unset)` → sent as `null`.
- **Boolean behavior**: checkboxes show Yes/No and default to **Yes** (`true`).

#### Field-by-field coding instructions

The unit of analysis for this codebook is:

> Full paper (title, abstract, methods, results, discussion, tables/figures, appendices when available).

Note:

> All definitions below refer to evidence and claims as presented in the paper (not only the abstract).

---

#### `evidence_primary` — Evidence primary (select)

**Definition**: The main type of evidence the paper relies on to support its central educational claim(s) about AI.  
**Decision rule**: Select the evidence type that most directly supports the paper’s headline claim(s) in the Results/Findings and Discussion.


| Stored value            | UI label             | Meaning                                                                                                                                                                  |
| ----------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `self_report`           | Self-report          | Evidence primarily from participants’ self-reports (e.g., surveys, questionnaires, Likert scales, interviews focused on perceptions/attitudes).                          |
| `performance_artifact`  | Performance artifact | Evidence primarily from demonstrated performance or produced artifacts (e.g., writing samples, assignments, rubric-scored work, task outputs).                           |
| `log_or_trace_data`     | Log / trace data     | Evidence primarily from system logs or behavioral traces (e.g., clicks, time-on-task, interaction logs, platform analytics).                                             |
| `grades_or_test_scores` | Grades / test scores | Evidence primarily from grades, standardized tests, quizzes, or other formal assessments with numeric scores.                                                            |
| `qualitative_data`      | Qualitative data     | Evidence primarily from qualitative sources aimed at meaning/experience/context (e.g., observations, open-ended interviews, field notes) rather than scaled self-report. |
| `mixed`                 | Mixed                | Two or more evidence types are used in a substantively integrated way to support the main claim(s).                                                                      |


---

#### `self_report_used_as_learning_proxy` — Self-report used as learning proxy (boolean)

**Definition**: Whether self-report measures are treated as evidence of learning or achievement (rather than attitudes, satisfaction, or perceived usefulness).  
**Decision rule**: Code true if the paper uses self-report results (alone or primarily) as the basis for concluding learning improvement or effectiveness.


| Stored value | UI label | Meaning                                                                                                   |
| ------------ | -------- | --------------------------------------------------------------------------------------------------------- |
| `true`       | Yes      | Self-report is used to substantiate learning gains, improved outcomes, or educational effectiveness.      |
| `false`      | No       | Self-report is used for perceptions/attitudes only, or learning is supported by non-self-report evidence. |


---

#### `outcome_distance` — Outcome distance (select)

**Definition**: How directly the measured outcomes align with the educational impact claims being made in the paper.  
**Decision rule**: If the primary evidence for learning impact is perceptions/engagement/satisfaction rather than performance or assessed learning, code distal.


| Stored value | UI label | Meaning                                                                                                                                                                 |
| ------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `proximal`   | Proximal | Outcomes are close to the learning activity and directly measurable (e.g., task performance, artifact quality, rubric scores, demonstrated skills).                     |
| `distal`     | Distal   | Outcomes are indirect proxies or broad endpoints (e.g., perceived learning, engagement-as-learning, satisfaction, general ‘learning outcomes’ without direct measures). |
| `unclear`    | Unclear  | The paper does not provide enough information to judge proximity.                                                                                                       |


---

#### `effectiveness_claim_present` — Effectiveness claim present (boolean)

**Definition**: Whether the paper makes an evaluative claim that AI improves or enhances educational outcomes.  
**Decision rule**: Code true if the paper concludes any improvement claim, even if limited to a subset of outcomes or contexts.


| Stored value | UI label | Meaning                                                                                                                                   |
| ------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `true`       | Yes      | Uses language like improves, enhances, increases, promotes, leads to better outcomes, positive effect (in Results/Discussion/Conclusion). |
| `false`      | No       | Describes use or implementation without concluding improvement.                                                                           |


---

#### `claim_strength` — Claim strength (select)

**Definition**: The inferential strength of the paper’s claims about AI’s effects, based on wording in Results/Discussion/Conclusion.  
**Decision rule**: Code based on the strongest claim language used in the paper’s conclusions, not on whether the study design warrants it.


| Stored value      | UI label        | Meaning                                                                                                                                |
| ----------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `descriptive`     | Descriptive     | Describes observations or experiences without linking variables (e.g., ‘we describe’, ‘we report’, ‘we document’).                     |
| `correlational`   | Correlational   | Associates AI use with outcomes without implying causation (e.g., ‘is associated with’, ‘predicts’, ‘relates to’).                     |
| `causal_language` | Causal language | Uses causal phrasing (e.g., ‘improves’, ‘leads to’, ‘causes’, ‘results in’) regardless of whether the design truly supports causality. |


---

#### `construct_learning_clarity` — Construct clarity: Learning (select)

**Definition**: How clearly the paper defines or operationalizes ‘learning’ (or learning outcomes) across methods and measures.  
**Decision rule**: If learning is central to the paper’s conclusions but measures are vague or undefined, code absent.


| Stored value | UI label | Meaning                                                                                                                                                      |
| ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `clear`      | Clear    | Learning is operationalized with specific constructs and measures (e.g., defined skills/knowledge assessed via named instruments, tasks, rubrics, or tests). |
| `partial`    | Partial  | Learning is referenced with limited operational detail (e.g., mentions a test/measure but not what it represents or how it maps to learning).                |
| `absent`     | Absent   | Learning is claimed but not operationalized in a way that can be evaluated from the paper.                                                                   |


---

#### `construct_engagement_clarity` — Construct clarity: Engagement (select)

**Definition**: How clearly the paper defines or operationalizes ‘engagement’ across methods and measures.  
**Decision rule**: If engagement is used as an outcome but the measurement approach is not described, code absent.


| Stored value     | UI label       | Meaning                                                                                                                                     |
| ---------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `clear`          | Clear          | Engagement is defined and measured with named dimensions (behavioral/cognitive/affective) and/or validated instruments or clear indicators. |
| `partial`        | Partial        | Engagement is measured but with limited detail (e.g., ‘engagement scale’ without dimensions or item examples).                              |
| `absent`         | Absent         | Engagement is claimed or discussed but not operationalized.                                                                                 |
| `not_applicable` | Not applicable | Engagement is not a construct used in the study’s claims.                                                                                   |


---

#### `construct_slippage_present` — Construct slippage present (boolean)

**Definition**: Whether distinct constructs (e.g., engagement, motivation, learning, achievement) are treated as interchangeable or collapsed without justification in the paper’s argument.  
**Decision rule**: Code true when conclusions about learning rely primarily on non-learning constructs (e.g., engagement, satisfaction) without a justified bridge.


| Stored value | UI label | Meaning                                                                                                                                                               |
| ------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `true`       | Yes      | The paper draws conclusions that treat one construct as evidence of another (e.g., engagement presented as learning) without clear conceptual/measures-based linkage. |
| `false`      | No       | Constructs are kept distinct, or relationships are explicitly justified with measures and theory.                                                                     |


---

#### `theory_present` — Theory present (boolean)

**Definition**: Whether an explicit theory or theoretical framework is named and used in the paper.  
**Decision rule**: Code true only if a specific theory/framework is explicitly named (not just general educational language).


| Stored value | UI label | Meaning                                                                                            |
| ------------ | -------- | -------------------------------------------------------------------------------------------------- |
| `true`       | Yes      | A named theory/framework is included and connected to the study design, interpretation, or claims. |
| `false`      | No       | No explicit theory/framework is named.                                                             |


---

#### `theory_named` — Theory named (text)

**Definition**: The name of the theory/framework if present (free-text).  
**Decision rule**: Record the theory/framework name(s) as written in the paper.

**Input guidance**:

- Enter the exact theory/framework name(s) (e.g., “Self-Determination Theory”, “Cognitive Load Theory”, “TPACK”).
- If `theory_present` is **No**, leave this unset/blank.

---

#### `theory_function` — Theory function (select)

**Definition**: How theory functions in the paper in relation to claims and evidence.  
**Decision rule**: If theory mostly appears in the introduction as rationale and is not used to interpret findings, code instrumental.


| Stored value     | UI label       | Meaning                                                                                                                               |
| ---------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `instrumental`   | Instrumental   | Theory primarily justifies the intervention or predicts effects (e.g., used to frame hypotheses) with limited critical interrogation. |
| `interpretive`   | Interpretive   | Theory is used to explain mechanisms, interpret findings, or clarify constructs beyond simple justification.                          |
| `critical`       | Critical       | Theory is used to examine power, equity, ethics, labor, surveillance, or systemic implications.                                       |
| `unclear`        | Unclear        | Theory is mentioned but its role is not evident in the paper’s design or interpretation.                                              |
| `not_applicable` | Not applicable | No theory is present.                                                                                                                 |


---

#### `teacher_labor_discussed` — Teacher labor discussed (boolean)

**Definition**: Whether the paper addresses teacher workload, time, effort, role shift, professional judgment, or labor implications of AI use.  
**Decision rule**: Code true even if framed positively (e.g., ‘reduces workload’) or neutrally (e.g., ‘changes teacher role’).


| Stored value | UI label | Meaning                                                                                                                  |
| ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `true`       | Yes      | Teacher labor/workload/role implications are explicitly discussed in findings, discussion, limitations, or implications. |
| `false`      | No       | No explicit discussion of teacher labor implications.                                                                    |


---

#### `student_labor_discussed` — Student labor discussed (boolean)

**Definition**: Whether the paper addresses student effort, responsibility, dependency, deskilling, workload, or redistributed labor due to AI use.  
**Decision rule**: Do not treat generic engagement/motivation as labor unless effort/responsibility/work practice is explicitly discussed.


| Stored value | UI label | Meaning                                                                    |
| ------------ | -------- | -------------------------------------------------------------------------- |
| `true`       | Yes      | Student labor/effort/responsibility implications are explicitly discussed. |
| `false`      | No       | No explicit discussion of student labor implications.                      |


---

#### `institutional_constraints_discussed` — Institutional constraints discussed (boolean)

**Definition**: Whether the paper discusses policy, governance, procurement, institutional rules, consent, integrity, compliance, or implementation constraints.  
**Decision rule**: Code true if ethics/privacy/integrity is discussed as a constraint, requirement, or limiting condition, not merely as a generic ‘future work’ note.


| Stored value | UI label | Meaning                                                                                                                                 |
| ------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `true`       | Yes      | Institutional boundary conditions are explicitly discussed (e.g., privacy rules, consent requirements, integrity policies, governance). |
| `false`      | No       | No explicit institutional constraints mentioned.                                                                                        |


---

#### `data_infrastructure_discussed` — Data infrastructure discussed (boolean)

**Definition**: Whether the paper discusses data flows, privacy, security, platform dependency, integration, retrieval, storage, or technical infrastructure as part of the educational system.  
**Decision rule**: Code true if the paper addresses how data is handled or how the system is embedded in infrastructure beyond simply naming a tool.


| Stored value | UI label | Meaning                                                                                                                                                   |
| ------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `true`       | Yes      | Data handling/infrastructure is explicitly discussed (e.g., logging, storage, privacy/security design, platform integration, dependency on vendors/APIs). |
| `false`      | No       | No explicit infrastructural/data considerations discussed.                                                                                                |


---

#### `power_equity_discussed` — Power / equity discussed (boolean)

**Definition**: Whether the paper addresses equity, bias, surveillance, power relations, marginalization, differential access, or fairness implications of AI in education.  
**Decision rule**: Code true only when these issues are explicitly discussed (e.g., in discussion/limitations/ethics), not inferred.


| Stored value | UI label | Meaning                                                               |
| ------------ | -------- | --------------------------------------------------------------------- |
| `true`       | Yes      | Any explicit mention of power/equity/bias/surveillance/access issues. |
| `false`      | No       | No explicit discussion of these implications.                         |


---

#### `coding_notes_20w` — Notes (~20 words) (textarea)

**Definition**: A short justification (approximately 20 words) explaining the key basis for the coding decisions, referencing the paper’s claims, evidence, construct handling, theory use, or sociotechnical discussion.  
**Decision rule**: Must cite the decisive cue (e.g., ‘concludes learning gains mainly from engagement survey; no operationalized learning measure; theory used as rationale’).

**Backend constraint**: max length 2000 characters (`apps/api/app/schemas/codes.py`).  
**Practical guidance**: aim for ~15–25 words even though longer text is technically allowed.

---

#### `coding_confidence` — Coding confidence (select)

**Definition**: Coder’s confidence that codes are correct given the paper’s detail and clarity.  
**Decision rule**: Use low if outcome measures, evidence basis, or construct definitions are not sufficiently documented in the paper.


| Stored value | UI label | Meaning                                                               |
| ------------ | -------- | --------------------------------------------------------------------- |
| `high`       | High     | Clear evidence in methods/results/discussion; minimal ambiguity.      |
| `medium`     | Medium   | Some ambiguity; best-judgment classification from available sections. |
| `low`        | Low      | Insufficient detail or conflicting signals; coding is tentative.      |


