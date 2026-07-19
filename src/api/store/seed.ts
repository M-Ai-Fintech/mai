import {
  AssignmentSide,
  Currency,
  DealPhase,
  DealPhaseHistoryEntry,
  DealStatus,
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
import { Entity, StoredChatThread } from "./types.ts";
import { clone } from "./utils.ts";

export function seedStore(state: MvpStoreState): void {
  const createdAt = state.now();
  const ana: TeamMember = {
    id: MVP_SEED_IDS.advisorAna,
    displayName: "Ana Costa",
    email: "ana.costa@mai.example",
    role: "Lead Advisor",
    firmName: "M&Ai Advisory",
    avatarUrl: null,
    active: true,
  };
  const bruno: TeamMember = {
    id: MVP_SEED_IDS.advisorBruno,
    displayName: "Bruno Lima",
    email: "bruno.lima@mai.example",
    role: "Legal DD",
    firmName: "M&Ai Advisory",
    avatarUrl: null,
    active: true,
  };
  state.teamMembers.set(ana.id, ana);
  state.teamMembers.set(bruno.id, bruno);

  const nexus: Entity = {
    id: MVP_SEED_IDS.entityNexus,
    legalName: "Nexus Health Holdings",
    taxId: "12.345.678/0001-90",
    sector: "healthcare",
    countryCode: "BR",
    roles: [EntityRole.Seller, EntityRole.Target],
    contactEmail: "deals@nexus.example",
    kybStatus: KybStatus.Pending,
    regulatoryClearanceRequired: true,
    primaryAdvisorId: ana.id,
    archivedAt: null,
    createdAt,
    updatedAt: createdAt,
    version: 1,
  };
  const aurora: Entity = {
    ...nexus,
    id: MVP_SEED_IDS.entityAurora,
    legalName: "Aurora Capital Partners",
    taxId: "98.765.432/0001-10",
    sector: "financial_services",
    roles: [EntityRole.Buyer, EntityRole.Institution],
    contactEmail: "ma@aurora.example",
    regulatoryClearanceRequired: false,
    kybStatus: KybStatus.Approved,
  };
  state.entities.set(nexus.id, nexus);
  state.entities.set(aurora.id, aurora);

  const horizonHistory: DealPhaseHistoryEntry = {
    id: state.id(),
    fromPhase: DealPhase.Sourcing,
    toPhase: DealPhase.DueDiligence,
    comment: "VDR access confirmed",
    changedAt: createdAt,
    changedBy: toAdvisorSummary(ana),
  };
  state.deals.set(MVP_SEED_IDS.dealHorizon, {
    id: MVP_SEED_IDS.dealHorizon,
    code: "HZ-2026",
    title: "Project Horizon",
    dealType: DealType.BuySide,
    status: DealStatus.Active,
    currentPhase: DealPhase.DueDiligence,
    target: toTargetSummary(nexus),
    targetId: nexus.id,
    valuationRange: {
      min: { amountMinor: "45000000000", currency: Currency.USD },
      max: { amountMinor: "120000000000", currency: Currency.USD },
    },
    leadAdvisor: toAdvisorSummary(ana),
    leadAdvisorId: ana.id,
    updatedAt: createdAt,
    phaseHistory: [horizonHistory],
    financialStructure: { cashPercentage: 60, equityPercentage: 40 },
    activeEntityIds: [nexus.id],
    version: 1,
    teamAssignments: [{
      id: state.id(),
      teamMember: clone(ana),
      assignmentRole: "lead_advisor",
      side: AssignmentSide.Buyer,
      isLead: true,
    }],
  });
  state.deals.set(MVP_SEED_IDS.dealAtlas, {
    id: MVP_SEED_IDS.dealAtlas,
    code: "AT-2026",
    title: "Project Atlas",
    dealType: DealType.SellSide,
    status: DealStatus.Active,
    currentPhase: DealPhase.Sourcing,
    target: toTargetSummary(aurora),
    targetId: aurora.id,
    valuationRange: {
      min: { amountMinor: "9000000000", currency: Currency.BRL },
      max: { amountMinor: "15000000000", currency: Currency.BRL },
    },
    leadAdvisor: toAdvisorSummary(bruno),
    leadAdvisorId: bruno.id,
    updatedAt: createdAt,
    phaseHistory: [{
      id: state.id(),
      fromPhase: null,
      toPhase: DealPhase.Sourcing,
      comment: "Deal created",
      changedAt: createdAt,
      changedBy: toAdvisorSummary(bruno),
    }],
    financialStructure: null,
    activeEntityIds: [aurora.id],
    version: 1,
    teamAssignments: [],
  });

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
  state.layouts.set("custom", {
    slug: "custom",
    version: 1,
    widgets: defaultWidgets(),
    updatedAt: createdAt,
  });
}
