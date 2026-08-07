// src/agent/ai_provider.ts

/**
 * Utility for configuring and initializing the Gemini provider.
 * Validates environment keys in order of priority.
 */
export class AIProvider {
  /**
   * Actively searches for the Gemini/Google AI Studio API key.
   * If no key is found, emits a warning to the console and
   * returns a flag informing that it is operating in fallback/dry-run.
   */
  public static getApiKey(): { key: string | null; isFallback: boolean } {
    if (Deno.env.get("DENO_ENV") === "test") {
      return { key: null, isFallback: true };
    }
    const key = firstConfiguredKey();
    if (key) return { key, isFallback: false };
    if (Deno.args[0] !== "completions") warnAboutMissingApiKey();
    return { key: null, isFallback: true };
  }
}

function firstConfiguredKey(): string | null {
  const names = [
    "GEMINI_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "GOOGLE_API_KEY",
  ];
  for (const name of names) {
    const key = Deno.env.get(name)?.trim();
    if (key && key !== "mock-key-for-dry-run") return key;
  }
  return null;
}

function warnAboutMissingApiKey(): void {
  console.warn("\n[WARNING] No API key found for Google AI Studio/Gemini.");
  console.warn(
    "Check if the variables GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY are defined in your environment or in the .env file.",
  );
  console.warn(
    "The system will operate in DRY-RUN/FALLBACK (mock) mode and no real API requests will be made.\n",
  );
  console.warn(
    "Configure your key using Linear document doc-8 in https://linear.app/mergesai/\n",
  );
}
