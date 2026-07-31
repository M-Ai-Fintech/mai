# Estrutura de Dívida Corporativa, Custo de Capital e Covenants no Brasil

Este documento de referência analisa a dinâmica de endividamento corporativo, o
custo de capital e os covenants usualmente aplicados em contratos de
financiamento no mercado corporativo brasileiro.

## 1. Estruturas Comuns de Crédito e Financiamento

### A. Empréstimos Bancários Indexados ao CDI (Capital de Giro)

A maior parte do crédito bancário contratado por empresas brasileiras (como as
Cédulas de Crédito Bancário - CCB) está atrelada à taxa pós-fixada do **CDI
(Certificado de Depósito Interbancário)**.

- **Custo Médio (Middle-Market):** Varia de **100% do CDI + 2,0% a 100% do CDI +
  6,0% ao ano**, a depender da solvência do tomador e das garantias reais
  (frequentemente exigindo aval dos sócios controladores, recebíveis de
  duplicatas de clientes ou penhor mercantil).
- **Prazo Médio:** Geralmente de curto a médio prazo (12 a 36 meses), gerando
  alta exposição a riscos de rolagem.

### B. Financiamentos Institucionais (BNDES)

O BNDES atua como a principal fonte nacional para financiamentos industriais de
longo prazo.

- **TLP (Taxa de Longo Prazo):** Criada para aproximar os juros do BNDES do
  mercado. A TLP acompanha a variação do IPCA (Inflação) mais uma taxa de juros
  real baseada no rendimento das NTN-B soberanas de longo prazo.
- **Linhas Comuns:**
  - **BNDES Finame:** Financiamento voltado à compra de máquinas e equipamentos
    novos de fabricação local com cadastro de credenciamento ativo (CFIN).
  - **BNDES Automático:** Empréstimos para projetos globais de implantação,
    modernização e expansão fabril ou comercial.

### C. Debêntures no Mercado de Capitais

As debêntures são títulos de dívida corporativa emitidos no mercado privado ou
por meio de distribuições públicas regulamentadas pela CVM.

- **Debêntures Incentivadas (Lei 12.431/11):** Focadas no setor de
  infraestrutura (saneamento, telecomunicações, rodovias). Os investidores
  pessoa física adquirentes são isentos de imposto de renda (IR), o que atrai
  demanda e permite taxas nominais competitivas para os emissores (ex: IPCA +
  6,5% a.a.).
- **Debêntures Comuns:** Usualmente indexadas ao CDI pós-fixado ou ao IPCA mais
  taxa de juros real prefixada.

---

## 2. Impacto da Selic e Cálculo do Custo da Dívida (Kd)

A taxa **Selic**, definida pelo Banco Central do Brasil através do Copom, dita o
ritmo de juros reais e nominais do país e afeta diretamente as dívidas indexadas
ao CDI.

### Sensibilidade a Flutuações da Selic

Como o CDI acompanha de forma muito próxima o comportamento da taxa Selic, a
elevação da taxa básica encarece instantaneamente as obrigações da empresa,
pressionando a margem líquida e gerando riscos de liquidez no fluxo de caixa
livre.

### Custo Líquido de Capital de Terceiros ($K_d$)

Para companhias sob o regime de tributação do **Lucro Real**, os juros pagos são
dedutíveis da base tributária do IRPJ (25%) e da CSLL (9%), totalizando um
benefício fiscal (_tax shield_) de 34%. O custo efetivo da dívida deve ser
expresso como:

$$K_{d, \text{líquido}} = K_d \times (1 - T) = K_d \times (1 - 0,34) = K_d \times 0,66$$

---

## 3. Cláusulas Restritivas Financeiras (Covenants) Típicas

Credores brasileiros utilizam cláusulas de manutenção de indicadores de
solvência e cobertura de fluxo de caixa para mitigação de riscos estruturais.

### A. Dívida Líquida / EBITDA (Métrica de Alavancagem)

Mede o número de anos necessários para que o EBITDA normalizado pague o saldo
total da dívida líquida financeira.

- **Cálculo:**
  $$\text{Alavancagem} = \frac{\text{Dívida Bruta (Empréstimos, CCBs, Debêntures, Leasing) - Caixa e Equivalentes}}{\text{EBITDA Recorrente 12m (LTM)}}$$
- **Benchmark Nacional:**
  - **Investment Grade:** $< 2,0\text{x}$ a $2,5\text{x}$
  - **Middle-Market Máximo Aceitável:** $\le 3,0\text{x}$ a $3,5\text{x}$
  - _Nota:_ O estouro desse indicador pode disparar a liquidação antecipada
    (_early acceleration_) da dívida.

### B. EBITDA / Despesa Financeira (Índice de Cobertura de Juros)

Indica o grau de folga operacional para suportar o custo das despesas
financeiras decorrentes do passivo da empresa.

- **Cálculo:**
  $$\text{Cobertura} = \frac{\text{EBITDA}}{\text{Despesas Financeiras Líquidas}}$$
- **Benchmark Nacional:** Exigência de patamar mínimo superior a **2,0x**
  (desejável acima de 3,0x).
