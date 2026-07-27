import { Client } from "pg";

export interface IntegrationConfig {
  databaseUrl: string;
  geminiApiKey: string;
  geminiModel: string;
  papermarkApiKey: string;
  papermarkApiUrl: string;
  papermarkRoomId: string;
}

type Environment = Record<string, string | undefined>;
type RequiredConfiguration = Record<
  | "DATABASE_URL"
  | "GEMINI_API_KEY"
  | "PAPERMARK_API_KEY"
  | "PAPERMARK_API_URL"
  | "PAPERMARK_ROOM_ID",
  string | undefined
>;
type RequiredConfigurationName = keyof RequiredConfiguration;

function isRealConfigurationValue(value: string | undefined): value is string {
  return Boolean(value?.trim()) && value !== "sua_chave_aqui" &&
    value !== "mock-key-for-dry-run";
}

export function integrationConfig(environment: Environment): IntegrationConfig {
  const required = requiredConfiguration(environment);
  assertCompleteConfiguration(required);
  return buildIntegrationConfig(required, environment);
}

function requiredConfiguration(
  environment: Environment,
): RequiredConfiguration {
  return {
    DATABASE_URL: environment.DATABASE_URL,
    GEMINI_API_KEY: environment.GEMINI_API_KEY ||
      environment.GOOGLE_GENERATIVE_AI_API_KEY,
    PAPERMARK_API_KEY: environment.PAPERMARK_API_KEY,
    PAPERMARK_API_URL: environment.PAPERMARK_API_URL,
    PAPERMARK_ROOM_ID: environment.PAPERMARK_ROOM_ID,
  };
}

function assertCompleteConfiguration(required: RequiredConfiguration): void {
  const missing = Object.entries(required)
    .filter(([, value]) => !isRealConfigurationValue(value))
    .map(([name]) => name);
  if (missing.length === 0) return;
  throw new Error(
    "verify:integration requires real service configuration; " +
      `invalid values: '${missing.join(", ")}'. ` +
      "Expected real service values and never substitutes mocks.",
  );
}

function buildIntegrationConfig(
  required: RequiredConfiguration,
  environment: Environment,
): IntegrationConfig {
  return {
    databaseUrl: requiredValue(required, "DATABASE_URL"),
    geminiApiKey: requiredValue(required, "GEMINI_API_KEY"),
    geminiModel: environment.GEMINI_SMOKE_MODEL || "gemini-2.5-flash",
    papermarkApiKey: requiredValue(required, "PAPERMARK_API_KEY"),
    papermarkApiUrl: requiredValue(required, "PAPERMARK_API_URL").replace(
      /\/$/,
      "",
    ),
    papermarkRoomId: requiredValue(required, "PAPERMARK_ROOM_ID"),
  };
}

function requiredValue(
  required: RequiredConfiguration,
  name: RequiredConfigurationName,
): string {
  const value = required[name];
  return requireConfigurationValue(value, name);
}

function requireConfigurationValue(
  value: string | undefined,
  name: string,
): string {
  if (isRealConfigurationValue(value)) return value;
  throw new Error(
    `Invalid integration configuration '${name}=${
      String(value)
    }'; expected a real service value.`,
  );
}

async function verifyPostgres(databaseUrl: string): Promise<void> {
  const client = new Client(databaseUrl);
  try {
    await client.connect();
    const result = await client.query("SELECT 1 AS live_smoke");
    const actual = result.rows[0]?.live_smoke;
    if (actual !== 1) {
      throw new Error(
        `PostgreSQL live smoke returned '${String(actual)}'; expected 1.`,
      );
    }
  } finally {
    await client.end().catch(() => {});
  }
}

async function verifyGemini(apiKey: string, model: string): Promise<void> {
  const response = await fetch(geminiUrl(apiKey, model), geminiRequest());
  if (!response.ok) {
    throw new Error(
      `Gemini live smoke returned HTTP ${response.status}; expected 2xx.`,
    );
  }
  const payload: unknown = await response.json();
  if (!hasGeneratedGeminiText(payload)) {
    throw new Error(
      `Gemini payload '${
        JSON.stringify(payload)
      }' lacked expected generated text.`,
    );
  }
}

function geminiUrl(apiKey: string, model: string): string {
  const encodedModel = encodeURIComponent(model);
  const encodedKey = encodeURIComponent(apiKey);
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodedModel}:generateContent?key=${encodedKey}`;
}

function geminiRequest(): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Reply only with OK." }] }],
      generationConfig: { maxOutputTokens: 8 },
    }),
  };
}

function hasGeneratedGeminiText(payload: unknown): boolean {
  if (!isRecord(payload) || !Array.isArray(payload.candidates)) return false;
  const candidate = payload.candidates[0];
  if (!isRecord(candidate) || !isRecord(candidate.content)) return false;
  const parts = candidate.content.parts;
  if (!Array.isArray(parts) || !isRecord(parts[0])) return false;
  return typeof parts[0].text === "string" && parts[0].text.length > 0;
}

async function verifyPapermark(config: IntegrationConfig): Promise<void> {
  const response = await fetch(papermarkUrl(config), papermarkRequest(config));
  if (!response.ok) {
    throw new Error(
      `Papermark live smoke returned HTTP ${response.status}; expected 2xx.`,
    );
  }
  const payload: unknown = await response.json();
  if (!hasPapermarkDocuments(payload)) {
    throw new Error(
      `Papermark payload '${
        JSON.stringify(payload)
      }'; expected an array or documents array.`,
    );
  }
}

function papermarkUrl(config: IntegrationConfig): string {
  const roomId = encodeURIComponent(config.papermarkRoomId);
  return `${config.papermarkApiUrl}/v1/rooms/${roomId}/documents`;
}

function papermarkRequest(config: IntegrationConfig): RequestInit {
  return {
    headers: {
      Authorization: `Bearer ${config.papermarkApiKey}`,
      Accept: "application/json",
    },
  };
}

function hasPapermarkDocuments(payload: unknown): boolean {
  if (Array.isArray(payload)) return true;
  return isRecord(payload) && Array.isArray(payload.documents);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  const isObject = typeof value === "object";
  return isObject && value !== null;
}

async function verifyTransformers(): Promise<void> {
  const { TransformersEngine } = await import(
    "../src/engines/prediction/transformers.ts"
  );
  const embedding = await TransformersEngine.generateEmbedding(
    "Real transformer integration smoke.",
  );
  if (
    embedding.length !== 384 ||
    embedding.some((value) => !Number.isFinite(value))
  ) {
    throw new Error("Transformers live smoke returned an invalid embedding.");
  }
}

if (import.meta.main) {
  const config = integrationConfig(Deno.env.toObject());
  await verifyPostgres(config.databaseUrl);
  await verifyGemini(config.geminiApiKey, config.geminiModel);
  await verifyPapermark(config);
  await verifyTransformers();
  console.log(
    "Live integration smoke checks passed: PostgreSQL, Gemini, Papermark, Transformers.",
  );
}
