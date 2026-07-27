import { z } from "zod";

import {
  chatMessageSchema,
  chatStreamEventSchema,
  chatStreamRequestSchema,
  chatThreadSchema,
} from "./chat-schemas";
import { moneySchema, paginationMetaSchema } from "./common-schemas";
import {
  dealCreateSchema,
  dealDetailSchema,
  dealPhaseSchema,
  dealStatusSchema,
  dealSummarySchema,
  dealUpdateSchema,
  phaseTransitionSchema,
} from "./deal-schemas";
import {
  entityDetailSchema,
  entityRoleSchema,
  entitySummarySchema,
  entityUpdateSchema,
  entityWriteSchema,
  kybStatusSchema,
  targetDossierSchema,
} from "./entity-schemas";
import {
  dashboardLayoutSchema,
  engineNameSchema,
  engineRunSchema,
  notificationSchema,
} from "./resource-schemas";
import { teamAssignmentSchema, teamMemberSchema } from "./team-schemas";

export type Money = z.infer<typeof moneySchema>;
export type DealSummary = z.infer<typeof dealSummarySchema>;
export type DealDetail = z.infer<typeof dealDetailSchema>;
export type DealCreate = z.infer<typeof dealCreateSchema>;
export type DealUpdate = z.infer<typeof dealUpdateSchema>;
export type PhaseTransition = z.infer<typeof phaseTransitionSchema>;
export type EntitySummary = z.infer<typeof entitySummarySchema>;
export type EntityDetail = z.infer<typeof entityDetailSchema>;
export type EntityWrite = z.infer<typeof entityWriteSchema>;
export type EntityUpdate = z.infer<typeof entityUpdateSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type TeamAssignment = z.infer<typeof teamAssignmentSchema>;
export type TargetDossier = z.infer<typeof targetDossierSchema>;
export type ChatThread = z.infer<typeof chatThreadSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatStreamRequest = z.infer<typeof chatStreamRequestSchema>;
export type ChatStreamEvent = z.infer<typeof chatStreamEventSchema>;
export type EngineRun = z.infer<typeof engineRunSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type DashboardLayout = z.infer<typeof dashboardLayoutSchema>;
export type Page<T> = { data: T[]; meta: z.infer<typeof paginationMetaSchema> };

export interface DealListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  status?: z.infer<typeof dealStatusSchema>;
  phase?: z.infer<typeof dealPhaseSchema>;
  assigneeId?: string;
}

export interface EntityListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  role?: z.infer<typeof entityRoleSchema>;
  sector?: string;
  countryCode?: string;
  kybStatus?: z.infer<typeof kybStatusSchema>;
}

export interface TeamMemberListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
}

export interface StreamChatOptions {
  signal?: AbortSignal;
  lastEventId?: string;
  onEvent: (event: ChatStreamEvent) => void;
}

export interface EngineRunListQuery {
  engine?: z.infer<typeof engineNameSchema>;
  page?: number;
  pageSize?: number;
}
