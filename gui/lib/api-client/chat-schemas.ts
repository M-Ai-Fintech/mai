import { z } from "zod";

import {
  idSchema,
  jsonObjectSchema,
  jsonValueSchema,
  timestampSchema,
} from "./common-schemas";

export const chatAgentSchema = z.string().trim().min(1);

export const chatThreadSchema = z.object({
  id: idSchema,
  dealId: idSchema,
  title: z.string(),
  agentId: chatAgentSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createChatThreadSchema = z.object({
  title: z.string().trim().min(1),
  agentId: chatAgentSchema,
});

export const citationSchema = z.object({
  id: idSchema,
  documentId: idSchema,
  label: z.string(),
  excerpt: z.string().nullable(),
  page: z.number().int().positive().nullable(),
});

const chatMessageBaseShape = {
  id: idSchema,
  threadId: idSchema,
  createdAt: timestampSchema,
};

export const chatMessageSchema = z.discriminatedUnion("role", [
  z.object({
    ...chatMessageBaseShape,
    role: z.literal("user"),
    content: z.string(),
    clientMessageId: idSchema,
  }),
  z.object({
    ...chatMessageBaseShape,
    role: z.literal("assistant"),
    content: z.string(),
    agentId: chatAgentSchema,
    citations: z.array(citationSchema),
  }),
  z.object({
    ...chatMessageBaseShape,
    role: z.literal("tool"),
    toolName: z.string(),
    status: z.enum(["started", "completed", "failed"]),
    content: jsonValueSchema,
  }),
  z.object({
    ...chatMessageBaseShape,
    role: z.literal("system"),
    content: z.string(),
  }),
]);

export const chatStreamRequestSchema = z.object({
  agentId: chatAgentSchema,
  message: z.string().trim().min(1),
  clientMessageId: idSchema,
});

const streamEventBaseSchema = z.object({
  eventId: idSchema,
  threadId: idSchema,
  messageId: idSchema,
});

export const chatStreamEventSchema = z.discriminatedUnion("event", [
  streamEventBaseSchema.extend({
    event: z.literal("message.accepted"),
    data: z.object({ clientMessageId: idSchema }),
  }),
  streamEventBaseSchema.extend({
    event: z.literal("response.delta"),
    data: z.object({ textDelta: z.string() }),
  }),
  streamEventBaseSchema.extend({
    event: z.literal("tool.started"),
    data: z.object({
      toolCallId: idSchema,
      toolName: z.string(),
      input: jsonObjectSchema,
    }),
  }),
  streamEventBaseSchema.extend({
    event: z.literal("tool.completed"),
    data: z.object({
      toolCallId: idSchema,
      toolName: z.string(),
      result: jsonValueSchema,
    }),
  }),
  streamEventBaseSchema.extend({
    event: z.literal("citation"),
    data: citationSchema,
  }),
  streamEventBaseSchema.extend({
    event: z.literal("response.completed"),
    data: z.object({ content: z.string(), citations: z.array(citationSchema) }),
  }),
  streamEventBaseSchema.extend({
    event: z.literal("response.failed"),
    data: z.object({
      code: z.string(),
      message: z.string(),
      retryable: z.boolean(),
    }),
  }),
]);
