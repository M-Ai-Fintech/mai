/** Analysis-engine, VDR, and generated-document contracts. */

import type { ISODateTime, UUID } from "./common.ts";
import type { ApiErrorDetail, PageQuery } from "./http.ts";

export enum EngineKind {
  FinancialRisk = "financial_risk",
  PortfolioMatch = "portfolio_match",
  Negotiation = "negotiation",
}

export enum EngineRunStatus {
  Queued = "queued",
  Running = "running",
  Completed = "completed",
  Failed = "failed",
}

export interface CreateEngineRunRequest {
  engine: EngineKind;
  input: Record<string, unknown>;
}

export interface EngineRun {
  id: UUID;
  dealId: UUID;
  engine: EngineKind;
  status: EngineRunStatus;
  result: Record<string, unknown> | null;
  error: ApiErrorDetail | null;
  createdAt: ISODateTime;
  completedAt: ISODateTime | null;
}

export interface EngineRunListQuery extends PageQuery {
  engine?: EngineKind;
}

export interface VdrDocument {
  id: UUID;
  dealId: UUID;
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: ISODateTime;
}

export enum GeneratedDocumentType {
  DueDiligenceReport = "due_diligence_report",
  TermSheet = "term_sheet",
  ClosingPackage = "closing_package",
}

export interface CreateDocumentRequest {
  documentType: GeneratedDocumentType;
  sourceRunId: UUID;
}

export interface GeneratedDocument {
  id: UUID;
  dealId: UUID;
  documentType: GeneratedDocumentType;
  sourceRunId: UUID;
  fileName: string;
  downloadUrl: string;
  createdAt: ISODateTime;
}
