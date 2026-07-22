---
id: MAI-7
title: Autocompletes de comandos CLI e tratamento de erros avançado
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-22 05:28'
labels:
  - interface
  - cli
  - mvp
  - revalidation
milestone: m-9
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

## Comments

<!-- COMMENTS:BEGIN -->
author: Antigravity (Gemini)
created: 2026-07-09 16:37
---
[REVISÃO CRÍTICA - MAI-7]
1. Inconsistência do Backlog (DoD e AC desmarcados): A tarefa está marcada como concluída (Done), mas todas as caixas de AC e DoD no arquivo markdown estão desmarcadas.
2. Interrupção do Loop Interativo: No loop do modo interativo em 'src/cli/interface.ts', se um erro for disparado por um subcomando, a exceção é capturada pelo catch global que invoca 'CLIErrorHandler.handleError'. O handler executa 'Deno.exit(1)' imediatamente. Isso quebra a experiência do usuário de estar em um loop CLI robusto e interativo, pois qualquer erro isolado encerra o terminal abruptamente em vez de recuperar e retornar ao menu principal.
---

author: Antigravity
created: 2026-07-09 17:22
---
[SANEAMENTO] Corrigido o encerramento do processo no loop interativo CLI. O CLIErrorHandler.handleError agora suporta um parâmetro 'exitProcess: boolean'. No loop interativo, se um comando falhar, o erro é interceptado, gravado no arquivo de log seguro ./data/logs/cli_errors.log com sanitização de segredos/chaves de API, e o usuário retorna de forma limpa ao menu principal em vez de ter o processo encerrado abruptamente.
---

author: @codex
created: 2026-07-22 05:28
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: Autocomplete and error handling lack complete behavioral verification across the current command surface, and the CLI currently contains a failing KYB path. Reopen until command discovery, completion, validation, and failure behavior have focused tests.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->

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
