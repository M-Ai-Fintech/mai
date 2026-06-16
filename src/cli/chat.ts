// src/cli/chat.ts
import { AgentOrchestrator } from "../agent/Mastra.ts";
import { ClientSiloedRAG } from "../agent/rag-layer.ts";
import { ContinuousLearningEngine } from "../agent/continuous_learning.ts";

export class CLIChat {
  /**
   * Starts an interactive chat loop with the M&A Broker Agent.
   */
  public static async startSession(dealId = "deal_default"): Promise<void> {
    console.log("\n============================================================");
    console.log(" M&A BROKER AGENT - SESSÃO DE CHAT INTERATIVA");
    console.log("============================================================");
    console.log(`ID do Deal:   ${dealId}`);
    console.log(`Instruções: Digite suas perguntas sobre o deal.`);
    console.log(`Comandos especiais:`);
    console.log(`- 'ajuste' ou 'corrigir': Grava correções do especialista (Aprendizado Contínuo).`);
    console.log(`- 'rag': Mostra os documentos indexados no VDR.`);
    console.log(`- 'sair': Encerra a sessão de chat.`);
    console.log("============================================================\n");

    // 1. Initialize Siloed RAG for this deal
    console.log("Carregando e indexando documentos do VDR local...");
    const chunksCount = await ClientSiloedRAG.initializeSilo(dealId, `./vdr_rooms/${dealId}`);
    console.log(`[RAG] VDR pronto. ${chunksCount} trechos indexados.`);
    console.log("Agente pronto! Como posso ajudar você hoje?\n");

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
      if (cmd === "sair" || cmd === "exit" || cmd === "quit") {
        console.log("\nSessão encerrada. Até logo!");
        break;
      }

      // Special Command: Capture Feedback / Continuous Learning
      if (cmd === "ajuste" || cmd === "corrigir") {
        await this.handleCorrectionCapture(dealId);
        continue;
      }

      // Special Command: View indexed VDR chunks
      if (cmd === "rag") {
        console.log("\n--- Trechos de Contexto no VDR ---");
        const queryResults = await ClientSiloedRAG.querySilo(dealId, "financial metrics", 5);
        queryResults.forEach((r, idx) => {
          console.log(`[${idx + 1}] Doc: ${r.document} (Score: ${r.score.toFixed(3)})\n   "${r.text.substring(0, 100)}..."`);
        });
        continue;
      }

      // 2. Standard Query: Search RAG context
      console.log("🤖 Pensando...");
      const searchResults = await ClientSiloedRAG.querySilo(dealId, input, 2);
      const ragContext = searchResults.map(r => `[Do documento ${r.document}] ${r.text}`).join("\n");

      // 3. Execute query on agent
      const reply = await AgentOrchestrator.executeAgentQuery(dealId, input, ragContext);
      
      console.log(`\n🤖 M&A Broker Agent >\n${reply}\n`);
    }
  }

  /**
   * Helper to prompt and capture human specialist feedback.
   */
  private static async handleCorrectionCapture(dealId: string): Promise<void> {
    console.log("\n--- Capturar Feedback do Especialista (Aprendizado Contínuo) ---");
    const decoder = new TextDecoder();
    const buffer = new Uint8Array(1024);

    const askQuestion = (q: string): string => {
      Deno.stdout.writeSync(new TextEncoder().encode(q));
      const bytes = Deno.stdin.readSync(buffer);
      return bytes ? decoder.decode(buffer.subarray(0, bytes)).trim() : "";
    };

    const paramName = askQuestion("Selecione a variável a ser corrigida (valuation / cashPercentage / nonCompeteMonths / earnOutTargetYears): ");
    
    if (!["valuation", "cashPercentage", "nonCompeteMonths", "earnOutTargetYears"].includes(paramName)) {
      console.log("❌ Variável inválida. Operação cancelada.");
      return;
    }

    const origStr = askQuestion("Valor original proposto pelo agente: ");
    const corrStr = askQuestion("Valor correto/desejável definido por você: ");
    const reason = askQuestion("Justificativa técnica para o ajuste: ");

    const originalValue = parseFloat(origStr);
    const correctedValue = parseFloat(corrStr);

    if (isNaN(originalValue) || isNaN(correctedValue)) {
      console.log("❌ Os valores informados devem ser numéricos. Operação cancelada.");
      return;
    }

    await ContinuousLearningEngine.recordCorrection({
      dealId,
      variableName: paramName as any,
      originalValue,
      correctedValue,
      reason,
    });

    console.log("✅ Feedback registrado e salvo com sucesso! O agente incorporará esta diretriz nas próximas interações.");
  }
}
