---
id: TASK-3
title: Evolução da Interface CLI
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-08 02:27'
labels:
  - interface
  - cli
milestone: m-6
dependencies: []
priority: high
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Épico focado na evolução da interface de linha de comando (CLI) do M&A Middleware de um protótipo interativo básico para uma ferramenta profissional com TUI (Terminal User Interface). A evolução visa melhorar a experiência do usuário por meio de prompts mais interativos (utilizando uma biblioteca robusta como Cliffy), suporte a autocompletação inteligente de comandos, estruturação de outputs com tabelas e spinners para processos de inferência e otimização assíncronos, além de um tratamento robusto de erros para evitar vazamento de dados internos ou stack traces confusos ao operador.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Substituir os prompts manuais e a leitura direta de buffers de entrada por prompts interativos nativos (ex: selects, inputs validados, confirmações) usando Cliffy ou biblioteca equivalente no Deno.
- [ ] #2 Migrar a lógica de argumentos (handleCliArgs) para uma estrutura baseada em classes de comando com validação de tipos, autocompletação nativa de subcomandos (kyb, predict, portfolio, negotiate, document, chat) e exibição automática do menu de ajuda (--help).
- [ ] #3 Adicionar feedbacks visuais de progresso (spinners ou barras de progresso) para operações assíncronas custosas, tais como inferência preditiva via ONNX, geração de PDF/LaTeX e execução do otimizador genético.
- [ ] #4 Formatar os dados de saída de forma legível e profissional no console (como tabelas estruturadas para o portfólio de empresas e scores de risco do FCD).
- [ ] #5 Implementar um tratador de exceções global para a CLI que evite o vazamento de stack traces internos do Deno no fluxo padrão, exibindo mensagens de erro formatadas e amigáveis ao usuário, a menos que uma flag --verbose ou --debug seja especificada.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Etapa 1: Definição e Estruturação de Comandos
- Instalar ou integrar a biblioteca Cliffy (módulos command e prompt) nas dependências do projeto.
- Refatorar a estrutura principal do src/cli/interface.ts utilizando a classe Command para definir opções, subcomandos e argumentos obrigatórios/opcionais.

### Etapa 2: Aprimoramento da TUI e Prompts Interativos (TASK-6.1)
- Substituir os prompt() tradicionais pelos prompts interativos da Cliffy (Input, Select, Confirm).
- Adicionar suporte a tabelas para visualização de relatórios do portfolio e predict.
- Integrar indicadores de carregamento (spinners) ao acionar comandos assíncronos das engines.

### Etapa 3: Autocomplete e Tratamento de Erros Avançado (TASK-6.2)
- Configurar autocompletes inteligentes nos prompts onde aplicável (ex: seleção de IDs de Deals, setores).
- Implementar um middleware ou tratador de erro global (via .error() ou try-catch no ponto de entrada) que formate erros do sistema de forma limpa.
- Suportar a flag global --debug / --verbose para expor o stack trace completo quando requisitado.

### Etapa 4: Validação, Testes e Documentação
- Executar testes locais simulando interação e modo CLI.
- Atualizar os testes em tests/e2e/cli.spec.ts para verificar os novos comandos.
- Verificar a integridade geral do projeto.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Toda a navegação da CLI e execução de comandos funcionam perfeitamente no runtime do Deno sem quebras.
- [ ] #2 A CLI emite códigos de erro (exit code) apropriados em caso de falhas e execuções malsucedidas.
- [ ] #3 Nenhuma regressão foi introduzida nas integrações de motores (predict, portfolio, negotiate, document, chat).
- [ ] #4 A suíte de testes de ponta a ponta (tests/e2e/cli.spec.ts) foi atualizada e está passando com sucesso.
- [ ] #5 Os comandos de ajuda e documentação da CLI estão completos, atualizados e descritos em português.
<!-- DOD:END -->
