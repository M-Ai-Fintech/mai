---
id: MAI-18
title: Evolução da Camada de Banco de Dados Postgres
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-09 04:41'
labels:
  - core
  - database
milestone: m-3
dependencies: []
priority: medium
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Coordenar a evolução e otimização da camada de banco de dados PostgreSQL do MVP monolítico no Deno, estabelecendo uma base sólida de persistência relacional e autônoma (Database Memory Service). Este épico visa estruturar adequadamente o esquema operacional de transações M&A, aplicar estratégias de indexação de alto desempenho (GIN e B-Tree) e garantir a resiliência operacional por meio de um gerenciamento eficiente de pool de conexões e fallbacks. Adicionalmente, prepara a arquitetura de dados local para uma transição e migração suave para a infraestrutura gerenciada Cloud SQL na Google Cloud Platform (GCP) com compatibilidade futura para a extensão pgvector.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 O esquema de banco de dados (src/core/db/schema.sql) deve conter a modelagem completa das 12+ tabelas operacionais e de memória, com chaves estrangeiras, restrições de integridade e índices otimizados.
- [ ] #2 As consultas críticas e buscas por dados semiestruturados JSONB devem ser aceleradas por índices do tipo GIN nas tabelas user_preferences, domain_knowledge e company_culture_memory.
- [ ] #3 O adaptador PostgresQueryAdapter e o DatabaseMemoryService devem operar com pool de conexões robusto (pg.Pool), garantindo a liberação de conexões mesmo em caso de exceções e implementando fallbacks quando o banco estiver indisponível.
- [ ] #4 A busca semântica por similaridade de cosseno (searchSimilarKnowledge) deve estar funcional e estruturada com campos REAL[] / vector, servindo de base para o RAG dos agentes.
- [ ] #5 A suíte de testes unitários em tests/core/memory_service.spec.ts devem validar a leitura, gravação e fallbacks de indisponibilidade sem vazamento de conexões ou falhas críticas no runtime Deno.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. **Refinamento do Schema & Indexação (Subtarefa MAI-28):** Mapear e validar a integridade relacional de src/core/db/schema.sql, chaves estrangeiras, restrições de integridade e índices B-Tree e GIN (para os campos JSONB de preferências, cultura e conhecimento).
2. **Resiliência e Otimização do Adaptador (Subtarefa MAI-29):** Otimizar o pooling de pg.Pool no PostgresQueryAdapter e implementar mecanismos de fallback elegante para evitar falhas catastróficas se o banco estiver offline.
3. **Validação da Busca por Similaridade & RAG:** Assegurar que o método searchSimilarKnowledge esteja apto a consultar embeddings por similaridade de cosseno (REAL[] / vector).
4. **Testes & Handoff:** Executar testes unitários locais e atualizar a documentação sobre conexões com banco local e Cloud SQL futuro.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Esquema relacional em schema.sql validado localmente e documentado.
- [ ] #2 Índices GIN e B-Tree criados com sucesso e comprovadamente utilizados em consultas do Database Memory Service.
- [ ] #3 Gestão do ciclo de vida das conexões (pool release) testada e livre de vazamentos de recursos (resource leaks).
- [ ] #4 Variáveis de ambiente do banco de dados (ex: DATABASE_URL) parametrizadas e documentadas no README.md.
- [ ] #5 Todos os testes unitários da camada de dados (memory_service.spec.ts) executados e passando no Deno.
<!-- DOD:END -->
