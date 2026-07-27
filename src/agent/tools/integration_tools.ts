import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { DatabaseMemoryService } from "../../core/db/memory_service.ts";
import { LocalPubSubBus } from "../../core/pubsub/LocalPubSubBus.ts";
import { describeError } from "../../shared/errors.ts";
import { VDRService } from "../vdr_mock.ts";

export const googleCloudPubSubTool = createTool({
  id: "pubsub-bus-tool",
  description:
    "Simulates VDR access requests and asynchronous engine triggers on the local event bus.",
  inputSchema: z.object({
    topic: z.string().describe("Pub/Sub topic to publish the message."),
    dealId: z.string().optional().describe("Associated deal/transaction ID."),
    requester: z.string().optional().describe(
      "Identity of the requesting agent or service.",
    ),
    payload: z.record(z.unknown()).optional(),
    action: z.enum(["request_vdr_access", "publish_event", "trigger_engine"])
      .default("publish_event"),
  }),
  outputSchema: z.unknown(),
  execute: publishLocalEvent,
});

async function publishLocalEvent(
  input: {
    topic: string;
    dealId?: string;
    requester?: string;
    payload?: Record<string, unknown>;
    action: "request_vdr_access" | "publish_event" | "trigger_engine";
  },
) {
  const event = localEvent(input);
  LocalPubSubBus.getInstance().publish(input.topic, event);
  const response = await localActionResponse(input, event);
  if (response) return response;
  return publishedEvent(input, event.messageId);
}

function publishedEvent(
  input: { topic: string; action: string },
  messageId: string,
) {
  return {
    success: true,
    messageId,
    topic: input.topic,
    action: input.action,
    message: `Message published successfully to topic '${input.topic}'.`,
  };
}

async function localActionResponse(
  input: {
    topic: string;
    dealId?: string;
    requester?: string;
    action: "request_vdr_access" | "publish_event" | "trigger_engine";
  },
  event: Record<string, unknown>,
) {
  if (
    input.action === "request_vdr_access" && input.dealId && input.requester
  ) return await publishVdrResponse(input.topic, input.dealId, event);
  if (input.action === "trigger_engine" && input.dealId) {
    return publishEngineResponse(input.topic, input.dealId, event);
  }
  return undefined;
}

function localEvent(input: {
  dealId?: string;
  requester?: string;
  payload?: Record<string, unknown>;
  action: "request_vdr_access" | "publish_event" | "trigger_engine";
}) {
  return {
    messageId: `msg_${Math.random().toString(36).substring(2, 11)}`,
    dealId: input.dealId,
    requester: input.requester,
    payload: input.payload,
    action: input.action,
    timestamp: new Date().toISOString(),
  };
}

function publishEngineResponse(
  topic: string,
  dealId: string,
  event: Record<string, unknown>,
) {
  LocalPubSubBus.getInstance().publish(`${topic}_response`, {
    ...event,
    status: "success",
    result: `Engine triggered successfully for ${dealId}`,
  });
  return {
    success: true,
    messageId: event.messageId,
    action: event.action,
    dealId,
    message: "Engine triggered successfully",
  };
}

async function publishVdrResponse(
  topic: string,
  dealId: string,
  event: Record<string, unknown>,
) {
  const documents = await VDRService.getDocumentsForDeal(dealId);
  LocalPubSubBus.getInstance().publish(`${topic}_response`, {
    ...event,
    status: "success",
    documents,
  });
  return {
    success: true,
    messageId: event.messageId,
    action: event.action,
    dealId,
    documents,
  };
}

export const mcpDatabaseTool = createTool({
  id: "mcp-database-tool",
  description:
    "Queries PostgreSQL operational tables and schema through an MCP-compatible interface.",
  inputSchema: z.object({
    action: z.enum(["query", "inspect_schema", "list_tables"]),
    table: z.enum([
      "transaction",
      "business",
      "financial_structure",
      "phase_history",
    ]).optional(),
    query: z.string().optional(),
    parameters: z.array(z.unknown()).optional(),
  }),
  outputSchema: z.unknown(),
  execute: async (input) => {
    const memoryService = DatabaseMemoryService.getInstance();
    try {
      return await executeDatabaseAction(memoryService, input);
    } catch (error: unknown) {
      console.warn(
        "mcpDatabaseTool - Connection to Postgres failed, executing fallback:",
        describeError(error),
      );
      return databaseFallback(input);
    }
  },
});

type DatabaseToolInput = {
  action: "query" | "inspect_schema" | "list_tables";
  table?: "transaction" | "business" | "financial_structure" | "phase_history";
  query?: string;
  parameters?: unknown[];
};

async function executeDatabaseAction(
  memoryService: DatabaseMemoryService,
  input: DatabaseToolInput,
) {
  if (input.action === "list_tables") {
    return await listDatabaseTables(memoryService);
  }
  if (input.action === "inspect_schema" && input.table) {
    return await inspectDatabaseTable(memoryService, input.table);
  }
  if (input.action === "inspect_schema") {
    return { success: false, message: "Unknown or invalid action." };
  }
  return await queryDatabase(memoryService, input);
}

async function listDatabaseTables(memoryService: DatabaseMemoryService) {
  const sql =
    `SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public';`;
  const rows = await memoryService.executeRawQuery<{ name: string }>(sql);
  return { success: true, tables: rows.map((row) => row.name) };
}

async function inspectDatabaseTable(
  memoryService: DatabaseMemoryService,
  table: NonNullable<DatabaseToolInput["table"]>,
) {
  const sql =
    `SELECT column_name as column FROM information_schema.columns WHERE table_name = $1;`;
  const rows = await memoryService.executeRawQuery<{ column: string }>(
    sql,
    [table],
  );
  return {
    success: true,
    table,
    schema: { columns: rows.map((row) => row.column) },
  };
}

async function queryDatabase(
  memoryService: DatabaseMemoryService,
  input: DatabaseToolInput,
) {
  const sql = input.query ??
    `SELECT * FROM ${input.table ?? "transaction"} LIMIT 10;`;
  const rows = await memoryService.executeRawQuery<Record<string, unknown>>(
    sql,
    input.parameters,
  );
  return {
    success: true,
    action: input.action,
    executedQuery: sql,
    data: rows,
  };
}

const databaseSchemas: Record<string, { columns: string[] }> = {
  transaction: {
    columns: [
      "id",
      "title",
      "code",
      "transaction_type_id",
      "transaction_strategy_id",
      "transaction_status_id",
      "target_valuation",
      "currency",
      "created_at",
      "updated_at",
    ],
  },
  business: {
    columns: [
      "id",
      "name",
      "cnpj",
      "sector",
      "origin_country",
      "created_at",
      "updated_at",
    ],
  },
  financial_structure: {
    columns: [
      "id",
      "transaction_id",
      "cash_percentage",
      "equity_percentage",
      "earn_out_percentage",
      "escrow_percentage",
      "total_valuation",
      "created_at",
      "updated_at",
    ],
  },
  phase_history: {
    columns: [
      "id",
      "transaction_id",
      "phase_id",
      "phase_status_id",
      "data",
      "started_at",
      "completed_at",
      "comments",
      "created_at",
    ],
  },
};

function databaseFallback(input: DatabaseToolInput) {
  if (input.action === "list_tables") {
    return {
      success: true,
      tables: Object.keys(databaseSchemas),
      fallback: true,
    };
  }
  if (input.action === "inspect_schema" && input.table) {
    return {
      success: true,
      table: input.table,
      schema: databaseSchemas[input.table],
      fallback: true,
    };
  }
  return fallbackQuery(input);
}

function fallbackQuery(input: DatabaseToolInput) {
  return {
    success: true,
    action: input.action,
    executedQuery: input.query ??
      `SELECT * FROM ${input.table ?? "transaction"} LIMIT 10`,
    data: [{
      id: crypto.randomUUID(),
      status: "active",
      notes: "Query executed via Fallback MCP (Database offline)",
    }],
    fallback: true,
  };
}
