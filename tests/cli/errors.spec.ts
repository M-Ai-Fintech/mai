import { assertNotMatch, assertStringIncludes } from "@std/assert";
import { CLIErrorHandler } from "../../src/cli/errors.ts";

interface SecretSanitizer {
  sanitizeSecrets(text: string): string;
}

const secretSanitizer = CLIErrorHandler as unknown as SecretSanitizer;

Deno.test("CLIErrorHandler sanitizes API keys from error messages", () => {
  const errorMessage =
    "Invalid API call with key AIzaSy123456789012345678901234567890123 and another key eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  const sanitized = secretSanitizer.sanitizeSecrets(errorMessage);

  assertStringIncludes(sanitized, "AIza***[CENSORED]");
  assertNotMatch(sanitized, /AIzaSy123456789012345678901234567890123/);
  assertStringIncludes(sanitized, "eyJ***[CENSORED]");
});

Deno.test("CLIErrorHandler does not sanitize normal UUIDs", () => {
  const errorMessage =
    "Process ID 550e8400-e29b-41d4-a716-446655440000 failed.";
  const sanitized = secretSanitizer.sanitizeSecrets(errorMessage);

  assertStringIncludes(sanitized, "550e8400-e29b-41d4-a716-446655440000");
});
