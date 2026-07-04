---
id: MAI-34
title: Exportação de modelos ONNX do Colab
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:26'
updated_date: '2026-07-09 04:42'
labels:
  - engine
  - prediction
  - poc
milestone: m-5
dependencies: []
parent_task_id: MAI-23
priority: medium
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Estruturar e validar o notebook Jupyter (scripts/colab_training_notebook.ipynb) utilizado para treinar o classificador feedforward (MLP) no Google Colab usando aceleração por GPU (T4 ou L4), realizar a exportação do modelo treinado do PyTorch para o formato ONNX (opset_version=17) com eixos dinâmicos de batch e aplicar a quantização dinâmica para 8 bits (q8) com onnxruntime.quantization. Garantir que o modelo gerado coincida exatamente com o formato de entrada ONNXModelInput e saída ONNXPredictionResult consumidos pelo motor preditivo (src/engines/prediction/onnx.ts), e documentar o processo para reprodução.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 O notebook scripts/colab_training_notebook.ipynb deve estar completamente estruturado, documentado e funcional para execução no Google Colab com GPU (T4/L4).
- [ ] #2 O notebook deve exportar o modelo treinado em formato ONNX bruto (ma_classifier.onnx) com eixos dinâmicos para batch size (dynamic_axes) e opset_version=17.
- [ ] #3 O notebook deve incluir uma etapa de quantização dinâmica de pesos para 8 bits (ma_classifier_q8.onnx usando QuantType.QUInt8) para otimização de latência e tamanho.
- [ ] #4 O modelo exportado deve aceitar exatamente as 6 variáveis de entrada mapeadas em ONNXModelInput e prever os 4 scores mapeados em ONNXPredictionResult conforme o motor preditivo (src/engines/prediction/onnx.ts).
- [ ] #5 Fornecer instruções claras detalhando as etapas para rodar o treino no Colab, baixar o arquivo .onnx e salvá-lo na pasta local models/.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. **Ajustar e Organizar o Notebook**: Verificar a estrutura de scripts/colab_training_notebook.ipynb para garantir que toda a massa sintética de dados financeiros esteja sendo gerada corretamente com base no Altman Z-Score normatizado e que o MLP esteja definido corretamente em PyTorch.
2. **Configurar Exportação ONNX**: Validar a exportação no notebook usando torch.onnx.export definindo opset_version=17, nomes apropriados de inputs/outputs (financials e predictions) e habilitando dynamic_axes para batching flexível.
3. **Configurar Quantização Dinâmica (q8)**: Integrar no notebook a rotina quantize_dynamic do onnxruntime.quantization para obter o modelo otimizado ma_classifier_q8.onnx.
4. **Alinhar com o Motor Deno**: Garantir que as chaves em ONNXModelInput e ONNXPredictionResult no Deno correspondam à ordem do tensor de entrada/saída treinado no PyTorch.
5. **Criar Diretório de Modelos e Guia**: Garantir que a pasta models/ exista na raiz do projeto e incluir instruções passo a passo (no notebook ou README) sobre como baixar e posicionar o arquivo ma_classifier_q8.onnx.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Notebook scripts/colab_training_notebook.ipynb verificado e sem erros de execução de ponta a ponta.
- [ ] #2 A compatibilidade de eixos de entrada/saída (tensores [batch, 6] e [batch, 4]) está alinhada entre o modelo PyTorch/ONNX e a tipagem do Deno.
- [ ] #3 Pasta models/ criada para receber os artefatos compilados do modelo.
- [ ] #4 README de instruções ou documentação interna criada/atualizada para reprodutibilidade do treino e exportação.
<!-- DOD:END -->
