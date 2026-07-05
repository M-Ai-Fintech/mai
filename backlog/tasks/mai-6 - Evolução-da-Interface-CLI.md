---
id: MAI-6
title: Evolução da Interface CLI
status: Done
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-09 15:40'
labels:
  - interface
  - cli
milestone: m-1
dependencies: []
priority: high
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Transformar a CLI básica numa ferramenta interativa usando Cliffy. Adicionar menus, confirmações, tabelas e spinners.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Migrar a lógica de argumentos (handleCliArgs) para uma estrutura baseada em classes de comando com validação de tipos, autocompletação nativa de subcomandos (kyb, predict, portfolio, negotiate, document, chat) e exibição automática do menu de ajuda (--help).
- [ ] #2 Adicionar feedbacks visuais de progresso (spinners ou barras de progresso) para operações assíncronas custosas, tais como inferência preditiva via ONNX, geração de PDF/LaTeX e execução do otimizador genético.
- [ ] #3 Formatar os dados de saída de forma legível e profissional no console (como tabelas estruturadas para o portfólio de empresas e scores de risco do FCD).
- [ ] #4 Implementar um tratador de exceções global para a CLI que evite o vazamento de stack traces internos do Deno no fluxo padrão, exibindo mensagens de erro formatadas e amigáveis ao usuário, a menos que uma flag --verbose ou --debug seja especificada.
- [ ] #5 Integração do Cliffy para prompts e subcomandos (kyb, predict, etc)
- [ ] #6 Uso de spinners em chamadas assíncronas
- [ ] #7 Resultados formatados em tabelas nativas do console
<!-- AC:END -->



## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Instalar `cliffy` e instanciar `Command` e `Prompt`.
2. Refatorar a captura de inputs do usuário para usar `Select.prompt` e `Input.prompt`.
3. Instanciar spinner/tabela (`cliffy/table`) nas respostas de predição/análise.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 A CLI emite códigos de erro (exit code) apropriados em caso de falhas e execuções malsucedidas.
- [ ] #2 Nenhuma regressão foi introduzida nas integrações de motores (predict, portfolio, negotiate, document, chat).
- [ ] #3 A suíte de testes de ponta a ponta (tests/e2e/cli.spec.ts) foi atualizada e está passando com sucesso.
- [ ] #4 Os comandos de ajuda e documentação da CLI estão completos, atualizados e descritos em português.
- [ ] #5 CLI roda sem quebras com subcomandos
- [ ] #6 Output formatado em tabelas e spinners visíveis
<!-- DOD:END -->
