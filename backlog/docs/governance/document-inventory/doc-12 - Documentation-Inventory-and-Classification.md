---
id: doc-12
title: Documentation Inventory and Classification
type: specification
created_date: '2026-07-24 15:37'
updated_date: '2026-08-07 02:15'
tags:
  - documentation
  - inventory
  - canonical
---
# Documentation Inventory

- Authority ID: DOC-INV-001
- Owner: Repository maintainers
- Authority: Canonical classification inventory
- Freshness: Current as of 2026-08-06
- Language: English
- Update trigger: Addition, deletion, relocation, or reclassification of tracked documentation-like assets

## Classification keys

- **Canonical**: governed project authority in `backlog/docs/`.
- **Redirect/deprecate**: governed legacy item to be replaced with an explicit non-authoritative pointer when its content is preserved elsewhere.
- **Referenced**: useful local documentation or runtime knowledge; not authority for project-wide policy.
- **Generated**: reproducible analysis output; never normative.
- **Work record**: Backlog task or milestone history; not a current architecture source.
- **Tooling asset**: bundled agent-skill guidance; not MAI product documentation.

All records use: `path | owner | purpose | authority | freshness | language | disposition`.

## Individual tracked documentation-like inventory

Every project file below is individually classified; removed paths are retained as historical inventory entries. Backlog tasks and milestones are deliberately excluded from this table because they are managed work-record families, as described after the table. Third-party, virtual-environment, vendor, build, and coverage directories are excluded.

| Path | Owner | Purpose | Authority | Freshness | Language | Disposition |
| --- | --- | --- | --- | --- | --- | --- |
| `.agents/skills/backlog-mcp/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/caveman/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/commit-changes/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/config-bug-closure/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/investigate/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/model-selection/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/model-selection/references/model-catalog-sources.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/model-selection/references/routing.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/solve-mai/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/solve-mai/phases/01-intake.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/solve-mai/phases/02-discovery.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/solve-mai/phases/03-investigation.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/solve-mai/phases/04-implementation.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/solve-mai/phases/05-verification.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/solve-mai/phases/06-review-and-pr.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/solve-mai/phases/07-finalization.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/wrap-up/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/ask-matt/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/code-review/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/codebase-design/DEEPENING.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/codebase-design/DESIGN-IT-TWICE.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/codebase-design/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/diagnosing-bugs/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/domain-modeling/ADR-FORMAT.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/domain-modeling/CONTEXT-FORMAT.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/domain-modeling/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/grill-me/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/grill-with-docs/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/grilling/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/handoff/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/implement/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/improve-codebase-architecture/HTML-REPORT.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/improve-codebase-architecture/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/prototype/LOGIC.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/prototype/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/prototype/UI.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/research/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/resolving-merge-conflicts/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/setup-matt-pocock-skills/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/setup-matt-pocock-skills/domain.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/setup-matt-pocock-skills/issue-tracker-github.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/setup-matt-pocock-skills/issue-tracker-gitlab.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/setup-matt-pocock-skills/issue-tracker-local.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/setup-matt-pocock-skills/triage-labels.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/tdd/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/tdd/mocking.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/tdd/tests.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/teach/GLOSSARY-FORMAT.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/teach/LEARNING-RECORD-FORMAT.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/teach/MISSION-FORMAT.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/teach/RESOURCES-FORMAT.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/teach/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/to-spec/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/to-tickets/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/triage/AGENT-BRIEF.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/triage/OUT-OF-SCOPE.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/triage/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/wayfinder/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/writing-great-skills/GLOSSARY.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `.agents/skills/writing-great-skills/SKILL.md` | Skill authors | Agent tooling instruction | tooling-local | versioned | English | tooling asset |
| `AGENTS.md` | Repository maintainers | Agent entry instruction | execution-only | current | English | reference |
| `CLAUDE.md` | Repository maintainers | Agent entry instruction | execution-only | current | mixed | reference |
| `CONTEXT.md` | Repository maintainers | Repository navigation/context | navigation-only | review-needed | mixed | removed after migration |
| `GEMINI.md` | Repository maintainers | Agent entry instruction | execution-only | current | mixed | reference |
| `README.md` | Repository maintainers | Repository navigation/context | navigation-only | current | English | reference |
| `backlog/docs/core_architecture.md` | Repository maintainers | Governed Backlog document | See manifest | current | Portuguese | governed |
| `backlog/docs/google_ai_studio_setup.md` | Repository maintainers | Governed Backlog document | See manifest | current | Portuguese | governed |
| `backlog/docs/gui-wireframes-routes.md` | Repository maintainers | Governed Backlog document | See manifest | current | Portuguese | governed |
| `backlog/docs/mocks_architecture/doc-1 - Deprecated-MVP-Mock-Architecture.md` | Architecture | Deprecated MVP mock architecture | LEGACY-MOCKS-001 | legacy | English | reference |
| `backlog/docs/refactoring_technical_debt.md` | Repository maintainers | Governed Backlog document | See manifest | current | Portuguese | governed |
| `context/agents_architecture.md` | Architecture | Legacy topic or architecture note | none | legacy | Portuguese | removed after migration |
| `context/architecture.md` | Architecture | Legacy topic or architecture note | none | legacy | Portuguese | removed after migration |
| `context/constraint_negotiation_api.md` | Architecture | Legacy topic or architecture note | none | legacy | Portuguese | removed after migration |
| `context/continuous_learning_and_rag.md` | Architecture | Legacy topic or architecture note | none | legacy | Portuguese | removed after migration |
| `context/core_architecture.md` | Architecture | Legacy topic or architecture note | none | legacy | Portuguese | removed after migration |
| `context/database_memory_singleton.md` | Architecture | Legacy topic or architecture note | none | legacy | Portuguese | removed after migration |
| `context/google_ai_studio_setup.md` | Architecture | Legacy topic or architecture note | none | legacy | Portuguese | removed after migration |
| `context/nextjs_gui_and_api.md` | Architecture | Legacy topic or architecture note | none | legacy | Portuguese | removed after migration |
| `context/onnx_bootstrapper.md` | Architecture | Legacy topic or architecture note | none | legacy | Portuguese | removed after migration |
| `context/optimization_portfolio_solver.md` | Architecture | Legacy topic or architecture note | none | legacy | Portuguese | removed after migration |
| `context/refactoring_technical_debt.md` | Architecture | Legacy topic or architecture note | none | legacy | Portuguese | removed after migration |
| `context/term_sheet_genetic_optimizer.md` | Architecture | Legacy topic or architecture note | none | legacy | Portuguese | removed after migration |
| `context/valuation.md` | Architecture | Legacy topic or architecture note | none | legacy | Portuguese | removed after migration |
| `context/vdr_integration_supergood.md` | Architecture | Legacy topic or architecture note | none | legacy | Portuguese | removed after migration |
| `docs/adr/0001-english-internal-identifiers-with-i18n.md` | Repository maintainers | Legacy ADR record | superseded by ADR-0001 | current | English | removed after migration |
| `docs/architecture.md` | Architecture | Legacy architecture note | none | mixed | English | removed after migration |
| `docs/prediction_engine.md` | Architecture | Legacy architecture note | none | mixed | English | removed after migration |
| `graphify-out/GRAPH_REPORT.md` | Graphify | Generated code graph report | none | regenerated | English | generated |
| `design/` | Product Design | Banker-workspace product-definition set | product-definition authority for MAI-85 design planning | current as of MAI-90 | English | referenced canonical design source |
| `design/0_Implementaion_Roadmap.md` | Product Design | MAI-85 implementation roadmap | roadmap support for design task sequencing | current as of MAI-90 | English | referenced governance support |
| `design/1_Application_Shell_Navigation.md` to `design/25_External_Participant_Screen_Family.md` | Product Design | 25 canonical banker-workspace screen definitions | screen-definition authority until implemented in Figma/code | current as of MAI-90 | English | referenced canonical design source |
| `design/26_Cross_Screen_Interaction_Map.md` | Product Design | Cross-screen route, object-ownership and handoff map | interaction governance support | current as of MAI-90 | English | referenced governance support |
| `design/27_Shared_State_Model.md` | Product Design | Shared state semantics and permission-state model | state governance support | current as of MAI-90 | English | referenced governance support |
| `backlog/docs/architecture/frontend-foundation/doc-15 - MAI-95-Frontend-Foundation-Inventory.md` | Frontend Engineering | MAI-95 path-level frontend disposition and foundation boundary | ARCH-FRONTEND-001 | current | English | canonical |
| `backlog/docs/architecture/frontend-tokens/doc-16 - MAI-96-Figma-to-Code-Semantic-Token-Architecture.md` | Frontend Engineering | MAI-96 live Figma-to-code semantic token mapping and verification contract | ARCH-FRONTEND-TOKENS-001 | current | English | canonical |
| `backlog/docs/architecture/frontend-components/doc-17 - MAI-97-Figma-Component-Library-Architecture-and-Conformance.md` | Frontend Engineering | MAI-97 component-library architecture, traceability, accessibility, and verification contract | ARCH-FRONTEND-COMPONENTS-001 | current | English | canonical |
| `backlog/docs/architecture/frontend-shell/doc-18 - MAI-98-Application-Shell-and-Route-Architecture.md` | Frontend Engineering | MAI-98 typed shell, route, navigation, and permission boundary | ARCH-FRONTEND-SHELL-001 | current | English | canonical |
| `gui/AGENTS.md` | GUI | GUI agent instruction | gui-local | current | English | referenced |
| `gui/CLAUDE.md` | GUI | GUI agent instruction | gui-local | review-needed | English | referenced |
| `gui/DESIGN.md` | GUI | Retired GUI design authority | none | retired by MAI-95 on 2026-07-29 | English | removed; history preserved in ARCH-FRONTEND-001 |
| `gui/DESIGN_GUIDELINES.md` | GUI | Retired GUI design authority | none | retired by MAI-95 on 2026-07-29 | English | removed; history preserved in ARCH-FRONTEND-001 |
| `gui/README.md` | GUI | GUI navigation | gui-local | current | English | referenced |
| `gui/STITCH_DESIGN.md` | GUI | Retired Stitch design authority | none | retired by MAI-95 on 2026-07-29 | English | removed; history preserved in ARCH-FRONTEND-001 |
| `gui/components/Accordion/Accordion.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/Avatar/Avatar.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/Badge/Badge.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/Button/Button.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/Card/Card.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/Checkbox/Checkbox.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/CountrySelector/CountrySelector.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/Divider/Divider.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/Dropdown/Dropdown.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/EmptyState/EmptyState.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/ErrorBoundary/ErrorBoundary.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/Footer/Footer.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/FormField/FormField.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/Icon/Icon.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/Input/Input.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/Modal/Modal.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/Navigation/Navigation.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/Radio/Radio.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/Skeleton/Skeleton.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/Spinner/Spinner.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/Table/Table.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/Tabs/Tabs.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/Textarea/Textarea.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/Toast/Toast.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/_template/ComponentTemplate.mdx` | GUI | Retired legacy Storybook visual documentation | none | retired by MAI-95 on 2026-07-29 | English | removed; path-level history preserved in ARCH-FRONTEND-001 |
| `gui/components/FoundationStatus/FoundationStatus.mdx` | GUI | Neutral foundation Storybook specimen | component-local | current | English | referenced; temporary foundation documentation until MAI-97 |
| `gui/docs/user-flow.md` | GUI | Retired legacy GUI workflow reference | none | retired by MAI-95 on 2026-07-29 | English | removed; history preserved in ARCH-FRONTEND-001 |
| `scripts/colab_training_notebook.ipynb` | Prediction engine | Colab training notebook | training reference | review-needed | English | referenced |
| `src/agent/agents/broker-orchestrator/fonts/broker_preferences_guide.md` | broker-orchestrator | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/broker-orchestrator/fonts/memory_taxonomy_ma.md` | broker-orchestrator | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/broker-orchestrator/fonts/reforma-tributaria-brasil-2026.md` | broker-orchestrator | Runtime domain knowledge | runtime-local | current | Portuguese | referenced |
| `src/agent/agents/broker-orchestrator/fonts/semantic_routing_patterns.md` | broker-orchestrator | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/broker-orchestrator/instructions.md` | broker-orchestrator | Runtime agent instruction | runtime-local | current | English | referenced |
| `src/agent/agents/broker-orchestrator/playbook.md` | broker-orchestrator | Runtime agent playbook | runtime-local | current | English | referenced |
| `src/agent/agents/broker-orchestrator/rules.md` | broker-orchestrator | Runtime agent rule | runtime-local | current | English | referenced |
| `src/agent/agents/deal-matching/fonts/deal_fatigue_mitigation.md` | deal-matching | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/deal-matching/fonts/portfolio_optimization_theory.md` | deal-matching | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/deal-matching/fonts/sector_ev_ebitda_brazil.md` | deal-matching | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/deal-matching/fonts/synergy_pricing_models.md` | deal-matching | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/deal-matching/fonts/valuation-multiples-brazil.md` | deal-matching | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/deal-matching/fonts/valuation_ranges_methodology.md` | deal-matching | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/deal-matching/instructions.md` | deal-matching | Runtime agent instruction | runtime-local | current | English | referenced |
| `src/agent/agents/deal-matching/playbook.md` | deal-matching | Runtime agent playbook | runtime-local | current | English | referenced |
| `src/agent/agents/deal-matching/rules.md` | deal-matching | Runtime agent rule | runtime-local | current | English | referenced |
| `src/agent/agents/financial-risk/fonts/brgaap_ifrs_adjustments.md` | financial-risk | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/financial-risk/fonts/cpc-06-r2-arrendamentos.md` | financial-risk | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/financial-risk/fonts/cpc-15-combinacoes.md` | financial-risk | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/financial-risk/fonts/debt_benchmarks.md` | financial-risk | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/financial-risk/fonts/ebitda_normalization_guide.md` | financial-risk | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/financial-risk/fonts/kanitz-elizabetsky-models.md` | financial-risk | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/financial-risk/fonts/sector_multiples_brazil.md` | financial-risk | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/financial-risk/instructions.md` | financial-risk | Runtime agent instruction | runtime-local | current | English | referenced |
| `src/agent/agents/financial-risk/playbook.md` | financial-risk | Runtime agent playbook | runtime-local | current | English | referenced |
| `src/agent/agents/financial-risk/rules.md` | financial-risk | Runtime agent rule | runtime-local | current | English | referenced |
| `src/agent/agents/general-dd/fonts/dd_checklist_brazil.md` | general-dd | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/general-dd/fonts/go_nogo_criteria.md` | general-dd | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/general-dd/fonts/risk_synthesis_framework.md` | general-dd | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/general-dd/fonts/vdr_directory_template.md` | general-dd | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/general-dd/instructions.md` | general-dd | Runtime agent instruction | runtime-local | current | English | referenced |
| `src/agent/agents/general-dd/playbook.md` | general-dd | Runtime agent playbook | runtime-local | current | English | referenced |
| `src/agent/agents/general-dd/rules.md` | general-dd | Runtime agent rule | runtime-local | current | English | referenced |
| `src/agent/agents/legal-closing/fonts/closing_mechanics_guide.md` | legal-closing | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/legal-closing/fonts/conditions_precedent_checklist.md` | legal-closing | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/legal-closing/fonts/mac_clause_guide.md` | legal-closing | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/legal-closing/fonts/non_compete_standards.md` | legal-closing | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/legal-closing/fonts/reps_warranties_brazil.md` | legal-closing | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/legal-closing/fonts/spa_template_brazil.md` | legal-closing | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/legal-closing/instructions.md` | legal-closing | Runtime agent instruction | runtime-local | current | English | referenced |
| `src/agent/agents/legal-closing/playbook.md` | legal-closing | Runtime agent playbook | runtime-local | current | English | referenced |
| `src/agent/agents/legal-closing/rules.md` | legal-closing | Runtime agent rule | runtime-local | current | English | referenced |
| `src/agent/agents/legal-closing/templates/spa-outline-template.md` | legal-closing | Runtime output template | runtime-local | current | English | referenced |
| `src/agent/agents/legal-closing/templates/term-sheet-template.md` | legal-closing | Runtime output template | runtime-local | current | English | referenced |
| `src/agent/agents/legal-dd/checklists/legal-dd-checklist.md` | legal-dd | Runtime checklist | runtime-local | current | English | referenced |
| `src/agent/agents/legal-dd/fonts/change_of_control_clauses.md` | legal-dd | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/legal-dd/fonts/cpc-25-contingencias.md` | legal-dd | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/legal-dd/fonts/labor_contingency_guide.md` | legal-dd | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/legal-dd/fonts/lei-sa-acordos.md` | legal-dd | Runtime domain knowledge | runtime-local | current | Portuguese | referenced |
| `src/agent/agents/legal-dd/fonts/lei_sa_6404_76_key_articles.md` | legal-dd | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/legal-dd/fonts/lgpd_compliance_checklist.md` | legal-dd | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/legal-dd/fonts/ltda_family_business_traps.md` | legal-dd | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/legal-dd/fonts/materiality_thresholds.md` | legal-dd | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/legal-dd/fonts/sumula-5-cade.md` | legal-dd | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/legal-dd/instructions.md` | legal-dd | Runtime agent instruction | runtime-local | current | English | referenced |
| `src/agent/agents/legal-dd/playbook.md` | legal-dd | Runtime agent playbook | runtime-local | current | English | referenced |
| `src/agent/agents/legal-dd/rules.md` | legal-dd | Runtime agent rule | runtime-local | current | English | referenced |
| `src/agent/agents/negotiation/fonts/batna_zopa_framework.md` | negotiation | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/negotiation/fonts/deal_structure_templates.md` | negotiation | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/negotiation/fonts/earn_out_brazil_standards.md` | negotiation | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/negotiation/fonts/escrow_best_practices.md` | negotiation | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/negotiation/fonts/nash_equilibrium_ma_tactics.md` | negotiation | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/negotiation/instructions.md` | negotiation | Runtime agent instruction | runtime-local | current | English | referenced |
| `src/agent/agents/negotiation/playbook.md` | negotiation | Runtime agent playbook | runtime-local | current | English | referenced |
| `src/agent/agents/negotiation/rules.md` | negotiation | Runtime agent rule | runtime-local | current | English | referenced |
| `src/agent/agents/sourcing-kyb/checklists/kyb-checklist.md` | sourcing-kyb | Runtime checklist | runtime-local | current | English | referenced |
| `src/agent/agents/sourcing-kyb/fonts/corporate_culture_signals.md` | sourcing-kyb | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/sourcing-kyb/fonts/key_person_risk_matrix.md` | sourcing-kyb | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/sourcing-kyb/fonts/osint_playbook_brazil.md` | sourcing-kyb | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/sourcing-kyb/fonts/public_databases_guide.md` | sourcing-kyb | Runtime domain knowledge | runtime-local | current | English | referenced |
| `src/agent/agents/sourcing-kyb/instructions.md` | sourcing-kyb | Runtime agent instruction | runtime-local | current | English | referenced |
| `src/agent/agents/sourcing-kyb/playbook.md` | sourcing-kyb | Runtime agent playbook | runtime-local | current | English | referenced |
| `src/agent/agents/sourcing-kyb/rules.md` | sourcing-kyb | Runtime agent rule | runtime-local | current | English | referenced |

| `backlog/docs/architecture/backend-redesign/gap-matrix/doc-19 - MAI-103-Frontend-to-Backend-Gap-Matrix.md` | Product, Domain, Security, and Platform Architecture | Complete approved frontend-to-backend requirements and gap traceability | doc-19 | proposed 2026-07-30 | English | canonical |
| `backlog/docs/architecture/backend-redesign/domain-workflows/doc-20 - MAI-103-Bounded-Contexts-Aggregates-and-Workflow-State-Machines.md` | Domain Architecture | Target bounded contexts, aggregates, commands, events, and state machines | doc-20 | proposed 2026-07-30 | English | canonical |
| `backlog/docs/architecture/backend-redesign/security-persistence/doc-21 - MAI-103-Tenancy-Authorization-Persistence-Audit-and-Provenance-Architecture.md` | Security and Data Architecture | Target tenancy, authorization, persistence, audit, evidence, and provenance | doc-21 | proposed 2026-07-30 | English | canonical |
| `backlog/docs/architecture/backend-redesign/api-async-agent-integrations/doc-22 - MAI-103-API-Jobs-Events-Agent-Execution-and-Integration-Catalog.md` | API, Agent, and Integration Architecture | Target API, job, event, agent execution, and integration contracts | doc-22 | proposed 2026-07-30 | English | canonical |
| `backlog/docs/architecture/backend-redesign/current-state-disposition/doc-23 - MAI-103-Current-Backend-Disposition.md` | Platform Architecture | Complete current backend Keep, Adapt, Replace, or Remove inventory | doc-23 | proposed 2026-07-30 | English | canonical |
| `backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 - MAI-103-Backend-Implementation-Plan.md` | Backend Architecture and Delivery | Owner-approved dependency-ordered backend implementation plan | doc-24 | approved 2026-07-30 | English | canonical |
| `backlog/docs/decisions/proposed-modular-monolith-boundaries/doc-25 - Proposed-ADR-Target-Modular-Monolith-and-Service-Boundaries.md` | Architecture | Accepted ADR: Target modular monolith and service boundaries | doc-25 | accepted 2026-07-30 | English | canonical |
| `backlog/docs/decisions/proposed-bounded-contexts-aggregate-ownership/doc-26 - Proposed-ADR-Bounded-Contexts-and-Aggregate-Ownership.md` | Architecture | Accepted ADR: Bounded contexts and aggregate ownership | doc-26 | accepted 2026-07-30 | English | canonical |
| `backlog/docs/decisions/proposed-tenancy-authorization/doc-27 - Proposed-ADR-Tenancy-and-Authorization-Model.md` | Architecture | Accepted ADR: Tenancy and authorization model | doc-27 | accepted 2026-07-30 | English | canonical |
| `backlog/docs/decisions/proposed-postgresql-schema-transactions/doc-28 - Proposed-ADR-PostgreSQL-Schema-and-Transaction-Strategy.md` | Architecture | Accepted ADR: PostgreSQL schema and transaction strategy | doc-28 | accepted 2026-07-30 | English | canonical |
| `backlog/docs/decisions/proposed-postgresql-row-level-security/doc-29 - Proposed-ADR-PostgreSQL-Row-Level-Security.md` | Architecture | Accepted ADR: Partial PostgreSQL row-level-security adoption | doc-29 | accepted 2026-07-30 | English | canonical |
| `backlog/docs/decisions/proposed-concurrency-versioning/doc-30 - Proposed-ADR-Concurrency-and-Aggregate-Versioning.md` | Architecture | Accepted ADR: Concurrency and aggregate versioning | doc-30 | accepted 2026-07-30 | English | canonical |
| `backlog/docs/decisions/proposed-events-outbox-inbox-jobs/doc-31 - Proposed-ADR-Events-Outbox-Inbox-and-Jobs.md` | Architecture | Accepted ADR: Events, outbox, inbox, and durable jobs | doc-31 | accepted 2026-07-30 | English | canonical |
| `backlog/docs/decisions/proposed-audit-evidence-provenance/doc-32 - Proposed-ADR-Audit-Evidence-Versioning-and-Provenance.md` | Architecture | Accepted ADR: Audit, evidence, versioning, and provenance | doc-32 | accepted 2026-07-30 | English | canonical |
| `backlog/docs/decisions/proposed-api-contracts/doc-33 - Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md` | Architecture | Accepted ADR: API style, errors, idempotency, and concurrency | doc-33 | accepted 2026-07-30 | English | canonical |
| `backlog/docs/decisions/proposed-agent-human-authority/doc-34 - Proposed-ADR-Agent-Execution-and-Human-Authority.md` | Architecture | Accepted ADR: Agent execution and human authority | doc-34 | accepted 2026-07-30 | English | canonical |
| `backlog/docs/decisions/proposed-documents-vdr-object-storage/doc-35 - Proposed-ADR-Documents-VDR-and-Object-Storage.md` | Architecture | Accepted ADR: Documents, VDR, and object storage | doc-35 | accepted 2026-07-30 | English | canonical |
| `backlog/docs/decisions/proposed-mvp-api-retirement/doc-36 - Proposed-ADR-Migration-and-Retirement-of-the-Mock-backed-MVP-API.md` | Architecture | Accepted ADR: Migration and retirement of the mock-backed MVP API | doc-36 | accepted 2026-07-30 | English | canonical |

| `backlog/docs/operations/deployment/doc-37 - MAI-148-Deployment-and-Operations-Foundation.md` | Platform Architecture and Operations | MAI-148 deployment and operations foundation | doc-37 | current 2026-08-01 | English | canonical |
| `backlog/docs/operations/deal-management/doc-38 - MAI-110-Deal-Reconciliation-Operator-Procedure.md` | Deal Management and Platform Operations | Bounded MAI-110 reconciliation and rollback read-routing procedure | doc-38 | current 2026-08-02 | English | canonical |
| `infra/README.md` | Platform Operations | Provider-neutral infrastructure implementation contract | implementation-local | current | English | referenced |
| `infra/runbooks/*.md` | Platform Operations | MAI-148 operator procedures | implementation-local | current | English | referenced |

| `prompts/OPERATING_RULES.md` | Developer Experience and Operations | Canonical repository execution, verification, model-routing, agent, environment, migration-integrity, and lifecycle policy | PROMPT-OPS-001 | current 2026-08-06 | English | canonical |
| `prompts/README.md` | Developer Experience and Operations | Prompt asset navigation and role classification | `prompts/OPERATING_RULES.md` | current 2026-08-06 | English | referenced |
| `prompts/SUBAGENT_RULES.md` | Developer Experience and Operations | Exceptional delegated-execution guardrails | `prompts/OPERATING_RULES.md` | current 2026-08-06 | English | referenced |
| `prompts/manifest.json` | Developer Experience and Operations | Machine-readable prompt inventory and execution defaults | `prompts/OPERATING_RULES.md` | current 2026-08-06 | English | referenced |

## Managed work-record families and exclusions

- `backlog/tasks/*.md` and `backlog/archive/tasks/*.md`: managed Backlog work records; authority is task lifecycle only.
- `backlog/milestones/*.md` and `backlog/archive/milestones/*.md`: managed Backlog planning records; authority is milestone lifecycle only.
- `node_modules/`, `.venv/`, `vendor/`, `dist/`, and `coverage/` are excluded third-party or generated build artifacts.

## Legacy document access limitation

The pre-governance top-level Backlog documents `core_architecture.md`, `google_ai_studio_setup.md`, `gui-wireframes-routes.md`, and `refactoring_technical_debt.md` have no MCP document IDs. They are explicitly non-authoritative and deprecated. They await removal or replacement with redirects through a future governed MCP lifecycle. Direct Markdown editing or a CLI workaround is prohibited.

## Machine-readable canonical manifest

The following manifest is authoritative for automated documentation checks. Paths are relative to `backlog/docs/`.

```json
{
  "canonicalRoot": ".",
  "documents": [
    {
      "path": "index/doc-10 - Documentation-Index-and-Information-Architecture.md",
      "owner": "Repository maintainers",
      "purpose": "Canonical navigation and information architecture",
      "authority": "DOC-IA-001",
      "freshness": "current",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "governance/documentation-governance/doc-11 - Documentation-Governance-and-Ownership.md",
      "owner": "Repository maintainers",
      "purpose": "Documentation governance and update workflow",
      "authority": "DOC-GOV-001",
      "freshness": "current",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "governance/document-inventory/doc-12 - Documentation-Inventory-and-Classification.md",
      "owner": "Repository maintainers",
      "purpose": "Documentation inventory and classification",
      "authority": "DOC-INV-001",
      "freshness": "current",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "governance/generated-artifacts-and-agent-knowledge/doc-13 - Generated-Artifacts-and-Agent-Knowledge-Classification.md",
      "owner": "Repository maintainers",
      "purpose": "Generated artifact and agent knowledge policy",
      "authority": "DOC-CLASS-001",
      "freshness": "current",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "decisions/adr-0001-english-internal-identifiers-i18n/doc-14 - ADR-0001-English-Internal-Identifiers-and-i18n.md",
      "owner": "Repository maintainers",
      "purpose": "English identifiers and i18n decision",
      "authority": "ADR-0001",
      "freshness": "current",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "architecture/frontend-foundation/doc-15 - MAI-95-Frontend-Foundation-Inventory.md",
      "owner": "Frontend Engineering",
      "purpose": "MAI-95 path-level frontend disposition and foundation boundary",
      "authority": "ARCH-FRONTEND-001",
      "freshness": "current",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "architecture/frontend-tokens/doc-16 - MAI-96-Figma-to-Code-Semantic-Token-Architecture.md",
      "owner": "Frontend Engineering",
      "purpose": "MAI-96 live Figma-to-code semantic token mapping and verification contract",
      "authority": "ARCH-FRONTEND-TOKENS-001",
      "freshness": "current",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "architecture/frontend-components/doc-17 - MAI-97-Figma-Component-Library-Architecture-and-Conformance.md",
      "owner": "Frontend Engineering",
      "purpose": "MAI-97 component-library architecture, traceability, accessibility, and verification contract",
      "authority": "ARCH-FRONTEND-COMPONENTS-001",
      "freshness": "current",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "architecture/frontend-shell/doc-18 - MAI-98-Application-Shell-and-Route-Architecture.md",
      "owner": "Frontend Engineering",
      "purpose": "MAI-98 typed shell, route, navigation, and permission boundary",
      "authority": "ARCH-FRONTEND-SHELL-001",
      "freshness": "current",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "architecture/system-core/doc-2 - System-and-Core-Architecture.md",
      "owner": "Architecture",
      "purpose": "System and core architecture",
      "authority": "ARCH-SYS-001",
      "freshness": "current",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "architecture/agent-workflows/doc-3 - Agent-Architecture-and-Workflows.md",
      "owner": "Architecture",
      "purpose": "Agent architecture and workflows",
      "authority": "ARCH-AGENT-001",
      "freshness": "current",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "architecture/data-and-memory/doc-4 - Data-and-Memory-Architecture.md",
      "owner": "Architecture",
      "purpose": "Data and memory architecture",
      "authority": "ARCH-DATA-001",
      "freshness": "current",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "architecture/engines/doc-5 - Engine-Architecture.md",
      "owner": "Architecture",
      "purpose": "Engine architecture",
      "authority": "ARCH-ENGINE-001",
      "freshness": "current",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "architecture/vdr-and-integrations/doc-6 - VDR-and-Integration-Architecture.md",
      "owner": "Architecture",
      "purpose": "VDR and integration architecture",
      "authority": "ARCH-INT-001",
      "freshness": "current",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "domain/domain-model/doc-7 - MA-Domain-Model.md",
      "owner": "Domain",
      "purpose": "M&A domain model",
      "authority": "DOMAIN-001",
      "freshness": "current",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "operations/local-setup/doc-8 - Local-Setup-and-Runtime-Operations.md",
      "owner": "Operations",
      "purpose": "Local setup and runtime operations",
      "authority": "OPS-LOCAL-001",
      "freshness": "current",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md",
      "owner": "Product",
      "purpose": "MVP GUI and API behavior",
      "authority": "PRODUCT-MVP-001",
      "freshness": "current",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "core_architecture.md",
      "owner": "Repository maintainers",
      "purpose": "Legacy core architecture record",
      "authority": "LEGACY-CORE-001",
      "freshness": "legacy",
      "language": "Portuguese",
      "disposition": "deprecated"
    },
    {
      "path": "google_ai_studio_setup.md",
      "owner": "Repository maintainers",
      "purpose": "Legacy Google AI Studio setup record",
      "authority": "LEGACY-GOOGLE-AI-001",
      "freshness": "legacy",
      "language": "Portuguese",
      "disposition": "deprecated"
    },
    {
      "path": "gui-wireframes-routes.md",
      "owner": "Product",
      "purpose": "Legacy GUI routes record",
      "authority": "LEGACY-GUI-ROUTES-001",
      "freshness": "stale",
      "language": "Portuguese",
      "disposition": "deprecated"
    },
    {
      "path": "refactoring_technical_debt.md",
      "owner": "Repository maintainers",
      "purpose": "Legacy technical debt record",
      "authority": "LEGACY-TECH-DEBT-001",
      "freshness": "legacy",
      "language": "Portuguese",
      "disposition": "deprecated"
    },
    {
      "path": "mocks_architecture/doc-1 - Deprecated-MVP-Mock-Architecture.md",
      "owner": "Architecture",
      "purpose": "Historic MVP mock architecture",
      "authority": "LEGACY-MOCKS-001",
      "freshness": "legacy",
      "language": "English",
      "disposition": "reference"
    },
    {
      "path": "architecture/backend-redesign/gap-matrix/doc-19 - MAI-103-Frontend-to-Backend-Gap-Matrix.md",
      "owner": "Product, Domain, Security, and Platform Architecture",
      "purpose": "Complete approved frontend-to-backend requirements and gap traceability",
      "authority": "doc-19",
      "freshness": "accepted 2026-07-30",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "architecture/backend-redesign/domain-workflows/doc-20 - MAI-103-Bounded-Contexts-Aggregates-and-Workflow-State-Machines.md",
      "owner": "Domain Architecture",
      "purpose": "Target bounded contexts, aggregates, commands, events, and state machines",
      "authority": "doc-20",
      "freshness": "accepted 2026-07-30",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "architecture/backend-redesign/security-persistence/doc-21 - MAI-103-Tenancy-Authorization-Persistence-Audit-and-Provenance-Architecture.md",
      "owner": "Security and Data Architecture",
      "purpose": "Target tenancy, authorization, persistence, audit, evidence, and provenance",
      "authority": "doc-21",
      "freshness": "accepted 2026-07-30",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "architecture/backend-redesign/api-async-agent-integrations/doc-22 - MAI-103-API-Jobs-Events-Agent-Execution-and-Integration-Catalog.md",
      "owner": "API, Agent, and Integration Architecture",
      "purpose": "Target API, job, event, agent execution, and integration contracts",
      "authority": "doc-22",
      "freshness": "accepted 2026-07-30",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "architecture/backend-redesign/current-state-disposition/doc-23 - MAI-103-Current-Backend-Disposition.md",
      "owner": "Platform Architecture",
      "purpose": "Complete current backend Keep, Adapt, Replace, or Remove inventory",
      "authority": "doc-23",
      "freshness": "accepted 2026-07-30",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "architecture/backend-redesign/implementation-plan/doc-24 - MAI-103-Backend-Implementation-Plan.md",
      "owner": "Backend Architecture and Delivery",
      "purpose": "Owner-approved dependency-ordered backend implementation plan",
      "authority": "doc-24",
      "freshness": "accepted 2026-07-30",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "decisions/proposed-modular-monolith-boundaries/doc-25 - Proposed-ADR-Target-Modular-Monolith-and-Service-Boundaries.md",
      "owner": "Architecture",
      "purpose": "Accepted ADR: Target modular monolith and service boundaries",
      "authority": "doc-25",
      "freshness": "accepted 2026-07-30",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "decisions/proposed-bounded-contexts-aggregate-ownership/doc-26 - Proposed-ADR-Bounded-Contexts-and-Aggregate-Ownership.md",
      "owner": "Architecture",
      "purpose": "Accepted ADR: Bounded contexts and aggregate ownership",
      "authority": "doc-26",
      "freshness": "accepted 2026-07-30",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "decisions/proposed-tenancy-authorization/doc-27 - Proposed-ADR-Tenancy-and-Authorization-Model.md",
      "owner": "Architecture",
      "purpose": "Accepted ADR: Tenancy and authorization model",
      "authority": "doc-27",
      "freshness": "accepted 2026-07-30",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "decisions/proposed-postgresql-schema-transactions/doc-28 - Proposed-ADR-PostgreSQL-Schema-and-Transaction-Strategy.md",
      "owner": "Architecture",
      "purpose": "Accepted ADR: PostgreSQL schema and transaction strategy",
      "authority": "doc-28",
      "freshness": "accepted 2026-07-30",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "decisions/proposed-postgresql-row-level-security/doc-29 - Proposed-ADR-PostgreSQL-Row-Level-Security.md",
      "owner": "Architecture",
      "purpose": "Accepted ADR: Partial PostgreSQL row-level-security adoption",
      "authority": "doc-29",
      "freshness": "accepted 2026-07-30",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "decisions/proposed-concurrency-versioning/doc-30 - Proposed-ADR-Concurrency-and-Aggregate-Versioning.md",
      "owner": "Architecture",
      "purpose": "Accepted ADR: Concurrency and aggregate versioning",
      "authority": "doc-30",
      "freshness": "accepted 2026-07-30",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "decisions/proposed-events-outbox-inbox-jobs/doc-31 - Proposed-ADR-Events-Outbox-Inbox-and-Jobs.md",
      "owner": "Architecture",
      "purpose": "Accepted ADR: Events, outbox, inbox, and durable jobs",
      "authority": "doc-31",
      "freshness": "accepted 2026-07-30",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "decisions/proposed-audit-evidence-provenance/doc-32 - Proposed-ADR-Audit-Evidence-Versioning-and-Provenance.md",
      "owner": "Architecture",
      "purpose": "Accepted ADR: Audit, evidence, versioning, and provenance",
      "authority": "doc-32",
      "freshness": "accepted 2026-07-30",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "decisions/proposed-api-contracts/doc-33 - Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md",
      "owner": "Architecture",
      "purpose": "Accepted ADR: API style, errors, idempotency, and concurrency",
      "authority": "doc-33",
      "freshness": "accepted 2026-07-30",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "decisions/proposed-agent-human-authority/doc-34 - Proposed-ADR-Agent-Execution-and-Human-Authority.md",
      "owner": "Architecture",
      "purpose": "Accepted ADR: Agent execution and human authority",
      "authority": "doc-34",
      "freshness": "accepted 2026-07-30",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "decisions/proposed-documents-vdr-object-storage/doc-35 - Proposed-ADR-Documents-VDR-and-Object-Storage.md",
      "owner": "Architecture",
      "purpose": "Accepted ADR: Documents, VDR, and object storage",
      "authority": "doc-35",
      "freshness": "accepted 2026-07-30",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "operations/deployment/doc-37 - MAI-148-Deployment-and-Operations-Foundation.md",
      "owner": "Platform Architecture and Operations",
      "purpose": "MAI-148 deployment and operations foundation",
      "authority": "doc-37",
      "freshness": "current 2026-08-01",
      "language": "English",
      "disposition": "canonical"
    },
    {
      "path": "decisions/proposed-mvp-api-retirement/doc-36 - Proposed-ADR-Migration-and-Retirement-of-the-Mock-backed-MVP-API.md",
      "owner": "Architecture",
      "purpose": "Accepted ADR: Migration and retirement of the mock-backed MVP API",
      "authority": "doc-36",
      "freshness": "accepted 2026-07-30",
      "language": "English",
      "disposition": "canonical"
    },
{
      "path": "operations/deal-management/doc-38 - MAI-110-Deal-Reconciliation-Operator-Procedure.md",
      "owner": "Deal Management and Platform Operations",
      "purpose": "Bounded MAI-110 reconciliation and rollback read-routing procedure",
      "authority": "doc-38",
      "freshness": "current 2026-08-02",
      "language": "English",
      "disposition": "canonical"
    }
  ]
}
```
