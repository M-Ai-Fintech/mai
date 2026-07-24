import {
  AgentOrchestrator,
  BrokerOrchestratorService,
  ComplianceConflictError,
} from "../agent/index.ts";
import { ClientSiloedRAG } from "../agent/rag_layer.ts";

export class CLIChat {
  /**
   * Starts an interactive chat loop with the M&A Broker Agent.
   */
  public static async startSession(dealId = "deal_default"): Promise<void> {
    console.log(
      "\n============================================================",
    );
    console.log(" M&A BROKER AGENT - INTERACTIVE CHAT SESSION");
    console.log("============================================================");
    console.log(`Deal ID:   ${dealId}`);
    console.log(`Instructions: Type your questions about the deal.`);
    console.log(`Special commands:`);
    console.log(
      `- 'adjust' or 'correct': Records specialist corrections (Continuous Learning).`,
    );
    console.log(`- 'rag': Shows indexed documents in the VDR.`);
    console.log(`- 'exit': Ends the chat session.`);
    console.log(
      "============================================================\n",
    );

    // 1. Initialize Siloed RAG for this deal
    console.log("Loading and indexing local VDR documents...");
    const chunksCount = await ClientSiloedRAG.initializeSilo(
      dealId,
      `./vdr_rooms/${dealId}`,
    );
    console.log(`[RAG] VDR ready. ${chunksCount} chunks indexed.`);
    console.log("Agent ready! How can I help you today?\n");

    const decoder = new TextDecoder();
    const buffer = new Uint8Array(1024);

    while (true) {
      // Print prompt marker
      Deno.stdout.writeSync(new TextEncoder().encode("\n👤 M&A Partner > "));

      const bytesRead = Deno.stdin.readSync(buffer);
      if (bytesRead === null) break;

      const input = decoder.decode(buffer.subarray(0, bytesRead)).trim();

      if (!input) continue;

      const cmd = input.toLowerCase();
      if (cmd === "exit" || cmd === "quit") {
        console.log("\nSession ended. See you later!");
        break;
      }

      // Special Command: Capture Feedback / Continuous Learning
      if (cmd === "adjust" || cmd === "correct") {
        await this.handleCorrectionCapture(dealId);
        continue;
      }

      // Special Command: View indexed VDR chunks
      if (cmd === "rag") {
        console.log("\n--- Context Chunks in VDR ---");
        const queryResults = await ClientSiloedRAG.querySilo(
          dealId,
          "financial metrics",
          5,
        );
        queryResults.forEach((r, idx) => {
          console.log(
            `[${idx + 1}] Doc: ${r.document} (Score: ${
              r.score.toFixed(3)
            })\n   "${r.text.substring(0, 100)}..."`,
          );
        });
        continue;
      }

      // 2. Standard Query: Search RAG context
      console.log("🤖 Thinking...");
      const searchResults = await ClientSiloedRAG.querySilo(dealId, input, 2);
      const ragContext = searchResults.map((r) =>
        `[From document ${r.document}] ${r.text}`
      ).join("\n");

      // 3. Execute query on agent with Compliance Conflict detection
      let reply: string;
      try {
        reply = await AgentOrchestrator.executeAgentQuery(
          dealId,
          input,
          ragContext,
        );
      } catch (err) {
        if (err instanceof ComplianceConflictError) {
          console.warn(
            `\n⚠️  [COMPLIANCE_CONFLICT] Fiduciary compliance conflict: ${err.message}`,
          );
          Deno.stdout.writeSync(
            new TextEncoder().encode(
              "Do you wish to authorize this execution under HITL (manual approval)? (y/n): ",
            ),
          );
          const bytes = Deno.stdin.readSync(buffer);
          const approve = bytes
            ? decoder.decode(buffer.subarray(0, bytes)).trim().toLowerCase()
            : "";
          if (approve === "y") {
            console.log("🔓 Execution authorized via HITL.");
            reply = await AgentOrchestrator.executeAgentQuery(
              dealId,
              input,
              ragContext,
              true,
            );
          } else {
            console.log(
              "❌ Execution blocked due to fiduciary compliance reasons.",
            );
            continue;
          }
        } else {
          console.error("Error during agent execution:", err);
          continue;
        }
      }

      console.log(`\n🤖 M&A Broker Agent >\n${reply}\n`);
    }
  }

  /**
   * Helper to prompt and capture human specialist feedback.
   */
  private static async handleCorrectionCapture(dealId: string): Promise<void> {
    console.log("\n--- Capture Specialist Feedback (Continuous Learning) ---");
    const decoder = new TextDecoder();
    const buffer = new Uint8Array(1024);

    const askQuestion = (q: string): string => {
      Deno.stdout.writeSync(new TextEncoder().encode(q));
      const bytes = Deno.stdin.readSync(buffer);
      return bytes ? decoder.decode(buffer.subarray(0, bytes)).trim() : "";
    };

    const paramName = askQuestion(
      "Select the variable to be corrected (valuation / cashPercentage / nonCompeteMonths / earnOutTargetYears): ",
    );

    if (
      !["valuation", "cashPercentage", "nonCompeteMonths", "earnOutTargetYears"]
        .includes(paramName)
    ) {
      console.log("❌ Invalid variable. Operation cancelled.");
      return;
    }

    const origStr = askQuestion("Original value proposed by the agent: ");
    const corrStr = askQuestion("Correct/desired value defined by you: ");
    const reason = askQuestion("Technical justification for the adjustment: ");

    const originalValue = parseFloat(origStr);
    const correctedValue = parseFloat(corrStr);

    if (isNaN(originalValue) || isNaN(correctedValue)) {
      console.log(
        "❌ The provided values must be numeric. Operation cancelled.",
      );
      return;
    }

    const orchestratorService = new BrokerOrchestratorService();
    const feedbackData: Record<string, any> = {
      dealId,
      variableName: paramName,
      originalValue,
      correctedValue,
      reason,
      requiresHitlApproval: false,
      hitlApproved: false,
    };
    const feedbackText =
      `The specialist corrected the ${paramName} from ${originalValue} to ${correctedValue} for deal ${dealId} because: ${reason}.`;

    const result = await orchestratorService.processUserCorrection(
      "default_user",
      "user_preference",
      "adjustments",
      feedbackData,
      feedbackText,
    );

    if (result.conflict) {
      console.log(
        `\n⚠️  [COMPLIANCE_CONFLICT] Conflict detected: ${result.conflictReason}`,
      );
      const approve = askQuestion(
        "Do you wish to force the recording of this preference even under compliance conflict (HITL)? (y/n): ",
      );
      if (approve.toLowerCase() !== "y") {
        console.log(
          "❌ Recording cancelled by user due to compliance conflict.",
        );
        return;
      }

      feedbackData.requiresHitlApproval = false;
      feedbackData.hitlApproved = true;
      await orchestratorService.processUserCorrection(
        "default_user",
        "user_preference",
        "adjustments",
        feedbackData,
        feedbackText,
      );
      console.log(
        "✅ Feedback registered and saved successfully with manual HITL approval.",
      );
    } else {
      console.log(
        "✅ Feedback registered and saved successfully! The agent will incorporate this guideline in future interactions.",
      );
    }
  }
}
