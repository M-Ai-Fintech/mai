import type { CalculationBinding } from "./definitions/index.ts";
import {
  MATCHING_CALCULATION_BINDINGS,
  TERM_SHEET_CALCULATION_BINDINGS,
} from "./definitions/specialist_calculations.ts";
import {
  negotiationProposalCalculationContextSchema,
  parseCalculationContext,
  portfolioSelectionCalculationContextSchema,
  synergyPricingCalculationContextSchema,
} from "./definitions/calculation_inputs.ts";
import { calculateSynergyPrice } from "../engines/valuation/synergy_calculation.ts";
import { selectPortfolio } from "../engines/optimization/matching/portfolio_selection.ts";
import {
  optimizeNegotiationProposal,
} from "../engines/optimization/negotiation/optimizer.ts";
import { emptyCost } from "../agent_runtime/runner_support.ts";
import {
  CalculationPortRegistry,
  type GovernedCalculationOutput,
  type GovernedCalculationPort,
  type GovernedCalculationRequest,
} from "./governed_calculation_ports.ts";

const PORTFOLIO_ENGINE_REFERENCE =
  "src/engines/optimization/matching/portfolio_selection.ts";
const SYNERGY_ENGINE_REFERENCE = "src/engines/valuation/synergy_calculation.ts";
const TERM_SHEET_ENGINE_REFERENCE =
  "src/engines/optimization/negotiation/optimizer.ts";

const PORTFOLIO_BINDING = declaredBinding(
  MATCHING_CALCULATION_BINDINGS,
  "calculation.portfolio",
);
const SYNERGY_BINDING = declaredBinding(
  MATCHING_CALCULATION_BINDINGS,
  "calculation.synergy",
);
const TERM_SHEET_BINDING = declaredBinding(
  TERM_SHEET_CALCULATION_BINDINGS,
  "calculation.term-sheet",
);

export class PortfolioSelectionCalculationPort
  implements GovernedCalculationPort {
  readonly name = PORTFOLIO_BINDING.purePort;
  readonly deterministic = true as const;

  execute(
    request: GovernedCalculationRequest,
  ): Promise<GovernedCalculationOutput> {
    return Promise.resolve().then(() => {
      assertBinding(request, PORTFOLIO_BINDING);
      const input = parseCalculationContext(
        request.input,
        portfolioSelectionCalculationContextSchema,
        PORTFOLIO_BINDING.capability,
      );
      return calculationOutput(
        request,
        PORTFOLIO_ENGINE_REFERENCE,
        selectPortfolio(input),
      );
    });
  }
}

export class SynergyPricingCalculationPort implements GovernedCalculationPort {
  readonly name = SYNERGY_BINDING.purePort;
  readonly deterministic = true as const;

  execute(
    request: GovernedCalculationRequest,
  ): Promise<GovernedCalculationOutput> {
    return Promise.resolve().then(() => {
      assertBinding(request, SYNERGY_BINDING);
      const input = parseCalculationContext(
        request.input,
        synergyPricingCalculationContextSchema,
        SYNERGY_BINDING.capability,
      );
      const outcome = calculateSynergyPrice(input);
      if (!outcome.ok) {
        throw new Error(
          "Calculation " + SYNERGY_BINDING.capability +
            " failed in its deterministic engine: " + outcome.error.message +
            ".",
        );
      }
      return calculationOutput(
        request,
        SYNERGY_ENGINE_REFERENCE,
        outcome.value,
      );
    });
  }
}

export class NegotiationProposalOptimizationCalculationPort
  implements GovernedCalculationPort {
  readonly name = TERM_SHEET_BINDING.purePort;
  readonly deterministic = true as const;

  execute(
    request: GovernedCalculationRequest,
  ): Promise<GovernedCalculationOutput> {
    return Promise.resolve().then(() => {
      assertBinding(request, TERM_SHEET_BINDING);
      const input = parseCalculationContext(
        request.input,
        negotiationProposalCalculationContextSchema,
        TERM_SHEET_BINDING.capability,
      );
      return calculationOutput(
        request,
        TERM_SHEET_ENGINE_REFERENCE,
        optimizeNegotiationProposal(input),
      );
    });
  }
}

const PRODUCTION_CALCULATION_PORTS = Object.freeze([
  new PortfolioSelectionCalculationPort(),
  new SynergyPricingCalculationPort(),
  new NegotiationProposalOptimizationCalculationPort(),
]);

export function createProductionCalculationRegistry(): CalculationPortRegistry {
  return new CalculationPortRegistry(PRODUCTION_CALCULATION_PORTS);
}

function calculationOutput<Result extends object>(
  request: GovernedCalculationRequest,
  engineReference: string,
  result: Result,
): GovernedCalculationOutput {
  return {
    value: {
      success: true,
      response: JSON.stringify(result),
      timestamp: request.step.createdAt.toISOString(),
      calculation: {
        ...request.binding,
        engineReference,
        result,
      },
    },
    cost: emptyCost(),
  };
}

function assertBinding(
  request: GovernedCalculationRequest,
  expected: CalculationBinding,
): void {
  const received = bindingReceipt(request.capability, request.binding);
  const declared = bindingReceipt(expected.capability, expected);
  if (received === declared) return;
  throw new Error(
    'Calculation binding "' + received + '" does not match declared binding "' +
      declared +
      '"; expected the exact capability, pure port, operation, and action receipt.',
  );
}

function bindingReceipt(
  capability: string,
  binding: Pick<CalculationBinding, "purePort" | "operation" | "action">,
): string {
  return capability + "/" + binding.purePort + "/" + binding.operation + "/" +
    binding.action;
}

function declaredBinding(
  bindings: readonly CalculationBinding[],
  capability: string,
): CalculationBinding {
  const binding = bindings.find((candidate) =>
    candidate.capability === capability
  );
  if (binding !== undefined) return binding;
  throw new Error(
    'Production calculation capability "' + capability +
      '" lacks a declared binding; expected one specialist calculation binding.',
  );
}
