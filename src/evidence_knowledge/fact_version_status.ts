import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { EvidenceScope, FactStatus } from "./model.ts";
import { scopeParameters } from "./repository_sql.ts";

export async function loadEffectiveFactVersionStatus(
  transaction: TransactionHandle,
  scope: EvidenceScope,
  factVersionId: string,
  declaredStatus: FactStatus,
): Promise<FactStatus> {
  const result = await transaction.query<{ toStatus: FactStatus }>(
    `SELECT to_status AS "toStatus" FROM evidence_knowledge.fact_transition_history WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND fact_version_id=$4 ORDER BY transition_sequence DESC LIMIT 1`,
    [...scopeParameters(scope), factVersionId],
  );
  return result.rows[0]?.toStatus ?? declaredStatus;
}
