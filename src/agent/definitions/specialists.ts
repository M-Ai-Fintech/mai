import {
  inputSchema as brokerInputSchema,
} from "../agents/broker-orchestrator/schemas/input.ts";
import {
  outputSchema as brokerOutputSchema,
} from "../agents/broker-orchestrator/schemas/output.ts";
import {
  inputSchema as matchingInputSchema,
} from "../agents/deal-matching/schemas/input.ts";
import {
  outputSchema as matchingOutputSchema,
} from "../agents/deal-matching/schemas/output.ts";
import {
  inputSchema as financialInputSchema,
} from "../agents/financial-risk/schemas/input.ts";
import {
  outputSchema as financialOutputSchema,
} from "../agents/financial-risk/schemas/output.ts";
import {
  inputSchema as generalInputSchema,
} from "../agents/general-dd/schemas/input.ts";
import {
  outputSchema as generalOutputSchema,
} from "../agents/general-dd/schemas/output.ts";
import {
  inputSchema as closingInputSchema,
} from "../agents/legal-closing/schemas/input.ts";
import {
  outputSchema as closingOutputSchema,
} from "../agents/legal-closing/schemas/output.ts";
import {
  inputSchema as legalInputSchema,
} from "../agents/legal-dd/schemas/input.ts";
import {
  outputSchema as legalOutputSchema,
} from "../agents/legal-dd/schemas/output.ts";
import {
  inputSchema as negotiationInputSchema,
} from "../agents/negotiation/schemas/input.ts";
import {
  outputSchema as negotiationOutputSchema,
} from "../agents/negotiation/schemas/output.ts";
import {
  inputSchema as sourcingInputSchema,
} from "../agents/sourcing-kyb/schemas/input.ts";
import {
  outputSchema as sourcingOutputSchema,
} from "../agents/sourcing-kyb/schemas/output.ts";
import { type AgentDefinition } from "./contract.ts";
import { createDefinitionCatalog, type DefinitionCatalog } from "./catalog.ts";
import {
  asset,
  defineSpecialist,
  MODEL_ADAPTATION_UNAVAILABLE,
  PROVIDER_UNAVAILABLE,
  purePort,
} from "./factory.ts";
import {
  FINANCIAL_RISK_CALCULATION_BINDINGS,
  MATCHING_CALCULATION_BINDINGS,
  TERM_SHEET_CALCULATION_BINDINGS,
} from "./specialist_calculations.ts";

export const brokerOrchestratorDefinition = defineSpecialist({
  id: "broker-orchestrator-agent",
  name: "BrokerOrchestratorAgent",
  inputSchema: brokerInputSchema,
  outputSchema: brokerOutputSchema,
  promptDigest:
    "sha256:3db52211832b4d9488f0065dd9faee99f1c0a0a1a80f26941c6e638613f80289",
  allowedCapabilities: ["evidence.search", "citation.propose"],
  knowledgeAssets: [
    asset("src/agent/agents/broker-orchestrator/instructions.md", "rules"),
    asset("src/agent/agents/broker-orchestrator/playbook.md", "playbook"),
    asset("src/agent/agents/broker-orchestrator/rules.md", "rules"),
    asset(
      "src/agent/agents/broker-orchestrator/fonts/broker_preferences_guide.md",
    ),
    asset("src/agent/agents/broker-orchestrator/fonts/memory_taxonomy_ma.md"),
    asset(
      "src/agent/agents/broker-orchestrator/fonts/reforma-tributaria-brasil-2026.md",
    ),
    asset(
      "src/agent/agents/broker-orchestrator/fonts/semantic_routing_patterns.md",
    ),
  ],
  toolReferences: [
    "governed.evidence.search",
    "governed.evidence.citation_proposal",
  ],
  purePorts: [],
  legacyToolReferences: [
    "databaseMemoryServiceTool",
    "geminiGoogleSearchTool",
    "googleCloudPubSubTool",
    "mcpDatabaseTool",
  ],
});

export const dealMatchingDefinition = defineSpecialist({
  id: "deal-matching-agent",
  name: "DealMatchingAgent",
  inputSchema: matchingInputSchema,
  outputSchema: matchingOutputSchema,
  promptDigest:
    "sha256:d7035427a19d6bf602b5cf7b09c9a1f4e0c19b3d6e6687a3fda229730fbb3011",
  allowedCapabilities: [
    "evidence.search",
    "citation.propose",
    "calculation.portfolio",
    "calculation.synergy",
  ],
  knowledgeAssets: [
    asset("src/agent/agents/deal-matching/instructions.md", "rules"),
    asset("src/agent/agents/deal-matching/playbook.md", "playbook"),
    asset("src/agent/agents/deal-matching/rules.md", "rules"),
    asset("src/agent/agents/deal-matching/fonts/deal_fatigue_mitigation.md"),
    asset(
      "src/agent/agents/deal-matching/fonts/portfolio_optimization_theory.md",
    ),
    asset("src/agent/agents/deal-matching/fonts/sector_ev_ebitda_brazil.md"),
    asset("src/agent/agents/deal-matching/fonts/synergy_pricing_models.md"),
    asset("src/agent/agents/deal-matching/fonts/valuation-multiples-brazil.md"),
    asset(
      "src/agent/agents/deal-matching/fonts/valuation_ranges_methodology.md",
    ),
  ],
  toolReferences: [
    "governed.evidence.search",
    "governed.evidence.citation_proposal",
  ],
  purePorts: [
    purePort(
      "portfolio-selection",
      "src/engines/optimization/matching/portfolio_selection.ts",
    ),
    purePort(
      "valuation-calculations",
      "src/engines/valuation/value_calculations.ts",
    ),
    purePort(
      "synergy-pricing",
      "src/engines/valuation/synergy_calculation.ts",
    ),
  ],
  calculationBindings: MATCHING_CALCULATION_BINDINGS,
  legacyToolReferences: [
    "databaseMemoryServiceTool",
    "googleCloudPubSubTool",
    "mcpDatabaseTool",
    "optimizePortfolioTool",
    "synergyPricingTool",
  ],
});

export const financialRiskDefinition = defineSpecialist({
  id: "financial-risk-agent",
  name: "FinancialRiskAgent",
  inputSchema: financialInputSchema,
  outputSchema: financialOutputSchema,
  promptDigest:
    "sha256:363b21dd3cf0b8704492506711ba6e42e1f6ab95de62b8d046d6495688bb2d8b",
  allowedCapabilities: [
    "document.list",
    "document.metadata.read",
    "evidence.search",
    "citation.propose",
    "calculation.financial-risk",
  ],
  knowledgeAssets: [
    asset("src/agent/agents/financial-risk/instructions.md", "rules"),
    asset("src/agent/agents/financial-risk/playbook.md", "playbook"),
    asset("src/agent/agents/financial-risk/rules.md", "rules"),
    asset("src/agent/agents/financial-risk/fonts/brgaap_ifrs_adjustments.md"),
    asset("src/agent/agents/financial-risk/fonts/cpc-06-r2-arrendamentos.md"),
    asset("src/agent/agents/financial-risk/fonts/cpc-15-combinacoes.md"),
    asset("src/agent/agents/financial-risk/fonts/debt_benchmarks.md"),
    asset(
      "src/agent/agents/financial-risk/fonts/ebitda_normalization_guide.md",
    ),
    asset("src/agent/agents/financial-risk/fonts/kanitz-elizabetsky-models.md"),
    asset("src/agent/agents/financial-risk/fonts/sector_multiples_brazil.md"),
  ],
  toolReferences: [
    "governed.documents.list",
    "governed.documents.version_metadata",
    "governed.documents.version_content",
    "governed.evidence.search",
    "governed.evidence.citation_proposal",
  ],
  purePorts: [
    purePort(
      "financial-value-calculations",
      "src/engines/valuation/value_calculations.ts",
    ),
  ],
  calculationBindings: FINANCIAL_RISK_CALCULATION_BINDINGS,
  legacyToolReferences: [
    "analyzeCompanyRisksTool",
    "databaseMemoryServiceTool",
    "googleCloudPubSubTool",
    "huggingFaceMcpTool",
    "mcpDatabaseTool",
    "vdrStructuredAccessTool",
  ],
});

export const generalDueDiligenceDefinition = defineSpecialist({
  id: "general-dd-agent",
  name: "GeneralDueDiligenceAgent",
  inputSchema: generalInputSchema,
  outputSchema: generalOutputSchema,
  promptDigest:
    "sha256:0582dc582fd122e0163452b8f5634ac198d50f75175837a97f1f7e4f6a65b365",
  allowedCapabilities: [
    "document.list",
    "document.metadata.read",
    "document.content.read",
    "evidence.search",
    "citation.propose",
    "finding.propose",
  ],
  knowledgeAssets: [
    asset("src/agent/agents/general-dd/instructions.md", "rules"),
    asset("src/agent/agents/general-dd/playbook.md", "playbook"),
    asset("src/agent/agents/general-dd/rules.md", "rules"),
    asset("src/agent/agents/general-dd/fonts/dd_checklist_brazil.md"),
    asset("src/agent/agents/general-dd/fonts/go_nogo_criteria.md"),
    asset("src/agent/agents/general-dd/fonts/risk_synthesis_framework.md"),
    asset("src/agent/agents/general-dd/fonts/vdr_directory_template.md"),
  ],
  toolReferences: [
    "governed.documents.list",
    "governed.documents.version_metadata",
    "governed.documents.version_content",
    "governed.evidence.search",
    "governed.evidence.citation_proposal",
    "governed.evidence.missing_document_finding_proposal",
  ],
  purePorts: [],
  legacyToolReferences: [
    "databaseMemoryServiceTool",
    "googleCloudPubSubTool",
    "mcpDatabaseTool",
    "vdrStructuredAccessTool",
  ],
});

export const legalClosingDefinition = defineSpecialist({
  id: "legal-closing-agent",
  name: "LegalClosingAgent",
  inputSchema: closingInputSchema,
  outputSchema: closingOutputSchema,
  promptDigest:
    "sha256:d0961539d92110dabe7e46b49731ac5c2f5bd07c80051b9ebe0fe871c5c804eb",
  allowedCapabilities: [
    "document.list",
    "document.metadata.read",
    "document.content.read",
    "evidence.search",
    "citation.propose",
    "finding.propose",
    "calculation.term-sheet",
  ],
  knowledgeAssets: [
    asset("src/agent/agents/legal-closing/instructions.md", "rules"),
    asset("src/agent/agents/legal-closing/playbook.md", "playbook"),
    asset("src/agent/agents/legal-closing/rules.md", "rules"),
    asset("src/agent/agents/legal-closing/fonts/closing_mechanics_guide.md"),
    asset(
      "src/agent/agents/legal-closing/fonts/conditions_precedent_checklist.md",
    ),
    asset("src/agent/agents/legal-closing/fonts/mac_clause_guide.md"),
    asset("src/agent/agents/legal-closing/fonts/non_compete_standards.md"),
    asset("src/agent/agents/legal-closing/fonts/reps_warranties_brazil.md"),
    asset("src/agent/agents/legal-closing/fonts/spa_template_brazil.md"),
    asset(
      "src/agent/agents/legal-closing/templates/spa-outline-template.md",
      "template",
    ),
    asset(
      "src/agent/agents/legal-closing/templates/term-sheet-template.md",
      "template",
    ),
  ],
  toolReferences: [
    "governed.documents.list",
    "governed.documents.version_metadata",
    "governed.documents.version_content",
    "governed.evidence.search",
    "governed.evidence.citation_proposal",
    "governed.evidence.missing_document_finding_proposal",
  ],
  purePorts: [
    purePort(
      "negotiation-proposal-optimizer",
      "src/engines/optimization/negotiation/optimizer.ts",
    ),
  ],
  calculationBindings: TERM_SHEET_CALCULATION_BINDINGS,
  legacyToolReferences: [
    "databaseMemoryServiceTool",
    "generatePdfTermSheetTool",
    "googleCloudPubSubTool",
    "mcpDatabaseTool",
  ],
  defaultArtifactKind: "reversible_draft",
});

export const legalDueDiligenceDefinition = defineSpecialist({
  id: "legal-dd-agent",
  name: "LegalDueDiligenceAgent",
  inputSchema: legalInputSchema,
  outputSchema: legalOutputSchema,
  promptDigest:
    "sha256:6a9dbfb255afd557d2449b7fa60f1cd2dc85ead43546b90207ff043eb0641d14",
  allowedCapabilities: [
    "document.list",
    "document.metadata.read",
    "document.content.read",
    "evidence.search",
    "citation.propose",
    "finding.propose",
  ],
  knowledgeAssets: [
    asset("src/agent/agents/legal-dd/instructions.md", "rules"),
    asset("src/agent/agents/legal-dd/playbook.md", "playbook"),
    asset("src/agent/agents/legal-dd/rules.md", "rules"),
    asset(
      "src/agent/agents/legal-dd/checklists/legal-dd-checklist.md",
      "checklist",
    ),
    asset("src/agent/agents/legal-dd/fonts/change_of_control_clauses.md"),
    asset("src/agent/agents/legal-dd/fonts/cpc-25-contingencias.md"),
    asset("src/agent/agents/legal-dd/fonts/labor_contingency_guide.md"),
    asset("src/agent/agents/legal-dd/fonts/lei-sa-acordos.md"),
    asset("src/agent/agents/legal-dd/fonts/lei_sa_6404_76_key_articles.md"),
    asset("src/agent/agents/legal-dd/fonts/lgpd_compliance_checklist.md"),
    asset("src/agent/agents/legal-dd/fonts/ltda_family_business_traps.md"),
    asset("src/agent/agents/legal-dd/fonts/materiality_thresholds.md"),
    asset("src/agent/agents/legal-dd/fonts/sumula-5-cade.md"),
  ],
  toolReferences: [
    "governed.documents.list",
    "governed.documents.version_metadata",
    "governed.documents.version_content",
    "governed.evidence.search",
    "governed.evidence.citation_proposal",
    "governed.evidence.missing_document_finding_proposal",
  ],
  purePorts: [],
  legacyToolReferences: [
    "databaseMemoryServiceTool",
    "googleCloudPubSubTool",
    "mcpDatabaseTool",
    "vdrStructuredAccessTool",
  ],
});

export const negotiationDefinition = defineSpecialist({
  id: "negotiation-agent",
  name: "NegotiationAgent",
  inputSchema: negotiationInputSchema,
  outputSchema: negotiationOutputSchema,
  promptDigest:
    "sha256:f44be751922e615afa7b704b0f40261d08c1467bec8798eab49ce69d3cb25f4f",
  allowedCapabilities: [
    "document.list",
    "document.metadata.read",
    "evidence.search",
    "citation.propose",
    "calculation.term-sheet",
  ],
  knowledgeAssets: [
    asset("src/agent/agents/negotiation/instructions.md", "rules"),
    asset("src/agent/agents/negotiation/playbook.md", "playbook"),
    asset("src/agent/agents/negotiation/rules.md", "rules"),
    asset("src/agent/agents/negotiation/fonts/batna_zopa_framework.md"),
    asset("src/agent/agents/negotiation/fonts/deal_structure_templates.md"),
    asset("src/agent/agents/negotiation/fonts/earn_out_brazil_standards.md"),
    asset("src/agent/agents/negotiation/fonts/escrow_best_practices.md"),
    asset("src/agent/agents/negotiation/fonts/nash_equilibrium_ma_tactics.md"),
  ],
  toolReferences: [
    "governed.documents.list",
    "governed.documents.version_metadata",
    "governed.evidence.search",
    "governed.evidence.citation_proposal",
  ],
  purePorts: [
    purePort(
      "negotiation-proposal-optimizer",
      "src/engines/optimization/negotiation/optimizer.ts",
    ),
  ],
  calculationBindings: TERM_SHEET_CALCULATION_BINDINGS,
  legacyToolReferences: [
    "databaseMemoryServiceTool",
    "googleCloudPubSubTool",
    "mcpDatabaseTool",
    "optimizeTermSheetTool",
  ],
});

export const sourcingKybDefinition = defineSpecialist({
  id: "sourcing-kyb-agent",
  name: "SourcingAndKYBAgent",
  inputSchema: sourcingInputSchema,
  outputSchema: sourcingOutputSchema,
  promptDigest:
    "sha256:3921a52a10c068b3c1602a99f74df3373e69306bcc3cda8356db77787862a195",
  allowedCapabilities: [
    "document.list",
    "document.metadata.read",
    "evidence.search",
    "citation.propose",
    "finding.propose",
  ],
  unavailableCapabilities: [
    PROVIDER_UNAVAILABLE,
    MODEL_ADAPTATION_UNAVAILABLE,
    {
      capability: "provider.registry-verification",
      reason:
        "Registry adapter certification is outside this definition lane; return an unavailable result until MAI-61 certifies it.",
    },
  ],
  knowledgeAssets: [
    asset("src/agent/agents/sourcing-kyb/instructions.md", "rules"),
    asset("src/agent/agents/sourcing-kyb/playbook.md", "playbook"),
    asset("src/agent/agents/sourcing-kyb/rules.md", "rules"),
    asset(
      "src/agent/agents/sourcing-kyb/checklists/kyb-checklist.md",
      "checklist",
    ),
    asset("src/agent/agents/sourcing-kyb/fonts/corporate_culture_signals.md"),
    asset("src/agent/agents/sourcing-kyb/fonts/key_person_risk_matrix.md"),
    asset("src/agent/agents/sourcing-kyb/fonts/osint_playbook_brazil.md"),
    asset("src/agent/agents/sourcing-kyb/fonts/public_databases_guide.md"),
  ],
  toolReferences: [
    "governed.documents.list",
    "governed.documents.version_metadata",
    "governed.evidence.search",
    "governed.evidence.citation_proposal",
    "governed.evidence.missing_document_finding_proposal",
  ],
  purePorts: [],
  legacyToolReferences: [
    "databaseMemoryServiceTool",
    "geminiGoogleSearchTool",
    "googleCloudPubSubTool",
    "mcpDatabaseTool",
    "verifyRegistryTool",
  ],
});

export const SPECIALIST_DEFINITIONS = Object.freeze(
  [
    brokerOrchestratorDefinition,
    dealMatchingDefinition,
    financialRiskDefinition,
    generalDueDiligenceDefinition,
    legalClosingDefinition,
    legalDueDiligenceDefinition,
    negotiationDefinition,
    sourcingKybDefinition,
  ] satisfies readonly AgentDefinition[],
);

export const BROKER_ORCHESTRATOR_DEFINITION = brokerOrchestratorDefinition;
export const DEAL_MATCHING_DEFINITION = dealMatchingDefinition;
export const FINANCIAL_RISK_DEFINITION = financialRiskDefinition;
export const GENERAL_DD_DEFINITION = generalDueDiligenceDefinition;
export const LEGAL_CLOSING_DEFINITION = legalClosingDefinition;
export const LEGAL_DD_DEFINITION = legalDueDiligenceDefinition;
export const NEGOTIATION_DEFINITION = negotiationDefinition;
export const SOURCING_KYB_DEFINITION = sourcingKybDefinition;
export const AGENT_DEFINITIONS = SPECIALIST_DEFINITIONS;

export function createSpecialistDefinitionCatalog(): DefinitionCatalog {
  return createDefinitionCatalog(SPECIALIST_DEFINITIONS);
}
