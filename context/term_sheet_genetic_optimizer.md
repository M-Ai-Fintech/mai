# Otimizador de Term Sheet (Algoritmo Genético)
## Lógica de Negócio e Algoritmo Genético de Utilidade

O arquivo `src/engines/optimization/matching/term_sheet_optimizer.ts` implementa a otimização de termos de propostas (MOU/LOI/SPA) utilizando um **Algoritmo Genético (GA)**. Ele reconcilia as preferências divergentes entre Comprador (Buyer) e Vendedor (Seller) sob um modelo de utilidade multi-critério.

---

## 1. Variáveis da Proposta (Term Sheet Chromosome)

Cada proposta (representada como um indivíduo ou "cromossomo" no GA) é modelada com 4 variáveis:
1. **`cashPercentage`** ($0.1 \le \text{cash} \le 1.0$): Percentual pago à vista em dinheiro. O restante é pago em ações (Equity).
2. **`buyerEquityShare`** ($0.1 \le \text{equity} \le 1.0$): Percentual de participação societária retido ou concedido ao comprador na nova entidade.
3. **`earnOutTargetYears`** ($1.0 \le \text{years} \le 5.0$): Prazo de vigência das metas de desempenho vinculadas a pagamentos futuros (earn-out).
4. **`nonCompeteMonths`** ($12 \le \text{months} \le 60$): Duração da cláusula de não-concorrência imposta aos fundadores da vendedora.

---

## 2. Funções de Utilidade e Preferências

As funções de utilidade ($u_S$ para o Vendedor, $u_B$ para o Comprador) variam de $0.0$ a $1.0$ e são ponderadas dinamicamente com base nas preferências selecionadas:

### A. Preferência "Balanced" (Padrão)
* **Vendedor ($u_S$):** Valoriza liquidez imediata (Cash), menor diluição (menos equity entregue) e prazos curtos de restrição.
  $$u_S = 0.4 \cdot \text{cashPercentage} + 0.3 \cdot (1 - \text{buyerEquityShare}) + 0.15 \cdot \frac{5 - \text{years}}{4} + 0.15 \cdot \frac{60 - \text{months}}{48}$$
* **Comprador ($u_B$):** Valoriza conservação de caixa (menos Cash à vista), maior participação societária, prazos longos de earn-out para mitigar riscos, e cláusulas longas de não-concorrência.
  $$u_B = 0.35 \cdot (1 - \text{cashPercentage}) + 0.35 \cdot \text{buyerEquityShare} + 0.15 \cdot \frac{\text{years} - 1}{4} + 0.15 \cdot \frac{\text{months} - 12}{48}$$

### B. Preferência "Liquidity"
Aumenta o peso do caixa imediato na utilidade do vendedor, e a conservação de caixa na utilidade do comprador:
* **Vendedor ($u_S$):** Peso de $0.7$ no `cashPercentage`.
* **Comprador ($u_B$):** Peso de $0.5$ no `(1 - cashPercentage)`.

### C. Preferência "Retention"
Valoriza a retenção a longo prazo, aumentando o peso de não-concorrência e metas de earn-out:
* **Vendedor ($u_S$):** Peso de $0.25$ em `earnOutTargetYears` e `nonCompeteMonths`.
* **Comprador ($u_B$):** Peso de $0.3$ em `earnOutTargetYears` e `nonCompeteMonths`.

---

## 3. Função de Aptidão (Fitness Function)

O GA busca uma solução que atenda aos requisitos mínimos de utilidade reserva de ambas as partes (pontos de veto ou *reservation utilities*):
* Se $u_S < \text{minSellerReservationUtility}$ ou $u_B < \text{minBuyerReservationUtility}$, o fitness é **$0$** (a proposta é inviável e rejeitada).
* Caso contrário, a aptidão é dada pelo produto dos excedentes de utilidade de Nash:
  $$\text{fitness} = (u_S - \text{minSellerReservationUtility}) \cdot (u_B - \text{minBuyerReservationUtility})$$

Essa formulação maximiza o bem-estar conjunto e encontra o equilíbrio ótimo (Fronteira de Pareto).

---

## 4. Estrutura do Algoritmo Genético

1. **População Inicial:** Gera `populationSize` propostas com valores aleatórios dentro dos intervalos permitidos.
2. **Seleção Natural:** Classifica a população por fitness. Os $20\%$ melhores (elite) são preservados diretamente para a próxima geração.
3. **Cruzamento (Crossover):** Combina pares do top $50\%$ da população tirando a média aritmética de seus atributos para gerar novos filhos.
4. **Mutação:** Para cada filho gerado, aplica-se uma perturbação aleatória nos atributos com base em `mutationRate`.
5. **Critério de Parada:** Executa por um número fixo de gerações (`generations`).
