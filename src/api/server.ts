import { verifyRegistryTool } from "../agent/actions.ts";
import { MLEngine, CompanyFinancialProfile } from "../engines/prediction/ml.ts";
import { PortfolioSolver } from "../engines/optimization/kyc/index.ts";
import { TermSheetOptimizer } from "../engines/optimization/matching/index.ts";
import { LaTeXGenerator } from "../engines/document-generator/latex.ts";
import { PDFGenerator } from "../engines/document-generator/pdf.ts";
import { AgentOrchestrator } from "../agent/index.ts";

const PORT = 8000;

export function startServer() {
  console.log(`[API Server] Starting on http://localhost:${PORT}`);
  
  Deno.serve({ port: PORT }, async (req) => {
    // CORS Headers
    const headers = new Headers({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });

    if (req.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    const url = new URL(req.url);

    try {
      if (req.method === "POST" && url.pathname === "/api/kyb") {
        const body = await req.json();
        const res = await verifyRegistryTool.execute!({ cnpj: body.cnpj }, {} as any);
        return new Response(JSON.stringify(res.data), { headers: { ...headers.entries(), "Content-Type": "application/json" } });
      }

      if (req.method === "POST" && url.pathname === "/api/predict") {
        const body = await req.json();
        const profile: CompanyFinancialProfile = {
          name: body.name,
          businessSector: body.sector,
          ebitda: body.ebitda,
          revenue: body.revenue,
          totalAssets: body.assets,
          totalLiabilities: body.liabilities,
          operatingCashFlow: body.cashflow,
          historicalVolatility: body.volatility
        };
        const report = await MLEngine.analyzeProfile(profile);
        return new Response(JSON.stringify(report), { headers: { ...headers.entries(), "Content-Type": "application/json" } });
      }

      if (req.method === "POST" && url.pathname === "/api/portfolio") {
        const body = await req.json();
        // Fallback targets for MVP HTTP response
        const pipelineTargets = [
          {
            id: "T1", name: "Alpha Tech S.A.", synergyValue: 85, acquisitionCost: 40,
            ebitda: 3500000, revenue: 12000000, totalAssets: 15000000, totalLiabilities: 8000000,
            operatingCashFlow: 2500000, historicalVolatility: 0.14, businessSector: "Tecnologia",
            taxDebtsAmount: 0
          }
        ];
        const res = await PortfolioSolver.evaluateAndOptimize(pipelineTargets, {
          budgetLimit: body.budget,
          riskToleranceLimit: body.riskTolerance,
          taxDebtCap: 999999999,
          mutualExclusions: []
        });
        return new Response(JSON.stringify(res), { headers: { ...headers.entries(), "Content-Type": "application/json" } });
      }

      if (req.method === "POST" && url.pathname === "/api/negotiate") {
        const res = await TermSheetOptimizer.run({
          populationSize: 10, // reduced for fast API response
          generations: 10,
          mutationRate: 0.1,
          crossoverRate: 0.8,
          minBuyerReservationUtility: 0.2,
          minSellerReservationUtility: 0.2,
        });
        return new Response(JSON.stringify(res), { headers: { ...headers.entries(), "Content-Type": "application/json" } });
      }

      if (req.method === "POST" && url.pathname === "/api/document") {
        const body = await req.json();
        const out = body.output || "./term_sheets/api_output.pdf";
        await PDFGenerator.writeTermSheetPDF(out, {
          buyerName: body.buyer,
          sellerName: body.seller,
          targetName: body.target,
          valuationAmount: body.valuation,
          proposal: { cashPercentage: 0.6, buyerEquityShare: 0.8, earnOutTargetYears: 2, nonCompeteMonths: 24, escrowPercentage: 0.1 } as any
        });
        return new Response(JSON.stringify({ status: "success", file: out }), { headers: { ...headers.entries(), "Content-Type": "application/json" } });
      }

      if (req.method === "GET" && url.pathname === "/api/chat") {
        const dealId = url.searchParams.get("dealId") || "default_deal";
        const query = url.searchParams.get("query") || "";
        
        let controller: ReadableStreamDefaultController;
        const stream = new ReadableStream({
          start(c) {
            controller = c;
            // Execute Agent asynchronously and stream result
            AgentOrchestrator.executeAgentQuery(dealId, query)
              .then(reply => {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(reply)}\n\n`));
                controller.close();
              })
              .catch(err => {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
                controller.close();
              });
          }
        });
        
        return new Response(stream, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
          }
        });
      }

      return new Response("Not Found", { status: 404, headers });
    } catch (err: any) {
      console.error("[API Error]", err);
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...headers.entries(), "Content-Type": "application/json" } });
    }
  });
}
