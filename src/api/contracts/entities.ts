/** Entity and team-member contracts. */

import type { ISODateTime, UUID, VersionedResource } from "./common.ts";
import type { PageQuery } from "./http.ts";

export enum EntityRole {
  Buyer = "buyer",
  Seller = "seller",
  Target = "target",
  Institution = "institution",
}

export enum KybStatus {
  Pending = "pending",
  InReview = "in_review",
  Approved = "approved",
  Rejected = "rejected",
}

export interface EntityEditableFields {
  legalName: string;
  taxId: string;
  sector: string;
  countryCode: string;
  roles: EntityRole[];
  contactEmail: string;
  kybStatus: KybStatus;
  regulatoryClearanceRequired: boolean;
  primaryAdvisorId: UUID | null;
}

export interface EntitySummary extends EntityEditableFields, VersionedResource {
  id: UUID;
  archivedAt: ISODateTime | null;
  updatedAt: ISODateTime;
}

export interface EntityDetail extends EntitySummary {
  createdAt: ISODateTime;
}

export interface EntityListQuery extends PageQuery {
  role?: EntityRole;
  sector?: string;
  countryCode?: string;
  kybStatus?: KybStatus;
}

export type CreateEntityRequest = EntityEditableFields;
export type UpdateEntityRequest =
  & Partial<EntityEditableFields>
  & VersionedResource;

export interface TeamMember {
  id: UUID;
  displayName: string;
  email: string;
  role: string;
  firmName: string;
  avatarUrl: string | null;
  active: boolean;
}

export interface TeamMemberListQuery extends PageQuery {
  role?: string;
}
