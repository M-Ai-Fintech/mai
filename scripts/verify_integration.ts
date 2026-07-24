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

function isRealConfigurationValue(value: string | undefined): value is string {
  return Boolean(value?.trim()) && value !== "sua_chave_aqui" &&
    value !== "mock-key-for-dry-run";
}

export function integrationConfig(environment: Environment): IntegrationConfig {
  const geminiApiKey = environment.GEMINI_API_KEY ||
    environment.GOOGLE_GENERATIVE_AI_API_KEY;
  const required = {
    DATABASE_URL: environment.DATABASE_URL,
    GEMINI_API_KEY: geminiApiKey,
    PAPERMARK_API_KEY: environment.PAPERMARK_API_KEY,
    PAPERMARK_API_URL: environment.PAPERMARK_API_URL,
    PAPERMARK_ROOM_ID: environment.PAPERMARK_ROOM_ID,
  };
  const missing = Object.entries(required)
    .filter(([, value]) => !isRealConfigurationValue(value))
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `verify:integration requires real service configuration: ${
        missing.join(", ")
      }. ` +
        "It never substitutes mocks.",
    );
  }

  return {
    databaseUrl: required.DATABASE_URL!,
    geminiApiKey: required.GEMINI_API_KEY!,
    geminiModel: environment.GEMINI_SMOKE_MODEL || "gemini-2.5-flash",
    papermarkApiKey: required.PAPERMARK_API_KEY!,
    papermarkApiUrl: required.PAPERMARK_API_URL!.replace(/\/$/, ""),
    papermarkRoomId: required.PAPERMARK_ROOM_ID!,
  };
}

async function verifyPostgres(databaseUrl: string): Promise<void> {
  const client = new Client(databaseUrl);
  try {
    await client.connect();
    const result = await client.query("SELECT 1 AS live_smoke");
    if (result.rows[0]?.live_smoke !== 1) {
      throw new Error("PostgreSQL did not return the live smoke value.");
    }
  } finally {
    await client.end().catch(() => {});
  }
}

async function verifyGemini(apiKey: string, model: string): Promise<void> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${
      encodeURIComponent(model)
    }:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Reply only with OK." }] }],
        generationConfig: { maxOutputTokens: 8 },
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`Gemini live smoke failed with HTTP ${response.status}.`);
  }

  const payload = await response.json();
  if (!payload.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error("Gemini live smoke returned no generated content.");
  }
}

async function verifyPapermark(config: IntegrationConfig): Promise<void> {
  const response = await fetch(
    `${config.papermarkApiUrl}/v1/rooms/${
      encodeURIComponent(config.papermarkRoomId)
    }/documents`,
    {
      headers: {
        Authorization: `Bearer ${config.papermarkApiKey}`,
        Accept: "application/json",
      },
    },
  );
  if (!response.ok) {
    throw new Error(
      `Papermark live smoke failed with HTTP ${response.status}.`,
    );
  }

  const payload = await response.json();
  if (!Array.isArray(payload) && !Array.isArray(payload.documents)) {
    throw new Error(
      "Papermark live smoke returned an unexpected documents payload.",
    );
  }
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
