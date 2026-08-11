import {
  type ConnectorAccountId,
  type DocumentId,
  type DocumentSourceId,
  type DocumentVersionId,
  type ObjectReferenceId,
  parseConnectorAccountId,
  parseDocumentId,
  parseDocumentSourceId,
  parseDocumentVersionId,
  parseObjectReferenceId,
} from "../documents/ids.ts";
import {
  createDocument,
  type Document,
  type DocumentScope,
} from "../documents/model.ts";
import { FakeObjectStore } from "../documents/object_store.ts";
import {
  createDocumentSource,
  createProviderMarker,
} from "../documents/source.ts";
import { DocumentUploadService } from "../documents/upload.ts";
import type { DocumentVersion } from "../documents/version.ts";
import type { ProcessingRun } from "../documents/processing.ts";
import {
  type Calculation,
  createCalculation,
  createCitation,
  createEvidenceRecord,
  createFreshness,
  type EvidenceRecord,
  parseCalculationId,
  parseCitationId,
  parseEvidenceId,
} from "../evidence_knowledge/v1.ts";
import { createExactEvidenceBasis } from "../diligence_decisions/basis.ts";
import {
  createFinding,
  type DecisionRecord,
  type DecisionRequest,
  type Finding,
} from "../diligence_decisions/model.ts";
import { parseFindingId } from "../diligence_decisions/ids.ts";
import {
  type Deliverable,
  type DeliverableVersion,
  type SourceSnapshot,
} from "../deliverables/model.ts";
import type {
  ActorId,
  DealId,
  TenantId,
  WorkspaceId,
} from "../platform/api/v1.ts";
import type { ActorReference } from "../platform/authz/v1.ts";
import type {
  DemoDocumentManifest,
  DemoManifest,
  DemoReadinessResult,
  DemoResetTarget,
} from "./contracts.ts";
import { processDemoDocumentVersions } from "./processing.ts";
import { MemoryDocumentVersions } from "./memory_versions.ts";
import { createDemoArtifact, proveHumanAuthority } from "./governed_outputs.ts";
import { readConfinedFixture } from "./fixture_paths.ts";
export type {
  DemoDocumentManifest,
  DemoManifest,
  DemoReadinessResult,
  DemoResetTarget,
} from "./contracts.ts";

const fixedTime = new Date("2026-08-10T12:00:00.000Z");
export const demoScope: DocumentScope = {
  tenantId: "tenant_serra-azul" as TenantId,
  workspaceId: "workspace_investor-demo" as WorkspaceId,
  dealId: "deal_serra-azul" as DealId,
};
const agent: ActorReference = {
  id: "actor_diligence-agent" as ActorId,
  kind: "ai",
  state: "active",
};
const banker: ActorReference = {
  id: "actor_demo-banker" as ActorId,
  kind: "human",
  state: "active",
};

export interface SyntheticInvestorDemoWorkflow {
  readonly result: DemoReadinessResult;
  readonly documents: readonly Document[];
  readonly versions: readonly DocumentVersion[];
  readonly processingRuns: readonly ProcessingRun[];
  readonly evidence: readonly EvidenceRecord[];
  readonly finding: Finding;
  readonly calculation: Calculation;
  readonly decisionRequest: DecisionRequest;
  readonly decisionRecord: DecisionRecord;
  readonly deliverable: Deliverable;
  readonly sourceSnapshot: SourceSnapshot;
  readonly deliverableVersion: DeliverableVersion;
}

/** Rejects reset targets that could name shared or production-like state.
 *
 * @example assertSafeDemoResetTarget({ environment: "test", databaseName: "mai_demo_readiness" })
 */
export function assertSafeDemoResetTarget(target: DemoResetTarget): void {
  if (
    (target.environment === "test" || target.environment === "local-demo") &&
    target.databaseName === "mai_demo_readiness"
  ) return;
  throw new Error(
    `Demo reset target "${target.environment}/${target.databaseName}" is unsafe; expected test or local-demo with database mai_demo_readiness.`,
  );
}

/** Runs the deterministic synthetic investor workflow through governed models.
 *
 * @example await runSyntheticInvestorDemo(manifest, fixtureRoot, target)
 */
export async function runSyntheticInvestorDemo(
  manifest: DemoManifest,
  fixtureRoot: URL,
  target: DemoResetTarget,
  authorizedHuman: ActorReference = banker,
): Promise<DemoReadinessResult> {
  return (await buildSyntheticInvestorDemo(
    manifest,
    fixtureRoot,
    target,
    authorizedHuman,
  )).result;
}

export async function buildSyntheticInvestorDemo(
  manifest: DemoManifest,
  fixtureRoot: URL,
  target: DemoResetTarget,
  authorizedHuman: ActorReference = banker,
): Promise<SyntheticInvestorDemoWorkflow> {
  assertSafeDemoResetTarget(target);
  assertManifest(manifest);
  const ingestion = await ingestDocuments(manifest, fixtureRoot);
  const versions = ingestion.versions;
  const processingRuns = processDemoDocumentVersions(versions);
  const evidence = versions.map((version, index) =>
    createVersionEvidence(version, manifest.documents[index])
  );
  const basis = await createBasis(evidence);
  const finding = createDemoFinding(basis);
  const calculation = createDemoCalculation(evidence);
  const authority = proveHumanAuthority(
    demoScope,
    finding,
    basis,
    authorizedHuman,
    agent,
    fixedTime,
  );
  const artifact = createDemoArtifact(
    demoScope,
    versions,
    finding.id,
    calculation,
    authorizedHuman,
    fixedTime,
  );
  const datasetDigest = await digest(stableJson(manifest));
  const result: DemoReadinessResult = {
    ...target,
    datasetId: manifest.datasetId,
    datasetDigest,
    auditEventId: `audit_demo-readiness-${datasetDigest.slice(0, 32)}`,
    labels: {
      synthetic: true,
      customerData: false,
      provider: "managed_local",
      calculation: "deterministic",
      persistence: "process_local",
    },
    documentVersions: versions.map((version) => ({
      documentId: version.documentId,
      documentVersionId: version.documentVersionId,
      sourceId: version.source.sourceId,
      checksum: version.checksum.value,
    })),
    processingRuns: processingRuns.map((run) => ({
      processingRunId: run.processingRunId,
      documentVersionId: run.documentVersionId,
      state: "succeeded",
      processorVersion: "synthetic-plaintext-v1",
    })),
    evidenceIds: evidence.map((record) => record.evidenceId),
    citations: evidence.map((record) => ({
      citationId: record.citation.citationId,
      documentVersionId: record.citation.source.documentVersionId,
      checksum: record.citation.source.checksum.value,
      location: record.citation.source.location as {
        readonly kind: "line";
        readonly startLine: number;
        readonly endLine: number;
      },
      excerpt: requiredCitationExcerpt(record),
      processingVersion: "synthetic-plaintext-v1",
    })),
    missingCategories: missingCategories(manifest),
    limitations: [
      "Process-local evidence does not certify PostgreSQL reset or persistence.",
      "Frontend screen traversal remains blocked by unregistered or pending adapter contracts.",
      "Live external VDR and production infrastructure certification are deferred.",
    ],
    finding: { id: finding.id, state: "proposed" },
    calculation: {
      id: calculation.calculationId,
      enterpriseValueBrl: calculation.output.enterpriseValueBrl as number,
      equityValueBrl: calculation.output.equityValueBrl as number,
      algorithmVersion: calculation.algorithmVersion,
    },
    authority: authority.result,
    artifact: artifact.result,
  };
  return {
    result,
    documents: ingestion.documents,
    versions,
    processingRuns,
    evidence,
    finding,
    calculation,
    decisionRequest: authority.request,
    decisionRecord: authority.record,
    deliverable: artifact.deliverable,
    sourceSnapshot: artifact.snapshot,
    deliverableVersion: artifact.version,
  };
}

function requiredCitationExcerpt(record: EvidenceRecord): string {
  const excerpt = record.citation.excerpt;
  if (excerpt !== undefined && excerpt.trim()) return excerpt;
  throw new Error(
    `Synthetic citation "${record.citation.citationId}" has no excerpt; expected exact source text.`,
  );
}

async function ingestDocuments(
  manifest: DemoManifest,
  fixtureRoot: URL,
): Promise<{
  readonly documents: readonly Document[];
  readonly versions: readonly DocumentVersion[];
}> {
  const store = new FakeObjectStore();
  const versions = new MemoryDocumentVersions();
  const upload = new DocumentUploadService({ objectStore: store, versions });
  const documents: Document[] = [];
  for (const entry of manifest.documents) {
    documents.push(await ingestDocument(entry, fixtureRoot, upload));
  }
  return { documents: Object.freeze(documents), versions: versions.all() };
}

async function ingestDocument(
  entry: DemoDocumentManifest,
  fixtureRoot: URL,
  upload: DocumentUploadService,
): Promise<Document> {
  const content = await readConfinedFixture(entry.path, fixtureRoot);
  assertCitationExcerpt(entry, content);
  const source = managedSource(entry);
  const document = createDocument({
    documentId: requiredDocumentId(entry.documentId),
    scope: demoScope,
    name: entry.name,
    mimeType: entry.mimeType,
    classification: entry.classification,
    aggregateVersion: 1,
    createdAt: fixedTime,
    updatedAt: fixedTime,
  });
  const result = await upload.complete(
    await upload.negotiate({
      document,
      documentVersionId: requiredDocumentVersionId(entry.documentVersionId),
      versionNumber: 1,
      source,
      objectReferenceId: requiredObjectReferenceId(entry.objectReferenceId),
      objectKey: `investor-demo/${entry.path}`,
      storageVersion: "synthetic-v1",
      requestedAt: fixedTime,
    }),
    content,
  );
  if (result.version.checksum.value !== entry.checksum) {
    throw new Error(
      `Synthetic document "${entry.path}" checksum "${result.version.checksum.value}" did not match expected "${entry.checksum}".`,
    );
  }
  return document;
}

function managedSource(entry: DemoDocumentManifest) {
  const provider = createProviderMarker("managed_local");
  return createDocumentSource({
    sourceId: requiredSourceId(entry.sourceId),
    scope: demoScope,
    connectorAccount: {
      connectorAccountId: requiredConnectorId("connector_managed-local"),
      tenantId: demoScope.tenantId,
      provider,
    },
    provider,
    providerWorkspaceId: "workspace_investor-demo",
    providerDocumentId: entry.documentId,
    providerVersion: "synthetic-v1",
    aggregateVersion: 1,
    createdAt: fixedTime,
    updatedAt: fixedTime,
  });
}

function createVersionEvidence(
  version: DocumentVersion,
  entry: DemoDocumentManifest,
): EvidenceRecord {
  const suffix = version.documentId.slice("doc_".length);
  const citation = createCitation({
    citationId: requiredValue(parseCitationId(`citation_${suffix}`)),
    scope: demoScope,
    source: {
      documentVersionId: version.documentVersionId,
      checksum: version.checksum,
      location: {
        kind: "line",
        startLine: entry.citation.startLine,
        endLine: entry.citation.endLine,
      },
      classification: version.classification,
      processingVersion: "synthetic-plaintext-v1",
    },
    excerpt: entry.citation.excerpt,
    freshness: createFreshness({ state: "current", checkedAt: fixedTime }),
    createdAt: fixedTime,
  });
  return createEvidenceRecord({
    evidenceId: requiredValue(parseEvidenceId(`evidence_${suffix}`)),
    scope: demoScope,
    citation,
    createdAt: fixedTime,
  });
}

function assertCitationExcerpt(
  entry: DemoDocumentManifest,
  content: Uint8Array,
): void {
  const lines = new TextDecoder().decode(content).split("\n");
  const excerpt = lines.slice(
    entry.citation.startLine - 1,
    entry.citation.endLine,
  ).join("\n");
  if (excerpt === entry.citation.excerpt) return;
  throw new Error(
    `Synthetic citation for "${entry.path}" resolved to "${excerpt}"; expected the manifest-pinned excerpt.`,
  );
}

async function createBasis(evidence: readonly EvidenceRecord[]) {
  const references = evidence.map((record) => ({
    kind: "evidence" as const,
    evidenceId: record.evidenceId,
  }));
  return createExactEvidenceBasis({
    scope: demoScope,
    references,
    basisDigest: await digest(stableJson(references)),
    capturedAt: fixedTime,
  });
}

function createDemoFinding(
  basis: ReturnType<typeof createExactEvidenceBasis>,
) {
  return createFinding({
    id: requiredValue(parseFindingId("finding_customer-concentration")),
    scope: demoScope,
    title: "Customer concentration requires buyer review",
    statement: "The largest synthetic customer represents 31% of 2025 revenue.",
    basis,
    proposedBy: agent,
    now: fixedTime,
  });
}

function createDemoCalculation(evidence: readonly EvidenceRecord[]) {
  return createCalculation({
    calculationId: requiredValue(parseCalculationId("calc_enterprise-value")),
    scope: demoScope,
    inputReferences: evidence.slice(1, 3).map((record) => ({
      kind: "evidence" as const,
      evidenceId: record.evidenceId,
    })),
    formula:
      "enterpriseValue = EBITDA * 6.5; equityValue = enterpriseValue - debt + cash",
    algorithmVersion: "deterministic-valuation-v1",
    output: { enterpriseValueBrl: 98_150_000, equityValueBrl: 79_450_000 },
    freshness: createFreshness({ state: "current", checkedAt: fixedTime }),
    createdAt: fixedTime,
  });
}

function missingCategories(manifest: DemoManifest): readonly string[] {
  const present = new Set(
    manifest.documents.map((entry) => entry.classification),
  );
  return manifest.expectedCategories.filter((category) =>
    !present.has(category)
  );
}

function assertManifest(manifest: DemoManifest): void {
  if (
    !manifest.synthetic || manifest.customerData ||
    manifest.documents.length === 0
  ) {
    throw new Error(
      `Demo manifest "${manifest.datasetId}" is unsafe; expected a non-empty synthetic, non-customer dataset.`,
    );
  }
}

async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_, item) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      return item;
    }
    return Object.fromEntries(
      Object.entries(item as Record<string, unknown>).sort(([left], [right]) =>
        left.localeCompare(right)
      ),
    );
  });
}

function requiredDocumentId(value: string): DocumentId {
  return requiredValue(parseDocumentId(value));
}

function requiredDocumentVersionId(value: string): DocumentVersionId {
  return requiredValue(parseDocumentVersionId(value));
}

function requiredSourceId(value: string): DocumentSourceId {
  return requiredValue(parseDocumentSourceId(value));
}

function requiredObjectReferenceId(value: string): ObjectReferenceId {
  return requiredValue(parseObjectReferenceId(value));
}

function requiredConnectorId(value: string): ConnectorAccountId {
  return requiredValue(parseConnectorAccountId(value));
}

function requiredValue<T>(
  result: { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  if (result.ok) return result.value;
  throw new Error(
    "Synthetic identifier is invalid; expected a canonical semantic identifier.",
  );
}
