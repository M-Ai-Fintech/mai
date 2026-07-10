# M&Ai - MVP Monolítico

Middleware de arquitetura "low-touch" projetado em **Deno** para automatizar, otimizar e desintermediar o ciclo de vida de transações de Fusões e Aquisições (M&A), com foco nos mercados *middle-market* e *lower-middle-market*.

O projeto combina a produtividade e a segurança do TypeScript no ecossistema Deno com motores de alta performance (WASM / ONNX) e uma avançada camada agêntica suportada pelo ADK e framework Mastra.

---

## 📐 Estrutura do Monolito

O repositório é organizado de forma modular, preparando o terreno para futura separação em microsserviços e implantação corporativa na Google Cloud Platform (GCP).

```
src/
├── agent/                  # Camada agêntica (ADK TypeScript / Mastra)
│   ├── agents/             # Definição dos 7 Agentes de M&A
│   ├── workflows/          # Pipelines determinísticos e validação Zod
│   ├── context/            # Adaptadores para VDR, Engines e DB
│   ├── actions.ts          # As 5 Ferramentas Globais do ADK
│   └── index.ts            # Ponto de entrada central do ecossistema
├── cli/                    # Interface interativa de linha de comando e preview
├── core/                   # Lógica de negócio, conexões e barramento
│   ├── db/                 # Persistência Postgres, schema SQL e Memory Service
│   ├── pubsub.ts           # Barramento local assíncrono (simulador Pub/Sub)
│   └── vdr.ts              # Integração de Core API para Virtual Data Rooms
└── engines/                # Motores de computação pesada
    ├── prediction/         # IA preditiva, classificadores ONNX e Transformers
    ├── optimization/       # Otimização matemática (MILP e Algoritmos Genéticos)
    └── document-generator/ # Geração de contratos em PDF (pdf-lib) e LaTeX
```

---

## 🤖 O Ecossistema Agêntico (ADK TypeScript)

A inteligência da aplicação reside no `src/agent/`, estruturada em **7 Agentes Especializados** que compartilham acesso universal ao VDR, Engines e Banco de Dados:

1. **`BrokerOrchestratorAgent`**: Orquestrador principal. Supervisiona o fluxo e separa ativamente conhecimentos de domínio (*Domain Knowledge*) de preferências do usuário (*User Preferences*) no Database Memory Service.
2. **`SourcingAndKYBAgent`**: Conduz a qualificação de contrapartes. Vai além dos dados cadastrais e dívidas fiscais (SERPRO/Receita), analisando o fator humano: cultura corporativa, movimentações passadas e perfil dos negociadores.
3. **`GeneralDueDiligenceAgent`**: Canal direto do usuário para assuntos de auditoria. Orquestra e sintetiza as análises de dois subagentes especializados:
   * **`FinancialRiskAgent`**: Investiga balanços e DREs usando o motor ONNX para prever insolvência e volatilidade.
   * **`LegalDueDiligenceAgent`**: Varre RAG de VDR buscando riscos jurídicos e cláusulas de *Change of Control*.
4. **`DealMatchingAgent`**: Responsável pela modelagem de propostas financeiras. Prioriza faixas flexíveis de negociação (*valuation ranges*) para poupar as partes de desgaste desnecessário (*deal fatigue*).
5. **`NegotiationAgent`**: Conselheiro estratégico iterativo. Nunca dita termos finais; apresenta sempre 3 ou mais cenários de oportunidade (permuta entre *Cash*, *Equity*, *Earn-outs* e *Escrow*).
6. **`LegalClosingAgent`**: Emissor formal de documentos. Exibe uma visualização prévia estruturada do contrato em Markdown no terminal da CLI, aguardando aprovação prévia do usuário (HITL) antes de compilar os binários.

### As 5 Integrações do ADK (`src/agent/actions.ts`)
As ferramentas globais foram totalmente conectadas a implementações reais para evitar dependência de mocks:
* **`Google Cloud Pub/Sub tool`**: Conectada ao `LocalPubSubBus` no runtime do Deno para simular o tráfego do Cloud Pub/Sub de forma local e determinística.
* **`MCP Toolbox for Databases tool`**: Conectada com o repositório PostgreSQL real (`DatabaseMemoryService`).
* **`Hugging Face MCP tool`**: Realiza inferência nativa local consumindo a arquitetura ONNX/Transformers do sistema.
* **`Gemini API Google Search tool`**: Habilitada com _grounding_ real do Google Search via Gemini 3.1 Pro.
* **`Database Memory Service`**: Integrado ativamente para ler e escrever memórias persistentes durante a execução dos workflows.

Todos os agentes foram padronizados para rodar exclusivamente no modelo **Gemini 3.1 Pro** via `@ai-sdk/google`.

---

## 🗄️ Persistência de Dados (PostgreSQL)

A aplicação faz uso do PostgreSQL (`src/core/db/`) para garantir o isolamento fiduciário e rastreabilidade:
* **Tabelas Operacionais:** `transaction`, `business`, `financial_structure`, `advisor`, etc.
* **Histórico Operacional (`phase_history`):** Exclusivo para o andamento e status do M&A deal flow em formato JSONB.
* **`Database Memory Service`:** Separação limpa em tabelas próprias para guardar preferências do usuário e inteligência cultural, preparadas para futuras consultas via `pg_vector`.

---

## ☁️ Nota Arquitetural de Evolução (GCP)

Este MVP monolítico foi desenhado sob princípios de forte desacoplamento (ex: comunicação Core <-> Agentes via mensageria assíncrona em `pubsub.ts`) com o objetivo de garantir uma futura transição sem atritos para a Google Cloud Platform (GCP).

Na fase corporativa (pós-MVP), a infraestrutura evoluirá para:
* **Entrada:** Cloud Load Balancing e Cloud API Gateway.
* **Comunicação:** Google Cloud Pub/Sub orquestrando requisições de VDR à Core API e acionamento de Engines.
* **Execução & AI:** Engines hospedadas no Cloud Run; Camada Agêntica executada via endpoints seguros da Vertex AI e BigQuery.
* **Persistência:** Cloud Storage para documentos/ONNX e Postgres em Replica Pool (Master/Slaves) com suporte vetorial.

---

## 🔄 Fluxo End-to-End (E2E)

A aplicação processa o ciclo de vida da transação em etapas assíncronas através dos agentes:

```mermaid
graph TD
    A[Sourcing & KYB] -->|Pub/Sub Event: VDR Access| B(Due Diligence)
    B -->|Financial Risk Score| C{Orchestrator}
    B -->|Legal Compliance Check| C
    C -->|Term Sheet Optimization| D[Negotiation Agent]
    D -->|Agreed Terms| E[Legal Closing Agent]
    E -->|Artifact| F(Final Markdown Preview / PDF)
    
    subgraph Motores
      ONNX[Inference Engine]
      MILP[MILP Optimizer]
    end
    B -.-> ONNX
    D -.-> MILP
```

**Artefatos Gerados:**
- **Sourcing Report**: Qualificação da empresa e reputação.
- **Risk Score**: Score quantitativo preditivo de falência gerado pelo modelo ONNX local.
- **Legal Summary**: Análise jurídica via RAG baseada em documentos locais.
- **Closing Preview**: Markdown estruturado exibido ao usuário com os termos finais antes da geração do PDF.

## 📖 Sumário do Conhecimento Adicional

Para permitir uma compreensão imediata das especificidades técnicas do middleware antes de abrir o código-fonte, todo o conhecimento apontado como adicional está sintetizado abaixo:

### 1. Arquitetura e Evolução GCP (`context/architecture.md`)
Descreve a estrutura do MVP monolítico Deno/TypeScript com mensageria assíncrona (PubSub local) e o plano de evolução corporativa na GCP. Na produção, o Core API e os Motores rodarão no **Cloud Run**, orquestrados via **Cloud Pub/Sub**, com armazenamento fiduciário no **Cloud Storage**, inteligência na **Vertex AI/BigQuery** e banco em **Cloud SQL (PostgreSQL)** com pool de réplicas e suporte a busca vetorial.

### 2. Integração Google AI & ADK (`AGENTS.md`)
Especifica a orquestração dos 7 agentes (BrokerOrchestrator, KybSourcing, GeneralDD, FinancialRisk, LegalDD, DealMatching, Negotiation, LegalClosing) construída sob o framework Mastra. Define as 5 ferramentas centrais integradas ao ecossistema (Google Search com grounding, MCP PostgreSQL, Hugging Face Transformers local, barramento Pub/Sub local e serviço de memória de preferências).

### 3. Regras de Valuation (`context/valuation.md`)
Estabelece a lógica financeira de cálculo do valuation corporativo sob 6 métodos puramente determinísticos: *Book Value* (patrimonial líquido tangível), *Discounted Cash Flow (DCF)* (fluxos de caixa descontados pelo custo de capital), *Market Capitalization* (valor acionário público), *Enterprise Value (EV)* (estrutura total de capital: dívida + equity - caixa), *EBITDA Multiples* (múltiplo operacional EV/EBITDA) e *Growing Perpetuity* (perpetuidade crescente de dividendos/JCP). 

### 4. Otimizador de Portfólio MILP (`context/optimization_portfolio_solver.md`)
Detalha o resolvedor de cesta de aquisições utilizando programação linear inteira mista (MILP) via `javascript-lp-solver`. O modelo matemático maximiza a sinergia total sob restrições binárias de seleção ($x_i \in \{0, 1\}$), limites estritos de orçamento global, tetos fiscais globais (tax debts), alocações setoriais específicas e matriz de exclusão mútua concorrencial.

### 5. Otimizador de Term Sheet Genético (`context/term_sheet_genetic_optimizer.md`)
Explica a evolução de propostas através de algoritmo genético para encontrar o Equilíbrio de Nash. O "cromossomo" modela 4 genes (percentual de caixa, participação societária, anos de earn-out e meses de não-concorrência). O fitness maximiza o produto dos excedentes de utilidade em relação às utilidades reserva sob 3 perfis de preferência (*Balanced*, *Liquidity*, *Retention*).

### 6. Integração VDR & Supergood Proxy (`context/vdr_integration_supergood.md`)
Apresenta o ecossistema de Virtual Data Rooms. O `BaseVDRProvider` padroniza operações de listagem, metadados, download e upload de arquivos sob conectores do Papermark, iDeals e Intralinks. O tráfego HTTP é roteado de forma transparente por meio do proxy fiduciário **Supergood** para auditoria, cache e segurança de endpoints.

### 7. RAG Silado e Aprendizado Contínuo (`context/continuous_learning_and_rag.md`)
Especifica o isolamento de informações de clientes (`ClientSiloedRAG`) filtradas estritamente por ID de transação para evitar vazamento de dados confidenciais de due diligence. Descreve o `ContinuousLearningEngine` que capta o feedback do usuário, gera embeddings e os armazena no PostgreSQL para busca semântica via indexação HNSW no `pgvector`.

### 8. Interface Gráfica Next.js (`context/nextjs_gui_and_api.md`)
Detalha a estrutura da interface web React rodando em Next.js. O painel inclui a visualização de engines e chat com agentes agendadores. A integração com o backend Deno (porta `8000`) ocorre via `ApiClient` com retentativas exponenciais e sanitização contra vazamento de caminhos do Linux local, além de streaming de respostas SSE em tempo real.

### 9. Runtime ONNX & WASM (`context/onnx_bootstrapper.md`)
Especifica a inicialização prévia da sessão WASM do `ma_classifier_q8.onnx` pelo `AppBootstrapper` em tempo de boot. Em tempo de inferência, o vetor de dados é processado por uma MLP profunda, gerando probabilidades de estresse financeiro. Esse score é convertido matematicamente de forma inversa na escala clássica de zonas de risco Altman Z-Score.

### 10. Negociação com Restrições CP (`context/constraint_negotiation_api.md`)
Detalha o motor de negociação fiduciária híbrido. Ele submete os cromossomos gerados pelo Algoritmo Genético à programação por restrições (CP), aplicando filtros impeditivos de governança (`KycConstraint`), alavancagem de dívida (`LeverageConstraint`) e fluxo mínimo de pagamento (`CoverageConstraint`). Aplica deduplicação de Manhattan para manter 3 opções distintas de Term Sheet.

### 11. Padrão Singleton do Banco (`context/database_memory_singleton.md`)
Descreve a restrição estrutural imposta ao `DatabaseMemoryService` para garantir pool único de conexão no PostgreSQL. A instanciação é privada e exposta apenas via `getInstance()`, compartilhada de forma transparente entre CLI, servidores HTTP e agentes em execução concorrente para evitar leaks e timeouts.

### 12. Treinamento da Rede ONNX (`docs/prediction_engine.md`)
Explica o pipeline de treino em PyTorch da rede classificadora feedforward executado em GPU no Google Colab, com posterior compilação de grafo ONNX e quantização para 8-bits para ganho de performance e leveza no Deno WASM.

---

## 🚀 Como Executar

### Pré-requisitos
Certifique-se de que o Deno está instalado no sistema.
```bash
curl -fsSL https://deno.land/install.sh | sh
```

### Testes Automatizados
A suíte de testes unitários integrada cobre todos os motores computacionais e as regras de negócio:
```bash
deno task test
# ou diretamente:
deno test --allow-read --allow-write --allow-env --allow-ffi
```

### Inicializando a Interface CLI
A CLI permite navegação interativa e execução de comandos diretos para interagir com cada agente especializado e pré-visualizar contratos:
```bash
deno task start
```

---

## 📚 Documentação Adicional

* **Arquitetura Geral:** Consulte 👉 **[context/architecture.md](file:///home/luis/mai/context/architecture.md)**
* **Integração Google AI & ADK:** Consulte 👉 **[AGENTS.md](file:///home/luis/mai/AGENTS.md)**
* **Regras de Valuation e Precificação:** Consulte 👉 **[context/valuation.md](file:///home/luis/mai/context/valuation.md)**
* **Otimizador de Portfólio (MILP):** Consulte 👉 **[context/optimization_portfolio_solver.md](file:///home/luis/mai/context/optimization_portfolio_solver.md)**
* **Otimizador de Term Sheet (Algoritmo Genético):** Consulte 👉 **[context/term_sheet_genetic_optimizer.md](file:///home/luis/mai/context/term_sheet_genetic_optimizer.md)**
* **Integração VDR & Supergood Proxy:** Consulte 👉 **[context/vdr_integration_supergood.md](file:///home/luis/mai/context/vdr_integration_supergood.md)**
* **RAG Silado e Aprendizado Contínuo:** Consulte 👉 **[context/continuous_learning_and_rag.md](file:///home/luis/mai/context/continuous_learning_and_rag.md)**
* **Interface Gráfica Next.js & API:** Consulte 👉 **[context/nextjs_gui_and_api.md](file:///home/luis/mai/context/nextjs_gui_and_api.md)**
* **Inicialização e Runtime ONNX (WASM):** Consulte 👉 **[context/onnx_bootstrapper.md](file:///home/luis/mai/context/onnx_bootstrapper.md)**
* **Otimização de Negociação com Restrições:** Consulte 👉 **[context/constraint_negotiation_api.md](file:///home/luis/mai/context/constraint_negotiation_api.md)**
* **Padrão Singleton do Banco de Dados:** Consulte 👉 **[context/database_memory_singleton.md](file:///home/luis/mai/context/database_memory_singleton.md)**
* **Motor Preditivo ONNX & Treinamento:** Consulte 👉 **[docs/prediction_engine.md](file:///home/luis/mai/docs/prediction_engine.md)**


### Cloud SQL e pg_vector
Para ativar o suporte a busca vetorial no Cloud SQL, execute no console do banco de dados:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX IF NOT EXISTS idx_user_preferences_hnsw ON user_preferences USING hnsw (embedding vector_cosine_ops);
```
O código da aplicação já está otimizado para identificar a presença da extensão de forma resiliente.
## Arquitetura de Orquestração
Veja [docs/architecture.md](docs/architecture.md) para detalhes do fluxo Pub/Sub e persistência de checkpoints.
