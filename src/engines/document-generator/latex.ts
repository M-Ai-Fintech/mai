import { t } from "../../i18n/index.ts";
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
    return [
      latexPreamble(),
      latexIntroduction(params),
      latexParties(params),
      latexStructure(params),
      latexEarnOut(params),
      latexNonCompete(params),
      latexSignatures(params),
    ].join("\n");
  }

  /**
   * Compiles LaTeX source to PDF using a spawned pdflatex process,
   * optimized for production with robust temp directory handling.
   */
  public static async compileToPDF(
    latexContent: string,
    outputFileName?: string,
  ): Promise<Uint8Array> {
    const tempDir = await Deno.makeTempDir({ prefix: "latex_build_" });
    const texFilePath = `${tempDir}/document.tex`;
    const pdfFilePath = `${tempDir}/document.pdf`;
    try {
      await Deno.writeTextFile(texFilePath, latexContent);
      await runPdfLatex(tempDir, texFilePath);
      const pdfBytes = await Deno.readFile(pdfFilePath);
      if (outputFileName) await Deno.writeFile(outputFileName, pdfBytes);
      return pdfBytes;
    } finally {
      await Deno.remove(tempDir, { recursive: true }).catch(() => {});
    }
  }
}

function latexPreamble(): string {
  return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{geometry}
\\geometry{margin=1in}
\\usepackage{booktabs}
\\title{\\textbf{${t("documentGen.latex.title")}}}
\\author{\\textbf{${t("documentGen.latex.author")}}}
\\date{\\today}
\\begin{document}
\\maketitle`;
}

function latexIntroduction(params: LaTeXDocumentParams): string {
  return t("documentGen.latex.intro", {
    target: params.targetName,
    buyer: params.buyerName,
  });
}

function latexParties(params: LaTeXDocumentParams): string {
  return `\\section{${t("documentGen.latex.partiesTitle")}}
\\begin{itemize}
    \\item \\textbf{${t("documentGen.latex.buyer")}} ${params.buyerName}
    \\item \\textbf{${t("documentGen.latex.seller")}} ${params.sellerName}
    \\item \\textbf{${t("documentGen.latex.target")}} ${params.targetName}
\\end{itemize}`;
}

function latexStructure(params: LaTeXDocumentParams): string {
  const cash = params.valuationAmount * params.proposal.cashPercentage;
  const equity = params.valuationAmount - cash;
  const percentages = structurePercentages(params.proposal);
  const buyerStake = (params.proposal.buyerEquityShare * 100).toFixed(2);
  return `\\section{${t("documentGen.latex.structureTitle")}}
${t("documentGen.latex.structureIntro")}
\\begin{itemize}
    \\item \\textbf{${
    t("documentGen.latex.valuation")
  }} \\$${params.valuationAmount.toLocaleString()}
    \\item \\textbf{${
    t("documentGen.latex.cash")
  }} \\$${cash.toLocaleString()} (${percentages.cash}\\%)
    \\item \\textbf{${
    t("documentGen.latex.equity")
  }} \\$${equity.toLocaleString()} (${percentages.equity}\\%)
    \\item \\textbf{${t("documentGen.latex.postClosingStake")}} ${buyerStake}\\%
\\end{itemize}`;
}

function structurePercentages(proposal: TermSheetProposal) {
  return {
    cash: (proposal.cashPercentage * 100).toFixed(2),
    equity: ((1 - proposal.cashPercentage) * 100).toFixed(2),
  };
}

function latexEarnOut(params: LaTeXDocumentParams): string {
  const years = params.proposal.earnOutTargetYears.toFixed(1);
  return `\\section{${t("documentGen.latex.earnOutTitle")}}
${t("documentGen.latex.earnOutIntro")}
\\begin{itemize}
    \\item \\textbf{${t("documentGen.latex.earnOutPeriod")}} ${years} ${
    t("documentGen.latex.years")
  }
\\end{itemize}`;
}

function latexNonCompete(params: LaTeXDocumentParams): string {
  const intro = t("documentGen.latex.nonCompeteIntro", {
    seller: params.sellerName,
  });
  return `\\section{${t("documentGen.latex.nonCompeteTitle")}}
${intro}
\\begin{itemize}
    \\item \\textbf{${
    t("documentGen.latex.nonCompetePeriod")
  }} ${params.proposal.nonCompeteMonths} ${t("documentGen.latex.monthsAfter")}
\\end{itemize}`;
}

function latexSignatures(params: LaTeXDocumentParams): string {
  const buyer = t("documentGen.latex.signatureBuyer", {
    buyer: params.buyerName,
  });
  const seller = t("documentGen.latex.signatureSeller", {
    seller: params.sellerName,
  });
  return `\\section{${t("documentGen.latex.nonBindingTitle")}}
${t("documentGen.latex.nonBindingIntro")}
\\vspace{2cm}
\\begin{center}
\\begin{tabular}{cc}
    \\underline{\\hspace{6cm}} & \\underline{\\hspace{6cm}} \\\\
    \\textbf{${buyer}} & \\textbf{${seller}} \\\\
\\end{tabular}
\\end{center}
\\end{document}
`;
}

async function runPdfLatex(
  tempDir: string,
  texFilePath: string,
): Promise<void> {
  const command = pdfLatexCommand(tempDir, texFilePath);
  const result = await command.output();
  if (result.code === 0) return;
  const decoder = new TextDecoder();
  const message = decoder.decode(result.stderr) ||
    decoder.decode(result.stdout);
  throw new Error(
    `LaTeX compilation failed with code ${result.code}; expected exit code 0: ${message}`,
  );
}

function pdfLatexCommand(
  tempDir: string,
  texFilePath: string,
): Deno.Command {
  return new Deno.Command("pdflatex", {
    args: [
      "-interaction=nonstopmode",
      "-halt-on-error",
      "-output-directory",
      tempDir,
      texFilePath,
    ],
    stdout: "piped",
    stderr: "piped",
  });
}
