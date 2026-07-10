# Otimização de Negociação com Restrições (Constraint-Driven Matcher)
## Lógica de Negócio e Pipeline Híbrido GA + Programação por Restrições

Este documento detalha o motor de negociação de Term Sheets unificado (`optimizeWithConstraints`) no arquivo `src/engines/optimization/index.ts`. Este motor combina o poder exploratório do **Algoritmo Genético** com a precisão regulatória e fiduciária da **Programação por Restrições (Constraint Programming)**.

---

## 1. O Problema da Otimização sob Restrições Múltiplas

Embora o Algoritmo Genético (GA) consiga encontrar combinações de Term Sheets com alta utilidade mútua, ele pode sugerir propostas inviáveis sob a ótica regulatória ou financeira corporativa (ex: alavancagem excessiva do comprador ou fragilidade de fluxo de caixa).

Para solucionar isso, o middleware adota uma abordagem híbrida:
1. **Fase de Exploração (GA):** O algoritmo genético evolui uma população de cromossomos (propostas de Term Sheets) maximizando o excedente de utilidade.
2. **Fase de Filtragem (Restrições):** Uma série de validadores estritos (Constraints) intercepta as propostas geradas, bloqueando sumariamente qualquer indivíduo que infrinja regras societárias, financeiras ou cadastrais.
3. **Fase de Diversificação e Ranking:** O sistema seleciona e retorna exatamente 3 propostas viáveis que sejam significativamente distintas umas das outras para dar poder de escolha real ao negociador.

---

## 2. As Restrições Estruturadas (`src/engines/optimization/constraints.ts`)

O sistema define uma interface `Constraint` e implementa quatro classes principais:

### A. Restrição de KYC (`KycConstraint`)
Avalia a conformidade cadastral e reputacional dos envolvidos.
* **Critérios de Feabilidade:** É considerada inviável se qualquer uma das bandeiras abaixo for verdadeira:
  * `kycBlocked` = true (impedimento por governança corporativa).
  * `sanctionMatch` = true (empresa ou fundadores em listas de sanções internacionais ou nacionais).
  * `pepExposure` = true (exposição direta a Pessoas Politicamente Expostas sem devida auditoria).

### B. Restrição de Alavancagem (`LeverageConstraint`)
Protege o comprador de endividamento excessivo decorrente da transação.
* **Cálculo:** Alavancagem Pós-Transação = Dívida Total / EBITDA.
* **Regra:** A proposta é bloqueada se a proporção calculada ultrapassar o limite máximo estabelecido pelo comitê (`maxLeverage`).

### C. Restrição de Cobertura de Juros (`CoverageConstraint`)
Garante a capacidade operacional de pagamento das parcelas de earn-out ou financiamento.
* **Cálculo:** Índice de Cobertura = EBITDA / Despesa de Juros.
* **Regra:** Bloqueia a proposta se o índice de cobertura for menor que o limite mínimo tolerado (`minCoverage`).

---

## 3. Algoritmo de Diversificação e Deduplicação

Para evitar o retorno de três propostas praticamente idênticas (ex: variando apenas $0.1\%$ no percentual de caixa), o resolvedor executa um algoritmo de filtragem por distância euclidiana/manhattan:

```typescript
const diff = 
  Math.abs(candidate.cash - distinct.cashPercentage) +
  Math.abs(candidate.equity - distinct.equityPercentage) +
  Math.abs(candidate.earnOut - distinct.earnOutPercentage) +
  Math.abs(candidate.escrow - distinct.escrowPercentage);
```
Se a soma das diferenças absolutas das variáveis de proposta de um candidato em relação às já selecionadas for **menor que $0.1$**, a proposta é considerada redundante e ignorada. O loop prossegue até encontrar 3 alternativas significativamente distintas ou esgotar a população factível.
