# Prediction Engine (IA Preditiva)

O **Prediction Engine** do M&Ai é um motor de inteligência artificial de alta performance responsável por analisar o risco financeiro de empresas-alvo em processos de Fusões e Aquisições (M&A). 

Ele substitui fórmulas simuladas por inferência estatística real em tempo de execução local através de modelos baseados em redes neurais de aprendizado profundo (Deep Learning).

---

## 📐 Visão Geral da Arquitetura do Modelo

O modelo é um classificador feedforward (Multi-Layer Perceptron - MLP) treinado no **PyTorch** contendo a seguinte estrutura:

- **Dimensão de Entrada (6):**
  1. `ebitda` (EBITDA anualizado)
  2. `revenue` (Faturamento)
  3. `totalAssets` (Ativos Totais)
  4. `totalLiabilities` (Passivos Totais)
  5. `operatingCashFlow` (Fluxo de Caixa Operacional)
  6. `historicalVolatility` (Volatilidade Histórica)
  
- **Arquitetura Interna:**
  - Camada de Entrada: Linear (6 $\to$ 16) + ReLU
  - Camada Oculta: Linear (16 $\to$ 16) + ReLU
  - Camada de Saída: Linear (16 $\to$ 4) + Sigmoid

- **Dimensão de Saída (4):**
  1. `insolvencyRisk` (Risco de Insolvência)
  2. `churnProbability` (Probabilidade de Churn de clientes)
  3. `dcfVolatility` (Volatilidade para Fluxo de Caixa Descontado)
  4. `industry4Score` (Pontuação de adequação geral)

---

## 📓 Treinamento no Google Colab e Exportação

O pipeline de treino e empacotamento é executado fora do runtime Deno usando Python e aceleração GPU (T4 ou L4 no Google Colab).

O notebook de referência está localizado em: 👉 **[scripts/colab_training_notebook.ipynb](file:///home/luis/mai/scripts/colab_training_notebook.ipynb)**

### Passos de Execução do Notebook:

1. **Instalação das dependências:**
   ```bash
   pip install torch torchvision onnx onnxruntime
   ```

2. **Definição e treinamento da Rede Neural:**
   Uma arquitetura `MACallClassifier` é instanciada e treinada utilizando um dataset de balanços históricos de empresas normatizados (Altman Z-Score adaptado) sob a função de perda `MSELoss` e otimizador `Adam`.

3. **Exportação ONNX:**
   O grafo é compilado para o formato `.onnx` utilizando o exportador nativo do PyTorch:
   ```python
   torch.onnx.export(
       model,
       dummy_input,
       "ma_classifier.onnx",
       export_params=True,
       opset_version=17,
       do_constant_folding=True,
       input_names=['financials'],
       output_names=['predictions'],
       dynamic_axes={'financials': {0: 'batch_size'}, 'predictions': {0: 'batch_size'}}
   )
   ```

4. **Quantização Dinâmica Int8 (q8):**
   Para otimizar o tamanho do binário e acelerar a inferência local no Deno via CPU/WASM, o modelo é quantizado para 8 bits:
   ```python
   from onnxruntime.quantization import quantize_dynamic, QuantType
   
   quantize_dynamic(
       "ma_classifier.onnx",
       "ma_classifier_q8.onnx",
       weight_type=QuantType.QUInt8
   )
   ```

5. **Instalação no Monolito:**
   O arquivo resultante `ma_classifier_q8.onnx` deve ser copiado para o diretório `models/ma_classifier_q8.onnx` na raiz do projeto.

---

## ⚙️ Execução Local no Deno via WASM

No Deno, o modelo é carregado de forma assíncrona por meio do **ONNX Runtime** empacotado na biblioteca `@huggingface/transformers` e `onnxruntime-web`.

### Implementação de Inferência (`src/engines/prediction/onnx.ts`)

O método `ONNXEngine.runModelInference` lê a entrada, mapeia para um tensor bidimensional de `float32` de dimensões `[1, 6]` e executa a inferência de forma assíncrona:

```typescript
import { InferenceSession, Tensor } from 'npm:onnxruntime-web';

const tensor = new Tensor('float32', [
  input.ebitda,
  input.revenue,
  input.totalAssets,
  input.totalLiabilities,
  input.operatingCashFlow,
  input.historicalVolatility
], [1, 6]);

const results = await session.run({ financials: tensor });
const outputTensor = results.predictions;
const data = outputTensor.data; // Mapeia de volta para ONNXPredictionResult
```

### Resiliência e Fallback Automático

Caso o arquivo do modelo ONNX não esteja acessível em `models/ma_classifier_q8.onnx` ou o carregamento da engine WASM falhe devido a limitações de ambiente, o `ONNXEngine` intercepta o erro graciosamente e aciona um **algoritmo de fallback matemático** (`simulateInference`) baseado em um cálculo simulado do Altman Z-Score clássico. Isso garante que a aplicação continue operando de ponta a ponta sem interrupções graves no ecossistema agêntico.
