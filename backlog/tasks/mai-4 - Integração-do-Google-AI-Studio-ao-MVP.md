---
id: MAI-4
title: Integração do Google AI Studio ao MVP
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-22 05:31'
labels:
  - agent
  - ai
  - mvp
  - revalidation
milestone: m-9
dependencies: []
parent_task_id: MAI-2
priority: high
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Garantir que a SDK de IA do projeto acesse o Google AI Studio corretamente de forma parametrizada. O sistema deverá procurar ativamente por chaves de API usando Deno.env em múltiplas variáveis de ambiente. Deve-se assegurar a segurança via .gitignore e .env.example, além de gerar documentação instrutiva sobre a criação das chaves e uso da API.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Garantir suporte completo a múltiplas variáveis de ambiente
      segura do provedor Google AI Studio (utilizando @ai-sdk/google via Mastra)
      no ponto de entrada src/agent/index.ts e sincronizar com todos os
      subagentes.
- [ ] #2 Implementar mensagens de erro claras e amigáveis ao usuário caso
      (priorizando GOOGLE_GENERATIVE_AI_API_KEY, com fallback para
      GOOGLE_API_KEY e GEMINI_API_KEY) para validação no momento do boot dos
      agentes.
- [ ] #3 Permitir testes locais ou execução de dry-run/fallback com mock quando
      nenhuma chave de API válida seja encontrada nas variáveis de ambiente,
      prevenindo falhas com stack traces confusos.
- [ ] #4 Verificar que todos os 7 agentes da suite agêntica do MVP monolito
      as chaves de API estiverem intencionalmente ausentes em ferramentas
      secundárias (como o grounding de busca).
      herdam e usam a configuração de provedor unificada de forma integrada, com
      cobertura básica de testes unitários confirmando a inicialização segura.

- [ ] #5 Inicialização centralizada do provedor Gemini, validando chaves de ambiente em ordem de prioridade usando Deno.env
- [ ] #6 Mensagem de aviso clara caso as credenciais não estejam presentes
- [ ] #7 Criação do .env.example e adição do .env no .gitignore confirmada
- [ ] #8 Documentação gerada explicando o passo a passo de acesso e criação da chave no Google AI Studio
- [ ] #9 The selected @ai-sdk/google model implements the interface expected by the pinned Mastra version
- [ ] #10 A non-mocked integration test reaches Gemini through the Deno Core and validates a real model response without logging secrets
- [ ] #11 Missing, invalid, and quota-limited credentials return explicit failures and never plausible fallback success
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Criar `.env.example` com placeholders para as chaves e garantir que `.env` esteja no `.gitignore`.
2. Criar um utilitário de configuração em `src/agent/ai_provider.ts` usando `Deno.env.get()`.
3. Incluir a lógica de busca iterativa pelas chaves de ambiente (GEMINI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY).
4. Emitir alerta instruindo o usuário caso a chave falte.
5. Criar documentação em `/backlog/docs/` e `/context/` sobre como gerar e configurar a API Key no Google AI Studio.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Antigravity (Gemini)
created: 2026-07-09 16:37
---
[REVISÃO CRÍTICA - MAI-4]
1. Patch com Chave Falsa no Ambiente: O arquivo 'src/agent/index.ts' injeta 'mock-key-for-dry-run' no Deno.env para contornar a inicialização da biblioteca Mastra/Google na ausência de chaves de API. Contudo, essa interceptação só é tratada manualmente em 'AgentOrchestrator.executeAgentQuery'.
2. Falhas não Tratadas nos Agentes Mastra: Qualquer subcomando da CLI ou chamada direta aos outros agentes instanciados de forma independente tentará disparar chamadas de API reais do Google usando a chave falsa e falhará com HTTP 400/401, em vez de passar por um fallback amigável de dry-run.
---

author: Antigravity
created: 2026-07-09 17:21
---
[SANEAMENTO] Implementado monkeypatching global em Agent.prototype.generate e Agent.prototype.stream na inicialização de agentes no ponto de entrada src/agent/index.ts, garantindo a interceptação graciosa de todas as chamadas a agentes da biblioteca Mastra em modo dry-run quando nenhuma chave Gemini estiver disponível. AIProvider.getApiKey agora detecta 'mock-key-for-dry-run' e o trata de forma unificada como fallback.
---

author: @codex
created: 2026-07-22 05:28
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: Gemini configuration is present, but execution fails because @ai-sdk/google 1.2.22 exposes an AI SDK v4 model while @mastra/core 1.42.0 expects v5+ for generate(). Reopen to establish compatible dependencies and a real, non-mocked Core smoke test.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---

author: @codex
created: 2026-07-22 05:31
---
## Gemini incident ownership\n\nNo separate bug task was created. MAI-4 owns the backend/provider failure: @ai-sdk/google 1.2.22 produces an AI SDK v4 model that @mastra/core 1.42.0 rejects through generate(). MAI-26 separately owns the browser transport failure that bypasses the Next.js proxy. MAI-52 depends on both before agentic chat can be considered integrated.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 O ponto de entrada de agentes (src/agent/index.ts) não apresenta erros
      foi implementada e testada no Deno.
- [ ] #2 Todas as variáveis de ambiente (GOOGLE_GENERATIVE_AI_API_KEY,
      de digitação, erros de compilação TS ou dependências quebradas no runtime.
- [ ] #3 A suíte de testes (deno task test) executa sem falhas e valida a
      GOOGLE_API_KEY, GEMINI_API_KEY) são mapeadas de forma robusta e validadas
      antes da chamada aos agentes.
- [ ] #4 A documentação do projeto (incluindo README.md ou guias de setup) foi
      correta leitura/inicialização das chaves e agentes.
      verificada para garantir que as instruções de configuração de ambiente
      estão alinhadas.

- [ ] #5 Remoção de chaves hardcoded e proteção via .gitignore validada
- [ ] #6 Execução sem chaves opera em dry-run ou emite aviso sem quebrar o runtime
- [ ] #7 Documentação em /backlog/docs e /context adicionada e clara
<!-- DOD:END -->
