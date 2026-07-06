import { assertEquals, assertStringIncludes, assertNotMatch } from "jsr:@std/assert";
import { CLIErrorHandler } from "../../src/cli/errors.ts";

Deno.test("CLIErrorHandler sanitizes API keys from error messages", async () => {
  const errorMessage = "Invalid API call with key AIzaSy123456789012345678901234567890123 and another key eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  
  // Expose the private method for testing via any casting
  const handler = CLIErrorHandler as any;
  const sanitized = handler.sanitizeSecrets(errorMessage);
  
  assertStringIncludes(sanitized, "AIza***[CENSORED]");
  assertNotMatch(sanitized, /AIzaSy123456789012345678901234567890123/);
  
  assertStringIncludes(sanitized, "eyJ***[CENSORED]");
});

Deno.test("CLIErrorHandler does not sanitize normal UUIDs", async () => {
  const errorMessage = "Process ID 550e8400-e29b-41d4-a716-446655440000 failed.";
  const handler = CLIErrorHandler as any;
  const sanitized = handler.sanitizeSecrets(errorMessage);
  
  assertStringIncludes(sanitized, "550e8400-e29b-41d4-a716-446655440000");
});
