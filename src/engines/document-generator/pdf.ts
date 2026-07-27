import { PDFDocument, StandardFonts } from "pdf-lib";
import { LaTeXDocumentParams } from "./latex.ts";
import {
  drawSignatureBlock,
  drawTermSheetPage,
  drawWatermark,
} from "./pdf_layout.ts";

export class PDFGenerator {
  /**
   * Generates a PDF byte array representing the Term Sheet.
   *
   * @example await PDFGenerator.generateTermSheetPDF(termSheet)
   */
  public static async generateTermSheetPDF(
    params: LaTeXDocumentParams,
  ): Promise<Uint8Array> {
    const document = await PDFDocument.create();
    const page = document.addPage([595, 842]);
    const regularFont = await document.embedFont(StandardFonts.Helvetica);
    const boldFont = await document.embedFont(StandardFonts.HelveticaBold);
    drawTermSheetPage(page, regularFont, boldFont, params);
    return await document.save();
  }

  /**
   * Adds a watermark and signature labels to an existing PDF.
   *
   * @example await PDFGenerator.injectSignaturesAndWatermark(bytes, "Buyer", "Seller")
   */
  public static async injectSignaturesAndWatermark(
    pdfBytes: Uint8Array,
    buyerSignature: string,
    sellerSignature: string,
  ): Promise<Uint8Array> {
    const document = await PDFDocument.load(pdfBytes);
    const regularFont = await document.embedFont(StandardFonts.Helvetica);
    const boldFont = await document.embedFont(StandardFonts.HelveticaBold);
    for (const page of document.getPages()) drawWatermark(page, boldFont);
    const lastPage = document.getPages().at(-1);
    if (!lastPage) {
      throw new Error(
        "Cannot inject PDF signatures into a document with 0 pages; expected at least 1 page.",
      );
    }
    drawSignatureBlock(lastPage, regularFont, buyerSignature, sellerSignature);
    return await document.save();
  }

  public static async writeTermSheetPDF(
    filePath: string,
    params: LaTeXDocumentParams,
  ): Promise<void> {
    await Deno.writeFile(filePath, await this.generateTermSheetPDF(params));
  }
}
