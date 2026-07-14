---
id: MAI-29
title: >-
  Otimizar queries SQL e resiliência via Postgres local (preparação para Cloud
  SQL)
status: Done
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-10 13:44'
labels:
  - core
  - database
  - poc
milestone: m-3
dependencies: []
parent_task_id: MAI-18
priority: medium
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Otimizar e refatorar as consultas SQL e o adaptador de conexão Postgres local para garantir alta resiliência e desempenho de banco de dados no MVP do middleware de M&A. O objetivo principal é preparar a base de dados para migração suave para o Google Cloud SQL, implementando boas práticas de pooling de conexão, timeouts de consultas, tratamento robusto de erros transientes e otimização de busca vetorial para o Database Memory Service.

Componentes Críticos:
1. Configuração de Pool Resiliente: Ajustar tamanhos máximos de conexões, timeouts de inatividade e tratamento global de erros do pool (pool.on('error')).
2. Mecanismo de Retry para Falhas Transientes: Implementar lógica de tentativa automática (exponential backoff) para consultas fracassadas por erros de rede ou failovers comuns do Cloud SQL.
3. Otimização de Índices GIN: Garantir que consultas em campos JSONB utilizem efetivamente os índices GIN criados através dos operadores corretos (containment '@>').
4. Alinhamento com pg_vector: Estruturar buscas por similaridade de embeddings (cosseno) de forma compatível com a extensão pg_vector no Cloud SQL, preparando a transição de REAL[] para vector(1536).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 O pool de conexões do Postgres deve ser configurado com limites explícitos de tamanho máximo (max) e timeouts (idleTimeoutMillis, connectionTimeoutMillis, query_timeout) no PostgresQueryAdapter, além de escuta global de erros no Pool.
- [ ] #2 Deve existir um mecanismo de retry automático com backoff exponencial para falhas de conexões transientes e erros específicos de rede/servidor.
- [ ] #3 Todas as queries de busca JSONB no Database Memory Service e nas actions de MCP devem utilizar operadores relacionais compatíveis com os índices GIN (ex: '@>') para evitar scans de tabela completos.
- [ ] #4 A consulta de similaridade em embeddings (searchSimilarKnowledge) deve ser estruturada de modo a aceitar a conversão direta para o formato vector do pg_vector do Cloud SQL e permitir indexação HNSW futuramente.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Configuração do Pool e Resiliência:
   - Configurar opções adicionais no construtor do pg.Pool em src/core/db/memory_service.ts: max, idleTimeoutMillis, connectionTimeoutMillis e statement_timeout.
   - Adicionar listener global para eventos de erro no Pool: pool.on('error', ...).

2. Mecanismo de Retry para Erros Transientes:
   - Implementar uma função auxiliar no query adapter para envelopar a execução de queries com tentativas de reexecução em caso de erros de conexão (ex: códigos PG '08000', '08003', '08006', '57P01') usando backoff exponencial com jitter.

3. Otimização de Consultas JSONB (GIN):
   - Ajustar as consultas SQL de leitura/pesquisa em tabelas operacionais e de memória para fazer uso otimizado do operador '@>' em vez de filtros no nível de aplicação ou indexação inadequada.

4. Adaptação para pg_vector do Cloud SQL:
   - Modificar a estrutura lógica da busca de similaridade e as definições do esquema SQL de forma a facilitar a alternância para a extensão pg_vector.
   - Planejar e registrar os comandos necessários no Cloud SQL (GCP) para ativar o pg_vector e criar o índice HNSW na coluna de embeddings.

5. Testes e Validação:
   - Atualizar a suíte de testes tests/core/memory_service.spec.ts para testar os cenários de pool, tratamento de erro de conexão e retentativas automáticas.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Passar em todos os testes unitários e de integração existentes (deno test), garantindo a estabilidade das funcionalidades básicas.
- [ ] #2 Garantir que a aplicação e a CLI não quebrem (comportamento de fallback resiliente) quando o banco PostgreSQL estiver offline.
- [ ] #3 Evitar concatenação de queries SQL dinâmicas não parametrizadas, garantindo proteção completa contra SQL Injection.
- [ ] #4 Conformidade total do código TypeScript com os padrões de linting e formatação do Deno (deno lint e deno fmt).
- [ ] #5 Documentação atualizada sobre as configurações de pool, retentativas e ativação da extensão pg_vector no Cloud SQL.
<!-- DOD:END -->
