import { verifyRegistryTool } from "../agent/actions.ts";
import { CompanyFinancialProfile, MLEngine } from "../engines/prediction/ml.ts";
import { PortfolioSolver } from "../engines/optimization/kyc/index.ts";
import {
  CoverageConstraint,
  KycConstraint,
  LeverageConstraint,
  optimizeWithConstraints,
} from "../engines/optimization/index.ts";
import { PDFGenerator } from "../engines/document-generator/pdf.ts";
import { AgentOrchestrator } from "../agent/index.ts";
import { TransactionRepository } from "../core/db/TransactionRepository.ts";
import { handleMvpRoute } from "./mvp_routes.ts";

const PORT = 8000;

function withMvpHeaders(response: Response, corsHeaders: Headers): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of corsHeaders.entries()) headers.set(name, value);
  headers.set("X-MAI-Persistence", "mock-backed-in-memory");
  headers.set(
    "Access-Control-Expose-Headers",
    "X-MAI-Persistence, X-Resource-Version",
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function startServer() {
  const repo = TransactionRepository.getRepoInstance();

  // Connect to DB asynchronously
  repo.connect().then((connected) => {
    if (connected) {
      console.log("[API Server] Database connected successfully.");
    } else {
      console.warn(
        "[API Server] Database not connected. Running in fallback mode.",
      );
    }
  });

  console.log(`[API Server] Starting on http://localhost:${PORT}`);

  Deno.serve({ port: PORT }, async (req) => {
    // CORS Headers
    const headers = new Headers({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Last-Event-ID",
    });

    if (req.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    const url = new URL(req.url);

    try {
      const mvpResponse = await handleMvpRoute(req, {
        executeChat: async ({ dealId, message }) => ({
          content: await AgentOrchestrator.executeAgentQuery(dealId, message),
          citations: [],
        }),
      });
      if (mvpResponse) return withMvpHeaders(mvpResponse, headers);

      if (req.method === "POST" && url.pathname === "/api/kyb") {
        const body = await req.json();
        const res = await verifyRegistryTool.execute!(
          { cnpj: body.cnpj },
          {} as Parameters<NonNullable<typeof verifyRegistryTool.execute>>[1],
        );
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
          historicalVolatility: body.volatility,
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
            id: "T1",
            name: "Alpha Tech S.A.",
            synergyValue: 85,
            acquisitionCost: 40,
            ebitda: 3500000,
            revenue: 12000000,
            totalAssets: 15000000,
            totalLiabilities: 8000000,
            operatingCashFlow: 2500000,
            historicalVolatility: 0.14,
            businessSector: "Tecnologia",
            taxDebtsAmount: 0,
          },
        ];
        const res = await PortfolioSolver.evaluateAndOptimize(pipelineTargets, {
          budgetLimit: body.budget,
          riskToleranceLimit: body.riskTolerance,
          taxDebtCap: 999999999,
          mutualExclusions: [],
        });

        // Persist input and portfolio solver results
        try {
          await repo.saveDomainKnowledge("PortfolioOptimization", {
            input: {
              budget: body.budget,
              riskTolerance: body.riskTolerance,
              targets: pipelineTargets,
            },
            result: res,
          });
        } catch (dbErr) {
          console.error(
            "Failed to persist portfolio optimization to database:",
            dbErr,
          );
        }

        const resHeaders = new Headers(headers);
        resHeaders.set("Content-Type", "application/json");
        return new Response(JSON.stringify(res), { headers: resHeaders });
      }

      if (req.method === "POST" && url.pathname === "/api/negotiate") {
        let body: {
          valuationMin?: number;
          valuationMax?: number;
          preferences?: {
            cash: number;
            equity: number;
            earnOut: number;
            escrow: number;
          };
          kyc?: {
            kycBlocked: boolean;
            sanctionMatch: boolean;
            pepExposure: boolean;
          };
          financial?: { ebitda: number; debt: number; interestExpense: number };
          maxLeverage?: number;
          minCoverage?: number;
          geneticConfig?: { populationSize: number; generations: number };
        } = {};
        try {
          body = await req.json();
        } catch {
          // fallback to defaults if no body
        }

        const profile = {
          valuationMin: body.valuationMin ?? 80,
          valuationMax: body.valuationMax ?? 120,
          preferences: body.preferences ??
            { cash: 0.4, equity: 0.3, earnOut: 0.2, escrow: 0.1 },
        };

        const kyc = body.kyc ??
          { kycBlocked: false, sanctionMatch: false, pepExposure: false };
        const financial = body.financial ??
          { ebitda: 5.0, debt: 15.0, interestExpense: 1.0 };

        const constraints = [
          new KycConstraint(),
          new LeverageConstraint(body.maxLeverage ?? 4.0),
          new CoverageConstraint(body.minCoverage ?? 2.5),
        ];

        const res = optimizeWithConstraints({
          profile,
          kyc,
          financial,
          constraints,
          geneticConfig: body.geneticConfig ??
            { populationSize: 100, generations: 40 },
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
          proposal: {
            cashPercentage: 0.6,
            buyerEquityShare: 0.8,
            earnOutTargetYears: 2,
            nonCompeteMonths: 24,
          },
        });
        const resHeaders = new Headers(headers);
        resHeaders.set("Content-Type", "application/json");
        return new Response(JSON.stringify({ status: "success", file: out }), {
          headers: resHeaders,
        });
      }

      return new Response("Not Found", { status: 404, headers });
    } catch (err: unknown) {
      console.error("[API Error]", err);
      const resHeaders = new Headers(headers);
      resHeaders.set("Content-Type", "application/json");
      return new Response(
        JSON.stringify({
          error: err instanceof Error ? err.message : "Unexpected server error",
        }),
        {
          status: 500,
          headers: resHeaders,
        },
      );
    }
  });
}

if (import.meta.main) {
  startServer();
}
