// src/engines/document-generator/latex.ts

export interface TermSheetProposal {
  cashPercentage: number;
  buyerEquityShare: number;
  earnOutTargetYears: number;
  nonCompeteMonths: number;
}

export interface LaTeXDocumentParams {
  buyerName: string;
  sellerName: string;
  targetName: string;
  proposal: TermSheetProposal;
  valuationAmount: number;
}

export class LaTeXGenerator {
  /**
   * Generates a complete LaTeX document string for the M&A Term Sheet.
   */
  public static generateTermSheetLaTeX(params: LaTeXDocumentParams): string {
    const cashAmount = params.valuationAmount * params.proposal.cashPercentage;
    const equityAmount = params.valuationAmount *
      (1 - params.proposal.cashPercentage);

    return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{geometry}
\\geometry{margin=1in}
\\usepackage{booktabs}

\\title{\\textbf{TERM SHEET: CORRESPONDENTE DE FUSÃO E AQUISIÇÃO}}
\\author{\\textbf{CONFIDENCIAL}}
\\date{\\today}

\\begin{document}

\\maketitle

Este Term Sheet resume os principais termos e condições relativos à potencial aquisição da empresa \\textbf{${params.targetName}} pela adquirente \\textbf{${params.buyerName}}.

\\section{Partes Envolvidas}
\\begin{itemize}
    \\item \\textbf{Comprador:} ${params.buyerName}
    \\item \\textbf{Vendedor:} Acionistas da ${params.sellerName}
    \\item \\textbf{Empresa-Alvo:} ${params.targetName}
\\end{itemize}

\\section{Estrutura de Capitalização e Valuation}
As partes concordam preliminarmente com a seguinte estrutura de transação otimizada por algoritmo genético de negociação estratégica:
\\begin{itemize}
    \\item \\textbf{Valuation de Referência:} \$${params.valuationAmount.toLocaleString()}
    \\item \\textbf{Componente em Caixa (Upfront Cash):} \$${cashAmount.toLocaleString()} (${
      (params.proposal.cashPercentage * 100).toFixed(2)
    }\\%)
    \\item \\textbf{Componente em Ações (Equity Roll):} \$${equityAmount.toLocaleString()} (${
      ((1 - params.proposal.cashPercentage) * 100).toFixed(2)
    }\\%)
    \\item \\textbf{Participação do Comprador no Capital Social Pós-Fechamento:} ${
      (params.proposal.buyerEquityShare * 100).toFixed(2)
    }\\%
\\end{itemize}

\\section{Condições de Desempenho (Earn-out)}
A transação prevê uma estrutura de earn-out vinculada a metas de desempenho corporativo:
\\begin{itemize}
    \\item \\textbf{Período de Medição de Metas:} ${
      params.proposal.earnOutTargetYears.toFixed(1)
    } anos.
\\end{itemize}

\\section{Restrições de Não-Competição (Non-Compete)}
Como parte integrante da transação, os sócios fundadores da ${params.sellerName} acordam com as seguintes restrições:
\\begin{itemize}
    \\item \\textbf{Prazo de Não-Competição:} ${params.proposal.nonCompeteMonths} meses pós-fechamento.
\\end{itemize}

\\section{Natureza Não-Vinculativa}
Exceto pelas cláusulas de confidencialidade e exclusividade, este documento representa apenas uma intenção de negociação e não constitui uma obrigação legal de conclusão da transação.

\\vspace{2cm}
\\begin{center}
\\begin{tabular}{cc}
    \\underline{\\hspace{6cm}} & \\underline{\\hspace{6cm}} \\\\
    \\textbf{Comprador: ${params.buyerName}} & \\textbf{Vendedor: ${params.sellerName}} \\\\
\\end{tabular}
\\end{center}

\\end{document}
`;
  }
}
