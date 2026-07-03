---
id: TASK-3.1
title: Incrementar layout e TUI (ink/cliffy) da CLI
status: To Do
assignee:
  - Luís Silva
created_date: "2026-07-08 02:25"
updated_date: "2026-07-08 02:28"
labels:
  - interface
  - cli
  - mvp
milestone: m-6
dependencies: []
parent_task_id: TASK-3
priority: medium
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Refatorar a interface de linha de comando (CLI) do M&A Middleware utilizando a
biblioteca Cliffy para Deno. O objetivo é substituir os inputs básicos do
sistema por prompts interativos polidos, embelezar as exibições de dados
financeiros e de otimização em tabelas estruturadas com bordas e cores ANSI, e
aprimorar a experiência visual no Chat interativo com o M&A Broker Agent
(utilizando cabeçalhos estilizados, colorização e spinners de progresso durante
o raciocínio do modelo). Também deve-se integrar um CLI Parser formal com
suporte a subcomandos e help automático.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 O menu principal deve ser interativo usando o prompt Select (do Cliffy
      ou equivalente), permitindo navegação via setas e teclado.
- [ ] #2 Substituir todas as coletas de input (CNPJ, EBITDA, Receita, etc.) por
      prompts interativos (Input, Number, Confirm) com validações básicas de
      tipo e limites.
- [ ] #3 Apresentar tabelas estruturadas de dados e resultados de otimização
      (MILP e Algoritmos Genéticos) utilizando o componente Table do Cliffy,
      aplicando cores e bordas estilizadas.
- [ ] #4 Refinar a TUI do Chat interativo no chat.ts com diferenciação de cores
      para as partes (Broker Agent vs. M&A Partner) e indicação visual de
      carregamento (spinner/loading) durante a inferência.
- [ ] #5 Migrar o parsing manual de argumentos de linha de comando para o
      Command do Cliffy, preservando total retrocompatibilidade com os comandos
      existentes nos testes E2E (kyb, predict, portfolio, negotiate, document).

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Registrar as dependências do Cliffy (cliffy/prompt, cliffy/command,
   cliffy/table, cliffy/ansi) no arquivo deno.json.
2. Refatorar o arquivo src/cli/interface.ts utilizando Cliffy Command para
   definir de forma declarativa os subcomandos kyb, predict, portfolio,
   negotiate e document, fornecendo documentação e help automáticos.
3. Alterar a lógica do loop principal em src/cli/interface.ts para utilizar o
   menu interativo com Select prompt do Cliffy.
4. Refatorar as coletas de inputs interativos em src/cli/commands.ts para
   utilizar os prompts de Input/Number com validações de dados financeiros.
5. Substituir as impressões brutas de dados estruturados em src/cli/commands.ts
   por tabelas ricas com bordas e cores do Cliffy Table.
6. Atualizar src/cli/chat.ts para prover uma interface de conversação colorida e
   um spinner dinâmico enquanto o Broker Agent computa a resposta.
7. Executar deno task test para validar a retrocompatibilidade com os testes E2E
   e assegurar a robustez da interface CLI.

<!-- SECTION:PLAN:END -->

## Definition of Done

<!-- DOD:BEGIN -->

- [ ] #1 Interface CLI executando sem erros de carregamento de dependências no
      Deno.
- [ ] #2 Navegação e fluxos interativos validados manualmente no terminal.
- [ ] #3 Garantia de retrocompatibilidade com comandos E2E, validada pelo
      sucesso dos testes em deno task test.
- [ ] #4 Código limpo, estruturado, sem avisos de lint ou chaves de API
      expostas.

<!-- DOD:END -->
