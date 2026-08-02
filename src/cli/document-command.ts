import { LaTeXGenerator } from "../engines/document-generator/latex.ts";
import { PDFGenerator } from "../engines/document-generator/pdf.ts";
import { optimizeLegacyTermSheet } from "../engines/optimization/negotiation/term_sheet_compatibility.ts";
import { TermSheetProposal } from "../engines/optimization/types.ts";
import { t } from "../i18n/index.ts";
import { describeCommandError, printSectionHeader } from "./command-output.ts";
import { createCommandProgress } from "./command-progress.ts";

export interface DocumentGenerationOptions {
  buyer: string;
  seller: string;
  target: string;
  valuation: number;
  output: string;
}

/**
 * Generates the LaTeX and PDF term-sheet artifacts.
 *
 * @example await generateTermSheetDocument({ buyer: "Buyer", seller: "Seller", target: "Target", valuation: 10, output: "./term-sheet.pdf" });
 */
export async function generateTermSheetDocument(
  options: DocumentGenerationOptions,
): Promise<void> {
  printDocumentStart(options.target);
  const proposal = await optimizeDocumentTerms();
  printMarkdownPreview(options, proposal);
  await compileTermSheetArtifacts(options, proposal);
}

function printDocumentStart(target: string): void {
  printSectionHeader(t("cli.headers.generateDocument"));
  console.log(t("cli.spinners.closingStart", { target }));
  console.log(t("cli.spinners.closingVerify"));
}

function optimizeDocumentTerms(): TermSheetProposal {
  const progress = createCommandProgress(t("cli.spinners.closingOptimize"));
  progress.start();
  const negotiation = optimizeLegacyTermSheet({
    populationSize: 100,
    generations: 50,
    mutationRate: 0.1,
    crossoverRate: 0.8,
    minBuyerReservationUtility: 0.3,
    minSellerReservationUtility: 0.3,
  });
  progress.stop();
  return negotiation.bestProposal;
}

function printMarkdownPreview(
  options: DocumentGenerationOptions,
  proposal: TermSheetProposal,
): void {
  console.log(t("cli.messages.markdownPreviewHeader"));
  console.log(
    t("cli.messages.termSheetTemplate", previewValues(options, proposal)),
  );
  console.log(t("cli.messages.previewFooter"));
}

function previewValues(
  options: DocumentGenerationOptions,
  proposal: TermSheetProposal,
): Record<string, string | number> {
  return {
    buyer: options.buyer,
    seller: options.seller,
    target: options.target,
    valuation: options.valuation.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    }),
    cash: (proposal.cashPercentage * 100).toFixed(1),
    equity: ((1 - proposal.cashPercentage) * 100).toFixed(1),
    buyerEquity: (proposal.buyerEquityShare * 100).toFixed(1),
    earnOutYears: proposal.earnOutTargetYears,
    nonCompeteMonths: proposal.nonCompeteMonths,
  };
}

async function compileTermSheetArtifacts(
  options: DocumentGenerationOptions,
  proposal: TermSheetProposal,
): Promise<void> {
  const progress = createCommandProgress(t("cli.spinners.closingCompile"));
  progress.start();
  try {
    const latexPath = await writeLatexArtifact(options, proposal);
    progress.stop();
    console.log(t("cli.messages.latexGenerated", { path: latexPath }));
    await writePdfArtifact(options, proposal);
  } catch (error) {
    progress.stop();
    console.error(t("cli.messages.docGenError"), describeCommandError(error));
    throw error;
  }
}

async function writeLatexArtifact(
  options: DocumentGenerationOptions,
  proposal: TermSheetProposal,
): Promise<string> {
  const documentTerms = toDocumentTerms(options, proposal);
  const latex = LaTeXGenerator.generateTermSheetLaTeX(documentTerms);
  await Deno.mkdir("./term_sheets", { recursive: true });
  const latexPath = options.output.replace(".pdf", ".tex");
  await Deno.writeTextFile(latexPath, latex);
  return latexPath;
}

async function writePdfArtifact(
  options: DocumentGenerationOptions,
  proposal: TermSheetProposal,
): Promise<void> {
  await PDFGenerator.writeTermSheetPDF(
    options.output,
    toDocumentTerms(options, proposal),
  );
  console.log(t("cli.messages.pdfCompiled", { path: options.output }));
}

function toDocumentTerms(
  options: DocumentGenerationOptions,
  proposal: TermSheetProposal,
) {
  return {
    buyerName: options.buyer,
    sellerName: options.seller,
    targetName: options.target,
    valuationAmount: options.valuation,
    proposal,
  };
}
