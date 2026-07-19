import {
  ChatCitation,
  EngineKind,
  GeneratedDocument,
  GeneratedDocumentType,
} from "../contracts.ts";
import { AgentId, MvpStore } from "../mvp_store.ts";

export interface ChatExecutionInput {
  dealId: string;
  threadId: string;
  agentId: AgentId;
  message: string;
}

export interface ChatExecutionResult {
  content: string;
  citations?: ChatCitation[];
}

export interface EngineExecutionInput {
  dealId: string;
  engine: EngineKind;
  input: Record<string, unknown>;
}

export interface DocumentExecutionInput {
  dealId: string;
  documentType: GeneratedDocumentType;
  sourceRunId: string;
}

export interface MvpRouteDependencies {
  store?: MvpStore;
  executeChat?: (input: ChatExecutionInput) => Promise<ChatExecutionResult>;
  runEngine?: (input: EngineExecutionInput) => Promise<Record<string, unknown>>;
  createDocument?: (
    input: DocumentExecutionInput,
  ) => Promise<GeneratedDocument>;
}

export interface ResolvedMvpRouteDependencies {
  store: MvpStore;
  executeChat: NonNullable<MvpRouteDependencies["executeChat"]>;
  runEngine: NonNullable<MvpRouteDependencies["runEngine"]>;
  createDocument: NonNullable<MvpRouteDependencies["createDocument"]>;
}

const defaultStore = new MvpStore();

function defaultExecuteChat(
  input: ChatExecutionInput,
): Promise<ChatExecutionResult> {
  return Promise.resolve({
    content: `${input.agentId} reviewed the request: ${input.message}`,
    citations: [],
  });
}

function defaultRunEngine(
  input: EngineExecutionInput,
): Promise<Record<string, unknown>> {
  switch (input.engine) {
    case EngineKind.FinancialRisk:
      return Promise.resolve({ score: 2.4, maximum: 5, label: "moderate" });
    case EngineKind.PortfolioMatch:
      return Promise.resolve({
        minimumAmountMinor: "42000000000",
        maximumAmountMinor: "89000000000",
      });
    case EngineKind.Negotiation:
      return Promise.resolve({
        alternatives: ["cash", "equity", "earn_out"],
      });
  }
}

function defaultCreateDocument(
  input: DocumentExecutionInput,
): Promise<GeneratedDocument> {
  const suffix = input.documentType.replaceAll("_", "-");
  return Promise.resolve({
    id: "00000000-0000-4000-8000-000000000071",
    dealId: input.dealId,
    documentType: input.documentType,
    sourceRunId: input.sourceRunId,
    fileName: `${suffix}.pdf`,
    downloadUrl:
      `/api/deals/${input.dealId}/documents/00000000-0000-4000-8000-000000000071/download`,
    createdAt: "2026-07-19T12:02:00.000Z",
  });
}

export function resolveMvpRouteDependencies(
  dependencies: MvpRouteDependencies,
): ResolvedMvpRouteDependencies {
  return {
    store: dependencies.store ?? defaultStore,
    executeChat: dependencies.executeChat ?? defaultExecuteChat,
    runEngine: dependencies.runEngine ?? defaultRunEngine,
    createDocument: dependencies.createDocument ?? defaultCreateDocument,
  };
}
