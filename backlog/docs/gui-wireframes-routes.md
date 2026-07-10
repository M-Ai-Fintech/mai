# M&A Middleware GUI - Wireframes & Routes Specification

## 1. Sitemap & Front-End Routing (Next.js/HonoX)

A arquitetura de páginas front-end segue a lógica de acesso do usuário e detalhamento de negócios (deals).

| Página | Rota Front-End | Descrição |
|--------|----------------|-----------|
| **Dashboard** | `/` | Visão geral do pipeline de M&A, listagem de deals ativos (kanban/lista) e KPIs recentes. |
| **Detalhes do Deal** | `/deals/[id]` | Visão central de uma transação específica (Overview, Valuation, Status). |
| **Due Diligence & Motores** | `/deals/[id]/engines` | Interface para rodar análises preditivas ONNX, MILP e due diligence financeira/legal. |
| **Chat RAG Orchestrator** | `/deals/[id]/chat` | Chat bot contextualizado com o histórico do VDR e Broker Orchestrator. |
| **Configurações/Memória** | `/settings` | Configuração de User Preferences, Domain Knowledge e chaves de API. |

## 2. API Routes & Payloads (Hono Backend)

O backend expõe rotas RESTful para alimentar a UI, mantendo conformidade com o `schema.sql` (`transaction`, `phase_history`, `user_preferences`).

### 2.1. Deals & Lifecycle
- `GET /api/deals` - Retorna a lista de transações ativas.
- `GET /api/deals/:id` - Retorna detalhes da transação e seu histórico (`phase_history`).
- `POST /api/deals` - Inicia uma nova transação.
  - **Payload (Zod):** `{ title: z.string(), code: z.string(), targetValuation: z.number().optional() }`
- `PUT /api/deals/:id/status` - Atualiza o status/fase da transação.
  - **Payload (Zod):** `{ statusId: z.string().uuid(), phaseId: z.string().uuid() }`

### 2.2. Motores Computacionais
- `POST /api/engines/predict` - Aciona a predição ONNX para risco financeiro.
  - **Payload (Zod):** `{ dealId: z.string().uuid(), metrics: z.record(z.number()) }`
- `POST /api/engines/optimize` - Aciona otimização MILP para valuation.
  - **Payload (Zod):** `{ dealId: z.string().uuid(), constraints: z.any() }`

### 2.3. RAG & Orchestrator
- `POST /api/chat/message` - Envia uma mensagem para o Broker Orchestrator no contexto de um Deal.
  - **Payload (Zod):** `{ dealId: z.string().uuid(), message: z.string(), agentType: z.enum(["orchestrator", "legal", "financial"]) }`

### 2.4. Preferences
- `GET /api/settings/preferences` - Retorna as `user_preferences`.
- `PUT /api/settings/preferences` - Atualiza preferências globais.
  - **Payload (Zod):** `{ preferences: z.record(z.any()) }`

## 3. Mermaid Wireframes

Abaixo estão as representações estruturais das 5 telas principais usando Mermaid e descrições visuais.

### 3.1. Dashboard (Visão Geral)

```mermaid
graph TD
    subgraph UI_Dashboard [Dashboard Web]
        Header[Logo M&A | User Menu]
        Sidebar[Dashboard | Deals | Settings]
        KPIs[KPIs: Total Deals | Volume $$ | Risco Médio]
        Kanban[Kanban Pipeline: Sourcing --> DD --> Negotiation --> Closed]
        Header --- Sidebar
        Sidebar --- KPIs
        KPIs --- Kanban
    end
```

### 3.2. Detalhes do Deal

```mermaid
graph TD
    subgraph UI_Deal_Details [Detalhes do Deal - /deals/:id]
        HeaderDeal[Deal Title | Status Badge | Edit]
        Tabs[Overview | Engines | RAG Chat | Documents]
        Content_Overview[Valuation | Target Info | Phase History Timeline]
        Actions[Move Phase | Request VDR Sync]
        HeaderDeal --- Tabs
        Tabs --- Content_Overview
        Content_Overview --- Actions
    end
```

### 3.3. Motores Computacionais (Engines)

```mermaid
graph TD
    subgraph UI_Engines [Motores & Due Diligence - /deals/:id/engines]
        Engine_Selector[Select Engine: ONNX Risk | MILP Valuation]
        Input_Params[Parametros do Motor / Constraints]
        Run_Button((RUN ANALYSIS))
        Results_Panel[Resultados Gráficos / Z-Score / Custo de Capital]
        Engine_Selector --- Input_Params
        Input_Params --- Run_Button
        Run_Button --> Results_Panel
    end
```

### 3.4. Chat RAG Orchestrator

```mermaid
graph TD
    subgraph UI_Chat [Chat Contextual RAG - /deals/:id/chat]
        Chat_History[Chat Messages: User vs Orchestrator]
        Context_Panel[Context: Current Deal | VDR Documents Referenced]
        Input_Area[Input Text | Upload File | Send Button]
        Chat_History --- Context_Panel
        Context_Panel --- Input_Area
    end
```

### 3.5. Configurações (Settings)

```mermaid
graph TD
    subgraph UI_Settings [Settings & Memória - /settings]
        Nav[Global Settings | Memory & Culture | API Keys]
        Form_Pref[Edit User Preferences JSON/Form]
        Table_Culture[Company Culture & Domain Knowledge Entries]
        Save_Btn((Save Changes))
        Nav --- Form_Pref
        Nav --- Table_Culture
        Form_Pref --- Save_Btn
    end
```
