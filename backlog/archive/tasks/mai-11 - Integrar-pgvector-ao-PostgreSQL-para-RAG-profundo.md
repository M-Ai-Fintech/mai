---
id: MAI-11
title: Integrar pgvector ao PostgreSQL para RAG profundo
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-22 05:28'
labels:
  - database
  - ai
  - poc
  - revalidation
milestone: m-9
dependencies: []
parent_task_id: MAI-8
priority: low
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementar e integrar a extensão pgvector ao PostgreSQL para prover busca semântica nativa e eficiente no Database Memory Service e na camada RAG.

Principais objetivos:
- Ativar a extensão pgvector na base PostgreSQL do monolito Deno.
- Migrar o tipo de dados das colunas 'embedding' das tabelas 'user_preferences', 'domain_knowledge' e 'company_culture_memory' de REAL[] para vector(384) (alinhado com o modelo all-MiniLM-L6-v2 de 384 dimensões).
- Criar a infraestrutura e a tabela 'vdr_document_chunks' para persistir e indexar os trechos de documentos do VDR no PostgreSQL.
- Otimizar as buscas utilizando o operador de distância de cosseno (<=>) e indexação HNSW.
- Garantir retrocompatibilidade e resiliência com logs e tratamento de erros caso a extensão pgvector não esteja ativa no ambiente de banco de dados.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A extensão pgvector deve ser habilitada (CREATE EXTENSION IF NOT EXISTS vector;) na inicialização do banco de dados (schema.sql).
- [ ] #2 Colunas 'embedding' em 'user_preferences', 'domain_knowledge' e 'company_culture_memory' devem usar o tipo vector(384) e possuir suporte a índices HNSW.
- [ ] #3 Refatorar 'ClientSiloedRAG' para persistir e buscar os chunks de documentos do VDR na tabela 'vdr_document_chunks' do Postgres.
- [ ] #4 Implementar tratamento de erros e fallbacks robustos (graceful degradation) para o caso do pgvector ou o banco estarem indisponíveis.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. **Configuração do PostgreSQL**:
   - Inserir 'CREATE EXTENSION IF NOT EXISTS vector;' no topo do src/core/db/schema.sql.
   - Atualizar a definição das colunas de embedding nas tabelas 'user_preferences', 'domain_knowledge' e 'company_culture_memory' de 'REAL[]' para 'vector(384)'.
   - Adicionar índices HNSW para distância de cosseno nas três tabelas (ex: USING hnsw (embedding vector_cosine_ops)).

2. **Criação da Tabela de RAG**:
   - Adicionar tabela 'vdr_document_chunks' com colunas: id (UUID), deal_id (UUID/VARCHAR), document_name (VARCHAR), chunk_index (INT), text_chunk (TEXT) e embedding (vector(384)).
   - Adicionar índice HNSW nesta nova tabela.

3. **Adaptação no Deno pg Driver**:
   - No 'DatabaseMemoryService', verificar se a passagem de arrays diretamente no pg driver funciona ou se é necessário formatar como string no formato '[val1,val2,...]' ou realizar cast explícito ($1::vector).

4. **Refatoração do ClientSiloedRAG**:
   - Alterar 'src/agent/rag_layer.ts' para usar o 'DatabaseMemoryService' e a tabela 'vdr_document_chunks' para salvar e buscar os chunks vetoriais.

5. **Testes e Validação**:
   - Criar script/teste rápido de fumaça de busca vetorial local e atualizar testes existentes.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-22 05:28
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: pgvector behavior is not proven against PostgreSQL: tests pass via in-memory fallback after database connection failure. Reopen until schema, vector operators, migrations, persistence, and similarity queries pass against a real local database.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 O schema.sql contém as diretivas de criação do pgvector e as novas estruturas de tabelas atualizadas.
- [ ] #2 A classe DatabaseMemoryService e a camada RAG usam queries SQL nativas com o operador <=> para buscas de similaridade.
- [ ] #3 Os testes em tests/core/memory_service.spec.ts passam com sucesso tratando fallbacks de banco de forma adequada.
- [ ] #4 A CLI (chat.ts) consegue inicializar o VDR e realizar buscas semânticas persistidas no Postgres local.
<!-- DOD:END -->
