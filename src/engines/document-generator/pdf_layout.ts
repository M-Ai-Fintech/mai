import { t } from "../../i18n/index.ts";
import { PDFFont, PDFPage, rgb } from "pdf-lib";
import { LaTeXDocumentParams } from "./latex.ts";

export function drawTermSheetPage(
  page: PDFPage,
  regularFont: PDFFont,
  boldFont: PDFFont,
  params: LaTeXDocumentParams,
): void {
  let y = drawHeader(page, boldFont);
  for (const section of termSheetSections(params)) {
    y = drawParagraph(page, regularFont, boldFont, y, section);
  }
  y = drawNote(page, regularFont, y - 20);
  drawSignatureBlock(
    page,
    boldFont,
    params.buyerName,
    params.sellerName,
    y - 60,
  );
}

function drawHeader(page: PDFPage, boldFont: PDFFont): number {
  const { width, height } = page.getSize();
  drawHeaderText(page, boldFont, height);
  page.drawLine({
    start: { x: 50, y: height - 115 },
    end: { x: width - 50, y: height - 115 },
    thickness: 1.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  return height - 145;
}

function drawHeaderText(
  page: PDFPage,
  boldFont: PDFFont,
  height: number,
): void {
  page.drawText(t("documentGen.pdf.title"), {
    x: 50,
    y: height - 50,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.2, 0.4),
  });
  page.drawText(t("documentGen.pdf.subtitle"), {
    x: 50,
    y: height - 75,
    size: 10,
    font: boldFont,
    color: rgb(0.5, 0.1, 0.1),
  });
}

interface TermSheetSection {
  title: string;
  content: string;
}

function termSheetSections(params: LaTeXDocumentParams): TermSheetSection[] {
  const cash = params.valuationAmount * params.proposal.cashPercentage;
  const equity = params.valuationAmount - cash;
  return [
    partiesSection(params),
    structureSection(params, cash, equity),
    section("section3", "controlContent", {
      buyerEquity: (params.proposal.buyerEquityShare * 100).toFixed(1),
    }),
    section("section4", "earnOutContent", {
      years: params.proposal.earnOutTargetYears.toFixed(1),
    }),
    section("section5", "nonCompeteContent", {
      months: params.proposal.nonCompeteMonths,
    }),
  ];
}

function partiesSection(params: LaTeXDocumentParams): TermSheetSection {
  return section("section1", "partiesContent", {
    buyer: params.buyerName,
    seller: params.sellerName,
    target: params.targetName,
  });
}

function structureSection(
  params: LaTeXDocumentParams,
  cash: number,
  equity: number,
): TermSheetSection {
  return section("section2", "structureContent", {
    valuation: params.valuationAmount.toLocaleString(),
    cash: cash.toLocaleString(),
    cashPct: (params.proposal.cashPercentage * 100).toFixed(1),
    equity: equity.toLocaleString(),
    equityPct: ((1 - params.proposal.cashPercentage) * 100).toFixed(1),
  });
}

function section(
  titleKey: string,
  contentKey: string,
  values: Record<string, string | number>,
): TermSheetSection {
  return {
    title: t(`documentGen.pdf.${titleKey}`),
    content: t(`documentGen.pdf.${contentKey}`, values),
  };
}

function drawParagraph(
  page: PDFPage,
  regularFont: PDFFont,
  boldFont: PDFFont,
  y: number,
  section: TermSheetSection,
): number {
  drawSectionTitle(page, boldFont, y, section.title);
  drawSectionContent(page, regularFont, y - 18, section.content);
  return y - 43;
}

function drawSectionTitle(
  page: PDFPage,
  font: PDFFont,
  y: number,
  title: string,
): void {
  page.drawText(title, {
    x: 50,
    y,
    size: 12,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
}

function drawSectionContent(
  page: PDFPage,
  font: PDFFont,
  y: number,
  content: string,
): void {
  page.drawText(content, {
    x: 50,
    y,
    size: 11,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });
}

function drawNote(page: PDFPage, font: PDFFont, y: number): number {
  page.drawText(t("documentGen.pdf.note"), {
    x: 50,
    y,
    size: 9,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });
  return y;
}

export function drawWatermark(page: PDFPage, font: PDFFont): void {
  const { width, height } = page.getSize();
  page.drawText(t("documentGen.pdf.watermark"), {
    x: width / 2 - 150,
    y: height / 2,
    size: 30,
    font,
    color: rgb(0.9, 0.9, 0.9),
  });
}

export function drawSignatureBlock(
  page: PDFPage,
  font: PDFFont,
  buyer: string,
  seller: string,
  y = 100,
): void {
  const { width } = page.getSize();
  drawSignatureLine(page, 50, 200, y);
  drawSignatureLine(page, width - 200, width - 50, y);
  drawSignatureLabel(page, font, buyer, 50, y - 15);
  drawSignatureLabel(page, font, seller, width - 200, y - 15);
}

function drawSignatureLine(
  page: PDFPage,
  startX: number,
  endX: number,
  y: number,
): void {
  page.drawLine({
    start: { x: startX, y },
    end: { x: endX, y },
    thickness: 1,
    color: rgb(0.5, 0.5, 0.5),
  });
}

function drawSignatureLabel(
  page: PDFPage,
  font: PDFFont,
  name: string,
  x: number,
  y: number,
): void {
  page.drawText(t("documentGen.pdf.signature", { name }), {
    x,
    y,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
}
