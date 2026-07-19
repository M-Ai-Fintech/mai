import {
  ApiCursorSuccess,
  ApiListSuccess,
  ChatCitation,
  ChatThread,
  CreateEntityRequest,
  DealDetail,
  DealTeamAssignment,
  DealTeamAssignmentInput,
  EngineKind,
  EngineRun,
  EntityDetail,
  TeamMember,
  UpdateEntityRequest,
} from "../contracts.ts";

export type Entity = EntityDetail;
export type EntityInput = CreateEntityRequest;
export type EntityPatch = UpdateEntityRequest;
export type TeamAssignmentInput = DealTeamAssignmentInput;
export type TeamAssignment = DealTeamAssignment;

export type AgentId =
  | "BrokerOrchestratorAgent"
  | "FinancialRiskAgent"
  | "LegalDueDiligenceAgent"
  | "NegotiationAgent";
export type EngineName = EngineKind;
export type Page<T> = ApiListSuccess<T>;
export type CursorPage<T> = ApiCursorSuccess<T>;

export interface StoredChatThread extends ChatThread {
  messageCount: number;
}

export interface StoredChatMessage {
  id: string;
  threadId: string;
  role: "user" | "assistant";
  agentId: string | null;
  clientMessageId: string | null;
  content: string;
  citations: ChatCitation[];
  status: "accepted" | "streaming" | "completed" | "failed";
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredEngineRun extends EngineRun {
  input: Record<string, unknown>;
  updatedAt: string;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
}

export interface DealState extends DealDetail {
  activeEntityIds: string[];
  targetId: string;
  leadAdvisorId: string | null;
}

export type TeamMemberState = Map<string, TeamMember>;
