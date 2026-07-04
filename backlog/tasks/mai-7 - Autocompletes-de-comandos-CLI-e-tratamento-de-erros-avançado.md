---
id: MAI-7
title: Autocompletes de comandos CLI e tratamento de erros avançado
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-09 14:45'
labels:
  - interface
  - cli
  - mvp
milestone: m-1
dependencies:
  - MAI-6
parent_task_id: MAI-6
priority: high
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extensão da interface de linha de comando com suporte a autocompletar e um framework global para captura e higienização de erros. A CLI não deve vazar `stack traces` longos do Deno e deve censurar ativamente segredos. Tarefa dependente de MAI-6.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Os prompts interativos na CLI (como CNPJ, setor de atuação e IDs de
      dinamicamente a partir dos comandos registrados (ex: kyb, predict,
      portfolio, negotiate, document, chat).
- [ ] #2 Centralizar o tratamento de erros em um manipulador global que
      deals) devem oferecer sugestões autocompletáveis e histórico local rápido.
- [ ] #3 Garantir que mensagens de erro mostradas na interface CLI sejam
      categorize exceções (ex: validação, dependência externa, falha de
      rede/API) e retorne códigos de saída (Exit Codes) adequados.
- [ ] #4 Gravar os detalhes de erros não tratados e stack traces originais em um
      higienizadas (sanitizadas), escondendo senhas, chaves de API, credenciais
      de banco e paths absolutos de sistema.
      arquivo de log seguro (ex: `/logs/cli-errors.log`) para auditoria técnica.

- [ ] #5 Disponibilização da geração de autocompletes (cli completions)
- [ ] #6 Handlers globais que capturam erros e retornam Exit Codes
- [ ] #7 Sanitização via Regex para remover padrões de API Key na saída de console
- [ ] #8 Flag --debug reativa a impressão do stack trace completo
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Configurar módulo nativo de autocomplete do Cliffy para shells bash/zsh/fish.
2. Criar `src/cli/errors.ts` exportando classes de Erros.
3. Adicionar try-catch raiz no `main.ts` que formata exceções e sanitiza segredos.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Testes automatizados garantindo a captura correta de erros e saída
      e de linha de comando.
- [ ] #2 Script de autocompletação verificado e funcional nos shells
      segura no console.
- [ ] #3 Arquivos de log criados em diretório seguro e não versionados (inclusos
      especificados.
      no .gitignore).

- [ ] #4 Erro intencional exibe mensagem tratada sem stacktrace
- [ ] #5 Uso de --debug revela stack trace
- [ ] #6 Chaves falsas forjadas no erro aparecem censuradas no log
<!-- DOD:END -->
