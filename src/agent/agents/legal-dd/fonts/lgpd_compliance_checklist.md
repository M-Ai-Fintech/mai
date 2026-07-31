# LGPD Compliance Checklist for M&A Transactions in Brazil

Compliance with the Brazilian General Data Protection Law (LGPD - Law
13.709/2018) is a critical component of transactional due diligence.
Non-compliance can result in successor liability, regulatory fines, and
post-closing operational hurdles.

---

## Phase 1: Due Diligence & VDR Audit (Data Sharing Security)

Sharing personal data during the due diligence phase constitutes a processing
activity under the LGPD. Both the seller (controller) and the prospective buyer
must secure this data transfer.

- **Risk:** Uploading unredacted employee files, customer lists, or medical
  records to a Virtual Data Room (VDR) violates the LGPD principle of
  minimization (_minimização dos dados_).
- **Mitigation Actions:**
  - [ ] **NDA with Data Protection Clauses:** Ensure the non-disclosure
        agreement contains a specific Data Protection Addendum (DPA) limiting
        the use of shared data strictly to transaction analysis.
  - [ ] **Data Redaction/Anonymization:** Redact names, CPF numbers, addresses,
        and emails from VDR documents (e.g., employment agreements, payrolls,
        customer contracts). Use generic identifiers (e.g., "Employee 1",
        "Client A").
  - [ ] **Clean Team Protocol:** For highly sensitive, non-anonymizable data
        (e.g., detailed health insurance rosters, strategic customer lists),
        restrict access to a "Clean Team" (independent advisors who sign clean
        team agreements and do not share the raw data with the buyer’s business
        teams).
  - [ ] **VDR Security Settings:** Disable downloading/printing of documents
        containing personal data, enable dynamic watermarking, and review VDR
        access logs weekly.

---

## Phase 2: Successor Liability for Past Breaches

Under Brazilian law, corporate successors (especially in mergers, share
purchases, and asset deals involving operational continuity) can inherit
liability for LGPD breaches committed by the target prior to the closing date.

- **ANPD Sanctions (Art. 52, LGPD):**
  - Administrative warnings.
  - Simple fines of up to **2% of the company's or group's gross revenue** in
    Brazil for the previous fiscal year, capped at **BRL 50 million per
    infraction**.
  - Suspension or prohibition of the database or processing activity (often a
    "death sentence" for tech startups and digital businesses).
- **Civil & Class Action Liability:** Beyond regulatory fines, the buyer
  inherits exposure to civil damage claims filed by individual data subjects or
  collective lawsuits (_Ações Civis Públicas_) led by Public Prosecutors (MP) or
  consumer protection agencies (Senacon, IDEC).
- **DD Checklist - Past Liabilities:**
  - [ ] Has the target suffered any data breaches or security incidents in the
        last 5 years? Review the target's incident log.
  - [ ] Check for active investigations or notifications by the National Data
        Protection Authority (ANPD), consumer protection bodies (Procon), or
        courts.
  - [ ] Assess the target's historical security vulnerabilities through a
        cyber-security due diligence (penetration tests, vulnerability scans).

---

## Phase 3: Post-Closing Compliance & Remediation Checklist

Once the deal closes, the buyer must integrate the target into its data
protection governance framework.

### 1. Governance & Accountability

- [ ] **DPO (Encarregado) Appointment:** Verify if the target has formally
      appointed a Data Protection Officer (DPO) and registered their contact
      info on the website. If not, appoint one immediately post-closing
      (mandatory for most companies, subject to simplified rules for small
      businesses).
- [ ] **ROPA (Registro de Operações de Tratamento):** Check if the target
      maintains an updated Record of Processing Activities (ROPA). Map all data
      flows, databases, and third-party SaaS tools used.
- [ ] **DPIA (Relatório de Impacto à Proteção de Dados - RIPD):** Prepare or
      review DPIAs for high-risk processing operations (e.g., profiling,
      biometrics, large-scale sensitive data).

### 2. Policies & Vendor Management

- [ ] **Privacy Policy and Terms of Use:** Harmonize the target's
      external-facing privacy notices and cookie policies with the buyer's
      standards.
- [ ] **Employee and HR Privacy:** Ensure employees have signed privacy terms or
      that the internal HR manual clearly defines data processing rules for
      workplace monitoring.
- [ ] **Vendor Contract Auditing:** Review all agreements with vendors, IT
      providers, and cloud services to ensure they contain standard LGPD
      processor clauses (_cláusulas de operador_), including data breach
      notification SLAs.
- [ ] **Data Subject Rights Channel:** Implement a functional, easy-to-use
      portal or email address for processing data subject access requests
      (DSARs).
