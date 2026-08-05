import type { EvidenceScope } from "./model.ts";

export function scopeParameters(scope: EvidenceScope): string[] {
  return [scope.tenantId, scope.workspaceId, scope.dealId];
}

export function citationSelectColumns(): string {
  return `SELECT citation_id AS "citationId", tenant_id AS "tenantId", workspace_id AS "workspaceId", deal_id AS "dealId", document_version_id AS "documentVersionId", checksum_algorithm AS "checksumAlgorithm", checksum_value AS "checksumValue", location, classification, processing_version AS "processingVersion", excerpt, freshness_state AS "freshnessState", freshness_reason AS "freshnessReason", freshness_checked_at AS "freshnessCheckedAt", created_at AS "createdAt" FROM evidence_knowledge.citations`;
}

export function evidenceSelectColumns(): string {
  return `SELECT evidence_records.evidence_id AS "evidenceId", evidence_records.tenant_id AS "tenantId", evidence_records.workspace_id AS "workspaceId", evidence_records.deal_id AS "dealId", evidence_records.citation_id AS "citationId", evidence_records.created_at AS "createdAt", citations.document_version_id AS "documentVersionId", citations.checksum_algorithm AS "checksumAlgorithm", citations.checksum_value AS "checksumValue", citations.location, citations.classification, citations.processing_version AS "processingVersion", citations.excerpt, citations.freshness_state AS "freshnessState", citations.freshness_reason AS "freshnessReason", citations.freshness_checked_at AS "freshnessCheckedAt" FROM evidence_knowledge.evidence_records JOIN evidence_knowledge.citations USING (tenant_id, workspace_id, deal_id, citation_id)`;
}

export function factSelectColumns(): string {
  return `SELECT fact_id AS "factId", tenant_id AS "tenantId", workspace_id AS "workspaceId", deal_id AS "dealId", category, status, current_fact_version_id AS "currentFactVersionId", aggregate_version AS "aggregateVersion", created_at AS "createdAt" FROM evidence_knowledge.facts`;
}

export function factVersionSelectColumns(): string {
  return `SELECT fact_version_id AS "factVersionId", fact_id AS "factId", tenant_id AS "tenantId", workspace_id AS "workspaceId", deal_id AS "dealId", statement, category, status, version_number AS "versionNumber", citation_ids AS "citationIds", supersedes_fact_version_id AS "supersedesFactVersionId", created_at AS "createdAt" FROM evidence_knowledge.fact_versions`;
}

export function calculationSelectColumns(): string {
  return `SELECT calculation_id AS "calculationId", tenant_id AS "tenantId", workspace_id AS "workspaceId", deal_id AS "dealId", input_references AS "inputReferences", formula, algorithm_version AS "algorithmVersion", output, freshness_state AS "freshnessState", freshness_reason AS "freshnessReason", freshness_checked_at AS "freshnessCheckedAt", created_at AS "createdAt" FROM evidence_knowledge.calculations`;
}
