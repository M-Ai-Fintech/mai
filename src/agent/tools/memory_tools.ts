import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { DatabaseMemoryService } from "../../core/db/memory_service.ts";
import { VDRService } from "../vdr_mock.ts";

const memoryInputSchema = z.object({
  action: z.enum([
    "get_user_preferences",
    "save_user_preferences",
    "get_domain_knowledge",
    "save_domain_knowledge",
    "search_similar_knowledge",
  ]),
  userId: z.string().optional(),
  category: z.string().optional(),
  businessId: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  embedding: z.array(z.number()).optional(),
  queryEmbedding: z.array(z.number()).optional(),
});

export const databaseMemoryServiceTool = createTool({
  id: "database-memory-service-tool",
  description: "Stores and retrieves user preferences and domain knowledge.",
  inputSchema: memoryInputSchema,
  outputSchema: z.unknown(),
  execute: executeMemoryAction,
});

type MemoryInput = z.infer<typeof memoryInputSchema>;

async function executeMemoryAction(input: MemoryInput) {
  const service = DatabaseMemoryService.getInstance();
  return await memoryAction(input.action)(service, input);
}

type MemoryAction = (
  service: DatabaseMemoryService,
  input: MemoryInput,
) => Promise<unknown>;

function memoryAction(action: MemoryInput["action"]): MemoryAction {
  const actions: Record<MemoryInput["action"], MemoryAction> = {
    get_user_preferences: getUserPreferences,
    save_user_preferences: saveUserPreferences,
    get_domain_knowledge: getDomainKnowledge,
    save_domain_knowledge: saveDomainKnowledge,
    search_similar_knowledge: searchKnowledge,
  };
  return actions[action];
}

async function getUserPreferences(
  service: DatabaseMemoryService,
  input: MemoryInput,
) {
  const userId = requireValue(input.userId, "userId", input.action);
  const preferences = await service.getUserPreferences(userId);
  return { success: true, userId, preferences };
}

async function saveUserPreferences(
  service: DatabaseMemoryService,
  input: MemoryInput,
) {
  await service.saveUserPreferences(
    requireValue(input.userId, "userId", input.action),
    requireValue(input.data, "data", input.action),
    input.embedding,
  );
  return savedMemory("User preferences");
}

async function getDomainKnowledge(
  service: DatabaseMemoryService,
  input: MemoryInput,
) {
  const category = requireValue(input.category, "category", input.action);
  const knowledge = await service.getDomainKnowledge(category);
  return { success: true, category, knowledge };
}

async function saveDomainKnowledge(
  service: DatabaseMemoryService,
  input: MemoryInput,
) {
  await service.saveDomainKnowledge(
    requireValue(input.category, "category", input.action),
    requireValue(input.data, "data", input.action),
    input.embedding,
  );
  return savedMemory("Domain knowledge");
}

async function searchKnowledge(
  service: DatabaseMemoryService,
  input: MemoryInput,
) {
  const query = requireValue(
    input.queryEmbedding,
    "queryEmbedding",
    input.action,
  );
  return {
    success: true,
    results: await service.searchSimilarKnowledge(query),
  };
}

function requireValue<T>(
  value: T | undefined,
  field: string,
  action: string,
): T {
  if (value !== undefined) return value;
  throw new Error(
    `Missing ${field} for action "${action}"; expected ${field} to be provided.`,
  );
}

function savedMemory(subject: string) {
  return { success: true, message: `${subject} saved successfully.` };
}

const synergyInputSchema = z.object({
  standaloneValue: z.number(),
  costSynergies: z.array(z.number()),
  revenueSynergies: z.array(z.number()),
  integrationCosts: z.array(z.number()),
  wacc: z.number(),
  taxRate: z.number().default(0.34),
  revenueHaircut: z.number().default(0.40),
  sharingCoefficient: z.number().default(0.30),
});

export const synergyPricingTool = createTool({
  id: "synergy-pricing-tool",
  description:
    "Calculates discounted operational synergies, integration costs, and recommended purchase price.",
  inputSchema: synergyInputSchema,
  outputSchema: z.unknown(),
  execute: (input) => Promise.resolve(calculateSynergyPrice(input)),
});

type SynergyInput = z.infer<typeof synergyInputSchema>;

function calculateSynergyPrice(input: SynergyInput) {
  const totals = synergyTotals(input);
  const net = totals.costs + totals.revenue - totals.integration;
  const premium = input.sharingCoefficient * net;
  return {
    success: true,
    presentValueCostSynergies: rounded(totals.costs),
    presentValueRevenueSynergies: rounded(totals.revenue),
    presentValueIntegrationCosts: rounded(totals.integration),
    netSynergyValue: rounded(net),
    sellerPremium: rounded(premium),
    recommendedPurchasePrice: rounded(input.standaloneValue + premium),
    sharingCoefficient: input.sharingCoefficient,
  };
}

function synergyTotals(input: SynergyInput) {
  const years = Math.max(
    input.costSynergies.length,
    input.revenueSynergies.length,
    input.integrationCosts.length,
  );
  const totals = { costs: 0, revenue: 0, integration: 0 };
  for (let index = 0; index < years; index++) {
    const year = discountedSynergyYear(input, index);
    totals.costs += year.costs;
    totals.revenue += year.revenue;
    totals.integration += year.integration;
  }
  return totals;
}

function discountedSynergyYear(input: SynergyInput, index: number) {
  const discount = Math.pow(1 + input.wacc, index + 1);
  return {
    costs: ((input.costSynergies[index] ?? 0) * (1 - input.taxRate)) / discount,
    revenue: ((input.revenueSynergies[index] ?? 0) *
      (1 - input.revenueHaircut) * (1 - input.taxRate)) / discount,
    integration: ((input.integrationCosts[index] ?? 0) *
      (1 - input.taxRate)) / discount,
  };
}

function rounded(value: number): number {
  return Number(value.toFixed(3));
}

export const vdrStructuredAccessTool = createTool({
  id: "vdr-structured-access-tool",
  description:
    "Lists, reads, searches, and audits documents in a deal's virtual data room.",
  inputSchema: z.object({
    action: z.enum([
      "list_files",
      "read_file_content",
      "query_silo",
      "audit_compliance",
    ]),
    dealId: z.string(),
    fileName: z.string().optional(),
    queryText: z.string().optional(),
    topK: z.number().optional(),
  }),
  outputSchema: z.unknown(),
  execute: executeVdrAction,
});

type VdrInput = {
  action:
    | "list_files"
    | "read_file_content"
    | "query_silo"
    | "audit_compliance";
  dealId: string;
  fileName?: string;
  queryText?: string;
  topK?: number;
};

async function executeVdrAction(input: VdrInput) {
  if (input.action === "list_files") return await listVdrFiles(input.dealId);
  if (input.action === "read_file_content") {
    return await readVdrFile(input);
  }
  if (input.action === "query_silo") return await queryVdrSilo(input);
  return await auditVdrCompliance(input.dealId);
}

async function readVdrFile(input: VdrInput) {
  const fileName = requireValue(input.fileName, "fileName", input.action);
  const content = await Deno.readTextFile(
    `./vdr_rooms/${input.dealId}/${fileName}`,
  );
  return { success: true, dealId: input.dealId, fileName, content };
}

async function queryVdrSilo(input: VdrInput) {
  const { ClientSiloedRAG } = await import("../rag_layer.ts");
  const query = requireValue(input.queryText, "queryText", input.action);
  const results = await ClientSiloedRAG.querySilo(
    input.dealId,
    query,
    input.topK ?? 2,
  );
  return { success: true, dealId: input.dealId, query, results };
}

async function listVdrFiles(dealId: string) {
  const docs = await VDRService.getDocumentsForDeal(dealId);
  const tags: Record<string, string> = {
    finance: "#financial",
    corporate: "#corporate",
    labor: "#labor",
    tax: "#tax",
  };
  return {
    success: true,
    dealId,
    files: docs.map((doc) => ({ ...doc, tag: tags[doc.type] ?? "#other" })),
  };
}

async function auditVdrCompliance(dealId: string) {
  const docs = await VDRService.getDocumentsForDeal(dealId);
  const types = docs.map((document) => document.type);
  const missing = ["finance", "corporate", "labor", "tax"].filter((type) =>
    !types.includes(type)
  );
  return {
    success: true,
    dealId,
    status: missing.length === 0 ? "COMPLIANT" : "NON_COMPLIANT",
    missingCategories: missing,
    message: missing.length === 0
      ? "All essential documents are present."
      : `Missing essential documents: ${missing.join(", ")}.`,
  };
}
