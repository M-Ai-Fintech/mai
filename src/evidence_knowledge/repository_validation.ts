import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type {
  Calculation,
  CalculationInputReference,
  EvidenceScope,
} from "./model.ts";
import type { ProvenanceLink } from "./provenance.ts";
import { scopeParameters } from "./repository_sql.ts";

export async function validateCalculationInputs(
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

export async function assertLineageNodeExists(
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

export function inputId(input: CalculationInputReference): string {
  if (input.kind === "evidence") return input.evidenceId;
  if (input.kind === "fact_version") return input.factVersionId;
  if (input.kind === "interpretation") return input.interpretationId;
  return input.assumptionId;
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
