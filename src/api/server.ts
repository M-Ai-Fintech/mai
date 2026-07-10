import { verifyRegistryTool } from "../agent/actions.ts";
import { MLEngine, CompanyFinancialProfile } from "../engines/prediction/ml.ts";
import { PortfolioSolver } from "../engines/optimization/kyc/index.ts";
import { TermSheetOptimizer } from "../engines/optimization/matching/index.ts";
import { optimizeWithConstraints, KycConstraint, LeverageConstraint, CoverageConstraint } from "../engines/optimization/index.ts";
import { LaTeXGenerator } from "../engines/document-generator/latex.ts";
import { PDFGenerator } from "../engines/document-generator/pdf.ts";
import { AgentOrchestrator } from "../agent/index.ts";
import { TransactionRepository } from "../core/db/TransactionRepository.ts";

const PORT = 8000;

async function getValidTransactionId(repo: TransactionRepository, dealId: string): Promise<string> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(dealId)) {
    try {
      const res = await repo.executeRawQuery<{ id: string }>(
        "SELECT id FROM transaction WHERE id = $1",
        [dealId]
      );
      if (res.length > 0) {
        return res[0].id;
      }
    } catch {
      // ignore and fallback
    }
  }

  // Fallback 1: Try to find any transaction
  try {
    const firstTx = await repo.executeRawQuery<{ id: string }>(
      "SELECT id FROM transaction LIMIT 1"
    );
    if (firstTx.length > 0) {
      return firstTx[0].id;
    }
  } catch {
    // ignore
  }

  // Fallback 2: Create a default transaction
  try {
    const newId = await repo.createDeal(
      "Default Deal",
      "DEFAULT_DEAL_" + Math.random().toString(36).substring(2, 7).toUpperCase(),
      "Acquisition",
      "Horizontal Integration",
      "Active",
      10000000
    );
    return newId;
  } catch (err) {
    console.error("Failed to create default deal:", err);
    throw err;
  }
}

export function startServer() {
  const repo = TransactionRepository.getRepoInstance();

  // Connect to DB asynchronously
  repo.connect().then((connected) => {
    if (connected) {
      console.log("[API Server] Database connected successfully.");
    } else {
      console.warn("[API Server] Database not connected. Running in fallback mode.");
    }
  });

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

    // URL Patterns for route matching
    const dealByIdPattern = new URLPattern({ pathname: "/api/deals/:id" });
    const dealPhasePattern = new URLPattern({ pathname: "/api/deals/:id/phase" });

    const matchDealById = dealByIdPattern.exec(req.url);
    const matchDealPhase = dealPhasePattern.exec(req.url);

    try {
      if (req.method === "POST" && url.pathname === "/api/kyb") {
        const body = await req.json();
        const res = await verifyRegistryTool.execute!({ cnpj: body.cnpj }, {} as any);
        const resHeaders = new Headers(headers);
        resHeaders.set("Content-Type", "application/json");
        return new Response(JSON.stringify(res.data), { headers: resHeaders });
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

        // Persist input and prediction report
        try {
          await repo.saveDomainKnowledge("Prediction", { profile, report });
        } catch (dbErr) {
          console.error("Failed to persist prediction to database:", dbErr);
        }

        const resHeaders = new Headers(headers);
        resHeaders.set("Content-Type", "application/json");
        return new Response(JSON.stringify(report), { headers: resHeaders });
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

        // Persist input and portfolio solver results
        try {
          await repo.saveDomainKnowledge("PortfolioOptimization", {
            input: {
              budget: body.budget,
              riskTolerance: body.riskTolerance,
              targets: pipelineTargets
            },
            result: res
          });
        } catch (dbErr) {
          console.error("Failed to persist portfolio optimization to database:", dbErr);
        }

        const resHeaders = new Headers(headers);
        resHeaders.set("Content-Type", "application/json");
        return new Response(JSON.stringify(res), { headers: resHeaders });
      }

      if (req.method === "POST" && url.pathname === "/api/negotiate") {
        let body: any = {};
        try {
          body = await req.json();
        } catch {
          // fallback to defaults if no body
        }

        const profile = {
          valuationMin: body.valuationMin ?? 80,
          valuationMax: body.valuationMax ?? 120,
          preferences: body.preferences ?? { cash: 0.4, equity: 0.3, earnOut: 0.2, escrow: 0.1 }
        };

        const kyc = body.kyc ?? { kycBlocked: false, sanctionMatch: false, pepExposure: false };
        const financial = body.financial ?? { ebitda: 5.0, debt: 15.0, interestExpense: 1.0 };

        const constraints = [
          new KycConstraint(),
          new LeverageConstraint(body.maxLeverage ?? 4.0),
          new CoverageConstraint(body.minCoverage ?? 2.5)
        ];

        const res = optimizeWithConstraints({
          profile,
          kyc,
          financial,
          constraints,
          geneticConfig: body.geneticConfig ?? { populationSize: 100, generations: 40 }
        });

        const resHeaders = new Headers(headers);
        resHeaders.set("Content-Type", "application/json");
        return new Response(JSON.stringify(res), { headers: resHeaders });
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
        const resHeaders = new Headers(headers);
        resHeaders.set("Content-Type", "application/json");
        return new Response(JSON.stringify({ status: "success", file: out }), { headers: resHeaders });
      }

      // GET /api/deals - retrieves active deals
      if (req.method === "GET" && (url.pathname === "/api/deals" || url.pathname === "/api/deals/")) {
        const deals = await repo.getDeals({ activeOnly: true });
        const resHeaders = new Headers(headers);
        resHeaders.set("Content-Type", "application/json");
        return new Response(JSON.stringify(deals), { headers: resHeaders });
      }

      // POST /api/deals - creates a new deal (helper endpoint)
      if (req.method === "POST" && (url.pathname === "/api/deals" || url.pathname === "/api/deals/")) {
        const body = await req.json();
        const dealId = await repo.createDeal(
          body.title || "Untitled Deal",
          body.code || "DEAL_" + Math.random().toString(36).substring(2, 7).toUpperCase(),
          body.type || "Acquisition",
          body.strategy || "Horizontal Integration",
          body.status || "Active",
          body.targetValuation || 0
        );
        const resHeaders = new Headers(headers);
        resHeaders.set("Content-Type", "application/json");
        return new Response(JSON.stringify({ id: dealId, message: "Deal created successfully" }), { headers: resHeaders });
      }

      // GET /api/deals/:id - retrieves specific deal details
      if (req.method === "GET" && matchDealById) {
        const id = matchDealById.pathname.groups.id!;
        const deal = await repo.getDealById(id);
        const resHeaders = new Headers(headers);
        resHeaders.set("Content-Type", "application/json");
        if (!deal) {
          return new Response(JSON.stringify({ error: "Deal not found" }), { status: 404, headers: resHeaders });
        }
        return new Response(JSON.stringify(deal), { headers: resHeaders });
      }

      // POST /api/deals/:id/phase - advances transaction phase
      if (req.method === "POST" && matchDealPhase) {
        const id = matchDealPhase.pathname.groups.id!;
        const body = await req.json();
        const resHeaders = new Headers(headers);
        resHeaders.set("Content-Type", "application/json");
        if (!body.phaseName || !body.statusName) {
          return new Response(JSON.stringify({ error: "phaseName and statusName are required" }), { status: 400, headers: resHeaders });
        }
        const updated = await repo.updateDealPhase(id, body.phaseName, body.statusName, body.comments, body.data);
        return new Response(JSON.stringify(updated), { headers: resHeaders });
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
              .then(async (reply) => {
                // Save chat interaction to flow_checkpoints
                try {
                  const validTxId = await getValidTransactionId(repo, dealId);
                  await repo.saveFlowCheckpoint(
                    validTxId,
                    "BrokerOrchestratorAgent",
                    "chat",
                    { query, reply }
                  );
                } catch (dbErr) {
                  console.error("Failed to save flow checkpoint to database:", dbErr);
                }

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
      const resHeaders = new Headers(headers);
      resHeaders.set("Content-Type", "application/json");
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: resHeaders });
    }
  });
}

if (import.meta.main) {
  startServer();
}
