/** Agentic chat, message, citation, and stream-event contracts. */

import type { ISODateTime, JsonObject, JsonValue, UUID } from "./common.ts";
import type { ApiCursorSuccess } from "./http.ts";

export interface ChatThread {
  id: UUID;
  dealId: UUID;
  title: string;
  agentId: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface CreateChatThreadRequest {
  title: string;
  agentId: string;
}

export interface ChatCitation {
  id: UUID;
  documentId: UUID;
  label: string;
  excerpt: string | null;
  page: number | null;
}

interface ChatMessageBase {
  id: UUID;
  threadId: UUID;
  createdAt: ISODateTime;
}

export interface UserChatMessage extends ChatMessageBase {
  role: "user";
  content: string;
  clientMessageId: UUID;
}

export interface AssistantChatMessage extends ChatMessageBase {
  role: "assistant";
  content: string;
  agentId: string;
  citations: ChatCitation[];
}

export interface ToolChatMessage extends ChatMessageBase {
  role: "tool";
  toolName: string;
  status: "started" | "completed" | "failed";
  content: JsonValue;
}

export interface SystemChatMessage extends ChatMessageBase {
  role: "system";
  content: string;
}

export type ChatMessage =
  | UserChatMessage
  | AssistantChatMessage
  | ToolChatMessage
  | SystemChatMessage;

export interface ChatMessagePage extends ApiCursorSuccess<ChatMessage> {}

export interface StreamChatRequest {
  agentId: string;
  message: string;
  clientMessageId: UUID;
}

interface ChatStreamEventBase<TName extends string, TData> {
  event: TName;
  eventId: UUID;
  threadId: UUID;
  messageId: UUID;
  data: TData;
}

export type MessageAcceptedEvent = ChatStreamEventBase<
  "message.accepted",
  { clientMessageId: UUID }
>;
export type ResponseDeltaEvent = ChatStreamEventBase<
  "response.delta",
  { textDelta: string }
>;
export type ToolStartedEvent = ChatStreamEventBase<
  "tool.started",
  { toolCallId: UUID; toolName: string; input: JsonObject }
>;
export type ToolCompletedEvent = ChatStreamEventBase<
  "tool.completed",
  { toolCallId: UUID; toolName: string; result: JsonValue }
>;
export type CitationEvent = ChatStreamEventBase<"citation", ChatCitation>;
export type ResponseCompletedEvent = ChatStreamEventBase<
  "response.completed",
  { content: string; citations: ChatCitation[] }
>;
export type ResponseFailedEvent = ChatStreamEventBase<
  "response.failed",
  { code: string; message: string; retryable: boolean }
>;

export type ChatStreamEvent =
  | MessageAcceptedEvent
  | ResponseDeltaEvent
  | ToolStartedEvent
  | ToolCompletedEvent
  | CitationEvent
  | ResponseCompletedEvent
  | ResponseFailedEvent;
