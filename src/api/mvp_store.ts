/**
 * Stable public façade for deterministic MVP_6 in-memory persistence.
 *
 * Domain behavior is implemented under `store/`; callers continue importing
 * this module so the API surface and mock-backed seed behavior remain stable.
 */

import {
  ApiErrorDetail,
  ChatCitation,
  ChatMessage,
  ChatThread,
  CreateDealRequest,
  DashboardLayout,
  DashboardWidget,
  DealDetail,
  DealListQuery,
  DealSummary,
  EngineRun,
  EngineRunStatus,
  Notification,
  NotificationListResponse,
  TeamMember,
  TransitionDealPhaseRequest,
  UpdateDealRequest,
} from "./contracts.ts";
import { ChatRepository } from "./store/chat.ts";
import { DealRepository } from "./store/deals.ts";
import { EngineRepository } from "./store/engines.ts";
import { EntityListQuery, EntityRepository, DossierRepository } from "./store/entities.ts";
import { DashboardLayoutRepository } from "./store/layouts.ts";
import {
  NotificationListQuery,
  NotificationRepository,
} from "./store/notifications.ts";
import { seedStore } from "./store/seed.ts";
import { MvpStoreState } from "./store/state.ts";
import { TeamMemberListQuery, TeamRepository } from "./store/team.ts";
import {
  AgentId,
  CursorPage,
  EngineName,
  Entity,
  EntityInput,
  EntityPatch,
  Page,
  StoredChatMessage,
  TeamAssignment,
  TeamAssignmentInput,
} from "./store/types.ts";

export { MvpStoreError } from "./store/error.ts";
export type { MvpStoreErrorCode } from "./store/error.ts";
export { MVP_SEED_IDS } from "./store/seed_ids.ts";
export type {
  Dossier,
  DossierPatch,
  AgentId,
  CursorPage,
  EngineName,
  Entity,
  EntityInput,
  EntityPatch,
  Page,
  TeamAssignment,
  TeamAssignmentInput,
} from "./store/types.ts";

export class MvpStore {
  readonly persistence = "mock-backed-in-memory" as const;

  private readonly state = new MvpStoreState();
  private readonly deals = new DealRepository(this.state);
  private readonly entities = new EntityRepository(this.state);
  private readonly dossiers = new DossierRepository(this.state);
  private readonly team = new TeamRepository(this.state);
  private readonly chat = new ChatRepository(this.state);
  private readonly engines = new EngineRepository(this.state);
  private readonly notifications = new NotificationRepository(this.state);
  private readonly layouts = new DashboardLayoutRepository(this.state);

  constructor() {
    seedStore(this.state);
  }

  listDeals(query: DealListQuery = {}): Page<DealSummary> {
    return this.deals.list(query);
  }

  getDealDetail(id: string): DealDetail {
    return this.deals.get(id);
  }

  createDeal(input: CreateDealRequest): DealDetail {
    return this.deals.create(input);
  }

  updateDeal(id: string, patch: UpdateDealRequest): DealDetail {
    return this.deals.update(id, patch);
  }

  archiveDeal(id: string, version?: number): DealDetail {
    return this.deals.archive(id, version);
  }

  transitionDealPhase(
    id: string,
    input: TransitionDealPhaseRequest,
  ): DealDetail {
    return this.deals.transition(id, input);
  }

  listEntities(query: EntityListQuery = {}): Page<Entity> {
    return this.entities.list(query);
  }

  getEntity(id: string): Entity {
    return this.entities.get(id);
  }

  createEntity(input: EntityInput): Entity {
    return this.entities.create(input);
  }

  updateEntity(id: string, patch: EntityPatch): Entity {
    return this.entities.update(id, patch);
  }

  archiveEntity(id: string, version?: number): Entity {
    return this.entities.archive(id, version);
  }

  getDossier(entityId: string) {
    return this.dossiers.get(entityId);
  }

  updateDossier(entityId: string, patch: any) {
    return this.dossiers.update(entityId, patch);
  }

  listTeamMembers(query: TeamMemberListQuery = {}): Page<TeamMember> {
    return this.team.listMembers(query);
  }

  getTeamAssignments(dealId: string): TeamAssignment[] {
    return this.team.getAssignments(dealId);
  }

  putTeamAssignments(
    dealId: string,
    version: number,
    inputs: TeamAssignmentInput[],
  ): { data: TeamAssignment[]; version: number } {
    return this.team.putAssignments(dealId, version, inputs);
  }

  listChatThreads(dealId: string): ChatThread[] {
    return this.chat.listThreads(dealId);
  }

  createChatThread(
    dealId: string,
    title: string,
    agentId: AgentId,
  ): ChatThread {
    return this.chat.createThread(dealId, title, agentId);
  }

  listChatMessages(
    threadId: string,
    cursor?: string,
    limit = 50,
  ): CursorPage<ChatMessage> {
    return this.chat.listMessages(threadId, cursor, limit);
  }

  appendUserMessage(
    dealId: string,
    threadId: string,
    input: { agentId: AgentId; message: string; clientMessageId: string },
  ): StoredChatMessage {
    return this.chat.appendUserMessage(dealId, threadId, input);
  }

  startAssistantMessage(
    threadId: string,
    agentId: AgentId,
  ): StoredChatMessage {
    return this.chat.startAssistantMessage(threadId, agentId);
  }

  appendAssistantDelta(
    threadId: string,
    messageId: string,
    textDelta: string,
  ): StoredChatMessage {
    return this.chat.appendAssistantDelta(threadId, messageId, textDelta);
  }

  completeAssistantMessage(
    threadId: string,
    messageId: string,
    citations: ChatCitation[] = [],
  ): StoredChatMessage {
    return this.chat.completeAssistantMessage(threadId, messageId, citations);
  }

  failAssistantMessage(
    threadId: string,
    messageId: string,
    error: string,
  ): StoredChatMessage {
    return this.chat.failAssistantMessage(threadId, messageId, error);
  }

  createEngineRun(
    dealId: string,
    engine: EngineName,
    input: Record<string, unknown>,
  ): EngineRun {
    return this.engines.createRun(dealId, engine, input);
  }

  updateEngineRun(
    dealId: string,
    runId: string,
    update: {
      status: EngineRunStatus;
      result?: Record<string, unknown>;
      error?: ApiErrorDetail;
    },
  ): EngineRun {
    return this.engines.updateRun(dealId, runId, update);
  }

  listEngineRuns(
    dealId: string,
    query: {
      page?: number;
      pageSize?: number;
      search?: string;
      sort?: string;
      engine?: EngineName;
    } = {},
  ): Page<EngineRun> {
    return this.engines.listRuns(dealId, query);
  }

  listNotifications(
    query: NotificationListQuery = {},
  ): NotificationListResponse {
    return this.notifications.list(query);
  }

  markNotificationRead(id: string, read: boolean): Notification {
    return this.notifications.markRead(id, read);
  }

  getDashboardLayout(slug: string): DashboardLayout {
    return this.layouts.get(slug);
  }

  putDashboardLayout(
    slug: string,
    version: number,
    widgets: DashboardWidget[],
  ): DashboardLayout {
    return this.layouts.put(slug, version, widgets);
  }

  resetDashboardLayout(slug: string, version?: number): DashboardLayout {
    return this.layouts.reset(slug, version);
  }
}
