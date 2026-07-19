/** Deal lifecycle and assignment contracts. */

import type { ISODateTime, Money, UUID, VersionedResource } from "./common.ts";
import type { TeamMember } from "./entities.ts";
import type { PageQuery } from "./http.ts";

export enum DealType {
  BuySide = "buy_side",
  SellSide = "sell_side",
}

export enum DealStatus {
  Active = "active",
  Archived = "archived",
  Completed = "completed",
}

export enum DealPhase {
  Sourcing = "sourcing",
  DueDiligence = "due_diligence",
  Negotiation = "negotiation",
  Closing = "closing",
}

export interface DealTargetSummary {
  id: UUID;
  legalName: string;
  sector: string;
  countryCode: string;
}

export interface AdvisorSummary {
  id: UUID;
  displayName: string;
  avatarUrl: string | null;
}

export interface ValuationRange {
  min: Money;
  max: Money;
}

export interface DealSummary extends VersionedResource {
  id: UUID;
  code: string;
  title: string;
  dealType: DealType;
  status: DealStatus;
  currentPhase: DealPhase;
  target: DealTargetSummary;
  valuationRange: ValuationRange;
  leadAdvisor: AdvisorSummary | null;
  updatedAt: ISODateTime;
}

export type DealFinancialStructure = Record<string, unknown>;

export interface DealPhaseHistoryEntry {
  id: UUID;
  fromPhase: DealPhase | null;
  toPhase: DealPhase;
  comment: string | null;
  changedAt: ISODateTime;
  changedBy: AdvisorSummary | null;
}

export enum AssignmentSide {
  Buyer = "buyer",
  Seller = "seller",
  Target = "target",
  Neutral = "neutral",
}

export interface DealTeamAssignment {
  id: UUID;
  teamMember: TeamMember;
  assignmentRole: string;
  side: AssignmentSide;
  isLead: boolean;
}

export interface DealDetail extends DealSummary {
  phaseHistory: DealPhaseHistoryEntry[];
  financialStructure: DealFinancialStructure | null;
  teamAssignments: DealTeamAssignment[];
}

export interface DealListQuery extends PageQuery {
  status?: DealStatus;
  phase?: DealPhase;
  assigneeId?: UUID;
}

export interface DealEditableFields {
  code: string;
  title: string;
  dealType: DealType;
  targetId: UUID;
  valuationRange: ValuationRange;
  leadAdvisorId: UUID | null;
  financialStructure: DealFinancialStructure | null;
}

export type CreateDealRequest = DealEditableFields;

export type UpdateDealRequest = Partial<DealEditableFields> & VersionedResource;

export interface TransitionDealPhaseRequest extends VersionedResource {
  toPhase: DealPhase;
  comment: string;
}

export interface DealTeamAssignmentInput {
  teamMemberId: UUID;
  assignmentRole: string;
  side: AssignmentSide;
  isLead: boolean;
}

export interface ReplaceDealTeamAssignmentsRequest extends VersionedResource {
  assignments: DealTeamAssignmentInput[];
}
