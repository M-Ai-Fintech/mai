export const ptBR = {
  cli: {
    headers: {
      checkRegistry: "Verificação Cadastral de KYB (SERPRO/Receita)",
      analyzeRisk: "Análise Preditiva de Risco: {{name}}",
      optimizePortfolio: "Otimização de Portfólio de Aquisições (MILP)",
      optimizeTermSheet: "Otimização Contratual por Algoritmo Genético",
      generateDocument: "Geração de Documentação Contratual",
    },
    spinners: {
      kyb:
        "[SourcingAndKYBAgent] Pesquisando registro e background para o CNPJ: {{cnpj}}...",
      risk:
        "[GeneralDueDiligenceAgent] Acionando subagente FinancialRiskAgent para inferência ONNX local quantizada...",
      matching:
        "[DealMatchingAgent] Calculando alocação de capital e faixas flexíveis (valuation ranges)...",
      negotiation:
        "[NegotiationAgent] Atuando como mesa de conselho iterativa. Apresentando 3+ alternativas estratégicas de negociação...",
      closingStart:
        "[LegalClosingAgent] Iniciando processo de fechamento (Closing) para o deal: {{target}}...",
      closingVerify:
        "[LegalClosingAgent] Verificando aprovação prévia dos termos finais... OK.",
      closingOptimize: "Otimizando termos finais via algoritmo genético...",
      closingCompile:
        "[LegalClosingAgent] Preview validado. Compilando os binários PDF e LaTeX...",
    },
    tables: {
      kybHeader: ["Campo", "Valor"],
      kybFields: {
        legalName: "Razão Social",
        tradeName: "Nome Fantasia",
        status: "Situação",
        capital: "Capital Social",
        foundingDate: "Data de Fundação",
        taxDebts: "Débitos Fiscais",
      },
      statusActive: "ATIVA",
      notAvailable: "N/A",
      riskHeader: ["Métrica", "Valor"],
      riskFields: {
        insolvency: "Probabilidade de Insolvência",
        zScore: "Classificação Z-Score",
        churn: "Probabilidade de Churn de Contratos",
        volatility: "Volatilidade Projetada do FCD",
        synergyScore: "Score de Resiliência de Sinergia (Indústria 4.0)",
      },
      portfolioHeader: [
        "ID",
        "Nome da Empresa",
        "Faixa Sugerida",
        "Referência",
        "Risco",
      ],
    },
    messages: {
      taxDebtsWarning:
        "\n\x1b[31m[AVISO] Débitos fiscais detectados! Isso pode impactar o valuation do ativo.\x1b[0m",
      cleanRegistry:
        "\n\x1b[32m[OK] Registro limpo e em conformidade fiscal.\x1b[0m",
      kybQualitative:
        "\n[SourcingAndKYBAgent - Análise Qualitativa e Cultural]",
      culture: "- Cultura Corporativa: {{value}}",
      pastMovements: "- Movimentações Passadas: {{value}}",
      negotiators: "- Perfil dos Negociadores: {{value}}",
      defaultCultureGood:
        "Governança sólida, fit cultural alto com adquirente.",
      defaultMovementsGood: "Sem histórico de litígios societários graves.",
      defaultNegotiatorsGood: "Board experiente no setor de atuação.",
      cultureQuery:
        "Faça uma análise de sourcing qualitativa e cultural em português de exatas 3 linhas (uma para 'Cultura Corporativa', uma para 'Movimentações Passadas', uma para 'Perfil dos Negociadores') para a empresa {{name}}.",
      cultureFallback:
        "Foco em inovação no setor de {{sector}}, governança sólida, fit cultural alto com adquirente.",
      movementsFallback:
        "Crescimento orgânico consistente, sem histórico de litígios societários.",
      negotiatorsFallback:
        "Board experiente e focado em expansão internacional.",
      kybError: "\n\x1b[31mErro na verificação cadastral:\x1b[0m",
      riskClassification:
        "\nClassificação do Risco de FCD: \x1b[33m[{{label}}]\x1b[0m",
      embeddingStatus: "Status de Geração de Embeddings: {{status}}",
      activated: "\x1b[32mATIVADO (Local)\x1b[0m",
      deactivated: "\x1b[31mDESATIVADO\x1b[0m",
      calculatedRiskMetrics: "\nMétricas de Risco Calculadas:",
      legalDueDiligence:
        "\n[GeneralDueDiligenceAgent - Parecer Subagente LegalDueDiligenceAgent]",
      ragScanComplete:
        "- RAG VDR: Varredura concluída. Principais trechos encontrados no VDR:",
      noCriticalClauses:
        "  * Nenhuma cláusula de relevância crítica identificada.",
      docSnippet: '  * [Doc: {{doc}}] "{{text}}..." (Similaridade: {{score}}%)',
      riskError: "\n\x1b[31mErro no processamento preditivo:\x1b[0m",
      dbLoaded:
        "\n\x1b[32m[Database] Carregadas {{count}} empresas dinamicamente da tabela 'business'.\x1b[0m",
      dbOfflineWarning:
        "\n[Aviso] Banco de dados offline. Carregando alvos de simulação.",
      pipelineInput: "Pipeline de entrada: {{count}} empresas elegíveis.",
      budgetTolerance:
        "Orçamento Limite: ${{budget}}M | Tolerância de Risco Máxima: {{tolerance}}%",
      solverSolution: "\nSolução do Solver HiGHS: \x1b[32m{{status}}\x1b[0m",
      totalSynergy: "Sinergia Total Realizada: {{synergy}} pontos",
      allocatedBudget: "Orçamento Alocado: ${{cost}}M de ${{budget}}M",
      recommendedCompanies:
        "\nEmpresas Recomendadas para Aquisição (Faixas Flexíveis para evitar Deal Fatigue):",
      noCompaniesMetCriteria:
        " -> Nenhuma empresa atendeu aos critérios sob as restrições atuais.",
      portfolioRange: "${{min}}M a ${{max}}M",
      portfolioError: "\n\x1b[31mErro na otimização de portfólio:\x1b[0m",
      alt1Title: "\n--- [Alternativa 1: Conservadora / Foco em Liquidez] ---",
      alt2Title: "\n--- [Alternativa 2: Balanceada / Padrão Otimizado] ---",
      alt3Title:
        "\n--- [Alternativa 3: Oportunidade com Retenção de Risco] ---",
      suggestedValuation: "- Valuation Sugerido:                ${{val}}M",
      cashUpfront: "- Composição de Caixa Upfront:       {{val}}%",
      equityRoll: "- Composição de Ações (Equity Roll):  {{val}}%",
      earnOut: "- Composição de Earn-out:            {{val}}%",
      escrowRetention: "- Retenção em Escrow:                {{val}}%",
      fitnessIndicator: "- Indicador de Acordo (Fitness):     {{val}}",
      noViableAlternative:
        " -> Nenhuma alternativa viável sob as restrições de KYC/Leverage.",
      geneticSearchError: "Erro na busca genética:",
      markdownPreviewHeader:
        "\n============================================================\n PREVIEW DO TERM SHEET EM MARKDOWN (CLI PREVIEWER)\n============================================================",
      termSheetTemplate: `
# TERMO DE COMPROMISSO DE FUSÃO E AQUISIÇÃO (TERM SHEET)

**PROPOSTA VINCULANTE DE INVESTIMENTO E AQUISIÇÃO DE PARTICIPAÇÃO SOCIETÁRIA**

**1. AS PARTES**
* **Adquirente:** {{buyer}}
* **Vendedora:** {{seller}}
* **Empresa Alvo:** {{target}}

**2. VALUATION E ESTRUTURAÇÃO DA OPERAÇÃO**
* **Valuation Base (Enterprise Value):** R$ {{valuation}}
* **Estrutura do Preço de Aquisição:**
  * **Parcela à Vista (Cash Upfront):** {{cash}}% do valor total.
  * **Permuta de Ações (Equity Roll):** {{equity}}% em ações preferenciais da Adquirente.
  * **Participação da Adquirente pós-fechamento:** {{buyerEquity}}% do capital social votante.

**3. CLÁUSULAS ESPECIAIS E GARANTIAS**
* **Cláusula de Earn-out:** Fica estipulado um período de metas de desempenho operacional de {{earnOutYears}} anos.
* **Acordo de Não-Competência (Non-Compete):** Os fundadores e administradores da Vendedora obrigam-se a não exercer atividade concorrente pelo prazo de {{nonCompeteMonths}} meses a contar do Fechamento.
* **Confidencialidade e Exclusividade:** Este instrumento guarda exclusividade mútua e sigilo estrito entre as partes.

**[Status]** Termos validados pelas partes e prontos para assinatura digital.
`,
      previewFooter:
        "============================================================\n",
      latexGenerated: "[LaTeX] Código-fonte gerado em: \x1b[32m{{path}}\x1b[0m",
      pdfCompiled:
        "[PDF] Documento PDF compilado e salvo em: \x1b[32m{{path}}\x1b[0m",
      docGenError: "\n\x1b[31mErro na geração do documento:\x1b[0m",
      techSaaS: "Tecnologia / SaaS",
    },
  },
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
