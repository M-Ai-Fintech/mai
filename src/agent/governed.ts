/**
 * Provider-neutral public surface for versioned specialist definitions,
 * proposal adapters, and governed ToolGateway definitions.
 *
 * @example import { createSpecialistDefinitionCatalog } from "./src/agent/governed.ts"
 */
export * from "./definitions/index.ts";
export * from "./governed_agent.ts";
export * from "./governed_calculation_ports.ts";
export * from "./governed_runtime_adapter.ts";
export * from "./tools/governed_evidence_tools.ts";
export * from "./tools/financial_risk_tools.ts";
