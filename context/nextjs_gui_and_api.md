# Interface Gráfica Next.js (GUI) & Integração com a API Deno
## Especificação Técnica da Camada de Frontend e Rotas de Integração

O sistema evoluiu de uma interface puramente CLI para incluir um painel de controle web completo desenvolvido em **Next.js** (localizado no diretório `gui/`). Esta interface se conecta diretamente com a API do middleware rodando no Deno (porta `8000`).

---

## 1. Estrutura do App Next.js (`gui/`)

O frontend é construído utilizando React 19, TypeScript e o App Router do Next.js.

### Estrutura de Diretórios de Rotas (`gui/app/`)
* **`/`**: **Dashboard Principal Multi-View** (Kanban, Tabela, Timeline), filtros por fase/busca e ancoragem de widgets sintetizados via Generative UI (MAI-60).
* **`/clients`**: **Telas CRUD de Entidades** (listagem paginada e modal de cadastro de clientes Buyers/Sellers com validação).
* **`/settings`**: Tela de configurações gerais, incluindo preferências de negociação globais e credenciais dos VDRs.
* **`/generative-ui`**: **Generative UI Synthesis Studio** (Motor de síntese de interfaces em runtime a partir de esquemas JSON DSL / Component Schema gerados por agentes).
* **`/deals`**: Listagem de transações ativas de M&A.
* **`/deals/[id]`**: Painel principal e visão 360° de uma transação específica.
  * **`/deals/[id]/chat`**: Interface de chat interativa em tempo real com o `BrokerOrchestratorAgent` via Server-Sent Events (SSE).
  * **`/deals/[id]/engines`**: Painel de visualização e controle dos motores computacionais (Previsão de Risco ONNX, Otimização MILP e Algoritmo Genético de Term Sheets).

### Componentes de Cliente Interativos & Generative UI Engine
- **Biblioteca de Componentes (MAI-53)**: Componentes atômicos (`Button`, `Badge`) e compostos (`Card`) fortemente tipados em TypeScript, com radii de 8px de alto contraste sobre Canvas Cream (`#F3F0EE`), alinhamento à esquerda por padrão e ícones brancos em fundos laranja.
- **Storybook 10 & MDX (MAI-54/59)**: Ambiente isolado de desenvolvimento e documentação funcional em `npm run storybook`.
- **Generative UI Engine (MAI-57)**: Parser e Factory React em [`gui/lib/generative-ui-engine.tsx`](file:///home/luis/mai/gui/lib/generative-ui-engine.tsx) que interpreta JSON DSL gerado pelos agentes e sintetiza componentes React sob as regras das [`gui/DESIGN_GUIDELINES.md`](file:///home/luis/mai/gui/DESIGN_GUIDELINES.md).
- **Dashboard Dinâmico (MAI-60)**: Interface de workspace customizável permitindo ancorar widgets sintetizados do Generative UI diretamente na página principal `/`.

---

## 2. A Classe `ApiClient` (`gui/lib/api-client.ts`)

A comunicação entre a GUI (Next.js) e o backend (Deno) é centralizada no helper `ApiClient`.

### Funcionalidades Resilientes Integradas
* **Timeout e Tentativas Exponenciais (`fetchWithRetry`):** As chamadas HTTP contam com 3 tentativas de reenvio automáticas usando *exponential backoff* e limite de tempo de 10 segundos para mitigar instabilidades de rede.
* **Sanitização de Caminhos Internos (`sanitizeErrorMessage`):** Evita que caminhos absolutos do sistema Linux (ex: `/home/luis/...`) ou stack traces de erro internos do backend sejam exibidos no console ou na interface do usuário final, limpando as mensagens antes de lançar a exceção.

---

## 3. Endpoints da API Backend Deno (`src/api/server.ts`)

O servidor de API roda nativamente em Deno na porta `8000` (`Deno.serve`) e provê suporte a CORS de forma global.

### Lista de Endpoints Operacionais
1. **`POST /api/kyb`:** Invoca a ferramenta de validação tributária cadastral (Receita/SERPRO) para CNPJs informados.
2. **`POST /api/predict`:** Executa a inferência de risco de insolvência no motor preditivo ML (`MLEngine.analyzeProfile`) e persiste os resultados em banco na tabela de conhecimento de domínio.
3. **`POST /api/portfolio`:** Executa o resolvedor MILP (`PortfolioSolver.evaluateAndOptimize`) para selecionar alvos com base em orçamentos e tolerâncias de risco.
4. **`POST /api/negotiate`:** Aciona a otimização de termos de negociação sob restrições (`optimizeWithConstraints`).
5. **`POST /api/document`:** Dispara a geração física do documento final em PDF (`PDFGenerator.writeTermSheetPDF`).
6. **`GET/POST /api/deals`:** Listagem e criação de novas transações na tabela `transaction`.
7. **`POST /api/deals/:id/phase`:** Avança a fase da transação e registra o checkpoint.
8. **`GET /api/chat` (Server-Sent Events):** Endpoint de streaming focado no chat. Retorna uma conexão SSE (`text/event-stream`) que envia as respostas do `BrokerOrchestratorAgent` em chunks conforme elas são processadas, armazenando o log de conversa na tabela de checkpoints.
