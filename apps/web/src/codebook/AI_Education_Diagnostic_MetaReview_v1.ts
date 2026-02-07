export type AllowedValues = Record<string, string>;

export type CodeDefinition = {
  definition: string;
  allowed_values?: AllowedValues;
  decision_rule?: string;
};

export type CodebookScopeUpdate = {
  unit_of_analysis: string;
  note: string;
};

export type CodebookDefinitionSet = {
  codebook_name: string;
  scope_update?: CodebookScopeUpdate;
  definitions: Record<string, CodeDefinition>;
};

export const AI_Education_Diagnostic_MetaReview_v1: CodebookDefinitionSet = {
  codebook_name: "AI_Education_Diagnostic_MetaReview_v1",
  scope_update: {
    unit_of_analysis:
      "Full paper (title, abstract, methods, results, discussion, tables/figures, appendices when available).",
    note: "All definitions below refer to evidence and claims as presented in the paper (not only the abstract).",
  },
  definitions: {
    evidence_primary: {
      definition:
        "The main type of evidence the paper relies on to support its central educational claim(s) about AI.",
      allowed_values: {
        self_report:
          "Evidence primarily from participants’ self-reports (e.g., surveys, questionnaires, Likert scales, interviews focused on perceptions/attitudes).",
        performance_artifact:
          "Evidence primarily from demonstrated performance or produced artifacts (e.g., writing samples, assignments, rubric-scored work, task outputs).",
        log_or_trace_data:
          "Evidence primarily from system logs or behavioral traces (e.g., clicks, time-on-task, interaction logs, platform analytics).",
        grades_or_test_scores:
          "Evidence primarily from grades, standardized tests, quizzes, or other formal assessments with numeric scores.",
        qualitative_data:
          "Evidence primarily from qualitative sources aimed at meaning/experience/context (e.g., observations, open-ended interviews, field notes) rather than scaled self-report.",
        mixed:
          "Two or more evidence types are used in a substantively integrated way to support the main claim(s).",
      },
      decision_rule:
        "Select the evidence type that most directly supports the paper’s headline claim(s) in the Results/Findings and Discussion.",
    },
    self_report_used_as_learning_proxy: {
      definition:
        "Whether self-report measures are treated as evidence of learning or achievement (rather than attitudes, satisfaction, or perceived usefulness).",
      allowed_values: {
        true: "Self-report is used to substantiate learning gains, improved outcomes, or educational effectiveness.",
        false: "Self-report is used for perceptions/attitudes only, or learning is supported by non-self-report evidence.",
      },
      decision_rule:
        "Code true if the paper uses self-report results (alone or primarily) as the basis for concluding learning improvement or effectiveness.",
    },
    outcome_distance: {
      definition: "How directly the measured outcomes align with the educational impact claims being made in the paper.",
      allowed_values: {
        proximal:
          "Outcomes are close to the learning activity and directly measurable (e.g., task performance, artifact quality, rubric scores, demonstrated skills).",
        distal:
          "Outcomes are indirect proxies or broad endpoints (e.g., perceived learning, engagement-as-learning, satisfaction, general ‘learning outcomes’ without direct measures).",
        unclear: "The paper does not provide enough information to judge proximity.",
      },
      decision_rule:
        "If the primary evidence for learning impact is perceptions/engagement/satisfaction rather than performance or assessed learning, code distal.",
    },
    effectiveness_claim_present: {
      definition: "Whether the paper makes an evaluative claim that AI improves or enhances educational outcomes.",
      allowed_values: {
        true: "Uses language like improves, enhances, increases, promotes, leads to better outcomes, positive effect (in Results/Discussion/Conclusion).",
        false: "Describes use or implementation without concluding improvement.",
      },
      decision_rule: "Code true if the paper concludes any improvement claim, even if limited to a subset of outcomes or contexts.",
    },
    claim_strength: {
      definition:
        "The inferential strength of the paper’s claims about AI’s effects, based on wording in Results/Discussion/Conclusion.",
      allowed_values: {
        descriptive:
          "Describes observations or experiences without linking variables (e.g., ‘we describe’, ‘we report’, ‘we document’).",
        correlational:
          "Associates AI use with outcomes without implying causation (e.g., ‘is associated with’, ‘predicts’, ‘relates to’).",
        causal_language:
          "Uses causal phrasing (e.g., ‘improves’, ‘leads to’, ‘causes’, ‘results in’) regardless of whether the design truly supports causality.",
      },
      decision_rule:
        "Code based on the strongest claim language used in the paper’s conclusions, not on whether the study design warrants it.",
    },
    construct_learning_clarity: {
      definition:
        "How clearly the paper defines or operationalizes ‘learning’ (or learning outcomes) across methods and measures.",
      allowed_values: {
        clear:
          "Learning is operationalized with specific constructs and measures (e.g., defined skills/knowledge assessed via named instruments, tasks, rubrics, or tests).",
        partial:
          "Learning is referenced with limited operational detail (e.g., mentions a test/measure but not what it represents or how it maps to learning).",
        absent: "Learning is claimed but not operationalized in a way that can be evaluated from the paper.",
      },
      decision_rule: "If learning is central to the paper’s conclusions but measures are vague or undefined, code absent.",
    },
    construct_engagement_clarity: {
      definition: "How clearly the paper defines or operationalizes ‘engagement’ across methods and measures.",
      allowed_values: {
        clear:
          "Engagement is defined and measured with named dimensions (behavioral/cognitive/affective) and/or validated instruments or clear indicators.",
        partial:
          "Engagement is measured but with limited detail (e.g., ‘engagement scale’ without dimensions or item examples).",
        absent: "Engagement is claimed or discussed but not operationalized.",
        not_applicable: "Engagement is not a construct used in the study’s claims.",
      },
      decision_rule: "If engagement is used as an outcome but the measurement approach is not described, code absent.",
    },
    construct_slippage_present: {
      definition:
        "Whether distinct constructs (e.g., engagement, motivation, learning, achievement) are treated as interchangeable or collapsed without justification in the paper’s argument.",
      allowed_values: {
        true: "The paper draws conclusions that treat one construct as evidence of another (e.g., engagement presented as learning) without clear conceptual/measures-based linkage.",
        false: "Constructs are kept distinct, or relationships are explicitly justified with measures and theory.",
      },
      decision_rule:
        "Code true when conclusions about learning rely primarily on non-learning constructs (e.g., engagement, satisfaction) without a justified bridge.",
    },
    theory_present: {
      definition: "Whether an explicit theory or theoretical framework is named and used in the paper.",
      allowed_values: {
        true: "A named theory/framework is included and connected to the study design, interpretation, or claims.",
        false: "No explicit theory/framework is named.",
      },
      decision_rule:
        "Code true only if a specific theory/framework is explicitly named (not just general educational language).",
    },
    theory_named: {
      definition: "The name of the theory/framework if present (free-text).",
      allowed_values: {
        string: "A theory name (e.g., ‘Self-Determination Theory’, ‘Cognitive Load Theory’, ‘TPACK’).",
        null: "No theory present.",
      },
      decision_rule: "Record the theory/framework name(s) as written in the paper.",
    },
    theory_function: {
      definition: "How theory functions in the paper in relation to claims and evidence.",
      allowed_values: {
        instrumental:
          "Theory primarily justifies the intervention or predicts effects (e.g., used to frame hypotheses) with limited critical interrogation.",
        interpretive:
          "Theory is used to explain mechanisms, interpret findings, or clarify constructs beyond simple justification.",
        critical: "Theory is used to examine power, equity, ethics, labor, surveillance, or systemic implications.",
        unclear: "Theory is mentioned but its role is not evident in the paper’s design or interpretation.",
        not_applicable: "No theory is present.",
      },
      decision_rule:
        "If theory mostly appears in the introduction as rationale and is not used to interpret findings, code instrumental.",
    },
    teacher_labor_discussed: {
      definition:
        "Whether the paper addresses teacher workload, time, effort, role shift, professional judgment, or labor implications of AI use.",
      allowed_values: {
        true: "Teacher labor/workload/role implications are explicitly discussed in findings, discussion, limitations, or implications.",
        false: "No explicit discussion of teacher labor implications.",
      },
      decision_rule:
        "Code true even if framed positively (e.g., ‘reduces workload’) or neutrally (e.g., ‘changes teacher role’).",
    },
    student_labor_discussed: {
      definition:
        "Whether the paper addresses student effort, responsibility, dependency, deskilling, workload, or redistributed labor due to AI use.",
      allowed_values: {
        true: "Student labor/effort/responsibility implications are explicitly discussed.",
        false: "No explicit discussion of student labor implications.",
      },
      decision_rule:
        "Do not treat generic engagement/motivation as labor unless effort/responsibility/work practice is explicitly discussed.",
    },
    institutional_constraints_discussed: {
      definition:
        "Whether the paper discusses policy, governance, procurement, institutional rules, consent, integrity, compliance, or implementation constraints.",
      allowed_values: {
        true: "Institutional boundary conditions are explicitly discussed (e.g., privacy rules, consent requirements, integrity policies, governance).",
        false: "No explicit institutional constraints mentioned.",
      },
      decision_rule:
        "Code true if ethics/privacy/integrity is discussed as a constraint, requirement, or limiting condition, not merely as a generic ‘future work’ note.",
    },
    data_infrastructure_discussed: {
      definition:
        "Whether the paper discusses data flows, privacy, security, platform dependency, integration, retrieval, storage, or technical infrastructure as part of the educational system.",
      allowed_values: {
        true: "Data handling/infrastructure is explicitly discussed (e.g., logging, storage, privacy/security design, platform integration, dependency on vendors/APIs).",
        false: "No explicit infrastructural/data considerations discussed.",
      },
      decision_rule:
        "Code true if the paper addresses how data is handled or how the system is embedded in infrastructure beyond simply naming a tool.",
    },
    power_equity_discussed: {
      definition:
        "Whether the paper addresses equity, bias, surveillance, power relations, marginalization, differential access, or fairness implications of AI in education.",
      allowed_values: {
        true: "Any explicit mention of power/equity/bias/surveillance/access issues.",
        false: "No explicit discussion of these implications.",
      },
      decision_rule:
        "Code true only when these issues are explicitly discussed (e.g., in discussion/limitations/ethics), not inferred.",
    },
    coding_notes_20w: {
      definition:
        "A short justification (approximately 20 words) explaining the key basis for the coding decisions, referencing the paper’s claims, evidence, construct handling, theory use, or sociotechnical discussion.",
      allowed_values: {
        string: "A concise note around 15–25 words.",
      },
      decision_rule:
        "Must cite the decisive cue (e.g., ‘concludes learning gains mainly from engagement survey; no operationalized learning measure; theory used as rationale’).",
    },
    coding_confidence: {
      definition: "Coder’s confidence that codes are correct given the paper’s detail and clarity.",
      allowed_values: {
        high: "Clear evidence in methods/results/discussion; minimal ambiguity.",
        medium: "Some ambiguity; best-judgment classification from available sections.",
        low: "Insufficient detail or conflicting signals; coding is tentative.",
      },
      decision_rule:
        "Use low if outcome measures, evidence basis, or construct definitions are not sufficiently documented in the paper.",
    },
  },
};

