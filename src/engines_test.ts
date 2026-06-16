// src/engines_test.ts
import { assertEquals, assertNotEquals, assertThrows } from "jsr:@std/assert";
import { TransformersEngine } from "./engines/prediction/Transformers.ts";
import { ONNXEngine } from "./engines/prediction/ONNX.ts";
import { MILPOptimizer, MATarget } from "./engines/optimization/MILP.ts";
import { TermSheetGeneticOptimizer } from "./engines/optimization/genetic_search.ts";
import { PDFGenerator } from "./engines/document-generator/PDF.ts";
import { VDRIntegration } from "./core/integrations/vdr.ts";
import { MADealLifecycle } from "./core/business_logic/ma_flow.ts";
import { ContinuousLearningEngine } from "./agent/continuous_learning.ts";

/**
 * 1. Prediction Engine Test
 */
Deno.test("Prediction Engine - Mock Embedding Vector Length", async () => {
  const embedding = await TransformersEngine.generateEmbedding("SaaS cloud technology");
  assertEquals(embedding.length, 384);
  
  // Verify vector is normalized (norm should be ~1)
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  assertEquals(Math.abs(norm - 1.0) < 1e-4, true);
});

Deno.test("Prediction Engine - ONNX Model Risk Outputs", async () => {
  const highRiskInput = {
    ebitda: -500000,
    revenue: 2000000,
    totalAssets: 5000000,
    totalLiabilities: 4500000, // Very leveraged
    operatingCashFlow: -200000,
    historicalVolatility: 0.45,
  };

  const report = await ONNXEngine.runModelInference(highRiskInput);
  
  // High debt and negative cash flows should yield elevated insolvency and churn risk
  assertEquals(report.insolvencyRisk > 0.5, true);
  assertEquals(report.churnProbability > 0.4, true);
  assertEquals(report.industry4Score < 60, true);
});

/**
 * 2. Optimization Engine Test
 */
Deno.test("Optimization Engine - MILP Solver Constraints", async () => {
  const targets: MATarget[] = [
    { id: "1", name: "Target A", synergyValue: 80, acquisitionCost: 30, kycRiskIndex: 0.1 },
    { id: "2", name: "Target B", synergyValue: 90, acquisitionCost: 40, kycRiskIndex: 0.15 },
    { id: "3", name: "Target C", synergyValue: 60, acquisitionCost: 20, kycRiskIndex: 0.4 }, // Excluded by high risk
    { id: "4", name: "Target D", synergyValue: 50, acquisitionCost: 15, kycRiskIndex: 0.05 },
  ];

  const config = {
    budgetLimit: 60,
    riskToleranceLimit: 0.2, // Targets with risk > 0.2 are excluded
    mutualExclusions: [["1", "4"]] as [string, string][], // Competitors excluded
  };

  const result = await MILPOptimizer.optimizePortfolio(targets, config);

  // Assertions
  assertEquals(result.totalCostSpent <= config.budgetLimit, true);
  // Target 3 has kycRiskIndex = 0.4 which is > 0.2 risk limit, so it should not be selected
  assertEquals(result.selectedTargetIds.includes("3"), false);
  // Target 1 and 4 are mutually exclusive, so they cannot be selected together
  const selectedBoth1And4 = result.selectedTargetIds.includes("1") && result.selectedTargetIds.includes("4");
  assertEquals(selectedBoth1And4, false);
});

Deno.test("Optimization Engine - Genetic Negotiation Utility Equilibrium", () => {
  const result = TermSheetGeneticOptimizer.optimizeTermSheet({
    populationSize: 50,
    generations: 20,
    mutationRate: 0.1,
    crossoverRate: 0.8,
    minBuyerReservationUtility: 0.35,
    minSellerReservationUtility: 0.35,
  });

  // Verify joint bargaining solution satisfies minimum reservations
  assertEquals(result.buyerUtility >= 0.35, true);
  assertEquals(result.sellerUtility >= 0.35, true);
  assertEquals(result.fitness >= 0, true);
});

/**
 * 3. Document Generator Test
 */
Deno.test("Document Generator - PDF Compilation", async () => {
  const tempPath = await Deno.makeTempFile({ suffix: ".pdf" });
  
  const proposal = {
    cashPercentage: 0.6,
    buyerEquityShare: 0.75,
    earnOutTargetYears: 3.0,
    nonCompeteMonths: 24,
  };

  await PDFGenerator.writeTermSheetPDF(tempPath, {
    buyerName: "Buyer Corp",
    sellerName: "Seller Corp",
    targetName: "Target Corp",
    valuationAmount: 10000000,
    proposal,
  });

  // Confirm PDF file was written and is not empty
  const fileStat = await Deno.stat(tempPath);
  assertEquals(fileStat.size > 0, true);
  
  // Cleanup
  await Deno.remove(tempPath);
});

/**
 * 4. Core VDR Integration Test
 */
Deno.test("Core VDR - Scan and KYB Registry Queries", async () => {
  const cnpjData = await VDRIntegration.queryKYBRegistry("12.345.678/0001-99");
  assertEquals(cnpjData.status, "ATIVA");
  assertEquals(cnpjData.shareCapital > 0, true);

  const vdrDocs = VDRIntegration.generateMockVDRDocuments();
  assertEquals(vdrDocs.length > 0, true);
  assertEquals(vdrDocs[0].category, "financial");
});

/**
 * 5. M&A Deal Lifecycle State Machine Test
 */
Deno.test("Core Flow - M&A Lifecycle Valid and Invalid Transitions", () => {
  const deal = MADealLifecycle.createDeal("Buyer Inc", "Seller Inc", "Target Ltda", 5000000);
  assertEquals(deal.currentState, "INITIATED");

  // Valid transition
  const updatedDeal = MADealLifecycle.transitionTo(deal, "NDA_SIGNED", "especialista", "NDA firmado.");
  assertEquals(updatedDeal.currentState, "NDA_SIGNED");

  // Invalid transition: going from NDA_SIGNED directly to VALUATION_COMPLETE (skipping DUE_DILIGENCE_ACTIVE)
  assertThrows(() => {
    MADealLifecycle.transitionTo(updatedDeal, "VALUATION_COMPLETE", "especialista", "Pular due diligence.");
  });
});

/**
 * 6. Continuous Learning Test
 */
Deno.test("Continuous Learning - Record Feedback & Prompt generation", async () => {
  const dealId = "test_deal_feedback";
  
  await ContinuousLearningEngine.recordCorrection({
    dealId,
    variableName: "valuation",
    originalValue: 10000000,
    correctedValue: 12000000,
    reason: "Sinergias de tecnologia subavaliadas pelo modelo.",
  });

  const history = await ContinuousLearningEngine.getFeedbackHistory(dealId);
  assertEquals(history.length > 0, true);
  assertEquals(history[0].correctedValue, 12000000);

  const prompt = await ContinuousLearningEngine.generateInContextLearningPrompt(dealId);
  assertEquals(prompt.includes("valuation"), true);
  assertEquals(prompt.includes("12000000"), true);
  
  // Cleanup test feedback file
  try {
    await Deno.remove("./data/human_feedback.json");
  } catch (_e) {
    // Ignore cleanup error
  }
});
