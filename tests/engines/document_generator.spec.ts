// tests/engines/document_generator.spec.ts
import { assertEquals } from "@std/assert";
import { PDFGenerator } from "../../src/engines/document-generator/pdf.ts";
import { LaTeXGenerator } from "../../src/engines/document-generator/latex.ts";

const sampleProposal = {
  cashPercentage: 0.6,
  buyerEquityShare: 0.75,
  earnOutTargetYears: 3.0,
  nonCompeteMonths: 24,
};

const sampleParams = {
  buyerName: "Buyer Corp",
  sellerName: "Seller Corp",
  targetName: "Target Corp",
  valuationAmount: 10000000,
  proposal: sampleProposal,
};

Deno.test("Document Generator - PDF Compilation to File", async () => {
  const tempPath = await Deno.makeTempFile({ suffix: ".pdf" });

  await PDFGenerator.writeTermSheetPDF(tempPath, sampleParams);

  // Confirm PDF file was written and is not empty
  const fileStat = await Deno.stat(tempPath);
  assertEquals(fileStat.size > 0, true);

  // Cleanup
  await Deno.remove(tempPath);
});

Deno.test("Document Generator - PDF Compilation to Uint8Array", async () => {
  const pdfBytes = await PDFGenerator.generateTermSheetPDF(sampleParams);

  // Confirm PDF bytes are generated and valid
  assertEquals(pdfBytes instanceof Uint8Array, true);
  assertEquals(pdfBytes.length > 0, true);
});

Deno.test("Document Generator - LaTeX Source Generation", () => {
  const latexSource = LaTeXGenerator.generateTermSheetLaTeX(sampleParams);

  // Confirm LaTeX structure and parameter embedding
  assertEquals(
    latexSource.includes("\\documentclass[11pt,a4paper]{article}"),
    true,
  );
  assertEquals(latexSource.includes("Buyer Corp"), true);
  assertEquals(latexSource.includes("Seller Corp"), true);
  assertEquals(latexSource.includes("Target Corp"), true);
  assertEquals(
    latexSource.includes("10,000,000") || latexSource.includes("10.000.000"),
    true,
  );
  assertEquals(latexSource.includes("60.00\\%"), true);
  assertEquals(latexSource.includes("75.00\\%"), true);
  assertEquals(latexSource.includes("24 meses"), true);
});
