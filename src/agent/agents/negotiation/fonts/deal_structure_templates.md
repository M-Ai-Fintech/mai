# Transaction Structuring Templates and Guidelines in Brazil

This document outlines the standard methodologies, legal foundations, and
templates for structuring corporate acquisitions in Brazil.

---

## 1. Cash-Free Debt-Free (CFDF) Pricing Model

The CFDF mechanism ensures that the Buyer pays the Enterprise Value ($EV$) of
the target business operations, adjusted for cash and debt at the closing date.

### A. The Equity Value Formula

$$Equity\ Value\ (Purchase\ Price) = EV + Cash_{closing} - Debt_{closing} \pm (NWC_{closing} - NWC_{target})$$

### B. Defining Elements under Brazilian Accounting (CPC/IFRS)

- **Cash (_Caixa e Equivalentes de Caixa_):**
  - Cash on hand and demand deposits.
  - Highly liquid financial investments (e.g., CDIs) redeemable within 90 days
    without penalty.
- **Debt (_Endividamento Financeiro e Assemelhados_):**
  - Loans and financing with financial institutions (_empréstimos e
    financiamentos_).
  - Debentures and other debt securities.
  - Tax parceling programs (e.g., _REFIS, PRT, Transações Tributárias_),
    including principal, interest, and penalties.
  - Lease liabilities under **CPC 06 (R2) / IFRS 16** (capitalized operating
    leases).
  - Unpaid dividends declared prior to closing.
  - Labor, civil, and tax contingencies classified by due diligence auditors as
    having a **"probable"** risk of loss (CPC 25 provisions).
- **Net Working Capital (NWC - _Capital de Giro Líquido_):**
  - Formula:
    $$NWC = (Accounts\ Receivable + Inventory + Prepaid\ Expenses) - (Accounts\ Payable + Salaries\ Payable + Taxes\ Payable)$$
  - _NWC Adjustment:_ Calculated relative to a historical 12-month average
    baseline (_Capital de Giro Meta_). If the actual closing NWC is lower than
    the target, the Purchase Price is adjusted downward dollar-for-dollar.

---

## 2. Share Swaps (_Incorporação de Ações_ - Art. 252, Lei das S.A.)

Under Art. 252 of the Brazilian Corporations Law (Lei nº 6.404/1976), an
_incorporação de ações_ is a corporate reorganization where all shares of a
target company ($T$) are transferred to the acquirer ($A$) in exchange for new
shares issued by $A$. $T$ becomes a wholly-owned subsidiary (_subsidiária
integral_) of $A$.

### A. Transaction Flow

```mermaid
sequenceDiagram
    participant Target_S as Target Shareholders
    participant Target as Target Company (T)
    participant Acquirer as Acquirer Company (A)
    
    Target_S->>Acquirer: 1. Transfer of all Target shares
    Acquirer->>Target_S: 2. Issuance and delivery of new Acquirer shares
    Note over Target,Acquirer: Target (T) becomes a Wholly-Owned Subsidiary (Subsidiária Integral)
```

### B. Procedural Steps and Legal Requirements

1. **Protocolo e Justificação (Art. 224 & 225):** The management of both
   companies drafts the protocol and justification detailing the transaction
   terms, exchange ratio (_relação de substituição_), and financial impact.
2. **Laudo de Avaliação (Art. 8 & Art. 252, § 1º):** An independent appraisal
   firm (_empresa avaliadora_) must value the target's shares at market value or
   net equity value to justify the capital increase of the Acquirer.
3. **Deliberação Societária (Art. 252, § 2º):** The transaction must be approved
   at Extraordinary General Meetings (AGE) of both the Target and the Acquirer.
4. **Direito de Recesso (Art. 137 & Art. 252, § 1º):** Dissenting shareholders
   of both the Target and the Acquirer may have the right to withdraw from the
   company and demand the redemption of their shares, valued based on the
   company's net book equity (_valor patrimonial_), unless the shares are liquid
   and dispersed in the market.

---

## 3. Asset Purchase (_Trespasse_) vs. Equity Purchase

The choice of deal structure drastically alters the legal risk profile and tax
consequences in Brazil.

| Structuring Criteria        | Equity Purchase (Quota/Share Sale)                                                     | Asset Purchase (_Trespasse_ - Art. 1.142 CC)                                                                          |
| :-------------------------- | :------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| **Target Entity**           | Purchase of shares/quotas of the existing Legal Entity (_Pessoa Jurídica_).            | Purchase of the organized assets/establishment (_Estabelecimento Empresarial_).                                       |
| **Consent Requirements**    | Board or shareholder approval.                                                         | Creditor notification and consent required if remaining assets are insufficient (Art. 1.144 CC).                      |
| **Pre-closing Liabilities** | Remains within the target entity; buyer relies on SPA indemnity and escrow protection. | Joint and several liability (_responsabilidade solidária_) of the seller for 1 year from publication (Art. 1.146 CC). |
| **Tax Succession**          | Absolute succession. The target company retains all tax liabilities.                   | Successor liability applies under **Art. 133 of the CTN** if the buyer continues the same business activity.          |
| **Labor Succession**        | Unchanged. The employer entity remains the same.                                       | Successor liability applies under **Art. 10 and 448 of the CLT** for all transferred employees.                       |
| **Contract Transfer**       | Automatic (unless change of control clauses exist).                                    | Individual assignment of each commercial contract/license is required.                                                |

---

## 4. Deferred Payment Mechanisms

To balance cash flows and hedge against post-closing contingency risks,
Brazilian transactions utilize:

1. **Preço Retido (Retainage):** A unilateral deduction from the purchase price
   held by the Buyer for a defined period (e.g., 10% for 3 years) to offset
   indemnification claims directly via set-off (_compensação_), without
   third-party escrow.
2. **Notas Promissórias (Promissory Notes):** Issuance of debt instruments by
   the Buyer to the Seller. These notes must contain clear subordination clauses
   and be linked to the SPA's offset terms to allow the Buyer to deduct unpaid
   indemnity claims from the note payments.
3. **Parcelas Diferidas com Correção:** Deferred payments indexed to inflation
   (typically _IPCA_ or _IGP-M_) plus a negotiated interest rate (e.g., 4% to 6%
   p.a. or a percentage of CDI).

---

## 5. Negotiation Agent Strategy & Playbook

When interacting with Brazilian middle-market founders, the Negotiation Agent
should deploy the following strategies:

- **Always Propose Three Structured Alternatives:** Avoid presenting a single
  take-it-or-leave-it offer. Instead, provide a menu of options that allow the
  founder to trade nominal value for transaction security:
  - **Option A (The "Cash Out" Strategy):** Lower overall enterprise value, but
    paid 90% upfront at closing with minimal earn-out and standard escrow.
  - **Option B (The "Legacy / Growth" Strategy):** Higher overall valuation, but
    structured with 60% upfront, 40% tied to a performance earn-out, and the
    founder retaining a minority equity rollover (10-20%) with a seat on the
    board.
  - **Option C (The "Indemnity Cap Tradeoff" Strategy):** Standard valuation,
    but with a highly restricted escrow account in exchange for strict
    representations and warranties.
- **De-escalate the "Fio de Bigode" Discomfort:** If the founder reacts
  defensively to standard representation, warranty, or indemnification clauses
  ("Você está dizendo que sou mentiroso?"), explain that these clauses are
  international institutional standards required by underwriters or investment
  committees, not a personal indictment of their character.
- **Honoring Legacy Mechanisms:** Incorporate non-financial terms that soothe
  the transition of control. Propose the creation of an honorary title (e.g.,
  "Presidente de Honra") or name a corporate facility after the founder's
  parents. These emotional concessions cost nothing to the buyer but hold
  massive value for the seller.
