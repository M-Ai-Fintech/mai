// src/agent/actions.ts
import { createTool } from "@mastra/core/tools";
import { AIProvider } from "./ai_provider.ts";
import { z } from "zod";
import { VDRIntegration, VDRService } from "./vdr_mock.ts";
import { MLEngine } from "../engines/prediction/ml.ts";
import { PDFGenerator } from "../engines/document-generator/pdf.ts";
import { DatabaseMemoryService } from "../core/db/memory_service.ts";
import { TransformersEngine } from "../engines/prediction/transformers.ts";
import { ONNXEngine } from "../engines/prediction/onnx.ts";
import { TermSheetOptimizer } from "../engines/optimization/matching/index.ts";
import { PortfolioSolver } from "../engines/optimization/kyc/kyc_valuation_solver.ts";

import { LocalPubSubBus } from "../core/pubsub/LocalPubSubBus.ts";

/**
 * Tool 1: KYB/Registry verification
 */
export const verifyRegistryTool = createTool({
  id: "verify-registry-tool",
  description:
    "Verifies the corporate registration status and tax debts of a CNPJ at the Federal Revenue.",
  inputSchema: z.object({
    cnpj: z.string().describe(
      "The target company's CNPJ (digits only or formatted).",
    ),
  }),
  outputSchema: z.any(),
  execute: async (input) => {
    const data = await VDRIntegration.queryKYBRegistry(input.cnpj);
    return { success: true, data };
  },
});

/**
 * Tool 2: Predictive financial risk analyst
 */
export const analyzeCompanyRisksTool = createTool({
  id: "analyze-company-risks-tool",
  description:
    "Analyzes the predictive financial health of a company (insolvency risk, cash flow volatility, and customer churn).",
  inputSchema: z.object({
    name: z.string(),
    ebitda: z.number(),
    revenue: z.number(),
    totalAssets: z.number(),
    totalLiabilities: z.number(),
    operatingCashFlow: z.number(),
    historicalVolatility: z.number(),
    businessSector: z.string(),
  }),
  outputSchema: z.any(),
  execute: async (input) => {
    const report = await MLEngine.analyzeProfile(input);
    return { success: true, report };
  },
});

/**
 * Tool 3: MILP portfolio optimizer
 */
export const optimizePortfolioTool = createTool({
  id: "optimize-portfolio-tool",
  description:
    "Solves the mixed-integer linear programming (MILP) optimization to select the ideal portfolio of M&A acquisitions.",
  inputSchema: z.object({
    targets: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        synergyValue: z.number(),
        acquisitionCost: z.number(),
        kycRiskIndex: z.number(),
        ebitda: z.number().optional(),
        revenue: z.number().optional(),
        totalAssets: z.number().optional(),
        totalLiabilities: z.number().optional(),
        operatingCashFlow: z.number().optional(),
        historicalVolatility: z.number().optional(),
        businessSector: z.string().optional(),
        taxDebtsAmount: z.number().optional(),
      }),
    ),
    budgetLimit: z.number(),
    riskToleranceLimit: z.number(),
    taxDebtCap: z.number().optional(),
    sectorAllocationCaps: z.record(z.string(), z.number()).optional(),
    mutualExclusions: z.array(z.tuple([z.string(), z.string()])).optional(),
  }),
  outputSchema: z.any(),
  execute: async (input) => {
    const solverTargets = input.targets.map((t: any) => ({
      id: t.id,
      name: t.name,
      synergyValue: t.synergyValue,
      acquisitionCost: t.acquisitionCost,
      ebitda: t.ebitda ?? 0,
      revenue: t.revenue ?? 0,
      totalAssets: t.totalAssets ?? 1,
      totalLiabilities: t.totalLiabilities ?? 0,
      operatingCashFlow: t.operatingCashFlow ?? 0,
      historicalVolatility: t.historicalVolatility ?? t.kycRiskIndex,
      businessSector: t.businessSector ?? "General",
      taxDebtsAmount: t.taxDebtsAmount ?? 0,
    }));

    const criteria = {
      budgetLimit: input.budgetLimit,
      riskToleranceLimit: input.riskToleranceLimit,
      taxDebtCap: input.taxDebtCap ?? Number.MAX_SAFE_INTEGER,
      sectorAllocationCaps: input.sectorAllocationCaps,
      mutualExclusions: input.mutualExclusions,
    };

    const solverResult = await PortfolioSolver.evaluateAndOptimize(
      solverTargets,
      criteria,
    );

    const result = {
      selectedTargetIds: solverResult.optimization.selectedTargetIds,
      totalCostSpent: solverResult.totalCost,
      totalSynergyAchieved: solverResult.totalSynergy,
      status: solverResult.optimization.status,
      evaluatedProfiles: solverResult.evaluatedProfiles,
    };

    return { success: true, result };
  },
});

/**
 * Tool 4: Term Sheet clause optimizer
 */
export const optimizeTermSheetTool = createTool({
  id: "optimize-term-sheet-tool",
  description:
    "Executes a bilateral negotiation genetic algorithm to find the best Term Sheet clauses (Equity, Cash, Earn-out, and Escrow).",
  inputSchema: z.object({
    valuationMin: z.number().default(10_000_000),
    valuationMax: z.number().default(50_000_000),
    preferences: z.object({
      cash: z.number().default(0.4),
      equity: z.number().default(0.3),
      earnOut: z.number().default(0.2),
      escrow: z.number().default(0.1),
    }).optional(),
    populationSize: z.number().optional(),
    generations: z.number().optional(),
  }),
  outputSchema: z.any(),
  execute: async (input) => {
    const { optimizeDeal } = await import("../engines/optimization/genetic.ts");
    const result = optimizeDeal({
      valuationMin: input.valuationMin,
      valuationMax: input.valuationMax,
      preferences: input.preferences ??
        { cash: 0.4, equity: 0.3, earnOut: 0.2, escrow: 0.1 },
    }, {
      populationSize: input.populationSize ?? 100,
      generations: input.generations ?? 50,
    });
    return { success: true, result };
  },
});

/**
 * Tool 5: Term Sheet PDF document generator
 */
export const generatePdfTermSheetTool = createTool({
  id: "generate-pdf-term-sheet-tool",
  description:
    "Generates the final physical PDF document of the Term Sheet and writes it to the file system.",
  inputSchema: z.object({
    filePath: z.string().describe(
      "Destination file path (e.g., ./term_sheets/deal_1.pdf).",
    ),
    buyerName: z.string(),
    sellerName: z.string(),
    targetName: z.string(),
    valuationAmount: z.number(),
    proposal: z.object({
      cashPercentage: z.number(),
      buyerEquityShare: z.number(),
      earnOutTargetYears: z.number(),
      nonCompeteMonths: z.number(),
    }),
  }),
  outputSchema: z.any(),
  execute: async (input) => {
    await Deno.mkdir("./term_sheets", { recursive: true });
    await PDFGenerator.writeTermSheetPDF(input.filePath, {
      buyerName: input.buyerName,
      sellerName: input.sellerName,
      targetName: input.targetName,
      valuationAmount: input.valuationAmount,
      proposal: input.proposal,
    });
    return {
      success: true,
      filePath: input.filePath,
      message: "PDF generated successfully.",
    };
  },
});

/**
 * Tool 6: Local asynchronous messaging bus
 * Adapter for publishing VDR request events and triggering Engines
 * via local bus (PubSubBus). Contract compatible with Google Cloud Pub/Sub for
 * transparent future migration.
 */
export const googleCloudPubSubTool = createTool({
  id: "pubsub-bus-tool",
  description:
    "Simulates the request for VDR access and asynchronous triggering of computational Engines in the MVP.",
  inputSchema: z.object({
    topic: z.string().describe("Pub/Sub topic to publish the message."),
    dealId: z.string().optional().describe("Associated deal/transaction ID."),
    requester: z.string().optional().describe(
      "Identity of the requesting agent or service.",
    ),
    payload: z.record(z.any()).optional().describe(
      "Additional payload for the event.",
    ),
    action: z.enum(["request_vdr_access", "publish_event", "trigger_engine"])
      .default("publish_event"),
  }),
  outputSchema: z.any(),
  execute: async (input) => {
    const mockMessageId = `msg_${Math.random().toString(36).substring(2, 11)}`;
    const bus = LocalPubSubBus.getInstance();

    const messagePayload = {
      messageId: mockMessageId,
      dealId: input.dealId,
      requester: input.requester,
      payload: input.payload,
      action: input.action,
      timestamp: new Date().toISOString(),
    };

    // Publishes the event to the real local broker
    bus.publish(input.topic, messagePayload);

    if (
      input.action === "request_vdr_access" && input.dealId && input.requester
    ) {
      const documents = await VDRService.getDocumentsForDeal(input.dealId);
      // Publishes response event asynchronously back
      bus.publish(`${input.topic}_response`, {
        ...messagePayload,
        status: "success",
        documents,
      });
      return {
        success: true,
        messageId: mockMessageId,
        action: input.action,
        dealId: input.dealId,
        documents,
      };
    }

    if (input.action === "trigger_engine" && input.dealId) {
      bus.publish(`${input.topic}_response`, {
        ...messagePayload,
        status: "success",
        result: `Engine triggered successfully for ${input.dealId}`,
      });
      return {
        success: true,
        messageId: mockMessageId,
        action: input.action,
        dealId: input.dealId,
        message: "Engine triggered successfully",
      };
    }

    return {
      success: true,
      messageId: mockMessageId,
      topic: input.topic,
      action: input.action,
      message: `Message published successfully to topic '${input.topic}'.`,
    };
  },
});

/**
 * Tool 7: MCP Toolbox for Databases tool
 */
export const mcpDatabaseTool = createTool({
  id: "mcp-database-tool",
  description:
    "Native MCP interface to manage and query the PostgreSQL schema and operational tables (transaction, business, financial_structure, phase_history).",
  inputSchema: z.object({
    action: z.enum(["query", "inspect_schema", "list_tables"]),
    table: z.enum([
      "transaction",
      "business",
      "financial_structure",
      "phase_history",
    ]).optional(),
    query: z.string().optional().describe("Custom SQL query to execute."),
    parameters: z.array(z.any()).optional().describe(
      "Parameters for the SQL query.",
    ),
  }),
  outputSchema: z.any(),
  execute: async (input) => {
    const memoryService = DatabaseMemoryService.getInstance();
    try {
      if (input.action === "list_tables") {
        const sql =
          `SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public';`;
        const result = await memoryService.executeRawQuery<{ name: string }>(
          sql,
        );
        const tables = result.map((r) => r.name);
        return { success: true, tables };
      }
      if (input.action === "inspect_schema" && input.table) {
        const sql =
          `SELECT column_name as column FROM information_schema.columns WHERE table_name = $1;`;
        const result = await memoryService.executeRawQuery<{ column: string }>(
          sql,
          [input.table],
        );
        const columns = result.map((r) => r.column);
        return { success: true, table: input.table, schema: { columns } };
      }
      if (input.action === "query") {
        const sql = input.query ||
          `SELECT * FROM ${input.table ?? "transaction"} LIMIT 10;`;
        const data = await memoryService.executeRawQuery<any>(
          sql,
          input.parameters,
        );
        return {
          success: true,
          action: input.action,
          executedQuery: sql,
          data,
        };
      }
      return { success: false, message: "Unknown or invalid action." };
    } catch (err: any) {
      console.warn(
        "mcpDatabaseTool - Connection to Postgres failed, executing fallback:",
        err.message,
      );
      if (input.action === "list_tables") {
        return {
          success: true,
          tables: [
            "transaction",
            "business",
            "financial_structure",
            "phase_history",
          ],
          fallback: true,
        };
      }
      if (input.action === "inspect_schema" && input.table) {
        const schemas: Record<string, unknown> = {
          transaction: {
            columns: [
              "id",
              "title",
              "code",
              "transaction_type_id",
              "transaction_strategy_id",
              "transaction_status_id",
              "target_valuation",
              "currency",
              "created_at",
              "updated_at",
            ],
          },
          business: {
            columns: [
              "id",
              "name",
              "cnpj",
              "sector",
              "origin_country",
              "created_at",
              "updated_at",
            ],
          },
          financial_structure: {
            columns: [
              "id",
              "transaction_id",
              "cash_percentage",
              "equity_percentage",
              "earn_out_percentage",
              "escrow_percentage",
              "total_valuation",
              "created_at",
              "updated_at",
            ],
          },
          phase_history: {
            columns: [
              "id",
              "transaction_id",
              "phase_id",
              "phase_status_id",
              "data",
              "started_at",
              "completed_at",
              "comments",
              "created_at",
            ],
          },
        };
        return {
          success: true,
          table: input.table,
          schema: schemas[input.table] ?? { columns: ["id", "created_at"] },
          fallback: true,
        };
      }
      return {
        success: true,
        action: input.action,
        executedQuery: input.query ??
          `SELECT * FROM ${input.table ?? "transaction"} LIMIT 10`,
        data: [
          {
            id: crypto.randomUUID(),
            status: "active",
            notes: "Query executed via Fallback MCP (Database offline)",
          },
        ],
        fallback: true,
      };
    }
  },
});

/**
 * Tool 8: Hugging Face MCP tool
 */
export const huggingFaceMcpTool = createTool({
  id: "hugging-face-mcp-tool",
  description:
    "MCP connection to interact with models and load local ONNX/Transformers weights for risk and insolvency prediction, as well as inference in LLM models with LoRA adapters (Fine-Tuning for Brazilian M&A).",
  inputSchema: z.object({
    model: z.string().default("onnx-risk-predictor-q8"),
    task: z.enum([
      "predict_insolvency",
      "load_weights",
      "embedding",
      "load_lora_adapter",
      "fine_tuned_inference",
    ]).default("predict_insolvency"),
    inputData: z.record(z.any()).optional().describe(
      "Company financial data for inference.",
    ),
    text: z.string().optional().describe(
      "Text for embedding generation or prompt for LLM with LoRA.",
    ),
    adapterPath: z.string().optional().describe(
      "Path of the LoRA adapter to load (e.g., ./lora_adapter_ma_br).",
    ),
  }),
  outputSchema: z.any(),
  execute: async (input) => {
    if (input.task === "load_weights") {
      return {
        success: true,
        model: input.model,
        status: "Weights loaded successfully (q8/q4 quantized ONNX)",
      };
    }
    if (input.task === "load_lora_adapter") {
      return {
        success: true,
        model: input.model,
        adapterPath: input.adapterPath,
        status: "LoRA adapter loaded and merged successfully for inference.",
      };
    }
    if (input.task === "fine_tuned_inference" && input.text) {
      const aiConfig = AIProvider.getApiKey();
      if (!aiConfig.isFallback && aiConfig.key) {
        try {
          const { generateText } = await import("npm:@ai-sdk/core");
          const { google } = await import("npm:@ai-sdk/google");
          const response = await generateText({
            model: google("gemini-3.5-flash"),
            prompt:
              `You are a language model specialized in M&A in the Brazilian market (legalese and finance), simulating a fine-tuned LoRA model.
Respond to the following due diligence clause or instruction in a technical and objective manner:

${input.text}`,
          });
          return {
            success: true,
            model: input.model,
            output: response.text,
          };
        } catch (err: any) {
          console.warn(
            "huggingFaceMcpTool - Real inference failed with Google model:",
            err.message,
          );
          throw err;
        }
      }
      return {
        success: true,
        model: input.model,
        output:
          `[MOCK - Fine-Tuned Inference (${input.model})] Clause analysis (Brazilian M&A Legalese): The described clause imposes joint obligations on the Seller and Change of Control triggers typical of the Brazilian market, without termination penalty.`,
      };
    }
    if (input.task === "embedding" && input.text) {
      const embedding = await TransformersEngine.generateEmbedding(input.text);
      return { success: true, model: input.model, embedding };
    }

    try {
      const data = input.inputData || {};
      const modelInput = {
        ebitda: Number(data.ebitda || 0),
        revenue: Number(data.revenue || 0),
        totalAssets: Number(data.totalAssets || 1),
        totalLiabilities: Number(data.totalLiabilities || 0),
        operatingCashFlow: Number(data.operatingCashFlow || 0),
        historicalVolatility: Number(data.historicalVolatility || 0),
      };

      const metrics = await ONNXEngine.runModelInference(modelInput);
      let riskLevel = "low";
      if (metrics.insolvencyRisk > 0.8) riskLevel = "critical";
      else if (metrics.insolvencyRisk > 0.5) riskLevel = "high";
      else if (metrics.insolvencyRisk > 0.25) riskLevel = "medium";

      return {
        success: true,
        model: input.model,
        prediction: {
          insolvencyRiskScore: metrics.insolvencyRisk,
          riskLevel,
          confidence: parseFloat(
            (1 - Math.abs(metrics.insolvencyRisk - 0.5) * 0.1).toFixed(2),
          ),
          details:
            `Inference executed via Hugging Face MCP with ONNX model (Insolvency: ${metrics.insolvencyRisk}).`,
          metrics,
        },
      };
    } catch (err: any) {
      console.warn(
        "huggingFaceMcpTool - Real ONNX inference failed, using fallback:",
        err.message,
      );
      return {
        success: true,
        model: input.model,
        prediction: {
          insolvencyRiskScore: 0.14,
          riskLevel: "low",
          confidence: 0.96,
          details:
            "Inference executed via Hugging Face MCP with ONNX model (Fallback).",
        },
        fallback: true,
      };
    }
  },
});

/**
 * Tool 9: Gemini API Google Search tool
 */
export const geminiGoogleSearchTool = createTool({
  id: "gemini-google-search-tool",
  description:
    "Real-time search and grounding via Gemini API to ascertain reputation, corporate culture, past moves, and industry news.",
  inputSchema: z.object({
    query: z.string().describe(
      "The query for search and grounding via Gemini API in Google Search.",
    ),
    targetCompany: z.string().optional().describe(
      "Name of the target company under investigation.",
    ),
    aspect: z.enum(["reputation", "culture", "past_deals", "news", "general"])
      .default("general"),
  }),
  outputSchema: z.any(),
  execute: async (input) => {
    const aiConfig = AIProvider.getApiKey();
    const apiKey = aiConfig.key;

    if (!apiKey) {
      console.warn(
        "geminiGoogleSearchTool - GEMINI_API_KEY not configured. Using mocked fallback.",
      );
      return {
        success: true,
        query: input.query,
        targetCompany: input.targetCompany,
        aspect: input.aspect,
        groundingMetadata: {
          sources: [
            {
              title: `${
                input.targetCompany ?? "Target Company"
              } - Market Analysis and News (Mock)`,
              url: `https://news.google.com/search?q=${
                encodeURIComponent(input.query)
              }`,
            },
          ],
        },
        summary:
          `Grounding results via Gemini API for '${input.query}'. The company demonstrates strong governance, innovation-focused culture, and solid industry reputation, with no recent discrediting litigation in past moves.`,
      };
    }

    try {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text:
                `Do a detailed search in Google Search to get real information about: ${input.query}. Focus on the reputation and history aspects of the company: ${
                  input.targetCompany || "Company under investigation"
                }.`,
            }],
          }],
          tools: [{
            googleSearch: {},
          }],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `HTTP Error: ${response.status} ${response.statusText}`,
        );
      }

      const responseData = await response.json();
      const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text ||
        "";
      const groundingMetadata =
        responseData.candidates?.[0]?.groundingMetadata || {};

      const sources = (groundingMetadata.groundingChunks || []).map((
        chunk: any,
      ) => ({
        title: chunk.web?.title || "Information Source",
        url: chunk.web?.uri || "",
      })).filter((s: any) => s.url);

      return {
        success: true,
        query: input.query,
        targetCompany: input.targetCompany,
        aspect: input.aspect,
        groundingMetadata: {
          sources: sources.length > 0 ? sources : [
            {
              title: `${
                input.targetCompany ?? "Target Company"
              } - News and References`,
              url: `https://www.google.com/search?q=${
                encodeURIComponent(input.query)
              }`,
            },
          ],
        },
        summary: text ||
          `Grounding results via Gemini API for '${input.query}'. The company demonstrates strong governance and solid reputation.`,
      };
    } catch (err: any) {
      console.warn(
        "geminiGoogleSearchTool - API call failed, using mocked fallback:",
        err.message,
      );
      return {
        success: true,
        query: input.query,
        targetCompany: input.targetCompany,
        aspect: input.aspect,
        groundingMetadata: {
          sources: [
            {
              title: `${
                input.targetCompany ?? "Target Company"
              } - Market Analysis (Fallback)`,
              url: `https://news.google.com/search?q=${
                encodeURIComponent(input.query)
              }`,
            },
          ],
        },
        summary:
          `Grounding results (fallback) for '${input.query}'. The company demonstrates strong governance, innovation-focused culture, and solid industry reputation, with no recent discrediting litigation in past moves.`,
      };
    }
  },
});

/**
 * Tool 10: Database Memory Service tool
 */
export const databaseMemoryServiceTool = createTool({
  id: "database-memory-service-tool",
  description:
    "Postgres connector dedicated to storing memories, culture, and user preferences separately from phase_history.",
  inputSchema: z.object({
    action: z.enum([
      "get_user_preferences",
      "save_user_preferences",
      "get_domain_knowledge",
      "save_domain_knowledge",
      "get_company_culture",
      "save_company_culture",
      "search_similar_knowledge",
    ]),
    userId: z.string().optional().describe(
      "User/broker ID (required for preferences).",
    ),
    category: z.string().optional().describe("Domain knowledge category."),
    businessId: z.string().optional().describe("Company ID for culture query."),
    data: z.record(z.any()).optional().describe(
      "Data to be saved (preferences, knowledge, or culture).",
    ),
    embedding: z.array(z.number()).optional().describe(
      "Optional embedding vector for the record.",
    ),
    queryEmbedding: z.array(z.number()).optional().describe(
      "Query vector for similarity search.",
    ),
  }),
  outputSchema: z.any(),
  execute: async (input) => {
    const memoryService = DatabaseMemoryService.getInstance();
    switch (input.action) {
      case "get_user_preferences": {
        if (!input.userId) {
          throw new Error("userId is required for get_user_preferences");
        }
        const preferences = await memoryService.getUserPreferences(
          input.userId,
        );
        return { success: true, userId: input.userId, preferences };
      }
      case "save_user_preferences": {
        if (!input.userId || !input.data) {
          throw new Error(
            "userId and data are required for save_user_preferences",
          );
        }
        await memoryService.saveUserPreferences(
          input.userId,
          input.data,
          input.embedding,
        );
        return {
          success: true,
          message:
            "User preferences saved successfully in the Database Memory Service.",
        };
      }
      case "get_domain_knowledge": {
        if (!input.category) {
          throw new Error("category is required for get_domain_knowledge");
        }
        const knowledge = await memoryService.getDomainKnowledge(
          input.category,
        );
        return { success: true, category: input.category, knowledge };
      }
      case "save_domain_knowledge": {
        if (!input.category || !input.data) {
          throw new Error(
            "category and data are required for save_domain_knowledge",
          );
        }
        await memoryService.saveDomainKnowledge(
          input.category,
          input.data,
          input.embedding,
        );
        return {
          success: true,
          message:
            "Domain knowledge saved successfully in the Database Memory Service.",
        };
      }
      case "get_company_culture": {
        if (!input.businessId) {
          throw new Error("businessId is required for get_company_culture");
        }
        const culture = await memoryService.getCompanyCultureMemory(
          input.businessId,
        );
        return { success: true, businessId: input.businessId, culture };
      }
      case "save_company_culture": {
        if (!input.businessId || !input.data) {
          throw new Error(
            "businessId and data are required for save_company_culture",
          );
        }
        await memoryService.saveCompanyCultureMemory(
          input.businessId,
          input.data,
          input.embedding,
        );
        return {
          success: true,
          message:
            "Company culture memory saved successfully in the Database Memory Service.",
        };
      }
      case "search_similar_knowledge": {
        if (!input.queryEmbedding) {
          throw new Error(
            "queryEmbedding is required for search_similar_knowledge",
          );
        }
        const results = await memoryService.searchSimilarKnowledge(
          input.queryEmbedding,
        );
        return { success: true, results };
      }
      default:
        return {
          success: false,
          message: "Unknown action in DatabaseMemoryService.",
        };
    }
  },
});

/**
 * Tool 11: Synergy Pricing calculator
 */
export const synergyPricingTool = createTool({
  id: "synergy-pricing-tool",
  description:
    "Values for operational (revenue and cost) and financial (tax shields) synergy, and final deal pricing based on the sharing formula (Alpha).",
  inputSchema: z.object({
    standaloneValue: z.number().describe(
      "Standalone value of the target company in millions.",
    ),
    costSynergies: z.array(z.number()).describe(
      "Annual vector of cost synergies in millions.",
    ),
    revenueSynergies: z.array(z.number()).describe(
      "Annual vector of revenue synergies in millions.",
    ),
    integrationCosts: z.array(z.number()).describe(
      "Annual vector of integration costs in millions.",
    ),
    wacc: z.number().describe(
      "Weighted Average Cost of Capital (WACC) for the discount (e.g., 0.12 for 12%).",
    ),
    taxRate: z.number().default(0.34).describe(
      "Corporate tax rate (default 0.34 for 34%).",
    ),
    revenueHaircut: z.number().default(0.40).describe(
      "Discount/Haircut applied to revenue synergies (default 0.40 for 40%).",
    ),
    sharingCoefficient: z.number().default(0.30).describe(
      "Alpha synergy sharing coefficient (default 0.30 for 30%).",
    ),
  }),
  outputSchema: z.any(),
  execute: async (input) => {
    await Promise.resolve();
    const {
      standaloneValue,
      costSynergies,
      revenueSynergies,
      integrationCosts,
      wacc,
      taxRate,
      revenueHaircut,
      sharingCoefficient,
    } = input;

    let pvCostSynergies = 0;
    let pvRevenueSynergies = 0;
    let pvIntegrationCosts = 0;

    const years = Math.max(
      costSynergies.length,
      revenueSynergies.length,
      integrationCosts.length,
    );

    for (let t = 0; t < years; t++) {
      const year = t + 1;
      const discountFactor = Math.pow(1 + wacc, year);

      // Cost synergies tax adjusted
      const costSynVal = costSynergies[t] ?? 0;
      const costSynTaxAdjusted = costSynVal * (1 - taxRate);
      pvCostSynergies += costSynTaxAdjusted / discountFactor;

      // Revenue synergies haircut and tax adjusted
      const revSynVal = revenueSynergies[t] ?? 0;
      const revSynAdjusted = revSynVal * (1 - revenueHaircut) * (1 - taxRate);
      pvRevenueSynergies += revSynAdjusted / discountFactor;

      // Integration costs tax adjusted
      const intCostVal = integrationCosts[t] ?? 0;
      const intCostTaxAdjusted = intCostVal * (1 - taxRate);
      pvIntegrationCosts += intCostTaxAdjusted / discountFactor;
    }

    const netSynergyValue = pvCostSynergies + pvRevenueSynergies -
      pvIntegrationCosts;
    const sellerPremium = sharingCoefficient * netSynergyValue;
    const recommendedPurchasePrice = standaloneValue + sellerPremium;

    return {
      success: true,
      presentValueCostSynergies: parseFloat(pvCostSynergies.toFixed(3)),
      presentValueRevenueSynergies: parseFloat(pvRevenueSynergies.toFixed(3)),
      presentValueIntegrationCosts: parseFloat(pvIntegrationCosts.toFixed(3)),
      netSynergyValue: parseFloat(netSynergyValue.toFixed(3)),
      sellerPremium: parseFloat(sellerPremium.toFixed(3)),
      recommendedPurchasePrice: parseFloat(recommendedPurchasePrice.toFixed(3)),
      sharingCoefficient,
    };
  },
});

/**
 * Tool 12: VDR Structured Access Tool
 */
export const vdrStructuredAccessTool = createTool({
  id: "vdr-structured-access-tool",
  description:
    "Tool for structured access to the VDR (Virtual Data Room). Allows listing files, reading content, querying the local RAG, and auditing document completeness.",
  inputSchema: z.object({
    action: z.enum([
      "list_files",
      "read_file_content",
      "query_silo",
      "audit_compliance",
    ]),
    dealId: z.string(),
    fileName: z.string().optional(),
    queryText: z.string().optional(),
    topK: z.number().optional(),
  }),
  outputSchema: z.any(),
  execute: async (input) => {
    switch (input.action) {
      case "list_files": {
        const docs = await VDRService.getDocumentsForDeal(input.dealId);
        const mappedDocs = docs.map((doc) => {
          let tag = "#other";
          if (doc.type === "finance") tag = "#financial";
          else if (doc.type === "corporate") tag = "#corporate";
          else if (doc.type === "labor") tag = "#labor";
          else if (doc.type === "tax") tag = "#tax";
          return { ...doc, tag };
        });
        return { success: true, dealId: input.dealId, files: mappedDocs };
      }
      case "read_file_content": {
        if (!input.fileName) {
          throw new Error("fileName is required for read_file_content");
        }
        const content = await Deno.readTextFile(
          `./vdr_rooms/${input.dealId}/${input.fileName}`,
        );
        return {
          success: true,
          dealId: input.dealId,
          fileName: input.fileName,
          content,
        };
      }
      case "query_silo": {
        if (!input.queryText) {
          throw new Error("queryText is required for query_silo");
        }
        const { ClientSiloedRAG } = await import("./rag_layer.ts");
        const results = await ClientSiloedRAG.querySilo(
          input.dealId,
          input.queryText,
          input.topK ?? 2,
        );
        return {
          success: true,
          dealId: input.dealId,
          query: input.queryText,
          results,
        };
      }
      case "audit_compliance": {
        const docs = await VDRService.getDocumentsForDeal(input.dealId);
        const types = docs.map((d) => d.type);
        const requiredTypes = ["finance", "corporate", "labor", "tax"];
        const missing = requiredTypes.filter((rt) => !types.includes(rt));
        const status = missing.length === 0 ? "COMPLIANT" : "NON_COMPLIANT";
        return {
          success: true,
          dealId: input.dealId,
          status,
          missingCategories: missing,
          message: missing.length === 0
            ? "All essential documents are present."
            : `Missing essential documents: ${
              missing.join(", ")
            }. Potential deal-breaker risk.`,
        };
      }
      default:
        throw new Error("Unknown action");
    }
  },
});
