import {
  AssignmentSide,
  Currency,
  DealPhase,
  DealPhaseHistoryEntry,
  DealStatus,
  DealTeamAssignment,
  DealType,
  EntityRole,
  KybStatus,
  Notification,
  NotificationType,
  TeamMember,
} from "../contracts.ts";
import { toAdvisorSummary, toTargetSummary } from "./deals.ts";
import { defaultWidgets } from "./layouts.ts";
import { MVP_SEED_IDS } from "./seed_ids.ts";
import { MvpStoreState } from "./state.ts";
import { DealState, Entity, StoredChatThread } from "./types.ts";
import { clone } from "./utils.ts";

const TEAM_MEMBERS: TeamMember[] = [
  {
    id: MVP_SEED_IDS.advisorAna,
    displayName: "Ana Costa",
    email: "ana.costa@mai.example",
    role: "Lead Advisor",
    firmName: "M&Ai Advisory",
    avatarUrl: null,
    active: true,
  },
  {
    id: MVP_SEED_IDS.advisorBruno,
    displayName: "Bruno Lima",
    email: "bruno.lima@mai.example",
    role: "Legal DD",
    firmName: "M&Ai Advisory",
    avatarUrl: null,
    active: true,
  },
];

const NEXUS_TEMPLATE = {
  id: MVP_SEED_IDS.entityNexus,
  legalName: "Nexus Health Holdings",
  taxId: "12.345.678/0001-90",
  sector: "healthcare",
  countryCode: "BR",
  roles: [EntityRole.Seller, EntityRole.Target],
  contactEmail: "deals@nexus.example",
  kybStatus: KybStatus.Pending,
  regulatoryClearanceRequired: true,
  primaryAdvisorId: MVP_SEED_IDS.advisorAna,
  archivedAt: null,
  version: 1,
} satisfies Omit<Entity, "createdAt" | "updatedAt">;

const AURORA_TEMPLATE = {
  ...NEXUS_TEMPLATE,
  id: MVP_SEED_IDS.entityAurora,
  legalName: "Aurora Capital Partners",
  taxId: "98.765.432/0001-10",
  sector: "financial_services",
  roles: [EntityRole.Buyer, EntityRole.Institution],
  contactEmail: "ma@aurora.example",
  regulatoryClearanceRequired: false,
  kybStatus: KybStatus.Approved,
} satisfies Omit<Entity, "createdAt" | "updatedAt">;

const HORIZON_TEMPLATE = {
  id: MVP_SEED_IDS.dealHorizon,
  code: "HZ-2026",
  title: "Project Horizon",
  dealType: DealType.BuySide,
  status: DealStatus.Active,
  currentPhase: DealPhase.DueDiligence,
  targetId: MVP_SEED_IDS.entityNexus,
  valuationRange: {
    min: { amountMinor: "45000000000", currency: Currency.USD },
    max: { amountMinor: "120000000000", currency: Currency.USD },
  },
  leadAdvisorId: MVP_SEED_IDS.advisorAna,
  financialStructure: { cashPercentage: 60, equityPercentage: 40 },
  activeEntityIds: [MVP_SEED_IDS.entityNexus],
  version: 1,
} satisfies Omit<
  DealState,
  "target" | "leadAdvisor" | "updatedAt" | "phaseHistory" | "teamAssignments"
>;

const ATLAS_TEMPLATE = {
  id: MVP_SEED_IDS.dealAtlas,
  code: "AT-2026",
  title: "Project Atlas",
  dealType: DealType.SellSide,
  status: DealStatus.Active,
  currentPhase: DealPhase.Sourcing,
  targetId: MVP_SEED_IDS.entityAurora,
  valuationRange: {
    min: { amountMinor: "9000000000", currency: Currency.BRL },
    max: { amountMinor: "15000000000", currency: Currency.BRL },
  },
  leadAdvisorId: MVP_SEED_IDS.advisorBruno,
  financialStructure: null,
  activeEntityIds: [MVP_SEED_IDS.entityAurora],
  version: 1,
  teamAssignments: [],
} satisfies Omit<
  DealState,
  "target" | "leadAdvisor" | "updatedAt" | "phaseHistory"
>;

export function seedStore(state: MvpStoreState): void {
  const createdAt = state.now();
  const [ana, bruno] = seedTeam(state);
  const [nexus, aurora] = seedEntities(state, createdAt);
  seedDeals(state, createdAt, ana, bruno, nexus, aurora);
  seedChat(state, createdAt);
  seedNotificationAndLayout(state, createdAt);
}

function seedTeam(state: MvpStoreState): TeamMember[] {
  for (const member of TEAM_MEMBERS) state.teamMembers.set(member.id, member);
  return TEAM_MEMBERS;
}

function seedEntities(state: MvpStoreState, createdAt: string): Entity[] {
  const entities = [NEXUS_TEMPLATE, AURORA_TEMPLATE].map((template) => ({
    ...template,
    createdAt,
    updatedAt: createdAt,
  }));
  for (const entity of entities) state.entities.set(entity.id, entity);
  return entities;
}

function seedDeals(
  state: MvpStoreState,
  createdAt: string,
  ana: TeamMember,
  bruno: TeamMember,
  nexus: Entity,
  aurora: Entity,
): void {
  state.deals.set(
    MVP_SEED_IDS.dealHorizon,
    horizonDeal(state, createdAt, ana, nexus),
  );
  state.deals.set(
    MVP_SEED_IDS.dealAtlas,
    atlasDeal(state, createdAt, bruno, aurora),
  );
}

function horizonDeal(
  state: MvpStoreState,
  createdAt: string,
  advisor: TeamMember,
  target: Entity,
): DealState {
  return {
    ...HORIZON_TEMPLATE,
    target: toTargetSummary(target),
    leadAdvisor: toAdvisorSummary(advisor),
    updatedAt: createdAt,
    phaseHistory: [horizonHistory(state, createdAt, advisor)],
    teamAssignments: [leadAssignment(state, advisor)],
  };
}

function horizonHistory(
  state: MvpStoreState,
  changedAt: string,
  advisor: TeamMember,
): DealPhaseHistoryEntry {
  return {
    id: state.id(),
    fromPhase: DealPhase.Sourcing,
    toPhase: DealPhase.DueDiligence,
    comment: "VDR access confirmed",
    changedAt,
    changedBy: toAdvisorSummary(advisor),
  };
}

function leadAssignment(
  state: MvpStoreState,
  advisor: TeamMember,
): DealTeamAssignment {
  return {
    id: state.id(),
    teamMember: clone(advisor),
    assignmentRole: "lead_advisor",
    side: AssignmentSide.Buyer,
    isLead: true,
  };
}

function atlasDeal(
  state: MvpStoreState,
  createdAt: string,
  advisor: TeamMember,
  target: Entity,
): DealState {
  return {
    ...ATLAS_TEMPLATE,
    target: toTargetSummary(target),
    leadAdvisor: toAdvisorSummary(advisor),
    updatedAt: createdAt,
    phaseHistory: [atlasHistory(state, createdAt, advisor)],
  };
}

function atlasHistory(
  state: MvpStoreState,
  changedAt: string,
  advisor: TeamMember,
): DealPhaseHistoryEntry {
  return {
    id: state.id(),
    fromPhase: null,
    toPhase: DealPhase.Sourcing,
    comment: "Deal created",
    changedAt,
    changedBy: toAdvisorSummary(advisor),
  };
}

function seedChat(state: MvpStoreState, createdAt: string): void {
  const thread: StoredChatThread = {
    id: MVP_SEED_IDS.threadHorizon,
    dealId: MVP_SEED_IDS.dealHorizon,
    title: "Horizon due diligence",
    agentId: "BrokerOrchestratorAgent",
    createdAt,
    updatedAt: createdAt,
    messageCount: 0,
  };
  state.threads.set(thread.id, thread);
  state.messages.set(thread.id, []);
}

function seedNotificationAndLayout(
  state: MvpStoreState,
  createdAt: string,
): void {
  const notification: Notification = {
    id: MVP_SEED_IDS.notificationUnread,
    type: NotificationType.Document,
    title: "VDR ingestion complete",
    body: "Project Horizon documents are ready for review.",
    dealId: MVP_SEED_IDS.dealHorizon,
    createdAt,
    readAt: null,
  };
  state.notifications.set(notification.id, notification);
  seedLayout(state, createdAt);
}

function seedLayout(state: MvpStoreState, createdAt: string): void {
  state.layouts.set("custom", {
    slug: "custom",
    version: 1,
    widgets: defaultWidgets(),
    updatedAt: createdAt,
  });
}
