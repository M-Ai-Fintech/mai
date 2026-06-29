# Financial Models for Pricing Synergies in M&A

Synergies are the main financial justification for paying a premium over a target's standalone value. This document provides a framework to value operational and financial synergies and allocate that value between buyer and seller.

---

## 1. Classification & Valuation Framework

Synergies must be calculated by comparing the projected cash flows of the combined entity to the standalone entities:

$$PV(\text{Synergies}) = PV(\text{Combined Entity}_{A+B}) - \left[ PV(\text{Company}_A) + PV(\text{Company}_B) \right]$$

### A. Operational Synergies
Operational synergies directly impact operating income (EBIT) and are modeled in the free cash flow projections.

1.  **Cost Synergies:**
    *   *Sources:* Layoff of redundant staff, consolidation of offices, IT system integration, and procurement savings due to increased buyer power.
    *   *Formula:*
        $$CF_{\text{Cost Synergy}, t} = (\text{Savings}_t - \text{Integration Costs}_t) \times (1 - T_c)$$
        where $T_c$ is the corporate tax rate.
    *   *Realization Probability:* High (typically discounted at the target's WACC).

2.  **Revenue Synergies:**
    *   *Sources:* Cross-selling products, accessing new distribution channels, and unified pricing strategies.
    *   *Formula:*
        $$CF_{\text{Revenue Synergy}, t} = (\Delta \text{Revenue}_t \times \text{Contribution Margin}_t) \times (1 - T_c)$$
    *   *Realization Probability:* Low to Moderate. Strategic plans must apply a **30% to 50% haircut** to these cash flows to reflect implementation challenges.

### B. Financial Synergies
Financial synergies alter the cost of capital or tax liabilities.

1.  **Tax Shields:**
    *   *Sources:* Amortization of goodwill, utilization of tax losses (NOLs), or debt restructuring.
    *   *Formula:*
        $$PV(\text{Tax Shield}) = \sum_{t=1}^n \frac{\text{Amortization}_t \times T_c}{(1 + K_d)^t}$$
        where $K_d$ is the cost of debt.

2.  **Lower Cost of Capital:**
    *   Combining entities often increases borrowing capacity and lowers the cost of debt ($K_d$). The resulting reduction in WACC increases the present value of all future cash flows.

---

## 2. Synergy Allocation and Purchase Price

The premium paid over the standalone value represents the portion of the synergy value given to the seller.

```
                  ┌─────────────────────────────────────────┐
                  │          Total Synergy Pool             │
                  └─────────────────────────────────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
    ┌─────────────────────────┐               ┌─────────────────────────┐
    │     Seller Share        │               │       Buyer Share       │
    │   (Control Premium)     │               │    (Retained Value)     │
    └─────────────────────────┘               └─────────────────────────┘
```

### A. The Pricing Formula
The final purchase price ($PP$) can be defined as:
$$PP = Standalone_{Target} + \alpha \times PV(\text{Net Synergies})$$
where $\alpha \in [0, 1]$ is the **synergy sharing coefficient** (the percentage of synergy value captured by the seller).

### B. Negotiation Scenarios and the Sharing Coefficient ($\alpha$)
*   **Bilateral Negotiation (Low Competition, $\alpha \approx 0.1 - 0.3$):**
    If the buyer is the only strategic suitor, they retain most of the synergy value. The seller receives a small premium to incentivize the transaction.
*   **Competitive Auction (High Competition, $\alpha \approx 0.5 - 0.8$):**
    If multiple strategic bidders compete, they are forced to bid away their synergies. The bidder with the highest internal synergies can pay a higher price while maintaining their target return.
*   **Overpayment ($\alpha > 1.0$):**
    The buyer pays more than the total net synergy value. This destroys value for the buyer's shareholders and is a major cause of post-merger underperformance.

### C. Risk-Adjusted Synergy Pricing
To mitigate risk, advisors structure the payment of the synergy premium over time using performance milestones (e.g., releasing escrow funds only when specific cost reductions are realized).
