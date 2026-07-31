# M&A Sector Multiples: EV/EBITDA Adjustments for Brazil

This document outlines the framework for applying and adjusting Enterprise
Value-to-EBITDA (EV/EBITDA) multiples in the Brazilian market. It covers typical
sector benchmarks and the specific macroeconomic adjustments required to align
international comparables with Brazilian realities.

---

## 1. Sector Benchmarks (2025-2026 Middle-Market)

The following table provides the normalized EV/EBITDA ranges for middle-market
transactions in Brazil. These multiples represent transactions with enterprise
values between BRL 50M and BRL 500M.

| Sector                   | EV/EBITDA Range  | Growth Profile       | Core Valuation Drivers                                                                                                  |
| :----------------------- | :--------------- | :------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| **SaaS & Technology**    | **8.0x – 14.0x** | High (ARR-driven)    | Net Revenue Retention (NRR), LTV/CAC ratio, annual recurring revenue scalability, and local cloud hosting dependencies. |
| **Healthcare**           | **6.5x – 10.0x** | Moderate (Defensive) | Geographic bed/clinic density, patient recurrence, average ticket size, and compliance with ANVISA regulations.         |
| **Agribusiness**         | **5.0x – 8.5x**  | Moderate-High        | Export exposure (hedging), asset-backed collateral (land, silos), logistics infrastructure, and weather risk profiles.  |
| **Traditional Industry** | **4.0x – 7.0x**  | Low-Moderate         | Capital Expenditure (Capex) intensity, capacity utilization, raw material volatility, and labor liability exposure.     |

---

## 2. Macroeconomic Adjustments for the Brazilian Context

Applying standard multiples from developed markets (e.g., US or Europe) directly
to Brazilian companies results in overvaluation. The following adjustments are
mandatory for a mathematically sound valuation:

### A. Country Risk Premium (CRP)

Brazil's emerging market status implies higher political, currency, and
institutional risks. This must be factored into the Discounted Cash Flow (DCF)
models that underpin the multiples:

- **Formula:** $WACC_{Brazil} = WACC_{US} + CRP_{Brazil} + Fx_{Diff}$
- **Implementation:** The **EMBI+ Brazil (Emerging Markets Bond Index)** spread
  is added to the cost of equity. Historically, this premium ranges between
  **200 to 450 bps** (2.0% to 4.5%).
- **Impact on Multiples:** A higher discount rate compresses the terminal value,
  resulting in an implied EV/EBITDA multiple reduction of approximately **1.5x
  to 3.0x** compared to equivalent US peers.

### B. Inflation Adjustments (IPCA vs. IGP-M)

Brazil has a dual inflation dynamic:

- **IPCA (Consumer Price Index):** Governs salaries and general services.
- **IGP-M (General Market Price Index):** Strongly tied to wholesale commodities
  and commercial rents, often highly volatile due to foreign exchange
  variations.
- **Valuation Impact:** EBITDA projections must decouple revenue adjustments
  (often tied to IGP-M or IPCA) from cost inflation. Over-indexing revenues
  without matching cost escalation artificially inflates EBITDA, leading to
  unrealistic multiple applications.

### C. Liquidity Constraints & Size Discount

Middle-market companies in Brazil suffer from severe liquidity constraints.

- **Private Company Discount (DLOM - Discount for Lack of Marketability):** A
  discount of **20% to 35%** is standard when comparing a private Brazilian
  target with publicly traded peers.
- **Scale Discount:** Smaller operational scale increases EBITDA volatility. If
  the target's EBITDA is below BRL 30M, a further size premium (typically **1.5%
  to 3.0%** added to WACC) is applied, depressing the target multiple.

### D. "Custo Brasil" & Tax Reform Impacts (IBS/CBS)

Brazil’s complex tax environment requires strict normalization of the EBITDA
denominator:

- **Tax Reform:** The transition to the dual VAT model (IBS/CBS) scheduled for
  full implementation by 2033 changes the tax incidence on services and
  manufacturing. EBITDA calculations must simulate the tax incidence
  post-transition to avoid valuing obsolete tax planning strategies.
- **ICMS/PIS/COFINS Normalization:** EBITDA must be cleaned of non-recurring tax
  credits that are transient or subject to litigation.

> [!IMPORTANT]
> When executing a multiples-based valuation in Brazil, **Normalized EBITDA**
> must be calculated by adjusting for owner compensation, non-recurring tax
> credits, and the impact of inflation on working capital.
