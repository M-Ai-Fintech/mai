import type { TransactionHandle } from "../platform/persistence/v1.ts";
import { VersionConflictError } from "../platform/persistence/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import type { Citation } from "./citation.ts";
import type {
  CalculationId,
  CitationId,
  EvidenceId,
  FactId,
  FactVersionId,
} from "./ids.ts";
import type {
  Assumption,
  Calculation,
  CalculationInputReference,
  EvidenceRecord,
  EvidenceScope,
  Fact,
  FactStatus,
  FactVersion,
  IndexMetadata,
  Interpretation,
  InvalidationRecord,
} from "./model.ts";
import type { ProvenanceLink } from "./provenance.ts";
import { assertFactStatusTransition } from "./fact.ts";
import { loadEffectiveFactVersionStatus } from "./fact_version_status.ts";
import {
  calculationSelectColumns,
  citationSelectColumns,
  evidenceSelectColumns,
  factSelectColumns,
  factVersionSelectColumns,
  scopeParameters,
} from "./repository_sql.ts";
import {
  rowToCalculation,
  rowToCitation,
  rowToEvidence,
  rowToFact,
  rowToFactVersion,
} from "./repository_rows.ts";

export class EvidenceKnowledgeRepository {
  async insertCitation(
    transaction: TransactionHandle,
    citation: Citation,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO evidence_knowledge.citations (citation_id, tenant_id, workspace_id, deal_id, document_version_id, checksum_algorithm, checksum_value, location, classification, processing_version, excerpt, freshness_state, freshness_reason, freshness_checked_at, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        citation.citationId,
        ...scopeParameters(citation.scope),
        citation.source.documentVersionId,
        citation.source.checksum.algorithm,
        citation.source.checksum.value,
        JSON.stringify(citation.source.location),
        citation.source.classification,
        citation.source.processingVersion,
        citation.excerpt,
        citation.freshness.state,
        citation.freshness.reason ?? null,
        citation.freshness.checkedAt,
        citation.createdAt,
      ],
    );
  }
  async findCitation(
    transaction: TransactionHandle,
    scope: EvidenceScope,
    citationId: CitationId,
  ): Promise<Citation | undefined> {
    const result = await transaction.query(
      `${citationSelectColumns()} WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND citation_id=$4`,
      [...scopeParameters(scope), citationId],
    );
    return result.rows[0] === undefined
      ? undefined
      : rowToCitation(result.rows[0]);
  }
  async insertEvidence(
    transaction: TransactionHandle,
    evidence: EvidenceRecord,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO evidence_knowledge.evidence_records (evidence_id, tenant_id, workspace_id, deal_id, citation_id, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        evidence.evidenceId,
        ...scopeParameters(evidence.scope),
        evidence.citation.citationId,
        evidence.createdAt,
      ],
    );
  }
  async findEvidence(
    transaction: TransactionHandle,
    scope: EvidenceScope,
    evidenceId: EvidenceId,
  ): Promise<EvidenceRecord | undefined> {
    const result = await transaction.query(
      `${evidenceSelectColumns()} WHERE evidence_records.tenant_id=$1 AND evidence_records.workspace_id=$2 AND evidence_records.deal_id=$3 AND evidence_records.evidence_id=$4`,
      [...scopeParameters(scope), evidenceId],
    );
    return result.rows[0] === undefined
      ? undefined
      : rowToEvidence(result.rows[0]);
  }
  async insertFact(transaction: TransactionHandle, fact: Fact): Promise<void> {
    await transaction.query(
      `INSERT INTO evidence_knowledge.facts (fact_id, tenant_id, workspace_id, deal_id, category, status, aggregate_version, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        fact.factId,
        ...scopeParameters(fact.scope),
        fact.category,
        fact.status,
        fact.aggregateVersion,
        fact.createdAt,
      ],
    );
  }
  async insertFactVersion(
    transaction: TransactionHandle,
    version: FactVersion,
  ): Promise<void> {
    if (version.supersedesFactVersionId !== undefined) {
      const prior = await transaction.query<{
        factId: string;
        versionNumber: string;
        status: string;
      }>(
        `SELECT fact_id AS "factId", version_number AS "versionNumber", status FROM evidence_knowledge.fact_versions WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND fact_version_id=$4`,
        [...scopeParameters(version.scope), version.supersedesFactVersionId],
      );
      const row = prior.rows[0];
      if (row === undefined) {
        throw new Error(
          `Superseded fact version "${version.supersedesFactVersionId}" was not found in scope; expected an approved prior version.`,
        );
      }
      const effectiveStatus = await loadEffectiveFactVersionStatus(
        transaction,
        version.scope,
        version.supersedesFactVersionId,
        row.status as FactStatus,
      );
      if (
        row.factId !== version.factId ||
        Number(row.versionNumber) >= version.versionNumber ||
        effectiveStatus !== "approved"
      ) {
        throw new Error(
          `Superseded fact version "${version.supersedesFactVersionId}" is invalid; expected the same fact, a lower version, and approved status.`,
        );
      }
    }
    await transaction.query(
      `INSERT INTO evidence_knowledge.fact_versions (fact_version_id, fact_id, tenant_id, workspace_id, deal_id, statement, category, status, version_number, citation_ids, supersedes_fact_version_id, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        version.factVersionId,
        version.factId,
        ...scopeParameters(version.scope),
        version.statement,
        version.category,
        version.status,
        version.versionNumber,
        JSON.stringify(version.citationIds),
        version.supersedesFactVersionId ?? null,
        version.createdAt,
      ],
    );
    for (const citationId of version.citationIds) {
      await transaction.query(
        `INSERT INTO evidence_knowledge.fact_version_citations (tenant_id, workspace_id, deal_id, fact_id, fact_version_id, citation_id) VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          ...scopeParameters(version.scope),
          version.factId,
          version.factVersionId,
          citationId,
        ],
      );
    }
  }
  async findFact(
    transaction: TransactionHandle,
    scope: EvidenceScope,
    factId: FactId,
  ): Promise<Fact | undefined> {
    const result = await transaction.query(
      `${factSelectColumns()} WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND fact_id=$4`,
      [...scopeParameters(scope), factId],
    );
    return result.rows[0] === undefined ? undefined : rowToFact(result.rows[0]);
  }
  async findFactVersion(
    transaction: TransactionHandle,
    scope: EvidenceScope,
    factVersionId: FactVersionId,
  ): Promise<FactVersion | undefined> {
    const result = await transaction.query(
      `${factVersionSelectColumns()} WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND fact_version_id=$4`,
      [...scopeParameters(scope), factVersionId],
    );
    if (result.rows[0] === undefined) return undefined;
    const version = rowToFactVersion(result.rows[0]);
    const status = await loadEffectiveFactVersionStatus(
      transaction,
      scope,
      factVersionId,
      version.status,
    );
    return Object.freeze({ ...version, status });
  }
  async transitionFactStatus(
    transaction: TransactionHandle,
    scope: EvidenceScope,
    factId: FactId,
    expectedVersion: AggregateVersion,
    status: FactStatus,
  ): Promise<Fact> {
    const locked = await transaction.query(
      `${factSelectColumns()} WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND fact_id=$4 FOR UPDATE`,
      [...scopeParameters(scope), factId],
    );
    const current = locked.rows[0] === undefined
      ? undefined
      : rowToFact(locked.rows[0]);
    if (current === undefined || current.aggregateVersion !== expectedVersion) {
      throw new VersionConflictError(
        "VERSION_CONFLICT",
        factId,
        expectedVersion,
      );
    }
    assertFactStatusTransition(current.status, status);
    const updated = await transaction.query(
      `UPDATE evidence_knowledge.facts SET status=$5, aggregate_version=aggregate_version+1 WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND fact_id=$4 AND aggregate_version=$6 RETURNING fact_id AS "factId", tenant_id AS "tenantId", workspace_id AS "workspaceId", deal_id AS "dealId", category, status, aggregate_version AS "aggregateVersion", created_at AS "createdAt"`,
      [...scopeParameters(scope), factId, status, expectedVersion],
    );
    if (updated.rowCount !== 1) {
      throw new VersionConflictError(
        "VERSION_CONFLICT",
        factId,
        expectedVersion,
      );
    }
    return rowToFact(updated.rows[0]);
  }
  async insertCalculation(
    transaction: TransactionHandle,
    calculation: Calculation,
  ): Promise<void> {
    await validateCalculationInputs(transaction, calculation);
    await transaction.query(
      `INSERT INTO evidence_knowledge.calculations (calculation_id, tenant_id, workspace_id, deal_id, input_references, formula, algorithm_version, output, freshness_state, freshness_reason, freshness_checked_at, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        calculation.calculationId,
        ...scopeParameters(calculation.scope),
        JSON.stringify(calculation.inputReferences),
        calculation.formula,
        calculation.algorithmVersion,
        JSON.stringify(calculation.output),
        calculation.freshness.state,
        calculation.freshness.reason ?? null,
        calculation.freshness.checkedAt,
        calculation.createdAt,
      ],
    );
    for (const input of calculation.inputReferences) {
      await this.insertCalculationInput(
        transaction,
        calculation.scope,
        calculation.calculationId,
        input,
      );
    }
  }

  async insertInterpretation(
    transaction: TransactionHandle,
    interpretation: Interpretation,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO evidence_knowledge.interpretations (interpretation_id, tenant_id, workspace_id, deal_id, statement, evidence_ids, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        interpretation.interpretationId,
        ...scopeParameters(interpretation.scope),
        interpretation.statement,
        JSON.stringify(interpretation.evidenceIds),
        interpretation.status,
        interpretation.createdAt,
      ],
    );
    for (const evidenceId of interpretation.evidenceIds) {
      await transaction.query(
        `INSERT INTO evidence_knowledge.interpretation_evidence (tenant_id, workspace_id, deal_id, interpretation_id, evidence_id) VALUES ($1,$2,$3,$4,$5)`,
        [
          ...scopeParameters(interpretation.scope),
          interpretation.interpretationId,
          evidenceId,
        ],
      );
    }
  }

  async insertAssumption(
    transaction: TransactionHandle,
    assumption: Assumption,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO evidence_knowledge.assumptions (assumption_id, tenant_id, workspace_id, deal_id, statement, rationale, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        assumption.assumptionId,
        ...scopeParameters(assumption.scope),
        assumption.statement,
        assumption.rationale ?? null,
        assumption.status,
        assumption.createdAt,
      ],
    );
  }

  private async insertCalculationInput(
    transaction: TransactionHandle,
    scope: EvidenceScope,
    calculationId: CalculationId,
    input: CalculationInputReference,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO evidence_knowledge.calculation_inputs (tenant_id, workspace_id, deal_id, calculation_id, input_kind, input_id) VALUES ($1,$2,$3,$4,$5,$6)`,
      [...scopeParameters(scope), calculationId, input.kind, inputId(input)],
    );
  }

  async insertProvenanceLink(
    transaction: TransactionHandle,
    link: ProvenanceLink,
  ): Promise<void> {
    await assertLineageNodeExists(transaction, link.scope, link.source);
    await assertLineageNodeExists(transaction, link.scope, link.target);
    await transaction.query(
      `INSERT INTO evidence_knowledge.provenance_links (provenance_id,tenant_id,workspace_id,deal_id,relation,source_kind,source_id,target_kind,target_id,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        link.provenanceId,
        ...scopeParameters(link.scope),
        link.relation,
        link.source.kind,
        link.source.id,
        link.target.kind,
        link.target.id,
        link.createdAt,
      ],
    );
  }

  async insertInvalidation(
    transaction: TransactionHandle,
    record: InvalidationRecord,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO evidence_knowledge.invalidations (invalidation_id,tenant_id,workspace_id,deal_id,source_kind,source_id,reason,event_identity,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        record.invalidationId,
        ...scopeParameters(record.scope),
        record.sourceKind,
        record.sourceId,
        record.reason,
        record.eventIdentity,
        record.createdAt,
      ],
    );
  }

  async insertIndexMetadata(
    transaction: TransactionHandle,
    metadata: IndexMetadata,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO evidence_knowledge.index_metadata (index_id,tenant_id,workspace_id,deal_id,document_version_id,classification,processing_version,index_version,state,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        metadata.indexId,
        ...scopeParameters(metadata.scope),
        metadata.documentVersionId,
        metadata.classification,
        metadata.processingVersion,
        metadata.indexVersion,
        metadata.state,
        metadata.createdAt,
      ],
    );
  }
  async findCalculation(
    transaction: TransactionHandle,
    scope: EvidenceScope,
    calculationId: CalculationId,
  ): Promise<Calculation | undefined> {
    const result = await transaction.query(
      `${calculationSelectColumns()} WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND calculation_id=$4`,
      [...scopeParameters(scope), calculationId],
    );
    return result.rows[0] === undefined
      ? undefined
      : rowToCalculation(result.rows[0]);
  }
}

function inputId(input: CalculationInputReference): string {
  if (input.kind === "evidence") return input.evidenceId;
  if (input.kind === "fact_version") return input.factVersionId;
  if (input.kind === "interpretation") return input.interpretationId;
  return input.assumptionId;
}

async function validateCalculationInputs(
  transaction: TransactionHandle,
  calculation: Calculation,
): Promise<void> {
  const seen = new Set<string>();
  for (const input of calculation.inputReferences) {
    const key = `${input.kind}:${inputId(input)}`;
    if (!seen.add(key)) {
      throw new Error(
        `Calculation input "${key}" is duplicated; expected unique provenance references.`,
      );
    }
    const target = calculationInputTarget(input);
    const result = await transaction.query(
      `SELECT 1 FROM evidence_knowledge.${target.table} WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND ${target.column}=$4`,
      [...scopeParameters(calculation.scope), target.id],
    );
    if (result.rowCount === 1) continue;
    throw new Error(
      `Calculation input "${key}" was not found in scope; expected an existing ${input.kind} target.`,
    );
  }
}

function calculationInputTarget(
  input: CalculationInputReference,
): { readonly table: string; readonly column: string; readonly id: string } {
  if (input.kind === "evidence") {
    return {
      table: "evidence_records",
      column: "evidence_id",
      id: input.evidenceId,
    };
  }
  if (input.kind === "fact_version") {
    return {
      table: "fact_versions",
      column: "fact_version_id",
      id: input.factVersionId,
    };
  }
  if (input.kind === "interpretation") {
    return {
      table: "interpretations",
      column: "interpretation_id",
      id: input.interpretationId,
    };
  }
  return {
    table: "assumptions",
    column: "assumption_id",
    id: input.assumptionId,
  };
}

async function assertLineageNodeExists(
  transaction: TransactionHandle,
  scope: EvidenceScope,
  node: ProvenanceLink["source"],
): Promise<void> {
  const table = node.kind === "evidence" ? "evidence_records" : "fact_versions";
  const column = node.kind === "evidence" ? "evidence_id" : "fact_version_id";
  const result = await transaction.query(
    `SELECT 1 FROM evidence_knowledge.${table} WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND ${column}=$4`,
    [...scopeParameters(scope), node.id],
  );
  if (result.rowCount === 1) return;
  throw new Error(
    `Provenance ${node.kind} "${node.id}" was not found in scope; expected an existing lineage node.`,
  );
}
