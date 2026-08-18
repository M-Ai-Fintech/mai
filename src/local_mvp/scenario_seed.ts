import { localMvpIdentity, type LocalMvpSqlPort } from "./identity_seed.ts";
import { localMvpDeals } from "./portfolio_seed.ts";

interface LocalMvpScenarioContext {
  readonly name: string;
  readonly statement: string;
  readonly actorScoped?: boolean;
  readonly payload: Readonly<Record<string, unknown>>;
}

const focalDeal = localMvpDeals[0];

export const localMvpScenarioContexts: readonly LocalMvpScenarioContext[] =
  Object.freeze([
    {
      name: "organization_registry",
      statement: `INSERT INTO organization_registry.organizations
        (aggregate_id, tenant_id, workspace_id, version, state, name,
         normalized_name, document, created_at, updated_at)
       VALUES
         ('org_serra-azul', $1, $2, 1, 'active', 'Serra Azul Logistica S.A.',
          'serra azul logistica s.a.',
          $5::jsonb || jsonb_build_object('dealId', $3::text), $4, $4),
         ('org_atlas-advisory', $1, $2, 1, 'active', 'Atlas M&A Advisory',
          'atlas m&a advisory',
          $5::jsonb || jsonb_build_object('dealId', $3::text), $4, $4)
       ON CONFLICT (aggregate_id) DO UPDATE SET document = EXCLUDED.document,
         updated_at = EXCLUDED.updated_at`,
      payload: {
        scenario: "serra_azul_sell_side",
        organizations: ["org_serra-azul", "org_atlas-advisory"],
      },
    },
    {
      name: "work_management",
      statement: `WITH seeded_workstream AS (
        INSERT INTO work_management.workstreams_current
          (workstream_id, tenant_id, workspace_id, deal_id, version, document,
           created_at, updated_at)
        VALUES ('workstream_diligence', $1, $2, $3, 1,
          $5::jsonb -> 'workstream', $4, $4)
        ON CONFLICT (tenant_id, workspace_id, deal_id, workstream_id)
        DO UPDATE SET document = EXCLUDED.document, updated_at = EXCLUDED.updated_at
        RETURNING workstream_id
      )
      INSERT INTO work_management.tasks_current
        (task_id, tenant_id, workspace_id, deal_id, workstream_id, version,
         document, created_at, updated_at)
      SELECT 'task_validate-tax-evidence', $1, $2, $3, workstream_id, 1,
        $5::jsonb -> 'task', $4, $4 FROM seeded_workstream
      ON CONFLICT (tenant_id, workspace_id, deal_id, task_id)
      DO UPDATE SET document = EXCLUDED.document, updated_at = EXCLUDED.updated_at`,
      payload: {
        workstream: {
          aggregateType: "workstream",
          id: "workstream_diligence",
          name: "Diligence and decision readiness",
          ownerId: localMvpIdentity.actorId,
          state: "planned",
          taskIds: ["task_validate-tax-evidence"],
          version: 1,
        },
        task: {
          aggregateType: "task",
          id: "task_validate-tax-evidence",
          workstreamId: "workstream_diligence",
          title: "Validate tax evidence",
          assigneeId: localMvpIdentity.actorId,
          state: "open",
          version: 1,
        },
      },
    },
    {
      name: "notifications",
      actorScoped: true,
      statement: `INSERT INTO notifications.projections
        (notification_id, tenant_id, workspace_id, deal_id, recipient_id,
         source_event_id, source_event_type, notification_type, title, body,
         created_at, delivery_state, idempotency_key)
       VALUES ('notification_local-review', $1, $2, $3, $4,
         COALESCE($6::jsonb ->> 'sourceEventId', 'event_local-review'),
         'approval.requested', 'approval_required',
         'Review required', 'Serra Azul has a diligence decision ready.',
         $5, 'queued', 'idem_local-notification')
       ON CONFLICT (tenant_id, notification_id, recipient_id) DO UPDATE SET
         title = EXCLUDED.title, body = EXCLUDED.body`,
      payload: { notificationId: "notification_local-review" },
    },
    {
      name: "valuation",
      statement: `WITH seeded_model AS (
        INSERT INTO valuation.models
          (model_id, tenant_id, workspace_id, deal_id, model_version, state,
           payload, created_at, updated_at)
        VALUES ('model_local-dcf', $1, $2, $3, 1, 'active',
          $5::jsonb -> 'model', $4, $4)
        ON CONFLICT (tenant_id, workspace_id, deal_id, model_id, model_version)
        DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at
        RETURNING model_id, model_version
      ), seeded_scenario AS (
        INSERT INTO valuation.scenarios
          (scenario_id, tenant_id, workspace_id, deal_id, aggregate_version,
           model_id, model_version, state, current_input_id,
           current_input_version, current_result_id, payload, created_at, updated_at)
        SELECT 'scenario_local-base', $1, $2, $3, 1, model_id, model_version,
          'computed', 'input_local-base', 1, 'valuation-result_local-base',
          $5::jsonb -> 'scenario', $4, $4 FROM seeded_model
        ON CONFLICT (tenant_id, workspace_id, deal_id, scenario_id)
        DO UPDATE SET state = EXCLUDED.state, current_input_id = EXCLUDED.current_input_id,
          current_input_version = EXCLUDED.current_input_version,
          current_result_id = EXCLUDED.current_result_id,
          payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at
        RETURNING scenario_id, aggregate_version, model_id, model_version
      ), seeded_input AS (
        INSERT INTO valuation.inputs
          (input_id, scenario_id, tenant_id, workspace_id, deal_id,
           input_version, scenario_version, model_id, model_version,
           basis_digest, payload, created_at)
        SELECT 'input_local-base', scenario_id, $1, $2, $3, 1,
          aggregate_version, model_id, model_version, repeat('0', 64),
          $5::jsonb -> 'input', $4 FROM seeded_scenario
        ON CONFLICT (tenant_id, workspace_id, deal_id, input_id, input_version)
        DO UPDATE SET payload = EXCLUDED.payload
        RETURNING input_id, input_version, scenario_id, scenario_version,
          model_id, model_version, basis_digest
      )
      INSERT INTO valuation.results
        (result_id, scenario_id, input_id, tenant_id, workspace_id, deal_id,
         scenario_version, input_version, model_id, model_version,
         basis_digest, payload, created_at)
      SELECT 'valuation-result_local-base', scenario_id, input_id, $1, $2, $3,
        scenario_version, input_version, model_id, model_version, basis_digest,
        $5::jsonb -> 'result', $4 FROM seeded_input
      ON CONFLICT (tenant_id, workspace_id, deal_id, result_id)
      DO UPDATE SET payload = EXCLUDED.payload`,
      payload: {
        model: { id: "model_local-dcf", method: "discounted_cash_flow" },
        scenario: { id: "scenario_local-base", name: "Base case" },
        input: {
          assumptions: {
            revenueGrowth: 0.12,
            wacc: 0.145,
            terminalGrowth: 0.04,
          },
          currency: "BRL",
        },
        result: {
          enterpriseValueBrl: 98_150_000,
          equityValueBrl: 79_450_000,
          provenance: "deterministic_local_scenario",
        },
      },
    },
    {
      name: "financial_risk",
      actorScoped: true,
      statement: `INSERT INTO financial_risk.results
        (result_id, assessment_id, tenant_id, workspace_id, deal_id,
         aggregate_type, version, state, actor_id, correlation_id,
         idempotency_key, operation_id, job_id, payload, created_at, updated_at)
       VALUES ('risk-result_local-base', 'risk-assessment_local-base', $1, $2,
         $3, 'financial_risk_result', 1, 'fallback', $4,
         'correlation_local-risk', 'idem_local-risk', 'operation_local-risk',
         'job_local-risk', $6, $5, $5)
       ON CONFLICT (tenant_id, workspace_id, deal_id, result_id) DO NOTHING`,
      payload: {
        assessmentId: "risk-assessment_local-base",
        inputs: { netDebtBrl: 18_700_000, ebitdaBrl: 15_100_000 },
        outputs: { leverageRatio: 1.24, liquidityRisk: "unverified" },
        readiness: "not_claimed",
        fallbackReason: "model_provider_not_configured_for_local_scenario",
        provenance: "deterministic_local_scenario",
      },
    },
    {
      name: "matching",
      statement: `WITH seeded_criteria AS (
        INSERT INTO matching.criteria
          (aggregate_id, tenant_id, workspace_id, deal_id, aggregate_version,
           payload, created_at, updated_at)
        VALUES ('criteria_local-buyers', $1, $2, $3, 1,
          $5::jsonb -> 'criteria', $4, $4)
        ON CONFLICT (tenant_id, workspace_id, deal_id, aggregate_id)
        DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at
        RETURNING aggregate_id
      ), seeded_run AS (
        INSERT INTO matching.runs
          (aggregate_id, tenant_id, workspace_id, deal_id, aggregate_version,
           payload, created_at, updated_at)
        SELECT 'matching-run_local-shortlist', $1, $2, $3, 1,
          $5::jsonb -> 'run', $4, $4 FROM seeded_criteria
        ON CONFLICT (tenant_id, workspace_id, deal_id, aggregate_id)
        DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at
        RETURNING aggregate_id
      )
      INSERT INTO matching.candidate_projections
        (aggregate_id, tenant_id, workspace_id, deal_id, aggregate_version,
         payload, created_at, updated_at)
      SELECT 'candidate_local-aurora', $1, $2, $3, 1,
        $5::jsonb -> 'candidate', $4, $4 FROM seeded_run
      ON CONFLICT (tenant_id, workspace_id, deal_id, aggregate_id)
      DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at`,
      payload: {
        criteria: { id: "criteria_local-buyers", state: "active" },
        run: {
          id: "matching-run_local-shortlist",
          criteriaId: "criteria_local-buyers",
          state: "succeeded",
          candidateCount: 24,
          shortlistedCount: 6,
        },
        candidate: {
          id: "candidate_local-aurora",
          runId: "matching-run_local-shortlist",
          name: "Aurora Capital",
          eligibility: "eligible",
        },
      },
    },
    {
      name: "negotiation",
      statement: `INSERT INTO negotiation.rounds
        (round_id, negotiation_id, tenant_id, workspace_id, deal_id, version,
         status, document, created_at, updated_at)
       VALUES ('round_local-initial', 'negotiation_local-horizon', $1, $2, $3,
         1, 'open', $5, $4, $4)
       ON CONFLICT (tenant_id, workspace_id, deal_id, round_id)
       DO UPDATE SET document = EXCLUDED.document, updated_at = EXCLUDED.updated_at`,
      payload: {
        id: "round_local-initial",
        status: "open",
        currentProposalId: "proposal_local-indicative",
        nextAction: "review_indicative_offer",
      },
    },
    {
      name: "closing",
      statement: `INSERT INTO closing.workspaces
        (closing_workspace_id, tenant_id, workspace_id, deal_id, version,
         status, document, created_at, updated_at)
       VALUES ('closing-workspace_local-horizon', $1, $2, $3, 1, 'preparing',
         $5, $4, $4)
       ON CONFLICT (tenant_id, workspace_id, deal_id, closing_workspace_id)
       DO UPDATE SET document = EXCLUDED.document, updated_at = EXCLUDED.updated_at`,
      payload: {
        id: "closing-workspace_local-horizon",
        status: "preparing",
        completion: 0.42,
        outstandingConditions: 4,
      },
    },
    {
      name: "deal_governance",
      statement: `INSERT INTO deal_governance.governance_aggregates
        (aggregate_id, tenant_id, workspace_id, deal_id, version, state,
         document, created_at, updated_at)
       VALUES ('governance_local-horizon', $1, $2, $3, 1, 'active', $5, $4, $4)
       ON CONFLICT (aggregate_id) DO UPDATE SET document = EXCLUDED.document,
         updated_at = EXCLUDED.updated_at`,
      payload: {
        id: "governance_local-horizon",
        state: "active",
        retentionPolicy: "active_deal",
        legalHold: false,
      },
    },
    {
      name: "agent_runtime",
      actorScoped: true,
      statement: `WITH seeded_mission AS (
        INSERT INTO agent_runtime.missions
          (mission_id, tenant_id, workspace_id, deal_id, actor_id, actor_kind,
           actor_state, objective, state, aggregate_version, created_at, updated_at)
        VALUES ('mission_local-diligence', $1, $2, $3, $4, 'human', 'active',
          'Prepare Serra Azul for banker diligence review', 'active', 1, $5, $5)
        ON CONFLICT (mission_id) DO UPDATE SET objective = EXCLUDED.objective,
          state = EXCLUDED.state, updated_at = EXCLUDED.updated_at
        RETURNING mission_id
      ), seeded_plan AS (
        INSERT INTO agent_runtime.plan_versions
          (plan_id, mission_id, tenant_id, workspace_id, deal_id, actor_id,
           actor_kind, actor_state, version, state, steps, source_versions,
           created_at)
        SELECT 'plan_local-diligence', mission_id, $1, $2, $3, $4, 'human',
          'active', 1, 'active', $6::jsonb -> 'steps', '[]'::jsonb, $5
        FROM seeded_mission
        ON CONFLICT (plan_id) DO UPDATE SET state = EXCLUDED.state,
          steps = EXCLUDED.steps
        RETURNING plan_id, mission_id, version
      )
      INSERT INTO agent_runtime.runs
        (run_id, mission_id, plan_id, plan_version, tenant_id, workspace_id,
         deal_id, actor_id, actor_kind, actor_state, correlation_id, state,
         aggregate_version, source_versions, cost, attempt_count,
         created_at, updated_at)
      SELECT 'run_local-diligence', mission_id, plan_id, version, $1, $2, $3,
        $4, 'human', 'active', 'correlation_local-agent', 'queued', 1,
        '[]'::jsonb, '{}'::jsonb, 0, $5, $5 FROM seeded_plan
      ON CONFLICT (run_id) DO UPDATE SET state = EXCLUDED.state,
        updated_at = EXCLUDED.updated_at`,
      payload: {
        missionId: "mission_local-diligence",
        steps: [{
          id: "step_review-evidence",
          name: "Review diligence evidence",
          kind: "tool",
        }],
        runId: "run_local-diligence",
        state: "queued",
      },
    },
  ]);

/** Seeds one deterministic read model in each activated scenario context. */
export async function seedLocalMvpScenario(
  sql: LocalMvpSqlPort,
  now = new Date().toISOString(),
): Promise<void> {
  if (await localMvpScenarioExists(sql)) return;
  for (const context of localMvpScenarioContexts) {
    const values = context.actorScoped
      ? actorScopedValues(now, context.payload)
      : scopedValues(now, context.payload);
    await sql.query(context.statement, values);
  }
}

/** Detects the transaction's final marker so replay never updates immutable rows. */
export async function localMvpScenarioExists(
  sql: LocalMvpSqlPort,
): Promise<boolean> {
  const result = await sql.query(
    `SELECT 1 FROM agent_runtime.missions
     WHERE mission_id = 'mission_local-diligence' AND tenant_id = $1
       AND workspace_id = $2 AND deal_id = $3 LIMIT 1`,
    [
      localMvpIdentity.tenantId,
      localMvpIdentity.workspaceId,
      focalDeal.id,
    ],
  );
  return result.rowCount === 1;
}

function scopedValues(
  now: string,
  payload: Readonly<Record<string, unknown>>,
): readonly unknown[] {
  return [
    localMvpIdentity.tenantId,
    localMvpIdentity.workspaceId,
    focalDeal.id,
    now,
    JSON.stringify(payload),
  ];
}

function actorScopedValues(
  now: string,
  payload: Readonly<Record<string, unknown>>,
): readonly unknown[] {
  return [
    localMvpIdentity.tenantId,
    localMvpIdentity.workspaceId,
    focalDeal.id,
    localMvpIdentity.actorId,
    now,
    JSON.stringify(payload),
  ];
}
