export interface LocalMvpDatabasePort {
  query<TRow extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<
    { readonly rows: readonly TRow[]; readonly rowCount?: number | null }
  >;
}

const localScenarioTables = Object.freeze([
  "demo_readiness.workflow_snapshots",
  "audit_activity.redaction_overlays",
  "audit_activity.audit_events",
  "deliverables.deliverable_versions",
  "deliverables.source_snapshots",
  "deliverables.deliverables",
  "diligence_decisions.decision_records",
  "diligence_decisions.decision_requests",
  "diligence_decisions.findings",
  "evidence_knowledge.calculation_inputs",
  "evidence_knowledge.calculations",
  "evidence_knowledge.evidence_records",
  "evidence_knowledge.citations",
  "documents.derived_artifacts",
  "documents.processing_runs",
  "documents.document_versions",
  "documents.object_references",
  "documents.document_sources",
  "documents.documents",
  "agent_runtime.runs",
  "agent_runtime.plan_versions",
  "agent_runtime.missions",
  "deal_governance.governance_aggregates",
  "closing.workspaces",
  "negotiation.rounds",
  "matching.candidate_projections",
  "matching.runs",
  "matching.criteria",
  "financial_risk.results",
  "valuation.results",
  "valuation.inputs",
  "valuation.scenarios",
  "valuation.models",
  "notifications.projections",
  "work_management.tasks_current",
  "work_management.workstreams_current",
  "organization_registry.organizations",
  "deal_management.deals",
  "access.role_policies",
  "iam.sessions",
  "iam.memberships",
  "iam.workspaces",
  "iam.user_identities",
  "iam.institutions",
]);

/** Erases only the guarded local database before deterministic reseeding. */
export async function resetLocalMvpScenario(
  database: LocalMvpDatabasePort,
): Promise<void> {
  const result = await database.query<{ readonly database_name: string }>(
    `SELECT current_database() AS database_name`,
  );
  const databaseName = result.rows[0]?.database_name;
  assertLocalDatabase(databaseName);
  await database.query(
    `TRUNCATE TABLE ${localScenarioTables.join(", ")} RESTART IDENTITY CASCADE`,
  );
}

function assertLocalDatabase(databaseName: string | undefined): void {
  if (databaseName === "mai_local") return;
  throw new Error(
    `Local MVP reset target "${databaseName}" is unsafe; expected current_database() to equal mai_local.`,
  );
}
