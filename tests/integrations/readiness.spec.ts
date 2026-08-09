import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  createReadinessEvidence,
  createReadinessRegister,
  evaluateReadiness,
  requiredReadinessGates,
} from "../../src/integrations/readiness.ts";

Deno.test("readiness evidence is immutable metadata without credential material", () => {
  const evidence = createReadinessEvidence({
    evidenceId: "evidence_local_configuration",
    provider: "papermark",
    environment: "local-development",
    providerVersion: "commit-local-001",
    environmentId: "papermark-local",
    gate: "configuration",
    outcome: "passed",
    source: "local-runtime",
    capturedAt: timestamp(),
    artifactDigest: digest("configuration"),
  });

  assertEquals(Object.isFrozen(evidence), true);
  assertEquals(JSON.stringify(evidence).includes("secret"), false);
  assertEquals(evidence.providerVersion, "commit-local-001");
  assertThrows(
    () =>
      createReadinessEvidence({
        evidenceId: "evidence_local_secret",
        provider: "papermark",
        environment: "local-development",
        providerVersion: "commit-local-001",
        environmentId: "papermark-local",
        gate: "configuration",
        outcome: "passed",
        source: "local-runtime",
        capturedAt: timestamp(),
        artifactDigest: digest("secret"),
        token: "secret-value",
      } as never),
    Error,
    "credential",
  );
});

Deno.test("fixture evidence cannot inflate to local or sandbox readiness", () => {
  const evidence = evidenceFor("fixture", "fixture-v1", "fixture");
  const register = createReadinessRegister(evidence);
  const fixture = register.evaluate(
    request("fixture", "fixture-v1", "fixture"),
  );
  const local = register.evaluate(
    request("local-development", "fixture-v1", "local-development"),
  );
  const sandbox = register.evaluate(
    request("sandbox-certification", "fixture-v1", "sandbox-certification"),
  );

  assertEquals(fixture.state, "fixture");
  assertEquals(local.state, "gated");
  assertEquals(sandbox.state, "gated");
  assert(local.missingGates.includes("configuration"));
});

Deno.test("local-development evidence is scoped to provider version and environment", () => {
  const evidence = evidenceFor(
    "local-development",
    "commit-local-001",
    "papermark-local",
  );
  const register = createReadinessRegister(evidence);
  const local = register.evaluate(
    request("local-development", "commit-local-001", "papermark-local"),
  );
  const wrongVersion = register.evaluate(
    request("local-development", "commit-local-002", "papermark-local"),
  );
  const wrongEnvironment = register.evaluate(
    request("local-development", "commit-local-001", "papermark-other"),
  );

  assertEquals(local.state, "gated");
  assertEquals(wrongVersion.state, "gated");
  assertEquals(wrongEnvironment.state, "gated");
  assert(wrongVersion.missingGates.length > 0);
});

Deno.test("sandbox evidence is required before sandbox certification", () => {
  const local = createReadinessRegister(
    evidenceFor("local-development", "commit-001", "papermark-local"),
  );
  const sandbox = createReadinessRegister(
    evidenceFor("sandbox-certification", "commit-001", "papermark-sandbox"),
  );
  const localAttempt = local.evaluate(
    request("sandbox-certification", "commit-001", "papermark-sandbox"),
  );
  const sandboxResult = sandbox.evaluate(
    request("sandbox-certification", "commit-001", "papermark-sandbox"),
  );

  assertEquals(localAttempt.state, "gated");
  assertEquals(sandboxResult.state, "gated");
  assert(sandboxResult.missingGates.includes("coordinator-authorization"));
});

Deno.test("lifecycle and implementation states fail closed before evidence evaluation", () => {
  const input = request("local-development", "commit-001", "papermark-local");

  assertEquals(
    evaluateReadiness({ ...input, lifecycle: "deferred" }).state,
    "deferred",
  );
  assertEquals(
    evaluateReadiness({ ...input, lifecycle: "disabled" }).state,
    "disabled",
  );
  assertEquals(
    evaluateReadiness({ ...input, implementation: "partial" }).state,
    "partially-implemented",
  );
  assertEquals(
    evaluateReadiness({ ...input, configured: false }).state,
    "unavailable",
  );
});

Deno.test("production candidate and verified claims require exact environment evidence", () => {
  const candidateEvidence = evidenceFor(
    "production-candidate",
    "commit-prod-001",
    "papermark-candidate",
  );
  const verifiedEvidence = evidenceFor(
    "production-verified",
    "commit-prod-002",
    "papermark-production",
  );
  const candidate = createReadinessRegister(candidateEvidence).evaluate(
    request("production-candidate", "commit-prod-001", "papermark-candidate"),
  );
  const verified = createReadinessRegister(verifiedEvidence).evaluate(
    request("production-verified", "commit-prod-002", "papermark-production"),
  );

  assertEquals(candidate.state, "gated");
  assertEquals(verified.state, "gated");
  assert(candidate.missingGates.includes("coordinator-authorization"));
  assert(verified.missingGates.includes("coordinator-authorization"));
});

Deno.test("Papermark readiness keeps each lifecycle gate independent", () => {
  const lifecycleGates = [
    "authenticated-room-lifecycle",
    "folder-lifecycle",
    "document-lifecycle",
    "permissions",
    "invalid-credentials",
    "expired-credentials",
    "provider-unavailable",
    "malformed-response",
    "timeout-retry",
    "rate-limit",
    "cleanup",
    "health",
    "capabilities",
    "pagination",
    "scope-isolation",
    "classification",
    "residency",
    "retention",
    "deletion",
    "legal-hold",
    "recovery",
    "rollback",
    "secret-redaction",
  ] as const;
  const targets = [
    "local-development",
    "sandbox-certification",
    "production-candidate",
    "production-verified",
  ] as const;
  for (const target of targets) {
    for (const gate of lifecycleGates) {
      assert(requiredReadinessGates(target).includes(gate));
    }
    const evidence = createReadinessEvidence({
      evidenceId: `evidence_${target}_failure_normalization`,
      provider: "papermark",
      environment: target,
      providerVersion: "commit-profile-001",
      environmentId: `papermark-${target}`,
      gate: "failure-normalization",
      outcome: "passed",
      source: evidenceSource(target),
      capturedAt: timestamp(),
      artifactDigest: digest(`${target}-failure-normalization`),
    });
    const evaluation = evaluateReadiness({
      ...request(target, "commit-profile-001", `papermark-${target}`),
      evidence: [evidence],
    });
    for (const gate of lifecycleGates) {
      assert(evaluation.missingGates.includes(gate));
    }
  }
});

Deno.test("forged coordinator authorization fails closed without a runtime symbol error", () => {
  assertThrows(
    () =>
      evaluateReadiness({
        ...request(
          "sandbox-certification",
          "commit-sandbox-001",
          "papermark-sandbox",
        ),
        coordinatorAuthorization: {
          authorizationReference: "forged",
        } as never,
      }),
    Error,
    "coordinator authorization",
  );
});

Deno.test("fixture evidence cannot be evaluated for a non-fixture target", () => {
  assertThrows(
    () =>
      evaluateReadiness({
        ...request("local-development", "fixture-v1", "local-development"),
        provider: "fixture",
      }),
    Error,
    "fixture target",
  );
});

Deno.test("deferred iDeals and Intralinks cannot claim readiness", () => {
  for (const provider of ["ideals", "intralinks"] as const) {
    assertThrows(
      () =>
        evaluateReadiness({
          ...request("local-development", "provider-v1", "provider-local"),
          provider,
          lifecycle: "enabled",
        }),
      Error,
      "Deferred provider",
    );
  }
});

Deno.test("readiness register append is immutable and rejects duplicate evidence IDs", () => {
  const evidence = evidenceFor(
    "local-development",
    "commit-001",
    "papermark-local",
  )[0];
  const initial = createReadinessRegister();
  const next = initial.appendEvidence(evidence);

  assertEquals(initial.evidence.length, 0);
  assertEquals(next.evidence.length, 1);
  assertEquals(Object.isFrozen(next.evidence), true);
  assertThrows(() => next.appendEvidence(evidence), Error, "evidence ID");
});

Deno.test("readiness evidence timestamps are defensive and cannot promote stale passes", () => {
  const evidence = evidenceFor(
    "local-development",
    "commit-001",
    "papermark-local",
  );
  const oldPass = evidence.find(({ gate }) => gate === "configuration");
  if (oldPass === undefined) {
    throw new Error("Expected configuration evidence.");
  }
  const oldPassIndex = evidence.findIndex(({ gate }) =>
    gate === "configuration"
  );
  const laterFail = createReadinessEvidence({
    ...oldPass,
    evidenceId: "evidence_local_configuration_failure",
    outcome: "failed",
    capturedAt: new Date("2026-08-08T13:00:00.000Z"),
    artifactDigest: digest("configuration-failure"),
  });
  const register = createReadinessRegister([...evidence, laterFail]);

  assertEquals(
    register.evaluate(
      {
        ...request("local-development", "commit-001", "papermark-local"),
        evaluatedAt: new Date("2026-08-08T14:00:00.000Z"),
      },
    ).state,
    "gated",
  );
  register.evidence[oldPassIndex].capturedAt.setFullYear(2099);
  assertEquals(
    register.evaluate(
      {
        ...request("local-development", "commit-001", "papermark-local"),
        evaluatedAt: new Date("2026-08-08T14:00:00.000Z"),
      },
    ).state,
    "gated",
  );
  assertEquals(
    register.evidence[oldPassIndex].capturedAt.toISOString(),
    "2026-08-08T12:00:00.000Z",
  );
  assertEquals(Object.isFrozen(register.evidence[oldPassIndex]), true);
});

Deno.test("direct readiness evaluation rejects duplicate evidence IDs across gates", () => {
  const evidence = evidenceFor(
    "local-development",
    "commit-duplicate-001",
    "papermark-local",
  );
  const duplicate = createReadinessEvidence({
    ...evidence[0],
    gate: "credentials",
  });
  assertThrows(
    () =>
      evaluateReadiness({
        ...request(
          "local-development",
          "commit-duplicate-001",
          "papermark-local",
        ),
        evidence: [evidence[0], duplicate],
      }),
    Error,
    "evidence ID",
  );
});

Deno.test("readiness evaluation rejects evidence captured after its injected clock", () => {
  const future = createReadinessEvidence({
    evidenceId: "evidence_future",
    provider: "fixture",
    environment: "fixture",
    providerVersion: "fixture-v1",
    environmentId: "fixture",
    gate: "interface-contract",
    outcome: "passed",
    source: "fixture-test",
    capturedAt: new Date("2026-08-08T13:00:00.000Z"),
    artifactDigest: digest("future"),
  });
  assertThrows(
    () =>
      evaluateReadiness({
        ...request("fixture", "fixture-v1", "fixture"),
        evidence: [future],
      }),
    Error,
    "newer than",
  );
});

Deno.test("equal-timestamp readiness failures dominate passes independent of input order", () => {
  const pass = createReadinessEvidence({
    evidenceId: "evidence_equal_pass",
    provider: "fixture",
    environment: "fixture",
    providerVersion: "fixture-v1",
    environmentId: "fixture",
    gate: "interface-contract",
    outcome: "passed",
    source: "fixture-test",
    capturedAt: timestamp(),
    artifactDigest: digest("equal-pass"),
  });
  const failure = createReadinessEvidence({
    ...pass,
    evidenceId: "evidence_equal_failure",
    outcome: "failed",
    artifactDigest: digest("equal-failure"),
  });
  for (const evidence of [[pass, failure], [failure, pass]]) {
    const result = evaluateReadiness({
      ...request("fixture", "fixture-v1", "fixture"),
      evidence,
    });
    assertEquals(result.state, "gated");
    assert(result.missingGates.includes("interface-contract"));
  }
});

Deno.test("readiness request runtime flags and lifecycle are validated", () => {
  const input = request("fixture", "fixture-v1", "fixture");
  assertThrows(
    () => evaluateReadiness({ ...input, lifecycle: "unknown" } as never),
    Error,
    "lifecycle",
  );
  assertThrows(
    () => evaluateReadiness({ ...input, configured: "true" } as never),
    Error,
    "configured",
  );
  assertThrows(
    () => evaluateReadiness({ ...input, implementation: "unknown" } as never),
    Error,
    "implementation",
  );
});

function request(
  target:
    | "fixture"
    | "local-development"
    | "sandbox-certification"
    | "production-candidate"
    | "production-verified",
  providerVersion: string,
  environmentId: string,
) {
  return {
    provider: target === "fixture" ? "fixture" as const : "papermark" as const,
    target,
    providerVersion,
    environmentId,
    lifecycle: "enabled" as const,
    configured: true,
    implementation: "complete" as const,
    evidence: [],
    evaluatedAt: timestamp(),
  };
}

function evidenceFor(
  environment:
    | "fixture"
    | "local-development"
    | "sandbox-certification"
    | "production-candidate"
    | "production-verified",
  providerVersion: string,
  environmentId: string,
) {
  return requiredReadinessGates(environment).map((gate, index) =>
    createReadinessEvidence({
      evidenceId: `evidence_${environment}_${index}`,
      provider: environment === "fixture" ? "fixture" : "papermark",
      environment,
      providerVersion,
      environmentId,
      gate,
      outcome: "passed",
      source: evidenceSource(environment),
      capturedAt: timestamp(),
      artifactDigest: digest(`${environment}-${gate}`),
    })
  );
}

function evidenceSource(
  environment:
    | "fixture"
    | "local-development"
    | "sandbox-certification"
    | "production-candidate"
    | "production-verified",
) {
  if (environment === "fixture") return "fixture-test" as const;
  if (environment === "local-development") return "local-runtime" as const;
  if (environment === "sandbox-certification") return "sandbox-run" as const;
  if (environment === "production-candidate") {
    return "production-review" as const;
  }
  return "production-verification" as const;
}

function digest(seed: string): string {
  return (seed.length % 2 === 0 ? "a" : "b").repeat(64);
}

function timestamp(): Date {
  return new Date("2026-08-08T12:00:00.000Z");
}
