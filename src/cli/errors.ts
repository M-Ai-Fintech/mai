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
  ) {
    let message = "An unknown error occurred.";
    let stack = "";

    if (error instanceof Error) {
      message = error.message;
      stack = error.stack || "";
    } else {
      message = String(error);
    }

    const sanitizedMessage = this.sanitizeSecrets(message);
    const sanitizedStack = this.sanitizeSecrets(stack);

    await this.logToFile(sanitizedMessage, sanitizedStack);

    if (exitProcess) {
      console.error(colors.red(`\nFatal error: ${sanitizedMessage}`));
    } else {
      console.error(colors.red(`\nError: ${sanitizedMessage}`));
    }

    if (isDebug) {
      console.error(colors.gray(sanitizedStack));
    }

    if (exitProcess) {
      Deno.exit(1);
    }
  }

  private static sanitizeSecrets(text: string): string {
    // Basic regex for API keys and tokens (Gemini, generic tokens, etc.)
    // Matches common API key formats (e.g. AIzaSy..., eyJ...)
    let sanitized = text.replace(
      /(?:AIza[0-9A-Za-z-_]{35})/g,
      "AIza***[CENSORED]",
    );
    sanitized = sanitized.replace(
      /(?:eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/g,
      "eyJ***[CENSORED]",
    );
    // General match for any potential long secret hex/alphanumeric strings that might be keys
    // We will specifically target the GEMINI_API_KEY if passed in args or env loosely,
    // but regex for standard keys is best.
    sanitized = sanitized.replace(
      /(?:sk-[A-Za-z0-9]{48})/g,
      "sk-***[CENSORED]",
    );
    sanitized = sanitized.replace(/([A-Za-z0-9_]{35,})/g, (match) => {
      // Avoid replacing UUIDs or typical hashes unless they look like secrets
      if (
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
          .test(match)
      ) {
        return match;
      }
      return match.substring(0, 4) + "***[CENSORED]";
    });
    return sanitized;
  }

  private static async logToFile(message: string, stack: string) {
    try {
      await Deno.mkdir("./data/logs", { recursive: true });
      const logEntry = `[${
        new Date().toISOString()
      }] ERROR: ${message}\n${stack}\n\n`;
      await Deno.writeTextFile(this.logFilePath, logEntry, { append: true });
    } catch (e) {
      // Fallback if logging fails
      console.error(
        colors.yellow(
          `Warning: Failed to write error log to ${this.logFilePath}`,
        ),
      );
    }
  }
}
