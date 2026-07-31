# Standardized M&A Virtual Data Room (VDR) Directory Template

> **Target Audience:** Sell-Side CFO/Legal Team, Buy-Side Audit Teams, RAG
> Ingestion Systems\
> **Market Focus:** Brazilian Middle-Market Acquisitions (LTDAs and S.As)

This document outlines the standardized folder structure and naming conventions
for organizing Virtual Data Rooms (VDR) in Brazilian corporate acquisitions. It
is optimized to enable autonomous agents to execute precise RAG
(Retrieval-Augmented Generation) queries.

---

## 1. General VDR Rules & Naming Conventions

### File Naming Format:

All files must be uploaded in searchable PDF format (OCR-enabled) and named
using the following structure:
`[YYYYMMDD]_[Entity_Name]_[Document_Type]_[Details_or_Version].pdf`

- _Example:_ `20260315_TargetLtda_ContratoSocial_Consolidado_12aAlteracao.pdf`
- _Example:_ `20260228_TargetLtda_Balancete_Fevereiro2026.pdf`

### RAG Metadata Tags:

Every folder contains metadata tags. When querying the VDR, the RAG agent should
prepend these tags to its semantic search queries.

---

## 2. Directory Index

### Folder 00: Administrative, Process & NDAs

_Tags:_ `#admin #nda #teaser #process-letter`

- **00.01_NDA_Confidentiality:** Executed Non-Disclosure Agreements (NDAs).
- **00.02_Teaser_IM:** Investment Teaser and Information Memorandum (IM).
- **00.03_Process_Letters:** Process Letters and Bid Guidelines.

### Folder 01: Corporate & Societário

_Tags:_
`#corporate #societario #contrato-social #estatuto #acordo-quotistas #junta-comercial`

- **01.01_Constitutive_Documents:** Contrato Social (for LTDAs) or Estatuto
  Social (for S.As), including all historical alterations and consolidations.
- **01.02_Junta_Comercial:** Recent Certidão Simplificada and Certidão Inteiro
  Teor from the local Junta Comercial (e.g., JUCESP, JUCERJA).
- **01.03_Acordos_Socios:** Quotaholder/Shareholder Agreements (Acordo de
  Quotistas/Acordo de Acionistas).
- **01.04_Minutes_Books:** Minutes of Shareholders’ Meetings (Atas de Assembleia
  Geral/Reunião de Sócios), Board Minutes, and official Corporate Books (Livro
  de Registro de Ações, etc.).
- **01.05_Powers_of_Attorney:** Active Powers of Attorney (Procurações) granted
  by the company and its partners.

### Folder 02: Financial & Accounting

_Tags:_
`#financial #contabilidade #dre #balanço #balancete #qoe #working-capital`

- **02.01_Balanço_Patrimonial:** Audited and/or management Balance Sheets
  (Balanços Patrimoniais) for the last 5 fiscal years.
- **02.02_DRE_Income_Statement:** Income Statements (Demonstrações do Resultado
  do Exercício - DRE) for the last 5 fiscal years (annual and monthly
  break-downs).
- **02.03_Balancetes:** Trial Balances (Balancetes de Verificação) for the
  current fiscal year.
- **02.04_Debt_Ledger:** Details on all bank loans, financing agreements (BNDES,
  etc.), debentures, and intercompany loans.
- **02.05_Cash_Reconciliation:** Bank statements and cash/cash equivalents
  reconciliations.
- **02.06_Working_Capital:** Accounts Receivable aging lists and Inventory aging
  reports.

### Folder 03: Tax & Fiscal

_Tags:_ `#tax #fiscal #cnd #sped #icms #iss #pis-cofins #lalur #autodeinfracao`

- **03.01_Certidoes_Tributarias:** Federal, State (ICMS/ITCMD), and Municipal
  (ISS/IPTU) Tax Certificates (CNDs or CPNDs).
- **03.02_SPED_Declarations:** SPED Fiscal, SPED Contábil (ECD), ECF
  (Escrituração Contábil Fiscal), and EFD Reinf filings for the last 5 years.
- **03.03_Tributos_Diretos:** IR PJ and CSLL computation sheets and e-Lalur
  books.
- **03.04_Tributos_Indiretos:** ISS (municipal) and ICMS / PIS / COFINS
  (state/federal) monthly calculations.
- **03.05_Transfer_Pricing:** Transfer pricing studies (if applicable to
  export/import activities).
- **03.06_Autos_Infracao:** Active tax administrative assessments (Autos de
  Infração) and tax planning documents.

### Folder 04: Labor & Previdenciário

_Tags:_ `#labor #trabalhista #cndt #fgts #esocial #pejotização #clt #sindicato`

- **04.01_Certidoes_Trabalhistas:** Certidão Negativa de Débitos Trabalhistas
  (CNDT) and Certificado de Regularidade do FGTS (CRF).
- **04.02_eSocial_GFIP:** Summary sheets of eSocial declarations, GFIP/SEFIP
  receipts, and GPS payments.
- **04.03_Employee_Census:** Complete census listing admission date, function,
  salary, CLT status, vacation balances, and benefits.
- **04.04_PJ_Service_Contracts:** Service contracts with independent contractors
  (PJs, Freelancers, and Cooperatives).
- **04.05_Collective_Bargaining:** Collective Bargaining Agreements (Convenções
  Coletivas de Trabalho - CCT) and relations with unions.

### Folder 05: Commercial & Operational

_Tags:_
`#operational #comercial #contrato-comercial #change-of-control #fornecedores`

- **05.01_Top_Customers:** Contracts, Purchase Orders, and sales history for the
  Top 10 clients.
- **05.02_Top_Suppliers:** Contracts and terms for the Top 10 suppliers.
- **05.03_Change_of_Control_Log:** A spreadsheet extracting "Change of Control"
  and "Assignment" clauses from material contracts.
- **05.04_Pricing_Pipelines:** Price lists, sales pipeline data, and marketing
  materials.

### Folder 06: Real Estate & Physical Assets

_Tags:_ `#real-estate #imoveis #matricula #locação #ativo-imobilizado`

- **06.01_Matriculas:** Property deeds (Matrículas Imobiliárias) updated within
  the last 30 days.
- **06.02_Lease_Agreements:** Rental and lease contracts (Contratos de Locação)
  for office space, factories, or warehouses.
- **06.03_Asset_Registry:** List of all machinery, vehicles, and equipment
  (Ativo Imobilizado registry).

### Folder 07: Intellectual Property & Tech

_Tags:_ `#ip #pi #inpi #software #marcas #lgpd #privacy`

- **07.01_INPI_Registrations:** Brand and patent registrations or pending
  applications at the Instituto Nacional da Propriedade Industrial (INPI).
- **07.02_Software_Code_Ownership:** Software copyright registrations, source
  code deposits, and developer IP assignment clauses.
- **07.03_LGPD_Compliance:** Privacy Policies, Data Protection Officer (DPO)
  designations, and data mapping reports.

### Folder 08: Environmental, Health & Safety

_Tags:_ `#environmental #ambiental #licença-operacao #ibama #sanitario #pcmso`

- **08.01_Licencas_Ambientais:** LP (Licença Prévia), LI (Licença de
  Instalação), and LO (Licença de Operação) certificates.
- **08.02_Sanitary_Outorgas:** Sanitary licenses (Anvisa/Vigilância Sanitária)
  and water use authorizations (Outorgas de Recursos Hídricos).
- **08.03_Work_Safety:** PPRA, PCMSO, and LTcat technical reports.

### Folder 09: Litigation & Judicial Contingencies

_Tags:_ `#litigation #judicial #civel #trabalhista #crime #falencia`

- **09.01_Processos_List:** Comprehensive litigation log detailing Court, Case
  Number, Parties, Object, Materiality, and Probability of Loss.
- **09.02_Certidoes_Distribuidores:** Search certificates from Civil, Criminal,
  Federal, State, and Labor Court distributors (Certidões de Falência,
  Recuperação Judicial e Cartório de Protestos).

### Folder 10: Insurance, Compliance & ESG

_Tags:_ `#compliance #seguros #anti-corruption #esg`

- **10.01_Insurance_Policies:** General Liability, Property, and D&O insurance
  policies.
- **10.02_Compliance_Policies:** Code of Conduct, Anti-Corruption Policies (Lei
  12.846/2013 compatibility), and training logs.
