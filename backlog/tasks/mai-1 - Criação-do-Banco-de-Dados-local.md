---
id: MAI-1
title: Criação do Banco de Dados Local
status: Done
assignee:
  - Luís Silva
created_date: '2026-07-09 02:25'
updated_date: '2026-07-09 17:21'
labels:
  - core
  - database
milestone: m-1
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
- [x] #1 Criação de um arquivo docker-compose.yml expondo PostgreSQL na porta 5432 com volume configurado (ex: pgdata:/var/lib/postgresql/data) para persistência de dados
- [x] #2 O DatabaseMemoryService deve conectar ao banco via Deno usando as credenciais definidas no .env
- [x] #3 Deve existir um comando npm/deno (db:start) para subir a infraestrutura local facilmente
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
[REVISÃO CRÍTICA - MAI-1]
1. Duplicação de DatabaseMemoryService: Existe uma classe homônima em 'src/core/db/DatabaseMemoryService.ts' (aponta para mai/postgres) e outra em 'src/core/db/memory_service.ts' (aponta para ma_database/ma_broker). Os agentes e mocks utilizam a segunda, de modo que sem configurar DATABASE_URL no .env, eles falham silenciosamente na autenticação com o banco Postgres do docker-compose e caem no fallback de mock.
2. Incompatibilidade SQL pg_vector: O schema.sql cria a coluna 'embedding' como REAL[], mas a query de 'searchSimilarKnowledge' em memory_service.ts usa o operador '<=>' (distância de cosseno), exclusivo do pg_vector. Em um banco real sem pg_vector instalado ou com tipo REAL[], essa consulta irá falhar com erro de sintaxe.
---

author: Antigravity
created: 2026-07-09 17:21
---
[SANEAMENTO] DatabaseMemoryService unificado em Singleton e habilitado pgvector fallback em memória + pgvector real no schema.sql.
---
<!-- COMMENTS:END -->

<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Contêiner Docker do PostgreSQL sobe na porta 5432 e os dados persistem mesmo após reinicialização (docker-compose down/up)
- [x] #2 Serviço em Deno conecta à base, loga sucesso, e não quebra se a base estiver fora
- [x] #3 Teste unitário/integrado de conexão rodando com sucesso
<!-- DOD:END -->
