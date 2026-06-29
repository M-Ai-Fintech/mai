# Forensic Audit Guide for Labor Risks in Brazil

Labor contingencies represent one of the most volatile off-balance-sheet liabilities in Brazilian corporate transactions. The complexity of the Consolidated Labor Laws (*CLT - Consolidação das Leis do Trabalho*) and the pro-employee orientation of the Labor Courts require a rigorous forensic approach.

---

## 1. PJ-to-CLT Reclassification (*Pejotização*)
*Pejotização* occurs when a company hires individuals as corporate entities (PJs - *Pessoas Jurídicas*) to perform services that, in practice, meet the legal definition of an employment relationship.

*   **Legal Test (Art. 3, CLT):** A court will reclassify a PJ relationship into a CLT contract if the following four elements are simultaneously present:
    1.  **Subordination (*Subordinação*):** The worker receives direct orders, is subject to performance reviews, has fixed working hours, or reports to a hierarchy.
    2.  **Habituality (*Habitualidade*):** The service is continuous and integrated into the company's regular operations (non-eventual).
    3.  **Personality (*Pessoalidade*):** The service must be performed specifically by that individual; they cannot send a substitute.
    4.  **Compensation (*Onerosidade*):** The individual is paid regularly for their service.
*   **Red Flags to Audit:**
    *   Service providers using corporate emails, Slack accounts, or representing the target as executives.
    *   PJs who are former employees of the target (within 18 months of termination - Art. 5-D, Law 6.019/74).
    *   PJs whose invoices are sequential (indicating the target is their sole client).
*   *Financial Impact Calculation:* If reclassified, the buyer faces claims for unpaid:
    *   FGTS (8% of all past payments + 40% penalty if terminated).
    *   13th Salary (annual bonus).
    *   Paid Vacation + 1/3 constitutional bonus.
    *   INSS (employer social security contributions, usually ~20-28% of total compensation).

---

## 2. Outsourced Services (*Terceirização*)
Under Law 13.429/2017 and Law 13.467/2017, and confirmed by the Supreme Court (STF - ADPF 324 and RE 958.252), outsourcing of core activities (*atividade-fim*) is fully legal.

*   **The Trap (Subsidiary Liability):** The tomador (the target company) remains **subsidiarily liable** (*responsabilidade subsidiária*) for all labor and social security debts of the outsourced service provider’s employees during the period they worked for the target (TST Súmula 331).
*   *DD Checklist:*
    *   Request clearance certificates (*Certidões Negativas de Débitos Trabalhistas - CNDT*) and proof of FGTS and INSS payments for all key outsourced companies.
    *   Ensure all outsourcing agreements contain indemnification clauses and require the provider to present monthly payment slips of their employees before invoice approval.

---

## 3. Occupational Safety and Health (SST)
Non-compliance with safety regulations leads to severe civil liabilities, tax penalties, and operational shutdown risks.

*   **Mandatory Programs:**
    *   **PGR (Programa de Gerenciamento de Riscos - NR-1):** Replaced PPRA. Identifies operational risks.
    *   **PCMSO (Programa de Controle Médico de Saúde Ocupacional - NR-7):** Mandates periodic medical exams.
    *   **LTCAT (Laudo Técnico das Condições Ambientais do Trabalho):** Technical report certifying if employees are exposed to agents that justify special retirement (*aposentadoria especial*).
*   **Insalubridade & Periculosidade:** Verify if employees working in unhealthy (*insalubridade* - 10%, 20%, or 40% of the minimum wage) or hazardous (*periculosidade* - 30% of the base salary) environments are receiving their lawful premiums.

---

## 4. Mathematical Modeling of Labor Liabilities
For RAG parsing and valuation models, labor contingencies must be categorized under three loss probability classes (following CPC 25 / IAS 37 standards):

1.  **Probable Loss (*Perda Provável*):** High likelihood of defeat. The calculated amount **must** be deducted directly from the Purchase Price or set aside as a cash reduction.
2.  **Possible Loss (*Perda Possível*):** Moderate likelihood. Must be covered by the **Escrow Account** or secured by a Seller indemnity clause.
3.  **Remote Loss (*Perda Remota*):** Low likelihood. Typically disregarded, but monitored.

### 4.1. The Forensic Calculation Formula
When evaluating active lawsuits, the face value of the claim (*valor da causa*) is rarely the actual risk. The auditor must calculate the risk using:

$$\text{Estimated Risk} = (\text{Base Claim Value} \times \text{Success Rate}) + \text{Monetary Correction (IPCA-E / SELIC)} + \text{Attorneys' Fees}$$

*   **Monetary Correction:** Labor debts in Brazil must be adjusted. Currently, the STF dictates the use of the IPCA-E index plus interest equivalent to the savings account rate (*poupança*) during the pre-judicial phase, and the **SELIC rate** from the date of service of process onwards.
*   **Sucumbência (Attorneys' Fees):** Law 13.467/17 introduced loser-pays attorneys' fees in labor courts. The target faces an additional cost of **5% to 15%** of the condemned value.
*   **Statute of Limitations (Art. 11, CLT):** Employees can claim rights going back **5 years** from the filing date, but the lawsuit must be filed within **2 years** of the termination of employment.
