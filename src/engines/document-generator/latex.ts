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
    const cashAmount = params.valuationAmount * params.proposal.cashPercentage;
    const equityAmount = params.valuationAmount *
      (1 - params.proposal.cashPercentage);

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

\\maketitle

${
      t("documentGen.latex.intro", {
        target: params.targetName,
        buyer: params.buyerName,
      })
    }

\\section{${t("documentGen.latex.partiesTitle")}}
\\begin{itemize}
    \\item \\textbf{${t("documentGen.latex.buyer")}} ${params.buyerName}
    \\item \\textbf{${t("documentGen.latex.seller")}} ${params.sellerName}
    \\item \\textbf{${t("documentGen.latex.target")}} ${params.targetName}
\\end{itemize}

\\section{${t("documentGen.latex.structureTitle")}}
${t("documentGen.latex.structureIntro")}
\\begin{itemize}
    \\item \\textbf{${
      t("documentGen.latex.valuation")
    }} \\$${params.valuationAmount.toLocaleString()}
    \\item \\textbf{${
      t("documentGen.latex.cash")
    }} \\$${cashAmount.toLocaleString()} (${
      (params.proposal.cashPercentage * 100).toFixed(2)
    }\\%)
    \\item \\textbf{${
      t("documentGen.latex.equity")
    }} \\$${equityAmount.toLocaleString()} (${
      ((1 - params.proposal.cashPercentage) * 100).toFixed(2)
    }\\%)
    \\item \\textbf{${t("documentGen.latex.postClosingStake")}} ${
      (params.proposal.buyerEquityShare * 100).toFixed(2)
    }\\%
\\end{itemize}

\\section{${t("documentGen.latex.earnOutTitle")}}
${t("documentGen.latex.earnOutIntro")}
\\begin{itemize}
    \\item \\textbf{${t("documentGen.latex.earnOutPeriod")}} ${
      params.proposal.earnOutTargetYears.toFixed(1)
    } ${t("documentGen.latex.years")}
\\end{itemize}

\\section{${t("documentGen.latex.nonCompeteTitle")}}
${t("documentGen.latex.nonCompeteIntro", { seller: params.sellerName })}
\\begin{itemize}
    \\item \\textbf{${
      t("documentGen.latex.nonCompetePeriod")
    }} ${params.proposal.nonCompeteMonths} ${t("documentGen.latex.monthsAfter")}
\\end{itemize}

\\section{${t("documentGen.latex.nonBindingTitle")}}
${t("documentGen.latex.nonBindingIntro")}

\\vspace{2cm}
\\begin{center}
\\begin{tabular}{cc}
    \\underline{\\hspace{6cm}} & \\underline{\\hspace{6cm}} \\\\
    \\textbf{${
      t("documentGen.latex.signatureBuyer", { buyer: params.buyerName })
    }} & \\textbf{${
      t("documentGen.latex.signatureSeller", { seller: params.sellerName })
    }} \\\\
\\end{tabular}
\\end{center}

\\end{document}
`;
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

    await Deno.writeTextFile(texFilePath, latexContent);

    const command = new Deno.Command("pdflatex", {
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

    const { code, stdout, stderr } = await command.output();

    if (code !== 0) {
      const errorMsg = new TextDecoder().decode(stderr) ||
        new TextDecoder().decode(stdout);
      await Deno.remove(tempDir, { recursive: true }).catch(() => {});
      throw new Error(`LaTeX compilation failed: ${errorMsg}`);
    }

    const pdfBytes = await Deno.readFile(pdfFilePath);

    if (outputFileName) {
      await Deno.writeFile(outputFileName, pdfBytes);
    }

    await Deno.remove(tempDir, { recursive: true }).catch(() => {});

    return pdfBytes;
  }
}
