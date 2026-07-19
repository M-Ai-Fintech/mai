import { ChatCitation, ChatMessage, ChatThread } from "../contracts.ts";
import { getDealState } from "./accessors.ts";
import { MvpStoreError } from "./error.ts";
import { MvpStoreState } from "./state.ts";
import {
  AgentId,
  CursorPage,
  StoredChatMessage,
  StoredChatThread,
} from "./types.ts";
import { clone, cursorPage } from "./utils.ts";

export class ChatRepository {
  constructor(private readonly state: MvpStoreState) {}

  listThreads(dealId: string): ChatThread[] {
    getDealState(this.state, dealId);
    return clone(
      [...this.state.threads.values()]
        .filter((thread) => thread.dealId === dealId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(({ messageCount: _messageCount, ...thread }) => thread),
    );
  }

  createThread(dealId: string, title: string, agentId: AgentId): ChatThread {
    getDealState(this.state, dealId);
    const timestamp = this.state.now();
    const thread: StoredChatThread = {
      id: this.state.id(),
      dealId,
      title,
      agentId,
      createdAt: timestamp,
      updatedAt: timestamp,
      messageCount: 0,
    };
    this.state.threads.set(thread.id, thread);
    this.state.messages.set(thread.id, []);
    return this.toThread(thread);
  }

  listMessages(
    threadId: string,
    cursor?: string,
    limit = 50,
  ): CursorPage<ChatMessage> {
    this.getThread(threadId);
    const stored = cursorPage(
      this.state.messages.get(threadId)!,
      cursor,
      limit,
    );
    return {
      data: stored.data.map((message) => this.toMessage(message)),
      meta: stored.meta,
    };
  }

  appendUserMessage(
    dealId: string,
    threadId: string,
    input: { agentId: AgentId; message: string; clientMessageId: string },
  ): StoredChatMessage {
    const thread = this.getThread(threadId, dealId);
    const existing = this.state.messages.get(threadId)!.find((message) =>
      message.clientMessageId === input.clientMessageId
    );
    if (existing) return clone(existing);
    const timestamp = this.state.now();
    const message: StoredChatMessage = {
      id: this.state.id(),
      threadId,
      role: "user",
      agentId: input.agentId,
      clientMessageId: input.clientMessageId,
      content: input.message,
      citations: [],
      status: "accepted",
      error: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.state.messages.get(threadId)!.push(message);
    thread.agentId = input.agentId;
    this.touchThread(thread, timestamp);
    return clone(message);
  }

  startAssistantMessage(
    threadId: string,
    agentId: AgentId,
  ): StoredChatMessage {
    const thread = this.getThread(threadId);
    const timestamp = this.state.now();
    const message: StoredChatMessage = {
      id: this.state.id(),
      threadId,
      role: "assistant",
      agentId,
      clientMessageId: null,
      content: "",
      citations: [],
      status: "streaming",
      error: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.state.messages.get(threadId)!.push(message);
    this.touchThread(thread, timestamp);
    return clone(message);
  }

  appendAssistantDelta(
    threadId: string,
    messageId: string,
    textDelta: string,
  ): StoredChatMessage {
    const message = this.getMessage(threadId, messageId);
    message.content += textDelta;
    message.updatedAt = this.state.now();
    return clone(message);
  }

  completeAssistantMessage(
    threadId: string,
    messageId: string,
    citations: ChatCitation[] = [],
  ): StoredChatMessage {
    const message = this.getMessage(threadId, messageId);
    message.status = "completed";
    message.citations = clone(citations);
    message.updatedAt = this.state.now();
    this.touchThread(this.getThread(threadId), message.updatedAt);
    return clone(message);
  }

  failAssistantMessage(
    threadId: string,
    messageId: string,
    error: string,
  ): StoredChatMessage {
    const message = this.getMessage(threadId, messageId);
    message.status = "failed";
    message.error = error;
    message.updatedAt = this.state.now();
    this.touchThread(this.getThread(threadId), message.updatedAt);
    return clone(message);
  }

  private getThread(id: string, dealId?: string): StoredChatThread {
    const thread = this.state.threads.get(id);
    if (!thread || (dealId && thread.dealId !== dealId)) {
      throw new MvpStoreError(
        "CHAT_THREAD_NOT_FOUND",
        "Chat thread not found",
        404,
      );
    }
    return thread;
  }

  private getMessage(threadId: string, id: string): StoredChatMessage {
    this.getThread(threadId);
    const message = this.state.messages.get(threadId)!.find((candidate) =>
      candidate.id === id
    );
    if (!message) {
      throw new MvpStoreError(
        "CHAT_MESSAGE_NOT_FOUND",
        "Chat message not found",
        404,
      );
    }
    return message;
  }

  private touchThread(thread: StoredChatThread, timestamp: string): void {
    thread.updatedAt = timestamp;
    thread.messageCount = this.state.messages.get(thread.id)!.length;
  }

  private toThread(thread: StoredChatThread): ChatThread {
    const { messageCount: _messageCount, ...contract } = thread;
    return clone(contract);
  }

  private toMessage(message: StoredChatMessage): ChatMessage {
    if (message.role === "user") {
      return {
        id: message.id,
        threadId: message.threadId,
        role: "user",
        content: message.content,
        clientMessageId: message.clientMessageId!,
        createdAt: message.createdAt,
      };
    }
    return {
      id: message.id,
      threadId: message.threadId,
      role: "assistant",
      content: message.content,
      agentId: message.agentId!,
      citations: clone(message.citations),
      createdAt: message.createdAt,
    };
  }
}
