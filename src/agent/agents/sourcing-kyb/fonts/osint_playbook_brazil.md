# Brazilian Corporate OSINT Playbook: Advanced Techniques for KYB & Due Diligence

## 1. Introduction & Methodology
Open Source Intelligence (OSINT) in the Brazilian corporate context is a critical process for identifying hidden liabilities, evaluating founder reputation, mapping informal corporate groups (*grupos econômicos de fato*), and verifying the operational reality of target companies. 

Unlike more digitized Anglo-Saxon jurisdictions, corporate records in Brazil are distributed across municipal, state, and federal systems. Furthermore, data protection laws (LGPD) restrict public access to certain personal data, requiring investigators to combine formal registry searches with advanced open-source techniques, network analysis, and social media intelligence (SOCMINT).

---

## 2. Corporate Registries & UBO (Ultimate Beneficial Owner) Extraction
The cornerstone of Brazilian KYB is the *Cadastro Nacional da Pessoa Jurídica* (CNPJ). 

### 2.1 Extracting the QSA (Quadro de Sócios e Administradores)
The *Quadro de Sócios e Administradores* (QSA) lists the formal owners, shareholders, and directors. However, it may not reflect the ultimate control. To extract and verify the QSA:
* **Receita Federal Portal:** Perform a CNPJ query (*Comprovante de Inscrição e de Situação Cadastral*) to access the active QSA.
* **Ultimate Beneficial Owner (UBO) declaration:** Under RFB Normative Instruction RFB nº 1.863/2018 (and subsequent updates), companies must declare their *Beneficiário Final* (UBO) to the Receita Federal. For complex holding structures or foreign shareholders, query the "Ficha do Beneficiário Final" via the Redesim portal using a government GOV.BR login (e-CNPJ or e-CPF).

### 2.2 Corporate Document Traversal
* **Junta Comercial filings:** State commercial registries (e.g., JUCESP in São Paulo, JUCERJA in Rio de Janeiro) hold the physical scans of the *Contrato Social* (Articles of Association) and its amendments (*Alterações Contratuais*).
* **Key Fields to Extract:**
  * **Capital Distribution:** Verify if shares are pledge-restricted or have usufruct clauses.
  * **Signing Authority (*Cláusula de Administração*):** Determine who holds the legal power to bind the company (sole administrator, joint signatures, or power of attorney).
  * **Procuradores:** Look for non-shareholder attorneys-in-fact who hold broad, irrevocable powers of attorney (*procurações em caráter irrevogável e irretratável*), as they are frequently the actual controllers of the entity.

---

## 3. Relational Mapping & Hidden Structures (*Grupo Econômico de Fato*)
Brazilian companies frequently operate under decentralized structures to isolate tax and labor risks or hide assets. Detecting an undocumented corporate group (*grupo econômico de fato*) is critical to prevent post-transaction liability contagion.

### 3.1 Indicators of Hidden Corporate Groups
* **Shared Physical Infrastructure:** Companies operating from the same commercial room, warehouse, or utilizing the same IP blocks (verifiable via WHOIS on domain names).
* **Identity Overlap:** Employees or administrative managers who represent multiple corporate entities without formal contracts.
* **Family Ties:** Companies owned by spouses, children, or siblings of the main founder, often acting in the same economic sector.
* **Intercompany Transactions:** High volumes of loan agreements (*mútuos*) or asset transfers without clear commercial justification.

### 3.2 Identifying "Laranjas" (Straw Men / Proxy Partners)
A common fraud mechanism in distressed Brazilian middle-market firms is registering companies in the name of low-income individuals (*laranjas*).
* **Socio-Economic Discrepancy Verification:**
  * Cross-reference the names/CPFs of partners in the QSA with public benefit databases (e.g., *Cadastro Único* / *Bolsa Família* via the Portal da Transparência). A multi-million-real company partner receiving government welfare is a major red flag.
  * Check the partner's residential address using Google Street View or land registry records. A partner living in a vulnerable neighborhood or informal settlement (*favela*) while owning a high-cap industrial business indicates a proxy structure.
* **Cross-Directorship Checks:** Use aggregators (such as Jusbrasil, Escavador, or Econodata) to find if the individual is a partner in dozens of unrelated companies in different states.

---

## 4. Search Engine Optimization (Dorks) for Brazilian Corporate OSINT
Google Dorks are highly effective for extracting regulatory filings, legal notices, and historical press releases.

| Target Information | Google Dork Syntax |
| :--- | :--- |
| **Bankruptcy & Reorganization** | `site:jusbrasil.com.br "recuperação judicial" OR "falência" "Nome da Empresa"` |
| **Official Gazette filings** | `site:in.gov.br "Nome da Empresa" "CNPJ"` |
| **State Gazettes (e.g., SP)** | `site:imprensaoficial.com.br "Nome da Empresa" AND ("Ata" OR "Assembleia")` |
| **Labor disputes and audits** | `site:tst.jus.br OR site:trt*.jus.br "Nome da Empresa" "CNPJ"` |
| **Unrecorded public bids/contracts**| `site:gov.br/compras "Nome da Empresa"` |
| **Hidden PDF agreements/Side letters**| `filetype:pdf "Nome da Empresa" "acordo de acionistas" OR "memorando de entendimentos"` |

---

## 5. Social Media Intelligence (SOCMINT) for Founders & Executives
Social media accounts in Brazil (primarily Instagram, LinkedIn, and Facebook) often leak operational and financial realities that mismatch official filings.

### 5.1 Profile Assessment Techniques
* **Lifestyle vs. Declared Revenue:** Evaluate if the founder’s personal lifestyle (luxury vehicles, yachts, private aircraft, international trips, high-end real estate) aligns with the company's declared EBITDA and tax filings. Cross-reference photos of assets with registration numbers.
* **Family Networks:** Map the founder's spouse and children. In distressed situations, assets are routinely registered under the spouse's maiden name or children's names. Check their social media for references to luxury assets, real estate acquisitions, or foreign shell companies.
* **Business Associations & Interpersonal Networks:** Look for photos of business dinners, regional association meetings, or political rallies. These connections reveal who the founder's informal advisors, lenders, or political protectors are.

---

## 6. Judicial Litigation & Legal OSINT
Brazil is one of the most litigious countries in the world. A target's litigation profile is a reliable indicator of its true financial health, labor environment, and contract compliance.

### 6.1 Mapping the Brazilian Judicial Structure
1. **Federal Courts (*Justiça Federal* - TRFs):** Handle cases involving federal entities (Receita Federal, Caixa Econômica, INSS, public banks). Critical for identifying federal tax execution cases (*execuções fiscais*).
2. **State Courts (*Justiça Estadual* - TJs):** Handle civil, commercial, family, and consumer disputes. The court of the company’s headquarters (e.g., TJSP, TJRJ) must be searched.
3. **Labor Courts (*Justiça do Trabalho* - TRTs):** Handle individual and collective labor claims.
4. **Superior Courts (STJ, STF):** Handle constitutional and federal-level appeals.

### 6.2 Scraping and Reviewing Lawsuits
* **DataJud (CNJ):** The national database of the National Justice Council. Use the CNPJ or partner CPF to search for the *Número Único de Processo* (CNJ format: `NNNNNNN-DD.AAAA.J.TR.OOOO`).
* **Jusbrasil & Escavador:** Use these platforms to aggregate state and federal court search results.
* **Analysis of Key Filings (*Autos do Processo*):**
  * Locate filings that are not under judicial secrecy (*segredo de justiça*).
  * Review the *Petição Inicial* (complaint) and the *Sentença* (judgment).
  * Look for joint liability declarations (*desconsideração da personalidade jurídica*) where the court has pierced the corporate veil to seize the personal assets of partners for corporate debts.

---

## 7. Real Estate & Asset Tracing
Identifying tangible assets is vital for evaluating collateral value and potential recovery scenarios.

### 7.1 Real Estate Search
* **Cartório de Registro de Imóveis (CRI):** Land ownership is registered at local municipal real estate registries.
* **ONR Portal (*Registradores* - onr.org.br):** The centralized national portal. Search for property ownership by CPF or CNPJ. Obtain the *Matrícula do Imóvel* (property deed history) to identify mortgages, pledges (*penhoras*), tax liens (*indisponibilidades*), or usufruct restrictions.

### 7.2 Vehicle and Special Asset Registries
* **Vehicles:** Check for vehicle ownership and judicial restrictions using the national **Renajud** registry system via judicial queries (or third-party vehicle check APIs like Olho no Carro, Infocar).
* **Aircraft:** Search the **RAB (Registro Aeronáutico Brasileiro)** run by ANAC (National Civil Aviation Agency). The database is public and searchable by owner name/CNPJ or aircraft registration mark (e.g., PR-XXX, PS-XXX).
* **Vessels:** Query the **Capitania dos Portos** (Navy Command) databases to identify registered luxury boats, yachts, and commercial vessels.

---

## 8. LGPD Compliance in Investigative OSINT
All OSINT operations must adhere to the *Lei Geral de Proteção de Dados* (LGPD - Law 13.709/2018).

* **Legal Bases for Processing:**
  * **Legítimo Interesse (Art. 7, IX):** Valid when the processing of personal data (e.g., partners' background checks) is necessary to support legitimate business transactions, risk assessment, and fraud prevention, provided it does not override the fundamental rights of the data subject.
  * **Exercício Regular de Direitos (Art. 7, VI):** Applicable when data is collected to safeguard legal rights, evaluate pre-litigation risks, or prepare defense files.
* **Data Minimization:** Retain only the data strictly necessary for the transaction's risk assessment. Delete administrative data of non-involved family members or third parties immediately.
* **Secure Storage:** Store all OSINT dossiers in encrypted vaults (with KMS/CMEK) and restrict access to authorized M&A team members and legal advisors. Ensure that no public-facing search queries leave unencrypted logs.
