import { t } from "../../i18n/index.ts";
// src/engines/document-generator/pdf.ts
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { LaTeXDocumentParams } from "./latex.ts";

export class PDFGenerator {
  /**
   * Generates a PDF byte array representing the Term Sheet.
   */
  public static async generateTermSheetPDF(
    params: LaTeXDocumentParams,
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();

    const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontHelveticaBold = await pdfDoc.embedFont(
      StandardFonts.HelveticaBold,
    );

    let currentY = height - 50;

    page.drawText(t("documentGen.pdf.title"), {
      x: 50,
      y: currentY,
      size: 18,
      font: fontHelveticaBold,
      color: rgb(0.1, 0.2, 0.4),
    });
    currentY -= 25;

    page.drawText(t("documentGen.pdf.subtitle"), {
      x: 50,
      y: currentY,
      size: 10,
      font: fontHelveticaBold,
      color: rgb(0.5, 0.1, 0.1),
    });
    currentY -= 40;

    page.drawLine({
      start: { x: 50, y: currentY },
      end: { x: width - 50, y: currentY },
      thickness: 1.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    currentY -= 30;

    const drawParagraph = (title: string, content: string) => {
      page.drawText(title, {
        x: 50,
        y: currentY,
        size: 12,
        font: fontHelveticaBold,
        color: rgb(0.2, 0.2, 0.2),
      });
      currentY -= 18;

      page.drawText(content, {
        x: 50,
        y: currentY,
        size: 11,
        font: fontHelvetica,
        color: rgb(0.3, 0.3, 0.3),
      });
      currentY -= 25;
    };

    drawParagraph(
      t("documentGen.pdf.section1"),
      t("documentGen.pdf.partiesContent", {
        buyer: params.buyerName,
        seller: params.sellerName,
        target: params.targetName,
      }),
    );

    const cashAmount = params.valuationAmount * params.proposal.cashPercentage;
    const equityAmount = params.valuationAmount *
      (1 - params.proposal.cashPercentage);

    drawParagraph(
      t("documentGen.pdf.section2"),
      t("documentGen.pdf.structureContent", {
        valuation: params.valuationAmount.toLocaleString(),
        cash: cashAmount.toLocaleString(),
        cashPct: (params.proposal.cashPercentage * 100).toFixed(1),
        equity: equityAmount.toLocaleString(),
        equityPct: ((1 - params.proposal.cashPercentage) * 100).toFixed(1),
      }),
    );

    drawParagraph(
      t("documentGen.pdf.section3"),
      t("documentGen.pdf.controlContent", {
        buyerEquity: (params.proposal.buyerEquityShare * 100).toFixed(1),
      }),
    );

    drawParagraph(
      t("documentGen.pdf.section4"),
      t("documentGen.pdf.earnOutContent", {
        years: params.proposal.earnOutTargetYears.toFixed(1),
      }),
    );

    drawParagraph(
      t("documentGen.pdf.section5"),
      t("documentGen.pdf.nonCompeteContent", {
        months: params.proposal.nonCompeteMonths,
      }),
    );

    currentY -= 20;

    page.drawText(t("documentGen.pdf.note"), {
      x: 50,
      y: currentY,
      size: 9,
      font: fontHelvetica,
      color: rgb(0.6, 0.6, 0.6),
    });

    currentY -= 60;

    page.drawLine({
      start: { x: 50, y: currentY },
      end: { x: 200, y: currentY },
      thickness: 1,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawLine({
      start: { x: width - 200, y: currentY },
      end: { x: width - 50, y: currentY },
      thickness: 1,
      color: rgb(0.5, 0.5, 0.5),
    });

    currentY -= 15;

    page.drawText(t("documentGen.pdf.signature", { name: params.buyerName }), {
      x: 50,
      y: currentY,
      size: 9,
      font: fontHelveticaBold,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawText(t("documentGen.pdf.signature", { name: params.sellerName }), {
      x: width - 200,
      y: currentY,
      size: 9,
      font: fontHelveticaBold,
      color: rgb(0.4, 0.4, 0.4),
    });

    return await pdfDoc.save();
  }

  /**
   * Injects dynamic signatures and a corporate watermark into an existing PDF.
   */
  public static async injectSignaturesAndWatermark(
    pdfBytes: Uint8Array,
    buyerSignature: string,
    sellerSignature: string,
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontHelveticaBold = await pdfDoc.embedFont(
      StandardFonts.HelveticaBold,
    );

    // Add watermark to all pages
    for (const page of pages) {
      const { width, height } = page.getSize();
      page.drawText(t("documentGen.pdf.watermark"), {
        x: width / 2 - 150,
        y: height / 2,
        size: 30,
        font: fontHelveticaBold,
        color: rgb(0.9, 0.9, 0.9),
      });
    }

    // Add signatures to the last page
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();
    let currentY = 100;

    lastPage.drawLine({
      start: { x: 50, y: currentY },
      end: { x: 200, y: currentY },
      thickness: 1,
      color: rgb(0.2, 0.2, 0.2),
    });

    lastPage.drawLine({
      start: { x: width - 200, y: currentY },
      end: { x: width - 50, y: currentY },
      thickness: 1,
      color: rgb(0.2, 0.2, 0.2),
    });

    currentY -= 15;

    lastPage.drawText(
      t("documentGen.pdf.signature", { name: buyerSignature }),
      {
        x: 50,
        y: currentY,
        size: 9,
        font: fontHelvetica,
        color: rgb(0, 0, 0),
      },
    );

    lastPage.drawText(
      t("documentGen.pdf.signature", { name: sellerSignature }),
      {
        x: width - 200,
        y: currentY,
        size: 9,
        font: fontHelvetica,
        color: rgb(0, 0, 0),
      },
    );

    return await pdfDoc.save();
  }

  public static async writeTermSheetPDF(
    filePath: string,
    params: LaTeXDocumentParams,
  ): Promise<void> {
    const bytes = await this.generateTermSheetPDF(params);
    await Deno.writeFile(filePath, bytes);
  }
}
