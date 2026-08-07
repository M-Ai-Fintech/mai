import { assertEquals, assertRejects } from "@std/assert";
import type {
  ExactDocumentVersionReference,
  ExactDocumentVersionVerificationPort,
} from "../../src/evidence_knowledge/v1.ts";
import { parseEvidenceId } from "../../src/evidence_knowledge/v1.ts";
import type { RequestContext } from "../../src/platform/api/v1.ts";
import {
  createExactEvidenceBasis,
  DiligenceDecisionError,
  type DiligenceScope,
  type EvidenceBasisReference,
  EvidenceKnowledgeBasisVerifier,
  parseDealId,
  parseFactVersionId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/diligence_decisions/v1.ts";

Deno.test("Evidence Knowledge verifier checks every exact public reference", async () => {
  const references = new NamedReferenceVerifier();
  const verifier = new EvidenceKnowledgeBasisVerifier(
    new UnusedDocumentVerifier(),
    references,
  );
  await verifier.verify(context(), scope(), basis());
  assertEquals(references.evidenceIds, ["evidence_tax"]);
  assertEquals(references.factVersionIds, ["factver_tax-v1"]);
});

Deno.test("Evidence Knowledge verifier maps unavailable references to protected not found", async () => {
  const references = new NamedReferenceVerifier("factver_tax-v1");
  const verifier = new EvidenceKnowledgeBasisVerifier(
    new UnusedDocumentVerifier(),
    references,
  );
  const error = await assertRejects(
    () => verifier.verify(context(), scope(), basis()),
    DiligenceDecisionError,
  );
  assertEquals(error.code, "PROTECTED_NOT_FOUND");
});

class NamedReferenceVerifier {
  readonly evidenceIds: string[] = [];
  readonly factVersionIds: string[] = [];

  constructor(private readonly unavailable?: string) {}

  verifyEvidence(
    _context: RequestContext,
    _scope: DiligenceScope,
    evidenceId: string,
  ): Promise<void> {
    this.evidenceIds.push(evidenceId);
    return this.failIfUnavailable(evidenceId);
  }

  verifyFactVersion(
    _context: RequestContext,
    _scope: DiligenceScope,
    factVersionId: string,
  ): Promise<void> {
    this.factVersionIds.push(factVersionId);
    return this.failIfUnavailable(factVersionId);
  }

  private failIfUnavailable(reference: string): Promise<void> {
    if (reference !== this.unavailable) return Promise.resolve();
    return Promise.reject(
      new Error(`Unavailable exact reference "${reference}".`),
    );
  }
}

class UnusedDocumentVerifier implements ExactDocumentVersionVerificationPort {
  verify(
    _context: RequestContext,
    _scope: DiligenceScope,
    reference: ExactDocumentVersionReference,
  ): Promise<never> {
    return Promise.reject(
      new Error(
        `Unexpected document reference "${reference.documentVersionId}".`,
      ),
    );
  }
}

function basis() {
  const references: readonly EvidenceBasisReference[] = [{
    kind: "evidence",
    evidenceId: required("evidence_tax", parseEvidenceId),
  }, {
    kind: "fact_version",
    factVersionId: required("factver_tax-v1", parseFactVersionId),
  }];
  return createExactEvidenceBasis({
    scope: scope(),
    references,
    basisDigest: "b".repeat(64),
    capturedAt: new Date("2026-08-07T12:00:00.000Z"),
  });
}

function context(): RequestContext {
  return {
    actorId: "actor_agent" as never,
    ...scope(),
    correlationId: "cor_diligence" as never,
    origin: "internal",
  };
}

function scope(): DiligenceScope {
  return {
    tenantId: required("tenant_acme", parseTenantId),
    workspaceId: required("workspace_dealroom", parseWorkspaceId),
    dealId: required("deal_horizon", parseDealId),
  };
}

function required<T>(
  value: string,
  parser: (
    candidate: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  const result = parser(value);
  if (result.ok) return result.value;
  throw new Error(`Invalid fixture "${value}".`);
}
