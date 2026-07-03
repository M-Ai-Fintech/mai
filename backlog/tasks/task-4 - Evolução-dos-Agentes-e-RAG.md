---
id: TASK-4
title: Evolução dos Agentes e RAG
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-08 02:30'
labels:
  - agent
  - ai
milestone: m-7
dependencies: []
priority: medium
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Este épico engloba a evolução da camada agêntica e da arquitetura de RAG (Retrieval-Augmented Generation) do middleware de M&A. O objetivo principal é dotar os agentes (BrokerOrchestratorAgent, SourcingAndKYBAgent, GeneralDueDiligenceAgent, e seus subagentes de due diligence financeira e jurídica) de capacidades analíticas avançadas baseadas em conhecimento de domínio persistente, histórico de transações e buscas semânticas vetoriais locais robustas.

A evolução será dividida em quatro frentes principais:
1. Integração nativa do pgvector ao PostgreSQL para migrar as buscas textuais simples para buscas semânticas vetoriais de alta precisão (usando embeddings gerados pelo transformers local all-MiniLM-L6-v2 com dimensão 384) com isolamento estrito de dados por transação (silo fiduciário).
2. Construção de um loop de Continuous Learning para registrar os feedbacks e correções manuais dos especialistas de M&A em um banco vetorial local de preferências, realimentando o context window dos agentes através de In-Context Learning dinâmico.
3. Criação de ferramentas estruturadas do ADK para acesso e navegação de VDR (Virtual Data Room) pelos agentes de due diligence.
4. Estruturação do pipeline de Fine-tuning (via LoRA/PEFT em Llama 3) para termos de M&A e dialeto fiduciário do mercado brasileiro, preparando conjuntos de dados e scripts automatizados de treino.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A base PostgreSQL local deve ser atualizada com a extensão pgvector habilitada, e as tabelas user_preferences, domain_knowledge e company_culture_memory devem utilizar a coluna tipo vector(384) para armazenar embeddings gerados pelo modelo all-MiniLM-L6-v2, substituindo o tipo genérico REAL[].
- [ ] #2 O motor de RAG (ClientSiloedRAG) deve ser refatorado para persistir chunks de documentos do VDR no banco de dados e realizar consultas semânticas restritas ao ID do Deal (isolamento fiduciário) utilizando a distância de cosseno (<=>) via pgvector.
- [ ] #3 Novas ferramentas personalizadas do ADK (ex: search-vdr-tool e extract-vdr-metadata) devem ser expostas em src/agent/actions.ts e disponibilizadas para os subagentes de Due Diligence (GeneralDD, FinancialRisk, LegalDD) lerem e consultarem documentos de forma estruturada.
- [ ] #4 O mecanismo de aprendizado contínuo (ContinuousLearningEngine) deve converter as justificativas das correções em embeddings vetoriais, armazenando-os como preferências do broker no Postgres, e recuperá-los semanticamente para injetar diretrizes dinâmicas (In-Context Learning) nos prompts do BrokerOrchestratorAgent.
- [ ] #5 Deve ser disponibilizado um pipeline documentado de fine-tuning (LoRA) para o mercado brasileiro de M&A, contendo um script de extração/formatação de dados em JSONL (padrão Alpaca/ShareGPT) a partir das interações históricas e um notebook Jupyter configurado no Colab.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Infraestrutura e Migração de Banco Vetorial (pgvector)
   - Ativar a extensão pgvector no PostgreSQL local via script de inicialização do banco (src/core/db/schema.sql).
   - Alterar o tipo das colunas embedding em user_preferences, domain_knowledge e company_culture_memory de REAL[] para vector(384) (adequando à dimensão do Xenova/all-MiniLM-L6-v2).
   - Criar uma nova tabela vdr_document_chunks com colunas deal_id, document_name, chunk_index, text_chunk e embedding vector(384) para indexação fiduciária persistente.
   - Refatorar a query de busca por similaridade em DatabaseMemoryService.searchSimilarKnowledge para usar o operador <=> (cosseno) do pgvector.

2. Conectores de VDR Estruturados e RAG Camada de Agentes
   - Refatorar src/agent/rag_layer.ts para usar a tabela vdr_document_chunks persistida no Postgres em vez do dicionário em memória volátil (silos).
   - Implementar novas ferramentas ADK no arquivo src/agent/actions.ts: searchVdrTool e readVdrDocumentTool.
   - Adicionar essas ferramentas na inicialização dos agentes GeneralDD, FinancialRisk e LegalDD no diretório src/agent/agents/.

3. Loop de Continuous Learning com Captação Vetorial
   - Refatorar src/agent/continuous_learning.ts para acionar o TransformersEngine ao receber novas correções de feedback, gerando o embedding do motivo/razão do feedback.
   - Salvar o feedback com seu embedding no Postgres via DatabaseMemoryService.saveUserPreferences ou tabela dedicada de correções vetoriais.
   - Atualizar a recuperação de feedbacks para usar busca vetorial com a query de busca por similaridade de preferências e gerar o prompt dinâmico de In-Context Learning.

4. Pipeline de Fine-Tuning de Termos de M&A
   - Criar script em TypeScript para extrair do Postgres dados de auditorias anteriores, correções e documentos técnicos, gerando o arquivo data/ma_finetuning_dataset.jsonl.
   - Estruturar e documentar em src/agent/fine_tuning.ts ou pasta de scripts os códigos PyTorch/PEFT para fine-tuning local ou no Google Colab, integrando-os com o notebook existente /scripts/colab_training_notebook.ipynb.

5. Testes Finais e Validação de Ponta a Ponta
   - Escrever testes unitários e de integração para validação das operações do pgvector, detecção de erros no RAG silo e feedback do continuous learning.
   - Garantir 100% de cobertura nos módulos críticos do RAG local e testar fluxos de execução na CLI do middleware.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Migrações SQL criadas e aplicadas com sucesso no Postgres, habilitando pgvector e migrando colunas de embeddings para o tipo vector(384).
- [ ] #2 Modificações de código TypeScript no DatabaseMemoryService (src/core/db/memory_service.ts) e ClientSiloedRAG (src/agent/rag_layer.ts) concluídas, testadas e livres de erros de compilação ou lints.
- [ ] #3 Ferramentas de acesso estruturado de VDR devidamente registradas e validadas no ADK em src/agent/actions.ts.
- [ ] #4 Scripts de exportação do dataset de fine-tuning integrados e script python de treino validado localmente ou no ambiente do Colab.
- [ ] #5 Loop de feedback (Continuous Learning) funcionando de ponta a ponta com persistência vetorial real no Postgres e teste de fumaça da CLI executado sem erros.
<!-- DOD:END -->
