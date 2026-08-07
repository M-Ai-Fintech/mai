import { assertEquals } from "@std/assert";
import {
  findPromptPolicyViolations,
  findStructuralViolations,
  isSemanticIntegrityException,
} from "./check_repository_standards.ts";

Deno.test("standards check exempts semantic SQL and migration artifacts", () => {
  assertEquals(
    isSemanticIntegrityException("src/core/migrations/large.ts"),
    true,
  );
  assertEquals(isSemanticIntegrityException("src/platform/schema.sql"), true);
  assertEquals(isSemanticIntegrityException("src/core/service.ts"), false);
  assertEquals(
    findStructuralViolations(
      new Map([
        ["src/core/migrations/large.ts", "line\n".repeat(600)],
      ]),
    ),
    [],
  );
});

Deno.test("standards check reports oversized changed application files", () => {
  const violations = findStructuralViolations(
    new Map([
      ["src/core/service.ts", "line\n".repeat(501)],
    ]),
  );
  assertEquals(violations.map((violation) => violation.code), [
    "oversized-application-file",
  ]);
});

Deno.test("standards check enforces central policy references without parsing prose broadly", () => {
  const violations = findPromptPolicyViolations(
    new Map([
      ["prompts/wave_x/task.md", "# Task\n"],
      [
        "prompts/wave_x/legacy.md",
        "# Task\n\n## Governed multi-subagent execution\n",
      ],
    ]),
  );
  assertEquals(violations.map((violation) => violation.code), [
    "missing-central-policy-reference",
    "missing-central-policy-reference",
    "duplicated-central-policy",
  ]);
});

Deno.test("standards check rejects legacy prompt model routing", () => {
  const violations = findPromptPolicyViolations(
    new Map([[
      "prompts/wave_x/legacy.md",
      "prompts/OPERATING_RULES.md\nRun `plan_MAI-123.md` with Sol first.\n",
    ]]),
  );
  assertEquals(violations.map((violation) => violation.code), [
    "legacy-prompt-routing",
  ]);
});
