# Inicialização e Runtime do Motor Preditivo ONNX (WASM)
## Especificação Técnica de Inicialização e Inferência Local

Este documento descreve como o M&A Low-Touch Middleware carrega e gerencia a execução de inferência de machine learning local via modelos ONNX usando WebAssembly (WASM) no Deno.

---

## 1. O Pipeline do Inicializador (`src/core/boot.ts`)

Para evitar atrasos de carregamento dinâmico (cold start) no momento em que um usuário requisita a due diligence, a inicialização do modelo de ML é executada de forma proativa durante a inicialização do sistema através do `AppBootstrapper.bootstrap()`.

### Fluxo de Boot
1. O bootstrapper tenta localizar o binário quantizado do modelo em: `models/ma_classifier_q8.onnx`.
2. Se o arquivo existir, ele invoca a função `loadOnnxModel` do `PredictionEngine` passivamente.
3. Se o arquivo estiver ausente ou corrompido, o bootstrapper captura a exceção, exibe um aviso claro (`console.warn`) informando que o sistema de predições irá falhar se acionado, mas permite que o resto do middleware (banco de dados, CLI, API) inicie em modo degradado sem travar o processo principal.

---

## 2. O Engine ONNX via WASM (`src/engines/prediction/onnx.ts`)

A inferência consome os pacotes `@huggingface/transformers` e `onnxruntime-web` importados diretamente via npm em Deno.

### Configuração do Multithreading
Como o Deno executa em ambientes de microsserviços e isolamento de contêineres, o backend WASM é configurado para utilizar apenas uma thread única, evitando sobrecarga de contexto do processador:
```typescript
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}
```

### Vetor de Entrada (Input Tensor)
A inferência espera um vetor linear de precisão simples com exatamente 6 atributos financeiros (`Float32Array`):
1. **`ebitda`** (EBITDA operacional)
2. **`revenue`** (Faturamento)
3. **`totalAssets`** (Ativo total)
4. **`totalLiabilities`** (Passivo total)
5. **`operatingCashFlow`** (Fluxo de caixa operacional)
6. **`historicalVolatility`** (Volatilidade histórica de mercado)

---

## 3. Lógica do Pseudo-Altman Z-Score

O classificador neural retorna na camada de saída a probabilidade de insolvência/estresse financeiro ($P$) da empresa-alvo na faixa $[0, 1]$. O middleware então executa uma conversão matemática inversa para classificar o nível de estresse da empresa seguindo as zonas do modelo clássico Altman Z-Score:

1. **Garantia de Estabilidade Numérica:** O percentual é delimitado de $1e-7$ a $1 - 1e-7$ para evitar indeterminações matemáticas por divisão por zero ou logaritmo de zero.
2. **Transformação Inversa Logística:**
   $$Z = 2 + \ln\left(\frac{1 - P}{P}\right)$$
3. **Classificação das Zonas:**
   * **$Z < 1.81$:** Zona Vermelha/Estresse Financeiro Alto (`Distress`).
   * **$1.81 \le Z < 2.99$:** Zona Cinza/Risco Moderado (`Grey`).
   * **$Z \ge 2.99$:** Zona Segura (`Safe`).

Essa aproximação permite converter o output contínuo probabilístico de redes neurais profundas (treinadas no PyTorch/Colab) em um score financeiro tradicional e amplamente auditável.
