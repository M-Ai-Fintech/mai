---
id: TASK-13.2
title: Implementar constraint programming em Optimization (KYC/Valuation)
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:26'
labels:
  - engine
  - optimization
  - poc
milestone: m-7
dependencies: []
parent_task_id: TASK-10
priority: medium
ordinal: 33000
estimate: 3d
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Aprimorar os modelos matemáticos aplicando regras e limites rígidos de compliance de KYC e regras financeiras complexas.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

- [ ] Deals que violam restrições de KYC (ex.: PEP, sanções OFAC/BACEN) são rejeitados automaticamente pelo solver antes de chegarem ao ranking final.
- [ ] A razão de alavancagem máxima (ex.: Dívida/EBITDA > 6×) bloqueia a estrutura de deal correspondente com mensagem de erro estruturada.
- [ ] O índice mínimo de cobertura de EBITDA (ex.: EBITDA/Juros < 1,5×) é verificado e falha com diagnóstico claro.
- [ ] O output do algoritmo genético (`GAResult`) é filtrado pelo solver, retornando apenas estruturas que satisfazem **todas** as restrições ativas.
- [ ] Restrições podem ser ativadas/desativadas por configuração, sem alterar o código-fonte de `constraints.ts`.
- [ ] O solver processa um conjunto de 100 candidatos em menos de 200 ms (benchmark local, Deno).

## Definition of Done

- [ ] Arquivo `src/engines/optimization/constraints.ts` implementado com pelo menos 4 tipos de restrição distintos (KYC, alavancagem, cobertura, valuation floor).
- [ ] Testes unitários para **cada tipo de constraint** passando (`deno test`) com cobertura ≥ 85%.
- [ ] Teste de integração validando o pipeline completo: saída do GA → CP solver → lista de deals viáveis ranqueados.
- [ ] Nenhum deal com flag `kycBlocked: true` passa pelo solver em qualquer cenário de teste.
- [ ] Documentação inline (JSDoc) descrevendo parâmetros, unidades e referências regulatórias de cada restrição.
- [ ] PR aprovado e tarefa movida para `Done` no Backlog.md.

## Implementation Plan

1. **Modelar interface `Constraint`** – definir tipo genérico com campos `id`, `type`, `evaluate(deal): ConstraintResult` e `enabled`.
2. **Implementar restrições de KYC** – checar flags `kycBlocked`, `sanctionMatch` e `pepExposure` vindas do `SourcingAndKYBAgent`.
3. **Implementar restrições financeiras** – calcular `debtToEBITDA`, `ebitdaCoverage` e `valuationFloor` a partir do payload do GA.
4. **Integrar com o loop do GA** – em `src/engines/optimization/index.ts`, passar candidatos por `filterFeasible(candidates, constraints)` antes do ranking.
5. **Configuração via arquivo** – ler limiares (ex.: `maxLeverage`, `minCoverage`) de `src/engines/optimization/config.ts` ou variável de ambiente.
6. **Testes** – criar `src/engines/optimization/constraints_test.ts` cobrindo casos limítrofes e cenários de violação múltipla.

## Notes

- Preferir implementação nativa em Deno antes de avaliar bindings para `or-tools` via WASM (complexidade de build vs. ganho marginal no MVP).
- As restrições de KYC devem espelhar as regras já validadas pelo `SourcingAndKYBAgent` para evitar duplicação de lógica; usar evento Pub/Sub ou injeção direta do resultado de KYB.
- Limiares regulatórios (Basileia III, BCB 4.557) devem ser revisados com o time jurídico antes do release de produção.
