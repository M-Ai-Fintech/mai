import type { JcpInput } from "../../../shared/types.ts";

/**
 * Computes the JCP corporate tax shield benefits.
 * Saves 34% combined tax in the Lucro Real regime, subject to shareholder IRRF.
 */
export function computeJcpTaxShield(
  input: JcpInput,
): { taxShieldBenefit: number; netJcpValue: number } {
  const { jcpAmount, corporateTaxRate, withholdingTaxRate = 0.15 } = input;
  if (jcpAmount <= 0) {
    return { taxShieldBenefit: 0, netJcpValue: 0 };
  }
  const taxShieldBenefit = jcpAmount * corporateTaxRate;
  const withholdingTax = jcpAmount * withholdingTaxRate;
  const netJcpValue = jcpAmount - withholdingTax;

  return { taxShieldBenefit, netJcpValue };
}
