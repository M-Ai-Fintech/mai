# Arquitetura e Visão de Evolução: M&A Low-Touch Middleware

Este documento detalha a arquitetura do Produto Mínimo Viável (MVP) em Deno, a modelagem de dados no PostgreSQL, o ecossistema agêntico de 7 agentes e as diretrizes de design para a futura transição corporativa para a Google Cloud Platform (GCP).

---

## 1. Visão Geral do MVP Monolítico (Deno)

O middleware foi arquitetado inicialmente como um **Monolito em Deno**, unindo a velocidade e produtividade do TypeScript com um runtime seguro por padrão e suporte integrado a WebAssembly (WASM).

O objetivo central do produto é automatizar e desintermediar o ciclo de vida de transações de Fusões e Aquisições (M&A), focando especificamente no *middle-market* e *lower-middle-market*.

```
src/
├── agent/
│   ├── agents/             # Definições dos 7 Agentes Especializados
│   ├── workflows/          # Pipelines determinísticos e esquemas Zod
│   ├── context/            # Leitores de VDR, Engines e DB
│   ├── actions.ts          # As 5 Integrações e Ferramentas do ADK
│   └── index.ts            # Ponto de entrada unificado (Mastra / ADK)
├── cli/                    # Interface de linha de comando com comandos diretos e preview
├── core/
│   ├── db/                 # Conectores Postgres, schema SQL e Database Memory Service
│   ├── pubsub.ts           # Barramento local de eventos assíncronos (simulador Pub/Sub)
│   └── vdr.ts              # Integração de Core API para Virtual Data Rooms
└── engines/                # Motores de predição (ONNX), otimização (WASM) e documentos
```

---

## 2. Ecossistema Agêntico (7 Agentes)

O ADK em TypeScript estrutura a inteligência em 7 agentes com responsabilidades e comportamentos rigorosamente delimitados:

1. **`BrokerOrchestratorAgent` (Orquestrador & Motor de Aprendizado):**
   * Ponto de acesso principal e gerenciador de workflows.
   * Mantém tracking das correções do usuário, separando no *Database Memory Service* as preferências do usuário (*User Preferences*) do conhecimento de domínio (*Domain Knowledge*).
2. **`SourcingAndKYBAgent` (KYB Holístico & Inteligência Cultural):**
   * Avalia a conformidade tributária e societária na Receita/SERPRO (`business`).
   * Investiga o fator humano: cultura da empresa, movimentações passadas no mercado e perfil dos fundadores, *board* e ponto de contato direto (`transaction_business_role`).
3. **`GeneralDueDiligenceAgent` (Conciliador de Due Diligence):**
   * Canal direto com o usuário para a auditoria. Orquestra e sintetiza o trabalho de dois subagentes de backend:
   * 🧮 **`FinancialRiskAgent`:** Analisa DREs, balanços e consome o motor ONNX preditivo para calcular o risco de insolvência e volatilidade.
   * ⚖️ **`LegalDueDiligenceAgent`:** Consome o RAG do VDR para varrer contratos em busca de passivos ocultos, litígios e cláusulas de *Change of Control*.
4. **`DealMatchingAgent` (Valuation Flexível & Alocação Inteligente):**
   * Utiliza ferramentas de otimização para construir faixas de negociação (*valuation ranges*).
   * Evita a inflexibilidade de propostas rígidas, garantindo que as partes não sofram desgaste prematuro (*deal fatigue*).
5. **`NegotiationAgent` (Conselheiro Interativo de Term Sheet):**
   * Atua de forma puramente consultiva e iterativa. **Nunca** impõe um termo absoluto.
   * Diante de impasses, apresenta sempre 3 ou mais cenários de oportunidade (combinando *Cash*, *Equity*, *Earn-outs* e *Escrow*) para o usuário manobrar.
6. **`LegalClosingAgent` (Emissor Legal & CLI Previewer):**
   * Responsável pela tradução formal das cláusulas para linguagem jurídica.
   * Antes da emissão de binários (PDF/LaTeX via `pdf-lib`), gera uma visualização limpa e legível do contrato em Markdown no terminal da CLI, aguardando aprovação prévia.

---

## 3. As 5 Integrações Centrais do ADK

No arquivo `src/agent/actions.ts`, o ADK expõe as seguintes ferramentas globais, agora com implementações reais e ativas (unmocked):
* **`Google Cloud Pub/Sub tool`**: Conectada ao `LocalPubSubBus` no runtime do Deno para simular o tráfego assíncrono e acionar as Engines.
* **`MCP Toolbox for Databases tool`**: Interface real (via `DatabaseMemoryService`) para inspecionar, consultar e gerenciar o esquema PostgreSQL.
* **`Hugging Face MCP tool`**: Realiza inferência nativa local consumindo a arquitetura ONNX/Transformers do sistema (`ONNXEngine` e `TransformersEngine`).
* **`Gemini API Google Search tool`**: Busca em tempo real habilitada com *grounding* do Google Search via Gemini 3.1 Pro.
* **`Database Memory Service`**: Conector ativo com o Postgres para ler e persistir preferências e conhecimentos adquiridos de forma isolada.

---

## 4. Modelagem de Dados no PostgreSQL

O sistema adota o PostgreSQL como repositório central relacional e semi-estruturado, fundamentado no seguinte modelo:
* **Tabelas Operacionais de M&A:** `transaction`, `business`, `advisor`, `financial_structure`, `transaction_business_role`, `transaction_advisor`.
* **Histórico Operacional (`phase_history`):** Armazena estritamente o andamento, status e logs operacionais de cada fase da transação (usando UUID da transação e campo `data: jsonb`).
* **`Database Memory Service`:** Tabelas e estruturas autônomas (separadas de `phase_history`) voltadas para armazenar a memória contínua, preferências do usuário e inteligência cultural da empresa, otimizadas para futuras buscas vetoriais (`pg_vector`).

---

## 5. Diretriz de Desacoplamento para Futura Escala na GCP

A futura migração do MVP monolítico para um ecossistema corporativo na Google Cloud Platform (GCP) orienta as decisões de design atuais. O monolito é construído sob forte desacoplamento para permitir uma transição sem atritos para a seguinte infraestrutura cloud:

```mermaid
graph TD
    subgraph Entrada e Roteamento
        LB[Cloud Load Balancing] --> AG[Cloud API Gateway]
        LB --> AGE[Camada Agêntica]
    end

    subgraph Core & Barramento de Eventos
        AG --> CORE[Core API / Integrações VDR]
        CORE <-->|Eventos / Mensageria| PUB[Google Cloud Pub/Sub]
        AGE <-->|Requisição VDR e Engines| PUB
    end

    subgraph Inteligência & Persistência (Vertex AI / BigQuery)
        BQ[BigQuery / Histórico de Mercado] --> VTX[Vertex AI / Gemini Endpoint]
        VTX --> AGE
    end

    subgraph Motores Computacionais (Cloud Run)
        PUB -->|Gatilho| CR_ENG[Engines: Predição, Otimização e Documentos]
    end

    subgraph Armazenamento & Banco de Dados (Replica Pool)
        CR_ENG <--> CS[Cloud Storage: VDR, ONNX, PDFs]
        CR_ENG <--> PG_M[(Postgres Master)]
        CORE <--> PG_M
        PG_M --> PG_S1[(Postgres Slave 1)]
        PG_M --> PG_S2[(Postgres Slave 2)]
    end
```

### Regras de Transição:
1. **Acesso VDR via Core & Pub/Sub:** No futuro, o `Core API` proverá acesso ao VDR exclusivamente via eventos trafegados no Cloud Pub/Sub. No monolito atual, simulamos esse tráfego via barramento em `src/core/pubsub.ts`.
2. **Motores no Cloud Run:** As Engines rodarão como serviços sem estado no Cloud Run, consumindo/gerando relatórios e binários no Cloud Storage.
3. **Replica Pool & Vetores:** O PostgreSQL escalará para uma arquitetura Master/Replica, com ativação nativa da extensão `pg_vector` para inferência rápida sobre memórias e embeddings ONNX.
