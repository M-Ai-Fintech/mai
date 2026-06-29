# Guia de Normalização de EBITDA e Quality of Earnings (QoE) no Middle-Market Brasileiro

Este guia estabelece a metodologia técnica e as práticas recomendadas de auditoria para a realização de análises de Quality of Earnings (QoE) e normalização de EBITDA de empresas de médio porte (*middle-market*) no Brasil. 

## 1. O EBITDA Recorrente vs. Estatutário
No ecossistema de *middle-market* brasileiro, a Demonstração do Resultado do Exercício (DRE) oficial ou gerencial apresentada pelos fundadores raramente traduz o real potencial de geração de caixa operacional da empresa. Devido a planejamentos tributários informais, contabilidade focada na minimização de impostos e à fraca governança contábil, é essencial reconstruir o resultado para atingir o **EBITDA Normalizado** ou **Recorrente**.

---

## 2. Doutrinas de Ajustes e Normalizações Típicas

### A. Ajuste de Pró-labore e Remuneração dos Sócios
*   **Prática Comum:** Sócios de empresas fechadas no Brasil costumam declarar um pró-labore reduzido (frequentemente fixado em um salário mínimo ou no piso de isenção fiscal) para evitar o INSS patronal (20%) e o Imposto de Renda Retido na Fonte (IRRF) na alíquota progressiva de até 27,5%. O restante da remuneração real é distribuído como dividendos, que atualmente são isentos de tributação no Brasil.
*   **Metodologia de Ajuste:**
    1.  Mapear todas as atribuições dos sócios no dia a dia operacional da companhia.
    2.  Estimar o salário de mercado para as funções equivalentes executadas (usando dados de consultorias de recrutamento executivo, ex: Robert Half, Page Executive) para estruturar uma diretoria profissionalizada.
    3.  Ajustar o EBITDA deduzindo o custo de mercado (salário bruto mais encargos patronais de cerca de 27% a 30% e benefícios) menos o pró-labore histórico pago. Este é um ajuste **negativo** (reduz o EBITDA).
*   **Fórmula:**
    $$\text{Ajuste} = \text{Pró-labore Histórico} - (\text{Salário de Mercado FMV} + \text{Encargos CLT})$$

### B. Despesas Pessoais e Familiares (*Despesas Familiares*)
*   **Prática Comum:** Empresas controladas por fundadores com estrutura familiar frequentemente arcam com despesas de uso estritamente pessoal dos proprietários e de seus familiares através do CNPJ corporativo.
*   **Principais Itens:**
    *   Leasing e manutenção de veículos de passeio de luxo familiares;
    *   Despesas com imóveis de lazer (casa de praia, fazendas) e frotas de aeronaves ou barcos privados;
    *   Viagens pessoais e despesas de cartão de crédito não relacionadas a negócios;
    *   Contratação de funcionários domésticos e pagamentos de seguros de vida ou planos de saúde individuais.
*   **Metodologia de Ajuste:** Realização de auditoria de auditoria forense nos razão auxiliares de contas correntes de sócios, reembolsos e despesas administrativas. Todos os itens de despesa pessoal identificados devem ser revertidos via *add-back* **positivo** (elevando o EBITDA).

### C. Regularização de PJ para CLT (*Pejotização*)
*   **Prática Comum:** A contratação de prestadores de serviços por meio de Pessoas Jurídicas (PJs) em posições operacionais chave para evitar os encargos da Consolidação das Leis do Trabalho (CLT) é muito comum no Brasil. Se as relações apresentarem os requisitos de vínculo empregatício (pessoalidade, onerosidade, habitualidade e subordinação), há riscos de passivos trabalhistas iminentes.
*   **Metodologia de Ajuste:**
    1.  Mapear os gastos históricos com PJs permanentes e projetar a regularização da força de trabalho para CLT.
    2.  Aplicar um markup trabalhista padrão (geralmente entre **50% e 70%** sobre o custo atual) para provisionar provisões de 13º salário, férias + 1/3 constitucional, recolhimentos previdenciários e FGTS.
    3.  Efetuar dedução **negativa** do EBITDA no resultado recorrente e constituir provisão de risco para o histórico (retroativo de até 5 anos).

### D. Exclusão de Créditos Tributários Não Recorrentes
*   **Prática Comum:** O reconhecimento de créditos tributários extemporâneos decorrentes de teses judiciais ganhas distorce os demonstrativos em um determinado exercício. O maior exemplo brasileiro é a **"Tese do Século"** (exclusão do ICMS da base de cálculo do PIS e da COFINS).
*   **Metodologia de Ajuste:** Os valores recuperados transitam pelo resultado operacional ou financeiro. Devem ser deduzidos de forma **negativa** do EBITDA, pois representam um ganho de caixa extraordinário de caráter financeiro/operacional passado que não se repetirá na operação futura.

### E. Efeito CPC 06 (R2) / IFRS 16 nos Arrendamentos (Leases)
*   **Distorção contábil:** A vigência do CPC 06 (R2) removeu os gastos de aluguel operacional do OPEX e passou a capitalizá-los sob a forma de **Ativos de Direito de Uso** contra **Passivos de Arrendamento**, dividindo o pagamento em depreciação do ativo e juros sobre a dívida. Isso infla o EBITDA contabilizado.
*   **Metodologia de Ajuste em M&A:**
    1.  **Dedução de Aluguel (Abordagem Tradicional):** Reduzir o EBITDA normalizado subtraindo os pagamentos mensais de arrendamento (como se fossem despesas operacionais normais). O Passivo de Arrendamento é desconsiderado na Dívida Líquida no *Cash Bridge*.
    2.  **Inclusão na Dívida Líquida (Abordagem IFRS 16):** Manter o EBITDA inflado (sem dedução de aluguel) para cálculo de valuation, mas somar integralmente o valor presente do **Passivo de Arrendamento** à Dívida Bruta da empresa no cálculo da Dívida Líquida.
    *   *Atenção:* Misturar as duas abordagens provoca dupla contagem do ônus do leasing, depreciando indevidamente o *Equity Value*.

---

## 3. Ponte de Reconciliação do EBITDA (Exemplo Prático)

| Item da Reconciliação | Valor (R$ '000) | Sentido do Ajuste | Descrição Técnica |
| :--- | :--- | :--- | :--- |
| **EBITDA Estatutário (Reportado)** | **12.500** | - | Ponto de partida contábil da DRE histórica |
| (+) Add-back: Despesas Pessoais dos Sócios | 950 | Positivo | Despesas de automóveis, seguros e viagens familiares |
| (+) Reclassificação de Custos de P&D | 1.100 | Positivo | Software desenvolvido ativado no intangível |
| (-) Pró-labore de Sócios a Mercado | -800 | Negativo | Custo estimado de substituição por gestão profissional |
| (-) Regularização PJ para CLT | -1.250 | Negativo | Carga tributária e FGTS sobre pejotização irregular |
| (-) Créditos de PIS/COFINS "Tese do Século" | -2.500 | Negativo | Crédito tributário extemporâneo reconhecido |
| (-) Ajuste de Aluguéis Operacionais | -1.400 | Negativo | Tratamento tradicional de aluguel pós-IFRS 16 |
| **EBITDA Recorrente (Normalizado)** | **8.600** | **Ajustado** | **Margem operacional real recalculada** |
