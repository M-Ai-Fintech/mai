# Interface Gráfica Next.js (GUI) & Integração com a API Deno
## Especificação Técnica da Camada de Frontend e Rotas de Integração

O sistema evoluiu de uma interface puramente CLI para incluir um painel de controle web completo desenvolvido em **Next.js** (localizado no diretório `gui/`). Esta interface se conecta diretamente com a API do middleware rodando no Deno (porta `8000`).

---

## 1. Estrutura do App Next.js (`gui/`)

O frontend é construído utilizando React 19, TypeScript e o App Router do Next.js.

### Estrutura de Diretórios de Rotas (`gui/app/`)
* **`/settings`**: Tela de configurações gerais, incluindo preferências de negociação globais e credenciais dos VDRs.
* **`/deals`**: Listagem de transações ativas de M&A.
* **`/deals/[id]`**: Painel principal de uma transação específica.
  * **`/deals/[id]/chat`**: Interface de chat interativa em tempo real com o `BrokerOrchestratorAgent`.
  * **`/deals/[id]/engines`**: Painel de visualização e controle dos motores computacionais (Previsão de Risco de Insolvência, Otimização de Portfólio, Reconciliação de Valuation e Geração de Term Sheets).

### Componentes de Cliente Interativos
As páginas `/chat` e `/engines` utilizam a diretiva `"use client"` do React para permitir interatividade dinâmica:
- **Chat de Negócios:** Interface estilo chat que renderiza logs e mensagens do agente com suporte a Markdown.
- **Painel de Motores:** Painéis gráficos e formulários para simular parâmetros de negociação e disparar inferências e otimizações em tempo real.

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
