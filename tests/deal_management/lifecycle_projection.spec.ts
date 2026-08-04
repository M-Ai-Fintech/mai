import { assertEquals } from "@std/assert";
import {
  createInitialLifecycle,
  deriveLegacyPhase,
  type LifecycleHistoryRecord,
  type LifecycleProjection,
  projectLifecycle,
  projectLifecycleActivity,
} from "../../src/deal_management/v1.ts";
import { field } from "../../src/platform/authz/v1.ts";
import { dealId } from "../../src/deal_management/v1.ts";

const aggregate = createInitialLifecycle({
  dealId: dealId("deal_projection"),
  tenantId: "tenant_northstar" as never,
  workspaceId: "workspace_alpha" as never,
  version: 4,
});

const fullMask = {
  include: [field("lifecycle"), field("milestones"), field("activity")],
  omit: [],
  redact: [],
  approvedClassifications: [
    { name: field("lifecycle"), classification: "public" as const },
    { name: field("milestones"), classification: "public" as const },
    { name: field("activity"), classification: "internal_audit" as const },
  ],
};

const publicMask = {
  include: [field("lifecycle"), field("milestones")],
  omit: [field("activity")],
  redact: [],
  approvedClassifications: [
    { name: field("lifecycle"), classification: "public" as const },
    { name: field("milestones"), classification: "public" as const },
  ],
};

function history(): LifecycleHistoryRecord {
  return {
    transitionId: "transition_projection-1",
    eventId: "event_projection-1",
    tenantId: aggregate.tenantId,
    workspaceId: aggregate.workspaceId,
    dealId: aggregate.dealId,
    aggregateVersion: 2 as never,
    subjectType: "lifecycle",
    subjectId: aggregate.dealId,
    previousState: "draft",
    nextState: "sourcing",
    prerequisites: [],
    actorId: "actor_projection",
    correlationId: "cor_projection",
    occurredAt: "2026-08-02T12:00:00.000Z",
  };
}

Deno.test("lifecycle projections expose only approved fields and activity", () => {
  const projected = projectLifecycle(aggregate, fullMask);
  assertEquals(projected.state, "draft");
  assertEquals(projected.version, 4);
  assertEquals(projected.milestones, []);

  const masked = projectLifecycle(aggregate, publicMask);
  assertEquals(masked.state, "draft");
  assertEquals(masked.milestones, []);
  assertEquals(projectLifecycleActivity([history()], publicMask), undefined);
  assertEquals(projectLifecycleActivity([history()], fullMask)?.length, 1);
});

Deno.test("legacy phase adapter keeps supported evidence proposed and ambiguity uncertain", async () => {
  const supported = await deriveLegacyPhase({
    source: "legacy_mvp",
    legacyDealId: "legacy-1",
    sourceVersion: 3,
    sourceUpdatedAt: "2026-08-01T12:00:00.000Z",
    currentPhase: "due_diligence",
    phaseHistory: ["sourcing", "due_diligence"],
  });
  assertEquals(supported.lifecycleState, "due_diligence");
  assertEquals(supported.status, "proposed");
  assertEquals(supported.quality, "supported");
  assertEquals(supported.approved, false);
  assertEquals(supported.approvedHistory, []);

  const ambiguous = await deriveLegacyPhase({
    source: "legacy_mvp",
    legacyDealId: "legacy-2",
    currentPhase: "closing",
    phaseHistory: [{ toPhase: "negotiation" }],
  });
  assertEquals(ambiguous.lifecycleState, undefined);
  assertEquals(ambiguous.status, "uncertain");
  assertEquals(ambiguous.quality, "ambiguous");

  const unsupported = await deriveLegacyPhase({
    source: "legacy_mvp",
    legacyDealId: "legacy-3",
    phase: "unknown_phase",
    phaseHistory: ["unknown_phase"],
  });
  assertEquals(unsupported.status, "uncertain");
  assertEquals(unsupported.quality, "unsupported");
  assertEquals(unsupported.sourceFingerprint.length, 64);
});

const projectionTypeCheck: LifecycleProjection = projectLifecycle(
  aggregate,
  publicMask,
);
void projectionTypeCheck;
