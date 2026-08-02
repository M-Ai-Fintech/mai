import type {
  CalculationOutcome,
  SynergyInput,
  SynergyResult,
} from "./types.ts";
import {
  failure,
  finiteErrorFor,
  firstError,
  presentValue,
  roundMoney,
  success,
} from "./support.ts";
import { validateSynergyInput } from "./validation.ts";

export function calculateSynergyPrice(
  input: SynergyInput,
): CalculationOutcome<SynergyResult> {
  const error = validateSynergyInput(input);
  if (error) return failure(error);
  const taxFactor = 1 - input.taxRate.decimal;
  const costValue = presentValue(
    input.costSynergies,
    input.discountRate,
    taxFactor,
  );
  const revenueValue = presentValue(
    input.revenueSynergies,
    input.discountRate,
    (1 - input.revenueHaircut.decimal) * taxFactor,
  );
  const integrationValue = presentValue(
    input.integrationCosts,
    input.discountRate,
    taxFactor,
  );
  const netValue = costValue + revenueValue - integrationValue;
  const sellerPremium = input.sharingCoefficient.decimal * netValue;
  const purchasePrice = input.standaloneValue.amount + sellerPremium;
  const finiteError = firstError(
    finiteErrorFor(costValue, "presentValueCostSynergies"),
    finiteErrorFor(revenueValue, "presentValueRevenueSynergies"),
    finiteErrorFor(integrationValue, "presentValueIntegrationCosts"),
    finiteErrorFor(netValue, "netSynergyValue"),
    finiteErrorFor(sellerPremium, "sellerPremium"),
    finiteErrorFor(purchasePrice, "recommendedPurchasePrice"),
  );
  if (finiteError) return failure(finiteError);
  return synergySuccess(
    input,
    costValue,
    revenueValue,
    integrationValue,
    netValue,
    sellerPremium,
    purchasePrice,
  );
}

function synergySuccess(
  input: SynergyInput,
  costValue: number,
  revenueValue: number,
  integrationValue: number,
  netValue: number,
  sellerPremium: number,
  purchasePrice: number,
): CalculationOutcome<SynergyResult> {
  const currency = input.standaloneValue.currency;
  return success(
    {
      method: "synergy-pricing",
      presentValueCostSynergies: roundMoney(costValue, currency, input.options),
      presentValueRevenueSynergies: roundMoney(
        revenueValue,
        currency,
        input.options,
      ),
      presentValueIntegrationCosts: roundMoney(
        integrationValue,
        currency,
        input.options,
      ),
      netSynergyValue: roundMoney(netValue, currency, input.options),
      sellerPremium: roundMoney(sellerPremium, currency, input.options),
      recommendedPurchasePrice: roundMoney(
        purchasePrice,
        currency,
        input.options,
      ),
      sharingCoefficient: { decimal: input.sharingCoefficient.decimal },
    },
    "valuation.synergy-pricing",
    [
      "standaloneValue",
      "costSynergies",
      "revenueSynergies",
      "integrationCosts",
      "discountRate",
      "taxRate",
      "revenueHaircut",
      "sharingCoefficient",
    ],
    input.options,
  );
}
