# Integração Google AI & ADK: M&A Low-Touch Middleware

Este documento estabelece as diretrizes de integração com o ecossistema de Inteligência Artificial do Google e o Agent Development Kit (ADK) em TypeScript aplicados ao middleware de M&A, englobando a fase de MVP (Monolito em Deno) e a futura arquitetura corporativa em nuvem (GCP).

---

## 1. Google AI Studio & ADK TypeScript (Fase MVP / Monolito)

Para a construção ágil do MVP em Deno, utilizamos o **Google AI Studio** para prover as chaves de acesso aos modelos Gemini de última geração, integrados nativamente via ADK em TypeScript no ponto de entrada central `src/agent/index.ts`.

### Configurando a Chave de API
1. Gere uma API Key no [Google AI Studio](https://aistudio.google.com/app/api-keys).
2. Defina a variável de ambiente no terminal:
   ```bash
   export GEMINI_API_KEY="sua_chave_aqui"
   ```
3. A camada agêntica inicializará os modelos conectando-os ao ecossistema de 7 agentes.

---

## 2. O Ecossistema de 7 Agentes no ADK

O ADK orquestra a comunicação entre os agentes através de fluxos determinísticos (Workflows) e comandos diretos via CLI, garantindo acesso compartilhado universal ao VDR, Engines e PostgreSQL.

```
src/agent/
├── agents/
│   ├── orchestrator.ts       # BrokerOrchestratorAgent
│   ├── kyb_sourcing.ts       # SourcingAndKYBAgent
│   ├── due_diligence.ts      # GeneralDD, FinancialRisk e LegalDD
│   ├── deal_matching.ts      # DealMatchingAgent
│   ├── negotiation.ts        # NegotiationAgent
│   └── legal_closing.ts      # LegalClosingAgent
├── workflows/                # Validação Zod e Workflows
├── context/                  # Adaptadores VDR, Engines e DB
├── actions.ts                # As 5 Ferramentas do ADK
└── index.ts                  # Ponto de Entrada Unificado
```

### Comportamento e Regras dos Agentes
* **`BrokerOrchestratorAgent`**: Ponto de acesso e orquestração. Intercepta correções do usuário e alimenta o *Database Memory Service*, segregando *Domain Knowledge* de *User Preferences*.
* **`SourcingAndKYBAgent`**: Acessível via CLI. Combina a checagem analítica na Receita/SERPRO com a investigação da cultura corporativa, movimentações passadas e perfil dos negociadores.
* **`GeneralDueDiligenceAgent`**: Acesso direto do usuário à auditoria. Requisita VDR via barramento Pub/Sub e delega tarefas pesadas para seus dois subagentes de backend:
  * `FinancialRiskAgent`: Dedicado aos demonstrativos financeiros e ao motor ONNX.
  * `LegalDueDiligenceAgent`: Dedicado à varredura de contratos (RAG) e cláusulas de *Change of Control*.
* **`DealMatchingAgent`**: Otimiza a alocação de capital focando em faixas flexíveis (*valuation ranges*) para eliminar o desgaste e a fadiga de negociação (*deal fatigue*).
* **`NegotiationAgent`**: Mesa de conselho iterativa. Nunca impõe acordos finais; oferece sempre 3 ou mais alternativas estratégicas (combinando *Cash*, *Equity*, *Earn-outs* e *Escrow*).
* **`LegalClosingAgent`**: Atua após a aprovação prévia dos termos finais. Exibe um preview estruturado em Markdown na CLI antes de gerar os binários PDF/LaTeX via `pdf-lib`.

---

## 3. As 5 Integrações Globais do ADK

O arquivo `src/agent/actions.ts` expõe as 5 integrações fundamentais do ADK:
1. **`Google Cloud Pub/Sub tool`**: Adaptador assíncrono para solicitação de dados do VDR à Core API e acionamento de Engines.
2. **`MCP Toolbox for Databases tool`**: Interface MCP nativa para gerenciar e consultar o esquema PostgreSQL.
3. **`Hugging Face MCP tool`**: Conexão MCP para interagir com modelos e carregar pesos ONNX/Transformers locais.
4. **`Gemini API Google Search tool`**: Busca em tempo real e *grounding* para apurar reputação, cultura e notícias do setor.
5. **`Database Memory Service`**: Repositório autônomo no Postgres dedicado a armazenar memórias, cultura e preferências do usuário separadamente de `phase_history`.

---

## 4. Google Colab (Treinamento do Motor Preditivo)

O classificador neural ONNX do motor preditivo (`src/engines/prediction/onnx.ts`) é treinado em GPU (T4 ou L4) fora do runtime Deno através do **Google Colab**.

O pipeline compreende:
1. **Coleta de Dados:** Carga de balanços históricos e scores Altman Z-Score normatizados.
2. **Treino no PyTorch:** Criação do modelo classificador feedforward (MLP).
3. **Exportação ONNX:** Compilação do grafo treinado para `.onnx` (`torch.onnx.export`).
4. **Quantização q8/q4:** Redução de pesos para 8 bits, viabilizando inferência ultrarrápida no Deno via WASM/FFI.

O notebook simulado está localizado em: 👉 **[scripts/colab_training_notebook.ipynb](file:///home/luis/mai/scripts/colab_training_notebook.ipynb)**

---

## 5. Vertex AI & Infra GCP (Fase Futura de Produção / Enterprise)

A arquitetura corporativa na Google Cloud Platform (GCP) representa a visão de evolução futura pós-MVP. O monolito atual em Deno adota práticas rígidas de desacoplamento de eventos e persistência para que a futura migração para a nuvem da Google seja instantânea.

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

### Vantagens de Conformidade na Escala Enterprise (GCP)
* **Silos e Privacidade Fiduciária:** Na Vertex AI, os dados confidenciais dos VDRs e as consultas RAG nunca trafegam em redes abertas nem treinam modelos fundacionais do Google.
* **VPC Service Controls:** Envelopa os pipelines do Deno, Cloud Run e inferências do Gemini dentro de um perímetro de rede privado e seguro.
* **CMEK (Customer-Managed Encryption Keys):** Os embeddings gerados e gravados no Cloud Storage / Postgres são criptografados com chaves gerenciadas diretamente pela equipe de M&A.

### Exemplo de Conexão Segura Futura (Vertex AI)
No ambiente produtivo futuro, o ADK em TypeScript utilizará credenciais padrão da GCP (ADC) e a biblioteca `@google-cloud/vertexai`:

```typescript
import { GoogleVertexAI } from "@google-cloud/vertexai";
import { Agent } from "@mastra/core/agent";

// Inicialização segura no ambiente Vertex AI da GCP
const vertexAI = new GoogleVertexAI({
  project: "gama-fund-ma-prod",
  location: "us-central1",
});

export const productionBrokerAgent = new Agent({
  id: "ma-broker-prod",
  name: "M&A Production Agent",
  instructions: "...",
  model: {
    provider: "VERTEX_AI",
    name: "gemini-1.5-pro-preview-0409",
  },
});
```
