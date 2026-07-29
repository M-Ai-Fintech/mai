---
id: doc-12
title: Documentation Inventory and Classification
type: specification
created_date: '2026-07-24 15:37'
updated_date: '2026-07-29 16:15'
tags:
  - documentation
  - inventory
  - canonical
---
# Documentation Inventory

- Authority ID: DOC-INV-001
- Owner: Repository maintainers
- Authority: Canonical classification inventory
- Freshness: Current as of 2026-07-29
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
    }
  ]
}
```
