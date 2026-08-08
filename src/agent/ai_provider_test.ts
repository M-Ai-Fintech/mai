import { assertThrows } from "@std/assert";
import { AIProvider } from "./ai_provider.ts";

Deno.test("configured provider fails closed even under the test profile", () => {
  const previousEnvironment = {
    profile: Deno.env.get("DENO_ENV"),
    provider: Deno.env.get("MAI_AI_PROVIDER"),
    keys: [
      "GEMINI_API_KEY",
      "GOOGLE_GENERATIVE_AI_API_KEY",
      "GOOGLE_API_KEY",
    ].map((name) => [name, Deno.env.get(name)] as const),
  };
  Deno.env.set("DENO_ENV", "test");
  Deno.env.set("MAI_AI_PROVIDER", "gemini");
  for (
    const name of [
      "GEMINI_API_KEY",
      "GOOGLE_GENERATIVE_AI_API_KEY",
      "GOOGLE_API_KEY",
    ]
  ) Deno.env.delete(name);
  try {
    assertThrows(
      () => AIProvider.getApiKey(),
      Error,
      "configured but unavailable",
    );
  } finally {
    restore("DENO_ENV", previousEnvironment.profile);
    restore("MAI_AI_PROVIDER", previousEnvironment.provider);
    for (const [name, value] of previousEnvironment.keys) restore(name, value);
  }
});

function restore(name: string, value: string | undefined): void {
  if (value === undefined) {
    Deno.env.delete(name);
    return;
  }
  Deno.env.set(name, value);
}
