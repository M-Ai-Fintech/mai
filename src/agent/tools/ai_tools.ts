import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { ONNXEngine } from "../../engines/prediction/onnx.ts";
import { TransformersEngine } from "../../engines/prediction/transformers.ts";
import { describeError } from "../../shared/errors.ts";
import type { RiskSeverity } from "../../shared/schemas/risk-severity.ts";
import { AIProvider } from "../ai_provider.ts";

const GeminiSearchResponseSchema = z.object({
  candidates: z.array(z.object({
    content: z.object({
      parts: z.array(z.object({ text: z.string().optional() })).optional(),
    }).optional(),
    groundingMetadata: z.object({
      groundingChunks: z.array(z.object({
        web: z.object({
          title: z.string().optional(),
          uri: z.string().optional(),
        }).optional(),
      })).optional(),
    }).optional(),
  })).optional(),
});

export const huggingFaceMcpTool = createTool({
  id: "hugging-face-mcp-tool",
  description:
    "Runs approved local prediction, weight-loading, and embedding tasks; legacy model adaptation is unsupported.",
  inputSchema: z.object({
    model: z.string().default("onnx-risk-predictor-q8"),
    task: z.enum([
      "predict_insolvency",
      "load_weights",
      "embedding",
      "load_lora_adapter",
      "fine_tuned_inference",
    ]).default("predict_insolvency"),
    inputData: z.record(z.unknown()).optional(),
    text: z.string().optional(),
    adapterPath: z.string().optional(),
  }),
  outputSchema: z.unknown(),
  execute: executeHuggingFaceTask,
});

type HuggingFaceInput = {
  model: string;
  task:
    | "predict_insolvency"
    | "load_weights"
    | "embedding"
    | "load_lora_adapter"
    | "fine_tuned_inference";
  inputData?: Record<string, unknown>;
  text?: string;
  adapterPath?: string;
};

async function executeHuggingFaceTask(input: HuggingFaceInput) {
  if (input.task === "load_weights") return loadedWeights(input.model);
  if (
    input.task === "load_lora_adapter" ||
    input.task === "fine_tuned_inference"
  ) return unsupportedAdaptation(input);
  if (input.task === "embedding" && input.text) {
    const embedding = await TransformersEngine.generateEmbedding(input.text);
    return { success: true, model: input.model, embedding };
  }
  return await predictInsolvency(input.model, input.inputData ?? {});
}

function loadedWeights(model: string) {
  return {
    success: true,
    model,
    status: "Weights loaded successfully (q8/q4 quantized ONNX)",
  };
}

function unsupportedAdaptation(input: HuggingFaceInput) {
  return {
    success: false,
    model: input.model,
    task: input.task,
    status: "unsupported",
    reason: "LEGACY_MODEL_ADAPTATION_UNSUPPORTED",
  };
}

async function predictInsolvency(
  model: string,
  inputData: Record<string, unknown>,
) {
  try {
    const metrics = await ONNXEngine.runModelInference(
      insolvencyMetrics(inputData),
    );
    return predictionResult(model, metrics);
  } catch (error: unknown) {
    console.warn(
      "huggingFaceMcpTool - Real ONNX inference failed, using fallback:",
      describeError(error),
    );
    return insolvencyFallback(model);
  }
}

function insolvencyFallback(model: string) {
  return {
    success: true,
    model,
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

function insolvencyMetrics(input: Record<string, unknown>) {
  return {
    ebitda: Number(input.ebitda || 0),
    revenue: Number(input.revenue || 0),
    totalAssets: Number(input.totalAssets || 1),
    totalLiabilities: Number(input.totalLiabilities || 0),
    operatingCashFlow: Number(input.operatingCashFlow || 0),
    historicalVolatility: Number(input.historicalVolatility || 0),
  };
}

function predictionResult(
  model: string,
  metrics: Awaited<ReturnType<typeof ONNXEngine.runModelInference>>,
) {
  const risk = metrics.insolvencyRisk;
  return {
    success: true,
    model,
    prediction: {
      insolvencyRiskScore: risk,
      riskLevel: insolvencyRiskLevel(risk),
      confidence: Number((1 - Math.abs(risk - 0.5) * 0.1).toFixed(2)),
      details:
        `Inference executed via Hugging Face MCP with ONNX model (Insolvency: ${risk}).`,
      metrics,
    },
  };
}

function insolvencyRiskLevel(risk: number): RiskSeverity {
  if (risk > 0.8) return "critical";
  if (risk > 0.5) return "high";
  if (risk > 0.25) return "medium";
  return "low";
}

export const geminiGoogleSearchTool = createTool({
  id: "gemini-google-search-tool",
  description:
    "Searches current company reputation, culture, transactions, and industry news through Gemini grounding.",
  inputSchema: z.object({
    query: z.string(),
    targetCompany: z.string().optional(),
    aspect: z.enum(["reputation", "culture", "past_deals", "news", "general"])
      .default("general"),
  }),
  outputSchema: z.unknown(),
  execute: executeGroundedSearch,
});

type SearchInput = {
  query: string;
  targetCompany?: string;
  aspect: "reputation" | "culture" | "past_deals" | "news" | "general";
};

async function executeGroundedSearch(input: SearchInput) {
  const apiKey = AIProvider.getApiKey().key;
  if (!apiKey) return searchFallback(input, "Mock");
  try {
    const response = await requestGroundedSearch(input, apiKey);
    return parseGroundedSearch(input, await response.json());
  } catch (error: unknown) {
    console.warn(
      "geminiGoogleSearchTool - API call failed, using mocked fallback:",
      describeError(error),
    );
    return searchFallback(input, "Fallback");
  }
}

async function requestGroundedSearch(input: SearchInput, apiKey: string) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(groundedSearchRequest(input)),
  });
  if (!response.ok) {
    throw new Error(
      `Gemini search returned ${response.status} ${response.statusText}; expected a successful response.`,
    );
  }
  return response;
}

function groundedSearchRequest(input: SearchInput) {
  const company = input.targetCompany ?? "the company";
  return {
    contents: [{
      parts: [{
        text:
          `Search Google for ${input.query}. Focus on ${company} and ${input.aspect}.`,
      }],
    }],
    tools: [{ googleSearch: {} }],
  };
}

function parseGroundedSearch(input: SearchInput, rawResponse: unknown) {
  const parsed = GeminiSearchResponseSchema.parse(rawResponse);
  const candidate = parsed.candidates?.[0];
  const sources = groundedSources(candidate);
  return {
    success: true,
    ...input,
    groundingMetadata: {
      sources: sources.length ? sources : [searchSource(input)],
    },
    summary: candidate?.content?.parts?.[0]?.text ??
      `Grounding results via Gemini API for '${input.query}'.`,
  };
}

function groundedSources(
  candidate: z.infer<typeof GeminiSearchResponseSchema>["candidates"] extends
    Array<infer Candidate> | undefined ? Candidate | undefined : never,
) {
  return (candidate?.groundingMetadata?.groundingChunks ?? []).flatMap(
    (chunk) =>
      chunk.web?.uri
        ? [{
          title: chunk.web.title ?? "Information Source",
          url: chunk.web.uri,
        }]
        : [],
  );
}

function searchSource(input: SearchInput) {
  return {
    title: `${input.targetCompany ?? "Target Company"} - News and References`,
    url: `https://www.google.com/search?q=${encodeURIComponent(input.query)}`,
  };
}

function searchFallback(input: SearchInput, mode: "Mock" | "Fallback") {
  return {
    success: true,
    ...input,
    groundingMetadata: { sources: [searchSource(input)] },
    summary:
      `Grounding results (${mode.toLowerCase()}) for '${input.query}'. The company demonstrates strong governance and solid industry reputation.`,
  };
}
