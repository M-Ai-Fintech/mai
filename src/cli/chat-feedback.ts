import { BrokerOrchestratorService } from "../agent/index.ts";
import { JsonObject } from "../shared/json.ts";
import { ChatConsole } from "./chat-console.ts";

interface SpecialistCorrection {
  variableName: string;
  originalValue: number;
  correctedValue: number;
  reason: string;
}

const CORRECTABLE_VARIABLES = [
  "valuation",
  "cashPercentage",
  "nonCompeteMonths",
  "earnOutTargetYears",
];

export async function captureSpecialistCorrection(
  dealId: string,
  chatConsole: ChatConsole,
): Promise<void> {
  console.log("\n--- Capture Specialist Feedback (Continuous Learning) ---");
  const correction = promptSpecialistCorrection(chatConsole);
  if (!correction) return;
  const submission = await submitSpecialistCorrection(dealId, correction);
  await resolveCorrectionResult(submission, chatConsole);
}

async function submitSpecialistCorrection(
  dealId: string,
  correction: SpecialistCorrection,
): Promise<CorrectionSubmission> {
  const service = new BrokerOrchestratorService();
  const feedback = correctionPayload(dealId, correction);
  const feedbackText = correctionNarrative(dealId, correction);
  const result = await service.processUserCorrection(
    "default_user",
    "user_preference",
    "adjustments",
    feedback,
    feedbackText,
  );
  return { service, feedback, feedbackText, result };
}

function promptSpecialistCorrection(
  chatConsole: ChatConsole,
): SpecialistCorrection | undefined {
  const variableName = chatConsole.ask(
    "Select the variable to be corrected (valuation / cashPercentage / nonCompeteMonths / earnOutTargetYears): ",
  );
  if (!CORRECTABLE_VARIABLES.includes(variableName)) {
    console.log("❌ Invalid variable. Operation cancelled.");
    return undefined;
  }
  return parseCorrectionValues(variableName, chatConsole);
}

function parseCorrectionValues(
  variableName: string,
  chatConsole: ChatConsole,
): SpecialistCorrection | undefined {
  const originalValue = parseFloat(
    chatConsole.ask("Original value proposed by the agent: "),
  );
  const correctedValue = parseFloat(
    chatConsole.ask("Correct/desired value defined by you: "),
  );
  const reason = chatConsole.ask(
    "Technical justification for the adjustment: ",
  );
  if (Number.isNaN(originalValue) || Number.isNaN(correctedValue)) {
    console.log("❌ The provided values must be numeric. Operation cancelled.");
    return undefined;
  }
  return { variableName, originalValue, correctedValue, reason };
}

function correctionPayload(
  dealId: string,
  correction: SpecialistCorrection,
): JsonObject {
  return {
    dealId,
    variableName: correction.variableName,
    originalValue: correction.originalValue,
    correctedValue: correction.correctedValue,
    reason: correction.reason,
    requiresHitlApproval: false,
    hitlApproved: false,
  };
}

function correctionNarrative(
  dealId: string,
  correction: SpecialistCorrection,
): string {
  return `The specialist corrected the ${correction.variableName} from ${correction.originalValue} to ${correction.correctedValue} for deal ${dealId} because: ${correction.reason}.`;
}

type CorrectionResult = Awaited<
  ReturnType<BrokerOrchestratorService["processUserCorrection"]>
>;

interface CorrectionSubmission {
  service: BrokerOrchestratorService;
  feedback: JsonObject;
  feedbackText: string;
  result: CorrectionResult;
}

async function resolveCorrectionResult(
  submission: CorrectionSubmission,
  chatConsole: ChatConsole,
): Promise<void> {
  if (!submission.result.conflict) {
    console.log(
      "✅ Feedback registered and saved successfully! The agent will incorporate this guideline in future interactions.",
    );
    return;
  }
  await requestConflictOverride(
    submission,
    chatConsole,
  );
}

async function requestConflictOverride(
  submission: CorrectionSubmission,
  chatConsole: ChatConsole,
): Promise<void> {
  console.log(
    `\n⚠️  [COMPLIANCE_CONFLICT] Conflict detected: ${submission.result.conflictReason}`,
  );
  const approval = chatConsole.ask(
    "Do you wish to force the recording of this preference even under compliance conflict (HITL)? (y/n): ",
  );
  if (approval.toLowerCase() !== "y") {
    console.log("❌ Recording cancelled by user due to compliance conflict.");
    return;
  }
  await recordApprovedCorrection(submission);
}

async function recordApprovedCorrection(
  submission: CorrectionSubmission,
): Promise<void> {
  submission.feedback.requiresHitlApproval = false;
  submission.feedback.hitlApproved = true;
  await submission.service.processUserCorrection(
    "default_user",
    "user_preference",
    "adjustments",
    submission.feedback,
    submission.feedbackText,
  );
  console.log(
    "✅ Feedback registered and saved successfully with manual HITL approval.",
  );
}
