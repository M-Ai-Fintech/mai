# Middleware de M&A Low-Touch

Monolito MVP desenvolvido em Deno para automação e desintermediação das fases de due diligence e estruturação de transações (fusões e aquisições) corporativas. 

---

## 📁 Estrutura do Monolito

O projeto é organizado seguindo uma arquitetura de código "flat" sob os 6 diretórios principais de responsabilidade:

```
src/
├── cli/                 # Interface de linha de comando
│   ├── interface.ts     # Menu principal interativo ANSI
│   ├── commands.ts      # Handlers de comandos de terminal
│   └── chat.ts          # REPL chatbot agêntico
├── core/                # Lógica de negócio e conexões base
│   ├── vdr.ts           # Integração cadastral KYB e virtual data rooms
│   └── ma_flow.ts       # Máquina de estados do ciclo do Deal
├── engines/
│   ├── prediction/      # IA preditiva e análise de risco
│   │   ├── ml.ts        # Coordenação preditiva
│   │   ├── transformers.ts # Embeddings semânticos locais
│   │   ├── onnx.ts      # Classificação de insolvência via ONNX
│   │   └── pytorch.ts   # Metadados e script de exportação PyTorch
│   ├── optimization/    # Pesquisa operacional e solvers
│   │   ├── kyc_valuations.ts # Otimização de portfólio pré-filtrada por risco
│   │   ├── milp.ts      # Otimização MILP de deal matching
│   │   ├── highs.ts     # HiGHS Solver compilado para WebAssembly
│   │   └── genetic_search.ts # Algoritmo Genético de negociação de Nash
│   └── document-generator/ # Emissão de contratos
│       ├── latex.ts     # Emissor de código-fonte LaTeX
│       └── pdf.ts       # Compilador físico PDF via pdf-lib
└── agent/               # Camada agêntica
    ├── actions.ts       # Ferramentas do Mastra Agent
    ├── rag_layer.ts     # RAG siloado e isolado por Deal
    ├── fine_tuning.ts   # Documentação PEFT/LoRA pós-investimento
    ├── continuous_learning.ts # Aprendizado em contexto (Observational Memory)
    └── mastra.ts        # Setup do Agente de IA M&A Broker
```

---

## 🚀 Como Executar

### Pré-requisitos
Certifique-se de que o Deno está instalado no sistema. Caso não esteja, instale executando:
```bash
curl -fsSL https://deno.land/install.sh | sh
```

### Inicializando o Menu Interativo
O middleware possui uma interface de terminal interativa com menus guiados:
```bash
deno task start
```

### Comandos CLI Diretos
Você também pode rodar tarefas específicas diretamente do terminal:

```bash
# 1. Consulta Cadastral KYB de CNPJ (SERPRO/Receita)
deno run --no-prompt --allow-read --allow-write --allow-env --allow-ffi src/cli/interface.ts kyb 12345678000199

# 2. Previsão de Risco e Insolvência Financeira (ONNX)
deno run --no-prompt --allow-read --allow-write --allow-env --allow-ffi src/cli/interface.ts predict

# 3. Otimização MILP de Portfólio (HiGHS WASM)
deno run --no-prompt --allow-read --allow-write --allow-env --allow-ffi src/cli/interface.ts portfolio <Orçamento> <RiscoMaximo>
# Exemplo:
deno run --no-prompt --allow-read --allow-write --allow-env --allow-ffi src/cli/interface.ts portfolio 90 0.6

# 4. Otimização de Cláusulas de Term Sheet (Algoritmo Genético)
deno run --no-prompt --allow-read --allow-write --allow-env --allow-ffi src/cli/interface.ts negotiate

# 5. Geração de PDF e LaTeX do Acordo Otimizado
deno run --no-prompt --allow-read --allow-write --allow-env --allow-ffi src/cli/interface.ts document

# 6. Iniciar Sessão Chat de IA com RAG Siloado
deno run --no-prompt --allow-read --allow-write --allow-env --allow-ffi src/cli/interface.ts chat <ID_do_Deal>
```

---

## 🧪 Testes Automatizados

A suíte de testes unitários integrada cobre todos os motores computacionais (predição, solvers, PDF, ciclo de vida e aprendizado contínuo):

```bash
deno task test
```

---

## 🧠 Integração Google AI

Para detalhes sobre como configurar chaves de API, fazer deploy na Vertex AI (produção), usar o Google Colab para treinar o classificador PyTorch/ONNX e integrar agentes usando o SDK Google Antigravity, leia:
👉 **[GEMINI.md](file:///home/luis/mai/GEMINI.md)**
