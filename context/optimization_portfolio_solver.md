# Otimizador de Portfólio (MILP & Hard Constraints)
## Lógica de Negócio e Formulação Matemática

O arquivo `src/engines/optimization/kyc/kyc_valuation_solver.ts` implementa o resolvedor de alocação de portfólio. Ele determina a combinação ideal de empresas-alvo para aquisição, maximizando a sinergia total sob restrições estritas de orçamento, tolerância a riscos de KYC, limites fiscais, alocação setorial e exclusões mútuas de mercado.

---

## 1. Lógica de Negócio e Casos de Uso

Nas transações de fusões e aquisições (M&A) de portfólio (buy-side orquestrado por holdings ou fundos), o tomador de decisão precisa selecionar uma cesta de alvos sob múltiplos critérios. As restrições não são apenas financeiras (orçamento), mas envolvem conformidade e risco legal:
1. **Risco KYC / Insolvência:** Empresas com alta volatilidade histórica ou histórico questionável devem ser pré-filtradas.
2. **Capacidade Fiscal (Tax Debts):** Passivos fiscais ocultos ou explícitos acumulados pelas alvos não podem ultrapassar um teto global estipulado pelo fundo para evitar contágio.
3. **Diversificação Setorial:** O fundo não pode concentrar todo o seu capital em um único setor da economia. Cada setor tem um teto de alocação de orçamento.
4. **Exclusões Mútuas:** Alvos concorrentes diretos ou com conflito de interesse explícito não podem ser adquiridas juntas (exclusão de portfólio).

---

## 2. Modelo Matemático (MILP)

O resolvedor modela o problema como uma Programação Linear Inteira Mista (MILP), especificamente uma variação multidimensional do **Problema da Mochila (Knapsack Problem)** com variáveis de decisão binárias.

### Variáveis de Decisão
Para cada empresa-alvo $i \in \{1, \dots, N\}$:
$$x_i \in \{0, 1\}$$
Onde:
* $x_i = 1$ significa que a empresa $i$ é selecionada para aquisição.
* $x_i = 0$ significa que a empresa $i$ é rejeitada.

### Função Objetivo
Maximizar a Sinergia Total Gerada:
$$\max \sum_{i=1}^{N} \text{synergyValue}_i \cdot x_i$$

### Restrições (Constraints)

1. **Restrição de Orçamento (Budget Limit):**
   $$\sum_{i=1}^{N} \text{acquisitionCost}_i \cdot x_i \le \text{budgetLimit}$$

2. **Restrição de Passivos Fiscais (Tax Debt Cap):**
   $$\sum_{i=1}^{N} \text{taxDebtsAmount}_i \cdot x_i \le \text{taxDebtCap}$$

3. **Restrição de Alocação Setorial (Sector Caps):**
   Para cada setor $S$ que possui um teto de alocação $\text{Cap}_S$:
   $$\sum_{i \in \text{Sector}_S} \text{acquisitionCost}_i \cdot x_i \le \text{Cap}_S$$

4. **Exclusões Mútuas (Mutual Exclusions):**
   Para cada par de exclusão $(A, B)$ (empresas que não podem ser adquiridas simultaneamente):
   $$x_A + x_B \le 1$$

---

## 3. Funcionamento Interno do Código

O solver utiliza a biblioteca `javascript-lp-solver` importada do npm.

### Passo 1: Pré-filtro (KYC Hard Block)
Antes de construir o modelo matemático, o resolvedor filtra as empresas com base na volatilidade histórica (risco de insolvência):
```typescript
if (target.historicalVolatility > criteria.riskToleranceLimit) {
  // A empresa é rejeitada sumariamente e não entra no modelo linear.
}
```

### Passo 2: Construção Dinâmica do Modelo
O resolvedor monta o JSON de especificação consumido pela biblioteca:
- **`constraints`**: Define os tetos de `budget`, `taxDebt`, tetos setoriais (ex: `sector_Technology: { max: 5000000 }`), e variáveis de exclusão (ex: `exclusion_0: { max: 1 }`).
- **`variables`**: Cada alvo gera um objeto mapeando o custo nos constraints em que participa.
- **`ints`**: Garante que os pesos de decisão sejam inteiros binários (0 ou 1).

### Passo 3: Resolução e Mapeamento
O método `solver.Solve(model)` roda o algoritmo Simplex/Branch-and-Bound e retorna o array de IDs selecionados. Se inviável, retorna status `infeasible`.
