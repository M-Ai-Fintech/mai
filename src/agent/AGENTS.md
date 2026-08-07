# Multi-Agent Subsystem Agent Instructions (`src/agent/`)

This directory contains the Multi-Agent System (MAS) architecture built on top
of Mastra (`@mastra/core`) and Gemini LLMs (`@ai-sdk/google`).

## Architecture & Submodules

- **Core AI Infrastructure**:
  - `ai_provider.ts`: Manages Google Gemini API initialization and fallback mock
    mode configuration.
  - `mastra.ts`, `mastra_agent.ts`, `mastra_tool_wrapper.ts`: Integration bridge
    between Mastra framework and internal tool implementations.
  - `registry.ts` & `runner.ts`: Agent registry, execution runner, and
    orchestration.
  - `actions.ts`: Common agent actions and task dispatchers.
- **Domain Sub-Agents (`src/agent/agents/`)**:
  - `broker-orchestrator/`: Master coordinator handling intent routing,
    conversation memory taxonomy, and workflow delegation.
  - `deal-matching/`: M&A match-making agent evaluating synergy pricing, sector
    EV/EBITDA multiples, and deal fatigue scoring.
  - `financial-risk/`: Financial audit agent performing EBITDA normalization,
    insolvency model evaluation (Kanitz / Elizabetsky), and BRGAAP/IFRS
    adjustment analysis.
  - `general-dd/`: General due diligence agent managing DD checklists, risk
    synthesis framework, and VDR directory structuring.
  - `legal-closing/`: Transaction closing agent managing SPA templates,
    conditions precedent, non-compete standards, MAC clauses, and closing
    mechanics.
  - `legal-dd/`: Legal due diligence agent analyzing change of control, CPC-25
    contingencies, labor risk, S.A./Ltda. governance, and LGPD compliance.
  - `negotiation/`: Negotiation strategy agent evaluating BATNA/ZOPA frameworks,
    earn-out structures, escrow arrangements, and Nash equilibrium tactics.
  - `sourcing-kyb/`: Target sourcing and KYB verification agent conducting OSINT
    investigation, corporate culture signal analysis, and key person risk
    evaluation.

## Colocated Knowledge Assets Authority

Each specialized agent folder contains domain knowledge assets in `fonts/*.md`
(e.g., `reforma-tributaria-brasil-2026.md`, `kanitz-elizabetsky-models.md`,
`ebitda_normalization_guide.md`).

- **Authority Rule**: Per project governance rules in root `AGENTS.md`,
  colocated agent knowledge assets under `src/agent/agents/**` have **local
  implementation authority** for their respective domain agents.

## Runtime Environment & Dependencies

- **Runtime**: Deno runtime (`deno.json`).
- **Frameworks**: `@mastra/core` and `@ai-sdk/google`.
- **Environment**: Requires `GEMINI_API_KEY` (or runs in mock/fallback mode).

## Key Commands & Testing

- **Run Agent Subsystem Tests**:
  `deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net tests/agents/`
- **Run Full System Integration Tests**: `deno task verify:integration`

## Key Interfaces & Conventions

- **Structured Agent I/O**: Every sub-agent must define input/output Zod schemas
  under `schemas/input.ts` and `schemas/output.ts`.
- **Tool Wrapping**: Custom Deno tool functions must be wrapped via
  `mastra_tool_wrapper.ts` before registering with Mastra agents.
- **Fallback Capability**: All agents must function deterministically when
  `aiFallback` mode is active.

## Documentation Governance

Canonical multi-agent architecture documentation lives in Linear document `doc-3`
([Agent Architecture and Workflows](https://linear.app/mergesai/document/agent-architecture-and-workflows-63b3e527b203)). Colocated knowledge assets
(`src/agent/agents/**/fonts/*.md`) govern local implementation details.
