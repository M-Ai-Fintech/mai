export const en = {
  cli: {
    headers: {
      checkRegistry: "KYB Registry Check (SERPRO/Receita)",
      analyzeRisk: "Predictive Risk Analysis: {{name}}",
      optimizePortfolio: "M&A Portfolio Optimization (MILP)",
      optimizeTermSheet: "Contract Optimization via Genetic Algorithm",
      generateDocument: "Contract Document Generation",
    },
    spinners: {
      kyb:
        "[SourcingAndKYBAgent] Searching registry and background for CNPJ: {{cnpj}}...",
      risk:
        "[GeneralDueDiligenceAgent] Triggering FinancialRiskAgent subagent for local quantized ONNX inference...",
      matching:
        "[DealMatchingAgent] Calculating capital allocation and flexible valuation ranges...",
      negotiation:
        "[NegotiationAgent] Acting as iterative board table. Presenting 3+ strategic negotiation alternatives...",
      closingStart:
        "[LegalClosingAgent] Starting closing process for deal: {{target}}...",
      closingVerify:
        "[LegalClosingAgent] Verifying prior approval of final terms... OK.",
      closingOptimize: "Optimizing final terms via genetic algorithm...",
      closingCompile:
        "[LegalClosingAgent] Preview validated. Compiling PDF and LaTeX binaries...",
    },
    tables: {
      kybHeader: ["Field", "Value"],
      kybFields: {
        legalName: "Legal Name",
        tradeName: "Trade Name",
        status: "Status",
        capital: "Share Capital",
        foundingDate: "Founding Date",
        taxDebts: "Tax Debts",
      },
      statusActive: "ACTIVE",
      notAvailable: "N/A",
      riskHeader: ["Metric", "Value"],
      riskFields: {
        insolvency: "Insolvency Probability",
        zScore: "Z-Score Classification",
        churn: "Contract Churn Probability",
        volatility: "Projected DCF Volatility",
        synergyScore: "Synergy Resilience Score (Industry 4.0)",
      },
      portfolioHeader: [
        "ID",
        "Company Name",
        "Suggested Range",
        "Reference",
        "Risk",
      ],
    },
    messages: {
      taxDebtsWarning:
        "\n\x1b[31m[WARNING] Tax debts detected! This may impact the asset valuation.\x1b[0m",
      cleanRegistry: "\n\x1b[32m[OK] Clean registry and tax compliance.\x1b[0m",
      kybQualitative:
        "\n[SourcingAndKYBAgent - Qualitative and Cultural Analysis]",
      culture: "- Corporate Culture: {{value}}",
      pastMovements: "- Past Movements: {{value}}",
      negotiators: "- Negotiator Profile: {{value}}",
      defaultCultureGood: "Solid governance, high cultural fit with acquirer.",
      defaultMovementsGood: "No history of serious corporate litigation.",
      defaultNegotiatorsGood: "Experienced board in the sector.",
      cultureQuery:
        "Write a 3-line qualitative and cultural sourcing analysis in English (one for 'Corporate Culture', one for 'Past Movements', one for 'Negotiator Profile') for the company {{name}}.",
      cultureFallback:
        "Focus on innovation in the {{sector}} sector, solid governance, high cultural fit with acquirer.",
      movementsFallback:
        "Consistent organic growth, no history of corporate litigation.",
      negotiatorsFallback:
        "Experienced board focused on international expansion.",
      kybError: "\n\x1b[31mRegistry verification error:\x1b[0m",
      riskClassification:
        "\nDCF Risk Classification: \x1b[33m[{{label}}]\x1b[0m",
      embeddingStatus: "Embeddings Generation Status: {{status}}",
      activated: "\x1b[32mACTIVATED (Local)\x1b[0m",
      deactivated: "\x1b[31mDEACTIVATED\x1b[0m",
      calculatedRiskMetrics: "\nCalculated Risk Metrics:",
      legalDueDiligence:
        "\n[GeneralDueDiligenceAgent - LegalDueDiligenceAgent Subagent Report]",
      ragScanComplete:
        "- RAG VDR: Scan complete. Main excerpts found in the VDR:",
      noCriticalClauses: "  * No clauses of critical relevance identified.",
      docSnippet: '  * [Doc: {{doc}}] "{{text}}..." (Similarity: {{score}}%)',
      riskError: "\n\x1b[31mPredictive processing error:\x1b[0m",
      dbLoaded:
        "\n\x1b[32m[Database] Dynamically loaded {{count}} companies from the 'business' table.\x1b[0m",
      dbOfflineWarning:
        "\n[Warning] Database offline. Loading simulation targets.",
      pipelineInput: "Input pipeline: {{count}} eligible companies.",
      budgetTolerance:
        "Budget Limit: ${{budget}}M | Max Risk Tolerance: {{tolerance}}%",
      solverSolution: "\nHiGHS Solver Solution: \x1b[32m{{status}}\x1b[0m",
      totalSynergy: "Total Synergy Realized: {{synergy}} points",
      allocatedBudget: "Allocated Budget: ${{cost}}M of ${{budget}}M",
      recommendedCompanies:
        "\nRecommended Companies for Acquisition (Flexible Ranges to avoid Deal Fatigue):",
      noCompaniesMetCriteria:
        " -> No companies met the criteria under current constraints.",
      portfolioRange: "${{min}}M to ${{max}}M",
      portfolioError: "\n\x1b[31mPortfolio optimization error:\x1b[0m",
      alt1Title: "\n--- [Alternative 1: Conservative / Liquidity Focus] ---",
      alt2Title: "\n--- [Alternative 2: Balanced / Optimized Standard] ---",
      alt3Title: "\n--- [Alternative 3: Opportunity with Risk Retention] ---",
      suggestedValuation: "- Suggested Valuation:               ${{val}}M",
      cashUpfront: "- Cash Upfront Composition:          {{val}}%",
      equityRoll: "- Equity Roll Composition:           {{val}}%",
      earnOut: "- Earn-out Composition:              {{val}}%",
      escrowRetention: "- Escrow Retention:                  {{val}}%",
      fitnessIndicator: "- Deal Fitness Indicator:            {{val}}",
      noViableAlternative:
        " -> No viable alternative under KYC/Leverage constraints.",
      geneticSearchError: "Genetic search error:",
      markdownPreviewHeader:
        "\n============================================================\n TERM SHEET MARKDOWN PREVIEW (CLI PREVIEWER)\n============================================================",
      termSheetTemplate: `
# MERGERS AND ACQUISITIONS COMMITMENT TERM (TERM SHEET)

**BINDING PROPOSAL FOR INVESTMENT AND ACQUISITION OF CORPORATE STAKE**

**1. THE PARTIES**
* **Acquirer:** {{buyer}}
* **Seller:** {{seller}}
* **Target Company:** {{target}}

**2. VALUATION AND TRANSACTION STRUCTURE**
* **Base Valuation (Enterprise Value):** BRL {{valuation}}
* **Acquisition Price Structure:**
  * **Cash Upfront:** {{cash}}% of the total value.
  * **Equity Roll:** {{equity}}% in preferred shares of the Acquirer.
  * **Acquirer's post-closing stake:** {{buyerEquity}}% of voting share capital.

**3. SPECIAL CLAUSES AND GUARANTEES**
* **Earn-out Clause:** An operational performance target period of {{earnOutYears}} years is stipulated.
* **Non-Compete Agreement:** The founders and administrators of the Seller are obliged not to exercise competing activities for a period of {{nonCompeteMonths}} months from Closing.
* **Confidentiality and Exclusivity:** This instrument maintains mutual exclusivity and strict confidentiality between the parties.

**[Status]** Terms validated by the parties and ready for digital signature.
`,
      previewFooter:
        "============================================================\n",
      latexGenerated:
        "[LaTeX] Source code generated at: \x1b[32m{{path}}\x1b[0m",
      pdfCompiled:
        "[PDF] PDF document compiled and saved at: \x1b[32m{{path}}\x1b[0m",
      docGenError: "\n\x1b[31mDocument generation error:\x1b[0m",
      techSaaS: "Technology / SaaS",
    },
  },
  documentGen: {
    latex: {
      title: "TERM SHEET: MERGERS AND ACQUISITIONS CORRESPONDENT",
      author: "CONFIDENTIAL",
      intro:
        "This Term Sheet summarizes the main terms and conditions regarding the potential acquisition of the company \\textbf{{{target}}} by the acquirer \\textbf{{{buyer}}}.",
      partiesTitle: "Involved Parties",
      buyer: "Buyer:",
      seller: "Seller:",
      target: "Target Company:",
      structureTitle: "Capitalization Structure and Valuation",
      structureIntro:
        "The parties preliminarily agree to the following transaction structure optimized by a strategic negotiation genetic algorithm:",
      valuation: "Reference Valuation:",
      cash: "Upfront Cash Component:",
      equity: "Equity Roll Component:",
      postClosingStake: "Buyer's Post-Closing Share Capital Stake:",
      earnOutTitle: "Performance Conditions (Earn-out)",
      earnOutIntro:
        "The transaction provides for an earn-out structure linked to corporate performance targets:",
      earnOutPeriod: "Target Measurement Period:",
      years: "years.",
      monthsAfter: "months post-closing.",
      nonCompeteTitle: "Non-Compete Restrictions",
      nonCompeteIntro:
        "As an integral part of the transaction, the founding partners of {{seller}} agree to the following restrictions:",
      nonCompetePeriod: "Non-Compete Period:",
      nonBindingTitle: "Non-Binding Nature",
      nonBindingIntro:
        "Except for the confidentiality and exclusivity clauses, this document represents only a negotiation intent and does not constitute a legal obligation to conclude the transaction.",
      signatureBuyer: "Buyer: {{buyer}}",
      signatureSeller: "Seller: {{seller}}",
    },
    pdf: {
      title: "TERM SHEET: LOW-TOUCH M&A AGREEMENT",
      subtitle: "SHARED AND CONFIDENTIAL STRUCTURE",
      section1: "1. Involved Parties",
      partiesContent:
        "Acquirer: {{buyer}}  |  Seller: {{seller}}  |  Target: {{target}}",
      section2: "2. Capitalization Structure and Valuation",
      structureContent:
        "Valuation: ${{valuation}} | Cash: ${{cash}} ({{cashPct}}%) | Equity: ${{equity}} ({{equityPct}}%)",
      section3: "3. Corporate Stake and Control",
      controlContent:
        "Buyer's Stake in Target Company post-closing: {{buyerEquity}}%",
      section4: "4. Performance Structure (Earn-out)",
      earnOutContent:
        "Earn-out period for fulfilling financial milestones: {{years}} years.",
      section5: "5. Restriction Period (Non-Compete)",
      nonCompeteContent:
        "Senior sellers agree not to compete directly or indirectly for {{months}} months.",
      note:
        "Note: This Term Sheet represents a non-binding preliminary understanding.",
      signature: "Signature: {{name}}",
      watermark: "CONFIDENTIAL - GAMA FUND",
    },
  },
};
