import { AgentOrchestrator, ComplianceConflictError } from "../agent/index.ts";
import { ClientSiloedRAG } from "../agent/rag_layer.ts";
import { ChatConsole } from "./chat-console.ts";
import { captureSpecialistCorrection } from "./chat-feedback.ts";

type VdrSearchResult = Awaited<
  ReturnType<typeof ClientSiloedRAG.querySilo>
>[number];

interface AgentQuestionContext {
  dealId: string;
  question: string;
  ragContext: string;
}

/**
 * Runs the interactive chat loop for one siloed deal.
 *
 * @example await runChatSession("deal_alpha");
 */
export async function runChatSession(dealId: string): Promise<void> {
  printSessionIntroduction(dealId);
  await initializeDealSilo(dealId);
  const chatConsole = new ChatConsole();
  while (true) {
    const input = readPartnerInput(chatConsole);
    if (input === null) return;
    const shouldContinue = await processPartnerInput(
      dealId,
      input,
      chatConsole,
    );
    if (!shouldContinue) return;
  }
}

function printSessionIntroduction(dealId: string): void {
  console.log("\n============================================================");
  console.log(" M&A BROKER AGENT - INTERACTIVE CHAT SESSION");
  console.log("============================================================");
  console.log(`Deal ID:   ${dealId}`);
  console.log("Instructions: Type your questions about the deal.");
  console.log("Special commands:");
  console.log(
    "- 'adjust' or 'correct': Records specialist corrections (Continuous Learning).",
  );
  console.log("- 'rag': Shows indexed documents in the VDR.");
  console.log("- 'exit': Ends the chat session.");
  console.log("============================================================\n");
}

async function initializeDealSilo(dealId: string): Promise<void> {
  // Initialize Siloed RAG before accepting questions for this deal.
  console.log("Loading and indexing local VDR documents...");
  const chunksCount = await ClientSiloedRAG.initializeSilo(
    dealId,
    `./vdr_rooms/${dealId}`,
  );
  console.log(`[RAG] VDR ready. ${chunksCount} chunks indexed.`);
  console.log("Agent ready! How can I help you today?\n");
}

function readPartnerInput(chatConsole: ChatConsole): string | null {
  chatConsole.write("\n👤 M&A Partner > ");
  const input = chatConsole.readLine();
  if (input === null) return null;
  return input.trim();
}

async function processPartnerInput(
  dealId: string,
  input: string,
  chatConsole: ChatConsole,
): Promise<boolean> {
  if (!input) return true;
  const command = input.toLowerCase();
  const commandResult = await processSessionCommand(
    dealId,
    command,
    chatConsole,
  );
  if (commandResult !== undefined) return commandResult;
  await answerPartnerQuestion(dealId, input, chatConsole);
  return true;
}

async function processSessionCommand(
  dealId: string,
  command: string,
  chatConsole: ChatConsole,
): Promise<boolean | undefined> {
  if (command === "exit" || command === "quit") {
    console.log("\nSession ended. See you later!");
    return false;
  }
  if (command === "adjust" || command === "correct") {
    await captureSpecialistCorrection(dealId, chatConsole);
    return true;
  }
  if (command === "rag") {
    await printIndexedChunks(dealId);
    return true;
  }
  return undefined;
}

async function printIndexedChunks(dealId: string): Promise<void> {
  console.log("\n--- Context Chunks in VDR ---");
  const queryResults = await ClientSiloedRAG.querySilo(
    dealId,
    "financial metrics",
    5,
  );
  queryResults.forEach(printIndexedChunk);
}

function printIndexedChunk(chunk: VdrSearchResult, index: number): void {
  console.log(
    `[${index + 1}] Doc: ${chunk.document} (Score: ${
      chunk.score.toFixed(3)
    })\n   "${chunk.text.substring(0, 100)}..."`,
  );
}

async function answerPartnerQuestion(
  dealId: string,
  question: string,
  chatConsole: ChatConsole,
): Promise<void> {
  console.log("🤖 Thinking...");
  const ragContext = await buildRagContext(dealId, question);
  const reply = await executeAgentQuery(
    { dealId, question, ragContext },
    chatConsole,
  );
  if (reply !== undefined) {
    console.log(`\n🤖 M&A Broker Agent >\n${reply}\n`);
  }
}

async function buildRagContext(
  dealId: string,
  question: string,
): Promise<string> {
  const searchResults = await ClientSiloedRAG.querySilo(dealId, question, 2);
  return searchResults.map((result) =>
    `[From document ${result.document}] ${result.text}`
  ).join("\n");
}

async function executeAgentQuery(
  context: AgentQuestionContext,
  chatConsole: ChatConsole,
): Promise<string | undefined> {
  try {
    return await AgentOrchestrator.executeAgentQuery(
      context.dealId,
      context.question,
      context.ragContext,
    );
  } catch (error) {
    return await resolveAgentError(context, error, chatConsole);
  }
}

async function resolveAgentError(
  context: AgentQuestionContext,
  error: unknown,
  chatConsole: ChatConsole,
): Promise<string | undefined> {
  if (!(error instanceof ComplianceConflictError)) {
    console.error("Error during agent execution:", error);
    return undefined;
  }
  return await resolveComplianceConflict(
    context,
    error,
    chatConsole,
  );
}

async function resolveComplianceConflict(
  context: AgentQuestionContext,
  conflict: ComplianceConflictError,
  chatConsole: ChatConsole,
): Promise<string | undefined> {
  // Compliance conflicts require explicit human authorization before retrying.
  printComplianceConflict(conflict);
  if (!complianceExecutionApproved(chatConsole)) {
    console.log("❌ Execution blocked due to fiduciary compliance reasons.");
    return undefined;
  }
  console.log("🔓 Execution authorized via HITL.");
  return await AgentOrchestrator.executeAgentQuery(
    context.dealId,
    context.question,
    context.ragContext,
    true,
  );
}

function printComplianceConflict(conflict: ComplianceConflictError): void {
  console.warn(
    `\n⚠️  [COMPLIANCE_CONFLICT] Fiduciary compliance conflict: ${conflict.message}`,
  );
}

function complianceExecutionApproved(chatConsole: ChatConsole): boolean {
  const approval = chatConsole.ask(
    "Do you wish to authorize this execution under HITL (manual approval)? (y/n): ",
  );
  return approval.toLowerCase() === "y";
}
