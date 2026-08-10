import type {
  FinancialRiskAssessment,
  FinancialRiskJobStatus,
} from "@/lib/api-client/financial-risk-schemas";
import type {
  FinancialRiskAssessmentPresentation,
  FinancialRiskAssessmentState,
  FinancialRiskJobPresentation,
} from "./financial-risk";

export function presentFinancialRiskAssessment(
  assessment: FinancialRiskAssessment,
): FinancialRiskAssessmentPresentation {
  if (assessment.state === "completed") {
    return modelBackedPresentation(assessment);
  }
  if (assessment.state === "fallback") return fallbackPresentation(assessment);
  return unavailableAssessmentPresentation(assessment);
}

export function presentFinancialRiskJob(
  status: FinancialRiskJobStatus,
): FinancialRiskJobPresentation {
  if (status.state === "queued") return queuedJobPresentation(status);
  if (status.state === "running" || status.state === "retry_scheduled") {
    return runningJobPresentation(status);
  }
  if (status.state === "succeeded") return succeededJobPresentation(status);
  if (status.state === "cancelled") return cancelledJobPresentation(status);
  return failedJobPresentation(status);
}

export function acceptedJobPresentation(
  status: "queued" | "accepted",
): FinancialRiskJobPresentation {
  return {
    state: "pending",
    title: "Queued",
    detail: status === "accepted"
      ? "The calculation request was accepted and is queued for processing."
      : "The calculation is queued for processing.",
    jobState: "queued",
    progress: 0,
  };
}

function modelBackedPresentation(
  assessment: Extract<FinancialRiskAssessment, { state: "completed" }>,
): FinancialRiskAssessmentPresentation {
  return assessmentPresentation(
    assessment,
    "Financial risk assessment complete",
    "Current reference-model result.",
    "model-backed",
    true,
    true,
  );
}

function fallbackPresentation(
  assessment: Extract<FinancialRiskAssessment, { state: "fallback" }>,
): FinancialRiskAssessmentPresentation {
  return assessmentPresentation(
    assessment,
    "Configured fallback estimate",
    "This estimate is not a model-backed result.",
    "configured-fallback",
    true,
    false,
  );
}

function unavailableAssessmentPresentation(
  assessment: Exclude<
    FinancialRiskAssessment,
    { state: "completed" | "fallback" }
  >,
): FinancialRiskAssessmentPresentation {
  return assessmentPresentation(
    assessment,
    unavailableTitle(assessment.state),
    unavailableDetail(assessment.state),
    "unavailable",
    false,
    false,
  );
}

function assessmentPresentation(
  assessment: FinancialRiskAssessment,
  title: string,
  detail: string,
  resultKind: FinancialRiskAssessmentPresentation["resultKind"],
  current: boolean,
  authoritative: boolean,
): FinancialRiskAssessmentPresentation {
  const presentation = {
    state: assessment.state,
    title,
    detail,
    resultKind,
    current,
    authoritative,
  };
  if ("outputs" in assessment) {
    return { ...presentation, outputs: assessment.outputs };
  }
  return presentation;
}

function unavailableTitle(
  state: Exclude<FinancialRiskAssessmentState, "completed" | "fallback">,
): string {
  if (state === "unavailable") return "Financial risk unavailable";
  if (state === "failed") return "Financial risk calculation failed";
  if (state === "cancelled") return "Financial risk calculation cancelled";
  if (state === "stale") return "Financial risk assessment needs refresh";
  return "Financial risk assessment superseded";
}

function unavailableDetail(
  state: Exclude<FinancialRiskAssessmentState, "completed" | "fallback">,
): string {
  if (state === "unavailable") return "Financial risk is unavailable.";
  if (state === "failed") return "The financial risk calculation failed.";
  if (state === "cancelled") {
    return "The financial risk calculation was cancelled.";
  }
  if (state === "stale") {
    return "Source information changed; refresh before relying on this result.";
  }
  return "A newer assessment is authoritative; this result is not current.";
}

function queuedJobPresentation(
  status: FinancialRiskJobStatus,
): FinancialRiskJobPresentation {
  return pendingJobPresentation(
    status,
    "Queued",
    "The calculation is queued for processing.",
  );
}

function runningJobPresentation(
  status: FinancialRiskJobStatus,
): FinancialRiskJobPresentation {
  return pendingJobPresentation(
    status,
    "In progress",
    "The calculation is still in progress.",
  );
}

function succeededJobPresentation(
  status: FinancialRiskJobStatus,
): FinancialRiskJobPresentation {
  return terminalJobPresentation(
    status,
    "succeeded",
    "Calculation complete",
    "Refresh the assessment to view the resulting state.",
  );
}

function cancelledJobPresentation(
  status: FinancialRiskJobStatus,
): FinancialRiskJobPresentation {
  return terminalJobPresentation(
    status,
    "cancelled",
    "Calculation cancelled",
    "No current assessment result was produced by this calculation.",
  );
}

function failedJobPresentation(
  status: FinancialRiskJobStatus,
): FinancialRiskJobPresentation {
  return terminalJobPresentation(
    status,
    "failed",
    "Calculation failed",
    "No current assessment result was produced by this calculation.",
  );
}

type PendingJobPresentation = Extract<
  FinancialRiskJobPresentation,
  { state: "pending" }
>;
type TerminalJobPresentation = Extract<
  FinancialRiskJobPresentation,
  { state: "succeeded" | "failed" | "cancelled" }
>;

function pendingJobPresentation(
  status: FinancialRiskJobStatus,
  title: PendingJobPresentation["title"],
  detail: string,
): PendingJobPresentation {
  return {
    state: "pending",
    title,
    detail,
    jobState: status.state,
    progress: status.progress,
  };
}

function terminalJobPresentation(
  status: FinancialRiskJobStatus,
  state: TerminalJobPresentation["state"],
  title: TerminalJobPresentation["title"],
  detail: string,
): TerminalJobPresentation {
  return {
    state,
    title,
    detail,
    jobState: status.state,
    progress: status.progress,
  } as TerminalJobPresentation;
}
