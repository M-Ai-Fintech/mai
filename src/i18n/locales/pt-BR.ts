export const ptBR = {
  documentGen: {
    latex: {
      title: "TERM SHEET: CORRESPONDENTE DE FUSÃO E AQUISIÇÃO",
      author: "CONFIDENCIAL",
      intro:
        "Este Term Sheet resume os principais termos e condições relativos à potencial aquisição da empresa \\textbf{{{target}}} pela adquirente \\textbf{{{buyer}}}.",
      partiesTitle: "Partes Envolvidas",
      buyer: "Comprador:",
      seller: "Vendedor:",
      target: "Empresa-Alvo:",
      structureTitle: "Estrutura de Capitalização e Valuation",
      structureIntro:
        "As partes concordam preliminarmente com a seguinte estrutura de transação otimizada por algoritmo genético de negociação estratégica:",
      valuation: "Valuation de Referência:",
      cash: "Componente em Caixa (Upfront Cash):",
      equity: "Componente em Ações (Equity Roll):",
      postClosingStake:
        "Participação do Comprador no Capital Social Pós-Fechamento:",
      earnOutTitle: "Condições de Desempenho (Earn-out)",
      earnOutIntro:
        "A transação prevê uma estrutura de earn-out vinculada a metas de desempenho corporativo:",
      earnOutPeriod: "Período de Medição de Metas:",
      years: "anos.",
      monthsAfter: "meses pós-fechamento.",
      nonCompeteTitle: "Restrições de Não-Competição (Non-Compete)",
      nonCompeteIntro:
        "Como parte integrante da transação, os sócios fundadores da {{seller}} acordam com as seguintes restrições:",
      nonCompetePeriod: "Prazo de Não-Competição:",
      nonBindingTitle: "Natureza Não-Vinculativa",
      nonBindingIntro:
        "Exceto pelas cláusulas de confidencialidade e exclusividade, este documento representa apenas uma intenção de negociação e não constitui uma obrigação legal de conclusão da transação.",
      signatureBuyer: "Comprador: {{buyer}}",
      signatureSeller: "Vendedor: {{seller}}",
    },
    pdf: {
      title: "TERM SHEET: ACORDO DE M&A LOW-TOUCH",
      subtitle: "ESTRUTURA COMPARTILHADA E CONFIDENCIAL",
      section1: "1. Partes Envolvidas",
      partiesContent:
        "Adquirente: {{buyer}}  |  Vendedor: {{seller}}  |  Alvo: {{target}}",
      section2: "2. Estrutura de Capitalização e Valuation",
      structureContent:
        "Valuation: ${{valuation}} | Dinheiro: ${{cash}} ({{cashPct}}%) | Ações: ${{equity}} ({{equityPct}}%)",
      section3: "3. Participação Societária e Controle",
      controlContent:
        "Participação do Comprador na Empresa-Alvo pós-fechamento: {{buyerEquity}}%",
      section4: "4. Estrutura de Desempenho (Earn-out)",
      earnOutContent:
        "Período de earn-out para cumprimento de marcos financeiros: {{years}} anos.",
      section5: "5. Prazo de Restrição (Non-Compete)",
      nonCompeteContent:
        "Os vendedores seniores concordam em não competir direta ou indiretamente por {{months}} meses.",
      note:
        "Nota: Este Term Sheet representa um entendimento preliminar não vinculativo.",
      signature: "Assinatura: {{name}}",
      watermark: "CONFIDENCIAL - GAMA FUND",
    },
  },
};
