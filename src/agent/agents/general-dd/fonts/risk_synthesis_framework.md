# M&A Due Diligence Risk Synthesis & Valuation Impact Framework

> **Target Audience:** M&A Investment Committee, Buy-Side Advisors, Legal
> Counsel, RAG Agents\
> **Jurisdiction:** Brazil\
> **Regulatory Reference:** CPC 25 (Provisões, Passivos e Ativos Contingentes /
> IAS 37) & Provimento CNJ nº 197/2025

This framework establishes a standardized, cross-functional methodology to
synthesize due diligence findings (financial, tax, legal, operational, and tech)
into a unified executive report, translating qualitative "red flags" into
quantitative adjustments to the transaction's valuation and legal structures.

---

## 1. Executive Synthesis Methodology

The General Due Diligence (GD) Coordinator aggregates specialized findings from
the Legal, Financial, Tax, and Operational subagents. Rather than presenting
isolated lists of issues, the coordinator performs **Cross-Functional
Correlation**.

> [!IMPORTANT]
> A single risk must not be evaluated in isolation. A moderate operational risk
> (e.g., customer concentration) combined with a moderate legal risk (e.g., a
> "Change of Control" clause in the main commercial agreement) synthesizes into
> a **Critical/High** risk that directly impacts the valuation.

### Key Synergistic Scenarios:

- **The "Pejotização" Loop:** The Legal agent identifies workers hired under
  corporate entities (PJs) with signs of subordination. The Financial agent must
  then calculate the hidden wage liabilities (FGTS, vacation, 13th salary, and
  INSS). The Tax agent determines the municipal service tax (ISS) vs. federal
  social security exposure.
- **Revenue Concentration + Change of Control:** Financial Due Diligence maps
  the target's customer concentration (threshold: >10% of revenue from one
  client in middle-market). Legal Due Diligence reviews the customer's contract.
  If it lacks "take-or-pay" clauses or allows termination upon "Change of
  Control", the risk is elevated to **Critical (Go/No-Go)**.
- **IP Non-Assignment + Key Person Dependency:** Tech/IP Due Diligence detects
  that core software was written by external contractors without formal IP
  assignments. Operational Due Diligence indicates the main developer is also a
  key partner. The risk of operational paralyzation and loss of competitive
  advantage is classified as **High**.

---

## 2. Risk Classification & CPC 25 Matrix

To align risk assessment with Brazilian accounting standards, all contingencies
must be classified according to **CPC 25** (equivalent to IAS 37). The
probability of loss dictates the financial treatment:

| CPC 25 Loss Probability | Statistical Range | Financial Action / Valuation Impact                                   | SPA Legal Mechanism                              |
| :---------------------- | :---------------- | :-------------------------------------------------------------------- | :----------------------------------------------- |
| **Provável (Probable)** | $> 50\%$          | Direct reduction of the Purchase Price (treatment as debt-like item). | Adjusted EBITDA or Net Debt deduction.           |
| **Possível (Possible)** | $10\% - 50\%$     | Retention in Escrow or Escrow Notarial.                               | Specific Indemnification & Escrow Account.       |
| **Remoto (Remote)**     | $< 10\%$          | Registered in the final report. No financial retention.               | Covered by general Representations & Warranties. |

---

## 3. Severity Ranking Framework

Risks are ranked into four severity tiers based on their financial materiality
(relative to the estimated Enterprise Value - EV) and operational disruption
potential:

### A. Critical (Deal-Breaker / Red Line)

- **Definition:** Threatens the continuity of the business, presents legal
  invalidity of core activities, or results in liabilities exceeding the
  transaction's Cap Limit ($>30\%$ of EV).
- **Action:** Immediate **No-Go** recommendation.
- **Examples:** Fraudulent Ultimate Beneficial Owner (UBO) structure; systemic
  tax evasion through "Caixa Dois"; active prosecution for environmental crimes
  without remediation options.

### B. High

- **Definition:** Financial exposure represents $10\%$ to $30\%$ of EV, or
  represents a significant operational risk that requires post-closing
  reorganization.
- **Action:** Price reduction (for Provável risks) and mandatory Escrow
  retention (for Possível risks).
- **Examples:** Non-consolidated "Pejotização" representing substantial
  potential labor claims; lack of core operational licenses (e.g., Licença de
  Operação - LO); lack of registered software copyrights at INPI.

### C. Medium

- **Definition:** Financial exposure represents $2\%$ to $10\%$ of EV.
- **Action:** Covered via standard Escrow retention and specific Representations
  & Warranties (R&W) in the SPA.
- **Examples:** Standard civil or labor claims with clear defense strategies;
  minor tax disputes regarding municipal ISS calculation; outdated internal
  policies.

### D. Low

- **Definition:** Financial exposure is below the _De Minimis_ threshold
  ($<0.1\%$ of EBITDA or $<2\%$ of EV).
- **Action:** Listed in the due diligence report for disclosure purposes. No
  pricing or escrow adjustments.
- **Examples:** Small labor claims by low-level former employees; minor
  administrative fines.

---

## 4. Mathematical Valuation Impact Model

The financial impact of synthesized risks is calculated through three distinct
channels:

### 1. QoE (Quality of Earnings) / EBITDA Normalization

Adjustments to the historical EBITDA directly reduce the Enterprise Value
through the transaction multiple.
$$\text{Valuation Reduction} = \text{EBITDA Adjustments} \times \text{Transaction Multiple}$$

- _Application:_ The Financial agent normalizes EBITDA by expunging
  founder-related personal expenses, adjusting transfer pricing anomalies, or
  adding the cost of regularizing informal employees (transforming PJs to CLT):
  $$\text{EBITDA Adjustments} = \text{PJ-to-CLT Regularization Cost} + \text{Unrecorded Founder Pro-Labore} + \text{Non-recurring Revenues}$$

### 2. Enterprise Value to Equity Value Bridge (Net Debt)

"Provável" liabilities are treated as debt-like items and subtracted 1-to-1 from
the Enterprise Value.
$$\text{Equity Value} = \text{Enterprise Value} - \text{Net Debt} - \text{Provável Contingencies} - \text{Working Capital Adjustment}$$

- _Application:_ If the target has R$ 5,000,000 in "Provável" tax contingencies
  (e.g., PIS/COFINS assessment), this is treated as a liability and directly
  deducted from the Purchase Price at closing.

### 3. Escrow Retention (Possível Contingencies)

"Possível" liabilities are secured via retention of a portion of the Purchase
Price in an Escrow account.
$$\text{Escrow Size} = \sum (\text{Possível Contingencies} \times \text{Risk Weight}) + \text{General R&W Buffer}$$

- _Buffer:_ Typically ranges between $10\%$ and $20\%$ of the Purchase Price,
  held for the duration of the statute of limitations (5 years for tax and labor
  in Brazil).

> [!TIP]
> **Provimento CNJ nº 197/2025 (Escrow Notarial):** Recommend the utilization of
> a **Conta Notarial Vinculada** managed by a notary public (_Tabelião de
> Notas_) under Provimento 197/2025. It offers a faster, cheaper, and safer
> alternative to commercial bank escrow accounts, with built-in dispute
> registration via _Ata Notarial_ if conditions are contested.

---

## 5. Standard Synthesis Output Schema (Markdown Format)

```markdown
### [Risk ID] - [Brief Risk Title]

- **Cross-Functional Category:** [e.g., Tax / Operational]
- **Severity Rank:** [Critical / High / Medium / Low]
- **CPC 25 Probability:** [Provável / Possível / Remoto]
- **Relevant Legal Provision / Clause:** [e.g., Art. 448 CLT / Clause 12.3 of
  Client X Contract]
- **EBITDA / QoE Impact:** [R$ Value or N/A]
- **Direct EV Deduction:** [R$ Value or N/A]
- **Escrow Retention Recommendation:** [R$ Value or N/A]
- **Mitigation Strategy:** [e.g., Deduct R$ X from EV; retain R$ Y in Notarial
  Escrow; demand condition precedent Z]
```
