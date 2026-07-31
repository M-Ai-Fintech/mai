# Escrow Structuring and Best Practices in Brazil

This document details the financial, operational, and legal parameters for
structuring escrow accounts in Brazilian M&A transactions, including a
comparative analysis of traditional bank escrows and the new **Conta Notarial
Vinculada** under CNJ Provimento nº 197/2025.

---

## 1. Standard Escrow Parameters in Brazil

Escrow accounts serve as the primary security mechanism for the Seller’s
indemnification obligations arising from breaches of representations and
warranties (R&Ws) and pre-closing contingencies.

### A. Retention Sizes

- **Standard Range:** Typically **10% to 20%** of the Purchase Price (_Preço de
  Aquisição_).
- **Adjustment Factors:**
  - _Due Diligence Risk Profile:_ Higher retention for targets with material,
    unquantified tax or labor contingencies.
  - _Seller Financial Health:_ If the Seller is a holding company or physical
    person with limited liquid assets, the escrow size is maximized to avoid
    collection hurdles.
  - _Survival Period:_ Longer survival periods require sustained retention.

### B. Release Milestones (_Cronograma de Liberação_)

Escrow agreements usually feature a gradual release schedule (_liberação
parcial_) rather than a single lump-sum payout. This aligns the release of funds
with the expiration of liability windows.

- _Typical Schedule:_
  - **T+12 Months:** Release of 20% to 30% of the escrowed funds (covering early
    operational and commercial claims).
  - **T+24 Months:** Release of an additional 20% to 30% (coinciding with the
    2-year statute of limitations for labor claims).
  - **T+36 Months:** Release of 20% (coinciding with the 3-year civil liability
    statute of limitations).
  - **T+60 Months:** Release of the remaining balance (coinciding with the
    5-year tax statute of limitations).

### C. Duration Matching the Statute of Limitations (_Prazos Prescricionais_)

The survival period of representations and warranties in the Share Purchase
Agreement (SPA) must match the statutory limitation periods under Brazilian law:

| Risk Category                                   | Statute of Limitations                                                                     | Legal Basis                                               | Structuring Rule                                                                                                                  |
| :---------------------------------------------- | :----------------------------------------------------------------------------------------- | :-------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| **Labor claims (_Reclamatórias Trabalhistas_)** | **2 years** post-termination to file; claims can cover the preceding **5 years**.          | Art. 7, XXIX of the Brazilian Federal Constitution        | Keep labor-related escrow portion locked for a minimum of 24 to 36 months post-closing to cover immediate post-departure filings. |
| **Civil & Commercial claims**                   | **3 years** for civil liability and damages; **10 years** for general contractual breach.  | Art. 206, § 3º, V and Art. 205 of the Código Civil        | Maintain general indemnity escrow for 3 years.                                                                                    |
| **Tax claims (_Créditos Tributários_)**         | **5 years** from the first day of the next fiscal year or the date of formal notification. | Art. 173 and 174 of the Código Tributário Nacional (CTN)  | Maintain a specific tax escrow bucket for 5 to 6 years (adding a 6-month buffer for administrative processing).                   |
| **Social Security (_Previdenciário_)**          | **5 years** (Prescrição quinquenal).                                                       | Súmula Vinculante 8 of the Supremo Tribunal Federal (STF) | Grouped with tax escrow; held for 5 years.                                                                                        |

---

## 2. Comparative Analysis: Traditional Bank Escrow vs. Conta Notarial Vinculada

The regulatory landscape for transaction security in Brazil evolved
significantly with the enactment of **Provimento CNJ nº 197/2025** (regulating
the _Marco Legal das Garantias_ - Lei nº 14.711/2023).

| Feature                   | Traditional Bank Escrow                                                                                                            | Conta Notarial Vinculada (Provimento CNJ nº 197/2025)                                                                                                                   |
| :------------------------ | :--------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Legal Framework**       | Standard deposit and custody agreement under the Civil Code.                                                                       | Art. 7-A, § 1º of Lei nº 8.935/1994 (introduced by Lei 14.711/2023) and Provimento CNJ 197/2025.                                                                        |
| **Role of the Custodian** | Passive financial institution. The bank does not interpret contract conditions or disputes.                                        | Impartial public officer (Tabelião de Notas) who acts as a neutral manager and "fiel depositário".                                                                      |
| **Asset Segregation**     | Funds are held in a specific account, but may be vulnerable to judicial freezes (_SISBAJUD_) targeting the parties.                | High protection. Funds are held in segregated bank accounts under CNB/CF agreements. Immune to unrelated seizures (_impenhorabilidade_).                                |
| **Dispute Resolution**    | Funds are locked until both parties sign a joint instruction (_instrução conjunta_) or a final court/arbitration ruling is issued. | Fast dispute recording. The notary suspends payouts, immediately issues an _ata notarial_ documenting the conflict, and holds the funds until a resolution is reached.  |
| **Setup & Bureaucracy**   | High KYC hurdle. Custom contract negotiation with bank legal teams takes weeks.                                                    | Streamlined. Formatted via a standard "requerimento de abertura de conta" and public deed.                                                                              |
| **Cost & Fee Structure**  | Custom administration fees (_taxa de administração_) charged to the parties; low CDI yield due to bank spreads.                    | No direct administration fees. The notary is compensated by the bank via CNB/CF revenue sharing. Only standard state-level notary fees (_emolumentos_) apply for deeds. |

### Operational Mechanics of the Conta Notarial Vinculada (Provimento CNJ 197/2025)

1. **Requerimento e Escritura:** The parties formalize the transaction rules
   (release dates, triggers, and dispute protocols) in a public instrument or
   written request to the _Tabelionato de Notas_.
2. **Depósito Segregado:** The Buyer deposits the escrowed funds into the
   notary's dedicated account, which is linked to a partner financial
   institution approved by the _Colégio Notarial do Brasil_ (CNB/CF).
3. **Verificação de Condições:** Upon a request for release, the _Tabelião_
   verifies the physical or digital evidence of the condition's fulfillment
   (e.g., certificates of tax clearance, expiry of survival periods).
4. **Dispute Protocol:** If the Buyer objects to a release (e.g., due to an
   active tax audit assessment), the notary freezes the contested amount,
   documents the dispute in an _ata notarial_, and waits for a joint release
   agreement, an arbitral award, or a judicial order.
