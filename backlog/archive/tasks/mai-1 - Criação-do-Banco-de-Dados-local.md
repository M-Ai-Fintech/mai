---
id: MAI-1
title: Criação do Banco de Dados Local
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-09 02:25'
updated_date: '2026-07-22 05:28'
labels:
  - core
  - database
  - revalidation
milestone: m-9
dependencies: []
priority: high
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Configuração e inicialização do banco de dados relacional PostgreSQL local utilizando Docker/Docker Compose para o ambiente de desenvolvimento. Implementação do `DatabaseMemoryService` para realizar as conexões, garantindo que as credenciais e URIs de conexão sejam extraídas de variáveis de ambiente de forma segura. O serviço deve oferecer a fundação (pool de conexões) para futuras consultas SQL e vector searches.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Criação de um arquivo docker-compose.yml expondo PostgreSQL na porta 5432 com volume configurado (ex: pgdata:/var/lib/postgresql/data) para persistência de dados
- [ ] #2 O DatabaseMemoryService deve conectar ao banco via Deno usando as credenciais definidas no .env
- [ ] #3 Deve existir um comando npm/deno (db:start) para subir a infraestrutura local facilmente
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Criar `docker-compose.yml` na raiz do projeto provisionando a imagem oficial do `postgres:15-alpine` com volume nomeado (ex: `-v pgdata:/var/lib/postgresql/data`) para persistência de dados.
2. Adicionar variáveis `DATABASE_URL`, `DB_USER`, `DB_PASS` ao `.env.example`.
3. Implementar a classe `DatabaseMemoryService` em `src/core/db/` estabelecendo um pool de conexões (ex: biblioteca `postgres` do Deno).
4. Adicionar rotinas de log para sucesso/falha de conexão no momento do startup.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Antigravity (Gemini)
created: 2026-07-09 16:37
---
[CRITICAL REVIEW - MAI-1]
1. Duplicate DatabaseMemoryService: A class with the same name exists in `src/core/db/DatabaseMemoryService.ts` (pointing to mai/postgres) and in `src/core/db/memory_service.ts` (pointing to ma_database/ma_broker). Agents and mocks use the latter, so without `DATABASE_URL` in `.env` they silently fail to authenticate with the docker-compose PostgreSQL database and fall back to mocks.
2. pgvector SQL incompatibility: `schema.sql` creates the `embedding` column as `REAL[]`, but `searchSimilarKnowledge` in `memory_service.ts` uses the `<=>` cosine-distance operator, which is specific to pgvector. On a real database without pgvector, or with a `REAL[]` type, this query will fail with a syntax error.
---

author: Antigravity
created: 2026-07-09 17:21
---
[REMEDIATION] Unified DatabaseMemoryService as a Singleton and enabled both an in-memory pgvector fallback and real pgvector support in `schema.sql`.
---

author: @codex
created: 2026-07-22 05:28
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: The local database foundation is not proven end-to-end: repository integration tests skip when PostgreSQL is unavailable and the banker-facing API persists through the in-memory MvpStore. Revalidate real startup, connection, schema, and persistence before Done.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->

<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Contêiner Docker do PostgreSQL sobe na porta 5432 e os dados persistem mesmo após reinicialização (docker-compose down/up)
- [ ] #2 Serviço em Deno conecta à base, loga sucesso, e não quebra se a base estiver fora
- [ ] #3 Teste unitário/integrado de conexão rodando com sucesso
<!-- DOD:END -->
