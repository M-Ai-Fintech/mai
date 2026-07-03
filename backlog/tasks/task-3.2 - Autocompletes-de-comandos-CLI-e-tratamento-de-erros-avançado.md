---
id: TASK-3.2
title: Autocompletes de comandos CLI e tratamento de erros avançado
status: To Do
assignee:
  - Luís Silva
created_date: "2026-07-08 02:25"
updated_date: "2026-07-08 02:27"
labels:
  - interface
  - cli
  - mvp
milestone: m-6
dependencies: []
parent_task_id: TASK-3
priority: medium
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Refatorar a interface CLI para prover autocompletação (tab-completion)
inteligente de comandos/argumentos no shell e inputs interativos
autocompletáveis no menu/chat. Implementar uma camada de tratamento de erros
avançada para higienizar logs de erro que possam conter chaves de API, segredos
ou dados confidenciais de M&A (evitando vazamento de informações) e gerenciar de
forma robusta falhas de infraestrutura (banco de dados Postgres, chamadas da API
Gemini, erros de inferência ONNX) com códigos de saída CLI padronizados e
gravação em log seguro de auditoria.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Deve gerar scripts de autocompletação no shell (bash/zsh/fish)
      dinamicamente a partir dos comandos registrados (ex: kyb, predict,
      portfolio, negotiate, document, chat).
- [ ] #2 Os prompts interativos na CLI (como CNPJ, setor de atuação e IDs de
      deals) devem oferecer sugestões autocompletáveis e histórico local rápido.
- [ ] #3 Centralizar o tratamento de erros em um manipulador global que
      categorize exceções (ex: validação, dependência externa, falha de
      rede/API) e retorne códigos de saída (Exit Codes) adequados.
- [ ] #4 Garantir que mensagens de erro mostradas na interface CLI sejam
      higienizadas (sanitizadas), escondendo senhas, chaves de API, credenciais
      de banco e paths absolutos de sistema.
- [ ] #5 Gravar os detalhes de erros não tratados e stack traces originais em um
      arquivo de log seguro (ex: `/logs/cli-errors.log`) para auditoria técnica.

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. **Modelagem do CLI Parser**: Utilizar uma biblioteca robusta de parsing no
   Deno (como o Cliffy ou Commander devidamente configurado) para estruturar os
   comandos, subcomandos e argumentos, permitindo a autocompletação e help
   dinâmicos.
2. **Integração de CLI Completions**: Configurar uma ação ou comando
   `completions` (ex: `deno task start completions zsh`) para despejar o script
   de completion necessário para os usuários ativarem a tecla TAB.
3. **Autocompletação em Prompts**: Atualizar os prompts de input manual do menu
   para aceitar sugestões de histórico recente ou listas predefinidas (ex:
   setores industriais comuns, CNPJs simulados ou IDs de deals cadastrados na
   base).
4. **Tratamento de Exceções e Higienização**: Criar um arquivo utilitário
   `src/cli/errors.ts` que exporta a classe `CLIErrorHandler` e erros
   especializados (`CLIValidationError`, `APIError`, etc.). Adicionar um
   sanitizador regex para mascarar chaves e paths sensíveis do sistema de
   arquivos antes de exibir os erros ao usuário.
5. **Auditoria de Logs**: Garantir a escrita assíncrona em
   `/logs/cli-errors.log` de forma segura (usando `Deno.writeTextFile` ou
   similar) e verificar se o diretório de logs está configurado no `.gitignore`.
6. **E2E e Unit Tests**: Escrever casos de teste no arquivo
   `tests/e2e/cli.spec.ts` para testar os fluxos de erro (ex: simular falha na
   API ou input inválido, checar código de saída CLI e mensagens limpas de erro
   no stderr).

<!-- SECTION:PLAN:END -->

## Definition of Done

<!-- DOD:BEGIN -->

- [ ] #1 Refatoração concluída e CLI operando sem quebras nos fluxos interativos
      e de linha de comando.
- [ ] #2 Testes automatizados garantindo a captura correta de erros e saída
      segura no console.
- [ ] #3 Script de autocompletação verificado e funcional nos shells
      especificados.
- [ ] #4 Arquivos de log criados em diretório seguro e não versionados (inclusos
      no .gitignore).

<!-- DOD:END -->
