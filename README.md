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
* `Google Cloud Pub/Sub tool`
* `MCP Toolbox for Databases tool`
* `Hugging Face MCP tool`
* `Gemini API Google Search tool`
* `Database Memory Service`

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

* Para a especificação profunda da arquitetura, 7 agentes e infraestrutura GCP, consulte: 👉 **[context/architecture.md](file:///home/luis/mai/context/architecture.md)**
* Para detalhes de integração com a IA da Google (AI Studio, Vertex AI, Colab e ADK SDK), consulte: 👉 **[AGENTS.md](file:///home/luis/mai/AGENTS.md)**
* Para regras de valoração e precificação, consulte: 👉 **[context/valuation.md](file:///home/luis/mai/context/valuation.md)**
