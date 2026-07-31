---
id: MAI-28
title: Modelagem de tabelas e indexação do Postgres local
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-22 05:29'
labels:
  - core
  - database
  - poc
  - revalidation
milestone: m-9
dependencies: []
parent_task_id: MAI-18
priority: medium
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Estruturar, aplicar e validar a modelagem relacional de tabelas e indexação do banco de dados local Postgres para o middleware de M&A. A tarefa envolve garantir a integridade referencial das tabelas operacionais e do Database Memory Service, criar um script automatizado de inicialização da estrutura (schema.sql) e carga inicial de dados de referência (seeding) de fases, tipos e status, além de validar a correta criação dos índices B-tree e GIN.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Validar e aplicar a modelagem relacional definida em schema.sql em uma instância local do Postgres, garantindo todas as chaves primárias, estrangeiras com políticas de deleção/atualização apropriadas, e restrições de unicidade.
- [ ] #2 Garantir a criação correta de todos os índices B-tree (em colunas chave) e GIN (para busca eficiente em campos JSONB de metadados operacionais e de memória).
- [ ] #3 Implementar um script de inicialização e carga inicial (seeding) para popular tabelas de domínio críticas: fases da transação, status de transação/fase, tipos/estratégias de transação e perfis de advisors.
- [ ] #4 Registrar o script como uma tarefa Deno (ex: 'deno task db:setup') para facilidade de inicialização em ambientes locais e pipelines de CI.
- [ ] #5 Implementar testes que verifiquem a execução do script de setup e seeding com comportamento de fallback resiliente e amigável quando o banco Postgres estiver inacessível.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Desenvolvimento do Script de Setup e Seeding: Criar o arquivo src/core/db/setup.ts para ler e executar o schema.sql e inserir registros básicos nas tabelas de lookup (transaction_type, transaction_strategy, transaction_status, advisor_type, advisor_side, phase, phase_status).
2. Configuração da Task Deno: Registrar a tarefa 'db:setup' no arquivo deno.json utilizando as permissões apropriadas do Deno (allow-read, allow-env, allow-net).
3. Criação de Testes de Integração do Schema: Adicionar testes automatizados para verificar a aplicação do schema e seeding contra um Postgres ativo, validando o isolamento de conexão e tratando erros de conexão de forma amigável.
4. Validação de Índices GIN e B-tree: Certificar-se de que os índices descritos no schema.sql são aplicados com sucesso e nenhuma query falha devido a falta de indexação.
5. Documentação da Camada de Persistência: Atualizar o README.md detalhando o comando de setup e pré-requisitos para rodar o banco de dados Postgres localmente.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: All acceptance and DoD items are unchecked, and the active prototype store bypasses the claimed Postgres data model. Reopen to reconcile schema, repositories, migrations, and runtime consumers.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Script de inicialização da estrutura de banco de dados 'setup.ts' implementado e testado com sucesso.
- [ ] #2 Carga inicial (seed) de dados de referência validada e funcional.
- [ ] #3 Indices B-tree e GIN aplicados e verificados nas tabelas correspondentes.
- [ ] #4 Nova tarefa 'db:setup' configurada e funcional no arquivo deno.json.
- [ ] #5 Garantia de conformidade total do código TypeScript com formatação (deno fmt) e regras de segurança contra SQL Injection.
<!-- DOD:END -->
