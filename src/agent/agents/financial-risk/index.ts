// src/agent/agents/financial-risk/index.ts
import { Agent } from "@mastra/core/agent";
import { google } from "@ai-sdk/google";
import * as tools from "./tools/index.ts";

const instructions = Deno.readTextFileSync(
  new URL("./instructions.md", import.meta.url)
);

export const FinancialRiskAgent = new Agent({
  id: "financial-risk-agent",
  name: "FinancialRiskAgent",
  model: google("gemini-3.5-flash"),
  instructions: instructions,
  tools: tools,
});
