import Handlebars from "npm:handlebars";
import { LaTeXDocumentParams, LaTeXGenerator } from "./latex.ts";
import { PDFGenerator } from "./pdf.ts";

export class HybridDocumentEngine {
  /**
   * Consolidates Handlebars template injection, LaTeX compilation,
   * and pdf-lib signature/watermark injection for SPA/QPA.
   */
  public static async generateHybridDocument(
    templateContent: string,
    params: LaTeXDocumentParams,
    buyerSignature: string,
    sellerSignature: string,
  ): Promise<Uint8Array> {
    // 1. Handlebars Injection
    const template = Handlebars.compile(templateContent);
    const compiledLaTeX = template(params);

    // 2. LaTeX -> PDF Compilation
    const basePdfBytes = await LaTeXGenerator.compileToPDF(compiledLaTeX);

    // 3. Dynamic injection of Signatures and Watermark (pdf-lib)
    const finalPdfBytes = await PDFGenerator.injectSignaturesAndWatermark(
      basePdfBytes,
      buyerSignature,
      sellerSignature,
    );

    return finalPdfBytes;
  }
}
