# Integração Google AI: M&A Low-Touch Middleware

Este documento detalha o ecossistema de Inteligência Artificial do Google
aplicado ao middleware de M&A, fornecendo a ponte de desenvolvimento (MVP) e de
nível corporativo (produção), além do treinamento de modelos.

---

## 1. Google AI Studio (Fase MVP / Desenvolvimento)

Para a fase rápida de MVP (45 dias), o **Google AI Studio** é a plataforma
recomendada. Ele fornece chaves de API rápidas de configurar, cotas gratuitas
generosas e acesso imediato aos modelos Gemini de última geração.

### Configurando o Agente com Gemini

O middleware está configurado para ler o modelo Gemini se a chave de ambiente
estiver definida.

1. Acesse o [Google AI Studio](https://aistudio.google.com/app/api-keys) e gere
   uma API Key.
2. Defina a variável de ambiente:
   ```bash
   export GEMINI_API_KEY="sua_chave_aqui"
   ```
3. O orquestrador Mastra em `src/agent/mastra.ts` detectará a variável e
   direcionará as chamadas de inferência de linguagem para o modelo
   `google/gemini-1.5-pro` (ou o modelo padrão selecionado), fornecendo
   raciocínio avançado para analisar cláusulas contratuais extraídas via RAG.

---

## 2. Vertex AI (Fase Produção / Enterprise)

Quando a startup receber o aporte do **Gama Fund** e transicionar do MVP para o
ambiente produtivo regulado, a infraestrutura deve migrar para o **Vertex AI**
na Google Cloud Platform (GCP).

### Vantagens de Conformidade e Segurança (M&A)

- **Silos e Privacidade Fiduciária:** No Vertex AI, os dados confidenciais dos
  Data Rooms Virtuais (VDR) e as consultas RAG nunca trafegam em redes abertas
  nem são utilizados para treinar os modelos fundacionais do Google.
- **VPC Service Controls:** Permite envelopar o pipeline do Deno e as chamadas
  de inferência do Gemini dentro de um perímetro de rede privado e seguro.
- **CMEK (Customer-Managed Encryption Keys):** Os embeddings gerados no RAG
  local e gravados nos bancos de dados do cliente são criptografados com chaves
  gerenciadas diretamente pela equipe de M&A.

### Exemplo de Integração Mastra + Vertex AI (TypeScript)

No ambiente de produção, a autenticação usará credenciais padrão do Google Cloud
(Application Default Credentials - ADC) e o SDK do Vertex AI:

```typescript
import { GoogleVertexAI } from "@google-cloud/vertexai";
import { Agent } from "@mastra/core/agent";

// Inicialização segura no ambiente Vertex AI da GCP
const vertexAI = new GoogleVertexAI({
  project: "gama-fund-ma-prod",
  location: "us-central1",
});

// A conexão é roteada de forma privada
export const productionBrokerAgent = new Agent({
  id: "ma-broker-prod",
  name: "M&A Production Agent",
  instructions: "...",
  // Conectado diretamente ao endpoint privado do Gemini no Vertex AI
  model: {
    provider: "VERTEX_AI",
    name: "gemini-1.5-pro-preview-0409",
  },
});
```

---

## 3. Google Colab (Treinamento do Motor Preditivo)

O classificador neural ONNX do motor preditivo
(`src/engines/prediction/onnx.ts`) é treinado fora do runtime Deno. Para essa
tarefa computacional pesada, utilizamos o **Google Colab** com aceleração por
GPU (T4 ou L4) para treinamento rápido em PyTorch.

O pipeline de treino no Colab compreende:

1. **Coleta de Massa de Dados:** Carga de balanços históricos e scores Altman
   Z-Score normatizados.
2. **Definição e Treino no PyTorch:** Criação do modelo classificador
   feedforward (MLP) utilizando a GPU para otimizar os gradientes.
3. **Exportação ONNX:** Compilação do grafo treinado para o formato portátil
   `.onnx` usando `torch.onnx.export`.
4. **Quantização q8/q4:** Redução do peso de precisão para 8 bits, permitindo
   que a inferência rode em frações de segundo diretamente no Deno via WASM/FFI.

O notebook completo simulado com as instruções de execução no Colab está
localizado em: 👉
[scripts/colab_training_notebook.ipynb](file:///home/luis/mai/scripts/colab_training_notebook.ipynb)

---

## 4. Google Antigravity SDK (Agentes Avançados)

Para cenários avançados de multi-agentes que requeiram raciocínio e execução
robusta fora do ambiente TypeScript (como pipelines pesados de engenharia de
dados em Python), o **Google Antigravity (AGY) SDK** fornece o ferramental ideal
para construir sistemas agênticos autônomos.

### Arquitetura de Integração (Python + Deno)

O monolito Deno orquestra os motores analíticos determinísticos e a CLI. Para
análises profundas de Due Diligence jurídica (por exemplo, varrer 10.000 páginas
de contratos buscando termos de "Change of Control"), o Deno pode despachar uma
tarefa em background para um agente agêntico robusto rodando em Python com o SDK
Antigravity.

O script de demonstração contendo o setup do agente do Antigravity está
disponível em: 👉
[scripts/antigravity_agent.py](file:///home/luis/mai/scripts/antigravity_agent.py)
