// src/agent/agents/legal-dd/index.ts
import { Agent } from "@mastra/core/agent";
import { google } from "@ai-sdk/google";
import * as tools from "./tools/index.ts";

const instructions = Deno.readTextFileSync(
  new URL("./instructions.md", import.meta.url),
);

export const LegalDueDiligenceAgent = new Agent({
  id: "legal-dd-agent",
  name: "LegalDueDiligenceAgent",
  model: google("gemini-3.5-flash"),
  instructions: instructions,
  tools: tools,
});
