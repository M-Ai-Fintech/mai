# M&Ai - MVP

MVP em estrutura de monolito para prova de conceito do produto. O projeto
consiste em princípio de 3 pilares principais, similares ao MVC, sendo engines,
cli e core, respectivamente, com uma camada extra agentica.

A escolha inicial do Deno é por uma questão da junção da facilidade da criação
de um MVP que o node possui, sem abrir mão da segurança e performance do TS e do
conceito de runtime seguro por padrão. Que também permite que parte do código
seja aproveitada no futuro, quando as engines forem convertidas em seus
repositórios próprios em Rust, compilados em WASM, visando a execução de alta
performance e baixo consumo de recursos, enquanto se mantém o core (business
logic) em Deno, com TS por padrão.

O CLI é uma escolha que visa uma interface mais simples possível, mas ainda
funcional, unicamente com o intuíto de provar o conceito do produto em si, não
visando ser uma ferramenta de uso produtivo, mas sim, uma ferramenta de
demonstração.

A camada agentica da aplicação é uma experimentação com LLMs e agentes de IA
para auxiliar na tomada de decisão e na automação de tarefas, mantendo tracking
de continuous learning, e seu próprio gerenciamento de memória e de curto e
longo prazo.

---

## Estrutura do Monolito

O projeto é organizado seguindo uma arquitetura de código "flat" sob os 6
diretórios principais de responsabilidade:

```
src/
├── agent/                  # Camada agêntica
├── cli/                    # Interface de linha de comando
├── core/                   # Lógica de negócio e conexões base
├── engines/
│   ├── prediction/         # IA preditiva e análise de risco
│   ├── optimization/       # Pesquisa operacional e solvers
└───└── document-generator/ # Emissão de contratos
```

---

## Motores

afasfaf

### Predição

### Otimização

### Gerador de Documentos

---

## Cloud

aaaa

### Google AI Studio

### Google Vertex AI

### Google Cloud Platform (GCP)

---

## Desenvolvimento

aaaaaaa

### Antigravity

### Google Colab

### Gemini

---

## Como Executar

### Pré-requisitos

Certifique-se de que o Deno está instalado no sistema. Caso não esteja, instale
executando:

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

## Testes Automatizados

A suíte de testes unitários integrada cobre todos os motores computacionais
(predição, solvers, PDF, ciclo de vida e aprendizado contínuo):

```bash
deno task test
```

---

## Integração Google AI

Para detalhes sobre como configurar chaves de API, fazer deploy na Vertex AI
(produção), usar o Google Colab para treinar o classificador PyTorch/ONNX e
integrar agentes usando o SDK Google Antigravity, leia: 👉
**[GEMINI.md](file:///home/luis/mai/GEMINI.md)**
