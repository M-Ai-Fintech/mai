---
id: MAI-4
title: Integração do Google AI Studio ao MVP
status: Done
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-09 17:21'
labels:
  - agent
  - ai
  - mvp
milestone: m-1
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
- [x] #1 Garantir suporte completo a múltiplas variáveis de ambiente
      segura do provedor Google AI Studio (utilizando @ai-sdk/google via Mastra)
      no ponto de entrada src/agent/index.ts e sincronizar com todos os
      subagentes.
- [x] #2 Implementar mensagens de erro claras e amigáveis ao usuário caso
      (priorizando GOOGLE_GENERATIVE_AI_API_KEY, com fallback para
      GOOGLE_API_KEY e GEMINI_API_KEY) para validação no momento do boot dos
      agentes.
- [x] #3 Permitir testes locais ou execução de dry-run/fallback com mock quando
      nenhuma chave de API válida seja encontrada nas variáveis de ambiente,
      prevenindo falhas com stack traces confusos.
- [x] #4 Verificar que todos os 7 agentes da suite agêntica do MVP monolito
      as chaves de API estiverem intencionalmente ausentes em ferramentas
      secundárias (como o grounding de busca).
      herdam e usam a configuração de provedor unificada de forma integrada, com
      cobertura básica de testes unitários confirmando a inicialização segura.

- [x] #5 Inicialização centralizada do provedor Gemini, validando chaves de ambiente em ordem de prioridade usando Deno.env
- [x] #6 Mensagem de aviso clara caso as credenciais não estejam presentes
- [x] #7 Criação do .env.example e adição do .env no .gitignore confirmada
- [x] #8 Documentação gerada explicando o passo a passo de acesso e criação da chave no Google AI Studio
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
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 O ponto de entrada de agentes (src/agent/index.ts) não apresenta erros
      foi implementada e testada no Deno.
- [x] #2 Todas as variáveis de ambiente (GOOGLE_GENERATIVE_AI_API_KEY,
      de digitação, erros de compilação TS ou dependências quebradas no runtime.
- [x] #3 A suíte de testes (deno task test) executa sem falhas e valida a
      GOOGLE_API_KEY, GEMINI_API_KEY) são mapeadas de forma robusta e validadas
      antes da chamada aos agentes.
- [x] #4 A documentação do projeto (incluindo README.md ou guias de setup) foi
      correta leitura/inicialização das chaves e agentes.
      verificada para garantir que as instruções de configuração de ambiente
      estão alinhadas.

- [x] #5 Remoção de chaves hardcoded e proteção via .gitignore validada
- [x] #6 Execução sem chaves opera em dry-run ou emite aviso sem quebrar o runtime
- [x] #7 Documentação em /backlog/docs e /context adicionada e clara
<!-- DOD:END -->
