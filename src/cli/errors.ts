import { colors } from "@cliffy/ansi";

export class CLIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CLIError";
  }
}

export class CLIErrorHandler {
  private static logFilePath = "./data/logs/cli_errors.log";

  public static async handleError(
    error: unknown,
    isDebug = false,
    exitProcess = true,
  ): Promise<void> {
    const { message, stack } = this.describeError(error);
    const sanitizedMessage = this.sanitizeSecrets(message);
    const sanitizedStack = this.sanitizeSecrets(stack);
    await this.logToFile(sanitizedMessage, sanitizedStack);
    this.printError(sanitizedMessage, sanitizedStack, isDebug, exitProcess);
    if (exitProcess) Deno.exit(1);
  }

  private static describeError(error: unknown): {
    message: string;
    stack: string;
  } {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack || "",
      };
    }
    return { message: String(error), stack: "" };
  }

  private static printError(
    message: string,
    stack: string,
    isDebug: boolean,
    fatal: boolean,
  ): void {
    const label = fatal ? "Fatal error" : "Error";
    console.error(colors.red(`\n${label}: ${message}`));
    if (isDebug) console.error(colors.gray(stack));
  }

  private static sanitizeSecrets(text: string): string {
    // Basic regex for API keys and tokens (Gemini, generic tokens, etc.)
    // Matches common API key formats (e.g. AIzaSy..., eyJ...)
    const apiKeysRemoved = text.replace(
      /(?:AIza[0-9A-Za-z-_]{35})/g,
      "AIza***[CENSORED]",
    ).replace(
      /(?:eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/g,
      "eyJ***[CENSORED]",
    );
    // General match for any potential long secret hex/alphanumeric strings that might be keys
    // We will specifically target the GEMINI_API_KEY if passed in args or env loosely,
    // but regex for standard keys is best.
    return apiKeysRemoved.replace(
      /(?:sk-[A-Za-z0-9]{48})/g,
      "sk-***[CENSORED]",
    ).replace(/([A-Za-z0-9_]{35,})/g, this.censorLongSecret);
  }

  private static censorLongSecret(match: string): string {
    // Avoid replacing UUIDs or typical hashes unless they look like secrets.
    const uuidPattern =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidPattern.test(match)
      ? match
      : match.substring(0, 4) + "***[CENSORED]";
  }

  private static async logToFile(message: string, stack: string) {
    try {
      await Deno.mkdir("./data/logs", { recursive: true });
      const logEntry = `[${
        new Date().toISOString()
      }] ERROR: ${message}\n${stack}\n\n`;
      await Deno.writeTextFile(this.logFilePath, logEntry, { append: true });
    } catch {
      // Fallback if logging fails
      console.error(
        colors.yellow(
          `Warning: Failed to write error log to ${this.logFilePath}`,
        ),
      );
    }
  }
}
