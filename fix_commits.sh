#!/bin/bash
set -e

# Refactoring (replacing mock fallbacks, memory service rename, genetic optimizer move)
git add src/core/db/memory_service.ts src/core/db/DatabaseMemoryService.ts src/core/boot.ts src/core/pubsub/LocalPubSubBus.ts
git add src/engines/optimization/genetic.ts src/engines/optimization/kyc/coordinator.ts
git add backlog/docs/refactoring_technical_debt.md context/refactoring_technical_debt.md
git add src/cli/interface.ts src/cli/chat.ts src/cli/commands.ts src/cli/errors.ts
git add tests/engines/optimization.spec.ts tests/pubsub.spec.ts tests/e2e/cli.spec.ts
git commit -m "refactor: restructure core, apply singletons and move optimization engines" || true

# MAI-8 (Evolução dos Agentes e RAG)
git add "backlog/tasks/mai-8 - Evolução-dos-Agentes-e-RAG.md"
git add src/agent/agents/broker-orchestrator/index.ts
git add src/agent/agents/financial-risk/tools/index.ts
git add src/agent/agents/general-dd/tools/index.ts
git add src/agent/agents/legal-dd/tools/index.ts
git commit -m "feat(agent): implement MAI-8" || true

# MAI-9 (Continuous Learning)
git add "backlog/tasks/mai-9 - Criar-loop-de-Continuous-Learning-com-captação-vetorial.md"
git add src/agent/continuous_learning.ts tests/core/continuous_learning.spec.ts data/human_feedback.json
git commit -m "feat(agent): implement MAI-9" || true

# MAI-10 (Fine-tuning)
git add "backlog/tasks/mai-10 - Estruturar-pipeline-de-Fine-tuning-Juridiquês-Financês-brasileiro.md"
git add src/agent/fine_tuning.ts scripts/fine_tuning_lora.py scripts/dataset_ma_br_mock.jsonl tests/fine_tuning_mcp.test.ts
git commit -m "feat(agent): implement MAI-10" || true

# MAI-11 (pgvector)
git add backlog/tasks/mai-11\ -\ Integrar-pgvector-ao-PostgreSQL-para-RAG-profundo.md
git add src/core/db/schema.sql
git commit -m "feat(database): implement MAI-11" || true

# MAI-12 (VDR Tool for agents)
git add backlog/tasks/mai-12\ -\ Criar-ferramenta-de-acesso-estruturado-de-VDR-pelos-agentes.md
git add tests/agents/vdr_tools.spec.ts
git commit -m "feat(agent): implement MAI-12" || true

# MAI-13 (Integrações de VDR na Core)
git add "backlog/tasks/mai-13 - Integrações-de-VDR-na-Core.md"
git commit -m "feat(core): implement MAI-13" || true

# MAI-14 (Papermark)
git add backlog/tasks/mai-14\ -\ Implementar-adaptador-da-API-Papermark.md
git add src/core/vdr/papermark.ts tests/core/papermark.spec.ts
git commit -m "feat(core): implement MAI-14" || true

# MAI-15 (Supergood VDR Interface)
git add "backlog/tasks/mai-15 - Projetar-interface-Supergood-de-provedor-genérico-de-VDR.md"
git add src/core/vdr/provider.ts src/core/vdr/mock.ts src/core/vdr/types.ts tests/vdr_provider.spec.ts
git commit -m "feat(core): implement MAI-15" || true

# MAI-16 (iDeals and Intralinks)
git add backlog/tasks/mai-16\ -\ Mapear-conectores-iDeals-e-Intralinks-via-Supergood.md
git add src/core/vdr/providers/ideals.ts src/core/vdr/providers/intralinks.ts tests/vdr_connectors.spec.ts
git add tests/fixtures/ideals.json tests/fixtures/intralinks.json
git commit -m "feat(core): implement MAI-16" || true

# Remaining updates (RAG layer, ai provider, actions.ts, remaining task updates, etc)
git add .
git commit -m "feat(agent): update RAG layers, MCP tools and backlog tasks" || true

