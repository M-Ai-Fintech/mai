import type { DocumentClassification } from "../documents/model.ts";

export interface DemoResetTarget {
  readonly environment: "local-demo" | "test";
  readonly databaseName: "mai_demo_readiness";
}

export interface DemoDocumentManifest {
  readonly documentId: string;
  readonly documentVersionId: string;
  readonly sourceId: string;
  readonly objectReferenceId: string;
  readonly path: string;
  readonly name: string;
  readonly mimeType: string;
  readonly classification: DocumentClassification;
  readonly checksum: string;
  readonly citation: {
    readonly startLine: number;
    readonly endLine: number;
    readonly excerpt: string;
  };
}

export interface DemoManifest {
  readonly schemaVersion: 1;
  readonly datasetId: string;
  readonly synthetic: true;
  readonly customerData: false;
  readonly expectedCategories: readonly DocumentClassification[];
  readonly documents: readonly DemoDocumentManifest[];
}

export interface DemoReadinessResult {
  readonly environment: "local-demo" | "test";
  readonly databaseName: "mai_demo_readiness";
  readonly datasetId: string;
  readonly datasetDigest: string;
  readonly auditEventId: string;
  readonly labels: {
    readonly synthetic: true;
    readonly customerData: false;
    readonly provider: "managed_local";
    readonly calculation: "deterministic";
    readonly persistence: "process_local" | "postgres_context_records";
  };
  readonly documentVersions: readonly {
    readonly documentId: string;
    readonly documentVersionId: string;
    readonly sourceId: string;
    readonly checksum: string;
  }[];
  readonly processingRuns: readonly {
    readonly processingRunId: string;
    readonly documentVersionId: string;
    readonly state: "succeeded";
    readonly processorVersion: "synthetic-plaintext-v1";
  }[];
  readonly evidenceIds: readonly string[];
  readonly citations: readonly {
    readonly citationId: string;
    readonly documentVersionId: string;
    readonly checksum: string;
    readonly location: {
      readonly kind: "line";
      readonly startLine: number;
      readonly endLine: number;
    };
    readonly excerpt: string;
    readonly processingVersion: "synthetic-plaintext-v1";
  }[];
  readonly missingCategories: readonly string[];
  readonly limitations: readonly string[];
  readonly finding: { readonly id: string; readonly state: "proposed" };
  readonly calculation: {
    readonly id: string;
    readonly enterpriseValueBrl: number;
    readonly equityValueBrl: number;
    readonly algorithmVersion: string;
  };
  readonly authority: {
    readonly agentDecisionRejected: true;
    readonly humanDecisionRecordId: string;
  };
  readonly artifact: {
    readonly deliverableId: string;
    readonly versionId: string;
    readonly sourceSnapshotId: string;
    readonly sourceChecksums: readonly string[];
  };
}

export type DemoScreenFamily =
  | "command-center"
  | "deals-portfolio"
  | "deal-overview"
  | "documents-vdr"
  | "diligence-decision-room"
  | "valuation-lab"
  | "matching-universe"
  | "negotiation-room"
  | "tasks-approvals"
  | "deal-activity-audit"
  | "deliverables-exports";

export interface DemoScreenReadModel {
  readonly family: DemoScreenFamily;
  readonly items: readonly {
    readonly id: string;
    readonly title: string;
    readonly summary: string;
    readonly status: string;
  }[];
  readonly selectedItemId?: string;
}

export interface DemoShellReadModel {
  readonly organization: { readonly id: string; readonly name: string };
  readonly deal: {
    readonly id: string;
    readonly name: string;
    readonly phase: string;
  };
  readonly permissions: readonly ["workspace", "deal"];
  readonly counts: {
    readonly tasks: number;
    readonly approvals: number;
    readonly notifications: number;
  };
}
