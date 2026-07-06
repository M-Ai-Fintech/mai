# Saneamento de Dívida Técnica e Refatoração Estrutural (Milestone MVP_1)

Este documento resume as melhorias estruturais, unificações de código e correções de dívidas técnicas implementadas no monolito do **M&A Low-Touch Middleware (M&Ai)**.

---

## 1. Unificação de Serviços Duplicados e Padrão Singleton

### DatabaseMemoryService
* **Problema:** Existiam duas versões independentes do serviço de banco de dados: `src/core/db/DatabaseMemoryService.ts` e `src/core/db/memory_service.ts`. Isso gerava múltiplas conexões concorrentes e pools órfãos.
* **Solução:** Unificação completa de toda a lógica em `DatabaseMemoryService.ts` usando o padrão **Singleton** via método estático `DatabaseMemoryService.getInstance()`. O arquivo anterior `memory_service.ts` foi mantido apenas para re-exportar os símbolos e evitar regressões de importação em outros locais do sistema.
* **Resiliência e Fallback pgvector:** Caso o banco Postgres esteja indisponível (ex: local development offline), o serviço entra silenciosamente em modo de fallback, realizando cálculos matemáticos de similaridade de cosseno em memória (Typescript) nos dados locais pré-carregados, sem lançar erros fatais nem interromper o fluxo transacional.

### LocalPubSubBus
* **Problema:** Duas implementações duplicadas de barramentos Pub/Sub locais competiam na mensageria interna (`src/core/pubsub/LocalPubSubBus.ts` e uma versão interna em `src/agent/actions.ts`).
* **Solução:** Centralização no Singleton de `LocalPubSubBus.ts`. A versão interna em `actions.ts` foi removida, e todos os testes e ferramentas Pub/Sub passaram a interagir com a mesma instância única através de `LocalPubSubBus.getInstance()`.

---

## 2. Motores de Otimização Assíncronos e Estratégicos

### TermSheetGeneticOptimizer (`src/engines/optimization/genetic.ts`)
* **Problema:** O algoritmo genético de otimização de Term Sheets executava um loop síncrono e bloqueante de 50+ gerações, travando o event loop de thread única do Deno.
* **Solução:** Refatorado para ser totalmente assíncrono. O loop de gerações agora yielda controle à fila de tarefas do Deno a cada 10 iterações (`await new Promise((r) => setTimeout(r, 0))`).
* **Preferências Estratégicas:** Adição de suporte às preferências de negociação:
  * `liquidity`: Maximiza o Cash Upfront do vendedor.
  * `balanced`: Equilibra de forma harmônica as utilidades de Nash para comprador e vendedor.
  * `retention`: Prioriza earn-outs estendidos e prazos de não-competência.

### KYCValuationsCoordinator (`src/engines/optimization/kyc/coordinator.ts`)
* **Problema:** A orquestração e filtragem de risco de portfólio (MILP) rodava de forma síncrona.
* **Solução:** Transformado em um pipeline inteiramente assíncrono (`async/await`) que coordena a inferência de risco Altman Z-Score / FCD e aplica as restrições lineares sem bloquear o event loop.

---

## 3. Grounding de RAG e Banco de Dados Real no CLI

* **checkRegistry (CNPJ):** Agora realiza uma busca no banco de dados local na tabela `business` para recuperar o ID correspondente e, a partir dele, extrair a cultura corporativa de `company_culture_memory` de forma dinâmica. Se offline ou vazio, faz fallback inteligente.
* **analyzeRisk (Financial Risk):** Inicializa dinamicamente o silo vetorial da transação via `ClientSiloedRAG` e pesquisa cláusulas legais críticas ("Change of Control") no VDR correspondente de forma dinâmica, em vez de exibir logs e strings estáticas de mocks.
* **optimizePortfolio (MILP):** Carrega os alvos de investimento dinamicamente da tabela `business` do Postgres via queries SQL reais. Se o banco de dados estiver inacessível, executa uma simulação baseada em dados reais mimetizados no pipeline.

---

## 4. Estabilidade de Execução em Dry-Run e Tratamento de Erros no CLI

* **Dry-Run/Monkeypatching:** Para que a inicialização do Mastra SDK não cause quebras quando o usuário não tiver uma chave Gemini (`GEMINI_API_KEY`) configurada, implementamos um patch dinâmico em `Agent.prototype.generate` e `Agent.prototype.stream` no ponto de entrada `src/agent/index.ts`. Se o sistema estiver em modo de fallback, o SDK intercepta as chamadas, emitindo avisos no console e fornecendo saídas sintéticas ricas.
* **Interactive Loop Error Handling:** O loop interativo da CLI em `src/cli/interface.ts` e o gerenciador de exceções `src/cli/errors.ts` foram ajustados para que erros em comandos individuais (como timeouts ou falhas de conexão) não causem a finalização abrupta do processo CLI (`Deno.exit`). Em vez disso, o CLI captura e loga o erro, reporta o aviso ao usuário e o retorna ao prompt de comandos interativos de forma segura.
