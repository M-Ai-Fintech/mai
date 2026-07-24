---
id: MAI-35
title: Finalizar inferência ONNX local via WASM no Prediction Engine
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:26'
updated_date: '2026-07-22 05:29'
labels:
  - engine
  - prediction
  - poc
  - revalidation
milestone: m-11
dependencies: []
parent_task_id: MAI-23
priority: medium
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementar a leitura e inferência real dos arquivos .onnx localmente no runtime Deno via WebAssembly com a biblioteca do Hugging Face.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Carregar arquivo .onnx quantizado (q8/q4) via fetch/FileSystem em Deno sem erros de runtime
- [ ] #2 Inferência retorna probabilidade de distress (Float32, intervalo [0,1]) em menos de 200ms para batch de 1 amostra
- [ ] #3 Classificação Altman Z-Score (Safe / Grey / Distress) derivada da probabilidade é retornada junto ao score numérico
- [ ] #4 Entrada aceita array de features financeiras tipado (Float32Array, shape [1, N]) com validação Zod antes da inferência
- [ ] #5 Fallback claro (erro tipado) é lançado quando o arquivo .onnx não é encontrado ou falha no carregamento WASM
- [ ] #6 Função exportada onnxInfer() passa em todos os testes unitários com modelo ONNX mock (stub de 4 features)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Adicionar dependência @huggingface/transformers (WASM backend) ao deno.json via import map
2. Implementar loadOnnxModel(path: string): carrega o arquivo .onnx com InferenceSession.create() via WASM
3. Definir tipos OnnxInput (Float32Array), OnnxOutput { distressProbability: number; zScoreLabel: ZScoreLabel } e ZScoreLabel enum
4. Implementar validateInput() com schema Zod para garantir shape e tipo corretos antes da inferência
5. Implementar onnxInfer(input: OnnxInput): OnnxOutput com lógica de classificação Z-Score (Safe ≥2.99, Grey 1.81–2.99, Distress <1.81)
6. Escrever testes unitários em src/engines/prediction/onnx.test.ts com modelo stub (Float32Array randômico)
7. Executar benchmark com performance.now() e logar P50/P99 via console.table no modo dev
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Depende do modelo exportado pela MAI-34 (distress_classifier_q8.onnx em assets/models/).
Backend recomendado: @huggingface/transformers com env.backends.onnx.wasm.numThreads = 1 para Deno single-thread.
Alternativa investigada: onnxruntime-web via Deno FFI – descartar se o import map WASM do HF for suficiente.
Thresholds Z-Score de Altman (1968): Safe ≥ 2.99 | Grey Zone 1.81–2.99 | Distress < 1.81.

[POC Orchestrator Note] Grupo B (Síncrono após A): Usar o modelo de MAI-34. Focar em src/engines/prediction/onnx.ts.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Technical Audit
created: 2026-07-10 06:04
---
[CRITICAL REVIEW] 1. Production initialization failure: `loadOnnxModel` is never initialized in production setup (`AppBootstrapper` or `api/server.ts`). Runtime inference therefore silently fails to load the model and returns the mocked fallback value (0.14 / Safe), preventing real model execution. 2. Missing test error handling: The real-model inference test in `prediction.spec.ts` silently swallows errors in a `try/catch` (“Model loading skipped”), so it passes even if the ONNX file is missing or corrupt.
---

author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: Direct ONNX tests pass, but API startup does not initialize the model session through AppBootstrapper. Reopen until inference works from the real API/agent entry point, not only an isolated test.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Testes unitários (Deno.test) com modelo ONNX mock cobrem: carga, inferência válida, input inválido e timeout
- [ ] #2 Cobertura de tipos TypeScript 100%: OnnxInput, OnnxOutput, ZScoreLabel exportados de onnx.ts
- [ ] #3 Benchmark documentado no arquivo: P50 < 100ms, P99 < 200ms (batch=1) em hardware de desenvolvimento
- [ ] #4 Integração com src/engines/prediction/index.ts validada: onnxInfer() chamável pelo PredictionEngine
- [ ] #5 Nenhuma dependência nativa de Node.js: runtime exclusivamente Deno + WASM (sem node: imports)
<!-- DOD:END -->
