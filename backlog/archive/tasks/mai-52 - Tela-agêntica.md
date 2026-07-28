---
id: MAI-52
title: 'Integração Agêntica: Chatbot e Painel de Engines'
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-14 05:31'
updated_date: '2026-07-28 03:00'
labels:
  - GUI
  - ai
  - integration
  - stitch
  - revalidation
milestone: m-12
dependencies:
  - MAI-4
  - MAI-85
references:
  - gui/DESIGN.md
  - src/api/server.ts
  - src/agent/index.ts
priority: high
ordinal: 53000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Integrar o frontend da aplicação com o backend ADK (agentes Deno), construindo a interface de interação do usuário com a inteligência artificial. Esta tarefa utiliza obrigatoriamente a biblioteca de componentes reutilizáveis da MAI-53 (Card, Button, Input, Skeleton, Toasts, Avatar, Spinner) e compreende duas telas/componentes principais na view de detalhe de um Deal:
1. **Interface de Chat Agêntico**: Chat UI para comunicação direta com os agentes (ex: BrokerOrchestratorAgent, NegotiationAgent). Deve suportar streaming de respostas (SSE), renderização de markdown (tabelas, negritos), exibição de 'thinking state' (loading indicators da MAI-53), e botões de ação rápida (suggested prompts).
2. **Painel de Engines (Insights)**: Dashboard específico do deal mostrando os outputs analíticos (ex: score de risco financeiro do ONNX, matching score do DealMatchingAgent, alertas de Due Diligence).

Todas as interfaces devem seguir rigorosamente o fluxo Stitch-First: prototipação no Stitch MCP -> aprovação do PO -> codificação React utilizando os componentes da MAI-53.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Chat UI e Painel de Engines prototipados no Stitch MCP e aprovados pelo PO antes da codificação (fluxo Stitch-First: prototipar no Stitch MCP -> aprovação PO -> código)
- [ ] #2 Interfaces construídas reutilizando os componentes base da biblioteca MAI-53 (Card, Button, Input, Skeleton, Avatar, Spinners)
- [ ] #3 Chat UI implementada suportando histórico de mensagens, input de texto com submit via enter, e auto-scroll
- [ ] #4 Chat UI renderiza respostas em Markdown (via react-markdown ou similar), com suporte a tabelas e code blocks
- [ ] #5 Indicador visual de 'agente digitando/pensando' (usando componentes da MAI-53) implementado durante a espera da resposta da API
- [ ] #6 Conexão com a API via Server-Sent Events (SSE) implementada no client para suportar respostas em streaming
- [ ] #7 Painel de Engines implementado exibindo cards de insights (Risk Score gauge, Valuation Range chart, DD Alerts list) a partir dos Cards reutilizáveis da MAI-53
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Prototipar Chat UI e Painel de Engines no Stitch MCP. 2. Obter aprovação do PO. 3. Implementar componentes de Chat (ChatWindow, Message, InputArea) estendendo os componentes da MAI-53. 4. Implementar renderizador de Markdown no chat. 5. Integrar SSE no frontend para receber stream de texto. 6. Implementar layout do Painel de Engines reutilizando componentes de Card da MAI-53. 7. Conectar o Painel com os endpoints de insights da API.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: The agentic screen only executes the Broker; engine outputs and VDR documents are defaults, streaming is artificial, citations remain empty, and tool traces are not emitted. Reopen for truthful integrated behavior.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---

author: @codex
created: 2026-07-22 05:31
---
## Gemini incident dependency\n\nAgentic chat depends on MAI-4 for compatible live Gemini execution and MAI-26 for Browser -> Next.js -> Core transport. The existing artificial stream, empty citations, absent tool traces, and Broker-only routing remain part of this task.
---

author: Codex
created: 2026-07-28 02:59
---
Archived as superseded on 2026-07-27 after the owner-approved MAI-85 rebaseline. Replacement work is tracked by the MAI-85.1 through MAI-85.15 dependency chain; this task's Stitch-first, legacy-GUI, or prototype-contract assumptions must not be implemented.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Protótipos de Chat UI e Painel de Engines aprovados no Stitch MCP pelo PO
- [ ] #2 Componentes de UI construídos e integrados reutilizando a biblioteca de componentes MAI-53
- [ ] #3 Chat testado enviando prompts reais para a API do Deno e renderizando a resposta transmitida via SSE
- [ ] #4 Painel de Engines renderiza corretamente com base no JSON retornado pela API
- [ ] #5 Componentes isolados de Chat (MessageBubble, InputBar) documentados com stories no Storybook
<!-- DOD:END -->
