---
canonical_name: "Documents & VDR"
definition_id: "BD-07"
definition_status: "Governed for MAI-90"
screen_family: "deal-execution"
owning_task: "MAI-92"
canonical_routes:
  - "/deals/:dealId/documents"
figma_file_key: "otMJE31OKIxdXogV4RNbGQ"
figma_status: "Approved for desktop MVP in MAI-92; tablet and mobile deferred"
figma_area: "MAI Banker Workspace — Design System & Product UI / 06 Application Shell"
figma_nodes:
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=205-3738"
figma_non_authoritative_responsive_drafts:
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=205-3822"
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=205-3886"
related_definitions:
  - "design/26_Cross_Screen_Interaction_Map.md"
  - "design/27_Shared_State_Model.md"
  - "design/0_Implementaion_Roadmap.md"
last_reviewed_task: "MAI-90"
implementation_capability_boundary: "Product definition only; no frontend, backend, Storybook, token export, or runtime behavior implemented by this file."
mock_demo_data_boundary: "Use fictional/demo transaction data only; do not encode real client, counterparty, credential, or confidential deal data."
---
# Documents & VDR Control

## 1. Recommended product naming

The product architecture can retain **Documents & VDR** as the internal screen family, but the banker-facing labels should be simpler:

* **Deal navigation:** `Documents`
* **Page title:** `Documents & Evidence`
* **Administrative source area:** `Connected Sources`
* **Technical architecture:** `Documents & VDR Control`

This avoids presenting “VDR” as if M&Ai were attempting to replace the customer’s existing data room.

The screen’s role is broader than storage:

> **It controls how transaction evidence enters M&Ai, how it is classified and processed, what has changed, what is missing, who may access it and which conclusions depend on it.**

The product architecture already establishes this workspace as the deal-level surface for synchronization, browsing, classification, processing, missing-document requests, version comparison, permissions, evidence references, extraction failures and preview. It should act as an intelligent control layer over the VDR—not as a substitute file explorer. 

---

# 2. Screen definition

**Documents & Evidence** is the deal-level control room for all source material used by M&Ai.

It establishes the chain between:

* The external or internal document source;
* The original file;
* The synchronized version;
* Its folder and classification;
* Its processing state;
* Extracted and normalized content;
* Evidence citations;
* Dossier facts;
* Diligence findings;
* Valuation assumptions;
* Negotiation terms;
* Closing conditions;
* Human review decisions.

Its central operating sequence is:

> **Source → Synchronization → Classification → Processing → Evidence → Downstream impact → Human review**

The screen should allow a banker to answer:

1. **Which source documents are available?**
2. **Are they current and complete?**
3. **Which documents are missing?**
4. **Which files failed processing or require review?**
5. **What changed since the last synchronization?**
6. **Which transaction conclusions depend on each document?**
7. **Who can access, download or use each file?**
8. **Can the original evidence be opened at the exact cited location?**

---

# 3. Why this screen is foundational

Documents are not simply another content type in M&Ai.

They are the evidentiary foundation for:

* Target Dossier facts;
* Diligence findings;
* Deterministic valuation inputs;
* Buyer or target assessments;
* Negotiation term reconciliation;
* Closing-condition completion;
* Generated reports;
* Human approvals;
* Audit records.

The product deck defines the Diligence Copilot as the layer that classifies files, identifies missing information and links findings to their sources. It also positions M&Ai as moving **from VDR documents to an auditable deal workspace**. 

That means this screen cannot be designed as:

> “Dropbox with AI labels.”

It must be designed as:

> **The transaction’s evidence-control layer.**

---

# 4. Primary intention

## Operational intention

Allow the deal team to control the quality, freshness, accessibility and downstream use of transaction evidence.

## User intention

A banker should be able to say:

> “I know what documentation exists, which version is authoritative, what is missing, what changed and which conclusions may need to be reviewed.”

## Product intention

The screen should make M&Ai’s relationship with the VDR explicit:

> **The VDR remains the source repository. M&Ai synchronizes, interprets and connects its evidence to transaction decisions.**

This is strategically important because M&Ai’s differentiation is not file storage. It is the connection between document evidence, structured analysis, deterministic calculations and human workflow. 

---

# 5. What the screen is not

Documents & Evidence should not become:

* A generic cloud drive;
* A replacement VDR;
* A Windows-style file explorer;
* A document editor;
* A permanent PDF reader;
* A folder tree with AI badges added;
* A dumping ground for generated reports;
* A complete information-request portal;
* A technical ingestion console;
* A vector-database browser;
* A RAG observability screen;
* A raw OCR interface;
* A system-log viewer;
* An unrestricted download center.

The primary question is not:

> “Where is the file?”

It is:

> **“Is this transaction evidence available, usable, current and connected to the decisions it supports?”**

---

# 6. Relationship to adjacent screens

| Screen                        | Primary responsibility                                            |
| ----------------------------- | ----------------------------------------------------------------- |
| **New Deal Setup**            | Selects the initial document source                               |
| **Documents & Evidence**      | Controls source files, synchronization, processing and provenance |
| **Target Dossier**            | Converts evidence into structured, reviewed transaction facts     |
| **Diligence Decision Room**   | Converts evidence and facts into material findings                |
| **Valuation Lab**             | Uses approved evidence-backed inputs in calculations              |
| **Deal Overview**             | Summarizes evidence readiness and material document changes       |
| **Open Questions / Requests** | Obtains missing documents or clarification                        |
| **Deliverables & Exports**    | Produces reports from approved evidence and decisions             |
| **Activity & Audit**          | Records document, access and synchronization events               |
| **Deal Team & Access**        | Controls who may access each source or document category          |

## Documents versus Target Dossier

Documents answers:

> Which source material exists?

Target Dossier answers:

> Which transaction facts have been established from that material?

## Documents versus Diligence

Documents answers:

> What does the source contain, and can it be used reliably?

Diligence answers:

> What transaction risk or exception follows from that evidence?

## Documents versus Deliverables

Documents contains **incoming evidence**.

Deliverables contains **outgoing transaction artifacts** generated or assembled by M&Ai.

A diligence report should not appear beside raw tax certificates as if they were equivalent source documents.

---

# 7. Source-of-record model

M&Ai should explicitly distinguish four document concepts.

## 7.1 External source document

The file stored in the connected VDR or repository.

Examples:

* Papermark document;
* future supported enterprise VDR document;
* secure cloud-storage document.

## 7.2 M&Ai synchronized representation

The metadata and controlled copy or reference that M&Ai uses for processing.

It may contain:

* Provider identifier;
* checksum;
* file metadata;
* source folder;
* synchronized timestamp;
* access scope;
* processing version.

## 7.3 Extracted evidence

The text, table, clause, cell range or structured value derived from the source.

## 7.4 Generated artifact

A report, model export or memorandum created by M&Ai.

Generated artifacts should be visibly separated from source evidence.

## UX principle

The user should always be able to determine:

* Where the original file lives;
* whether M&Ai stores a controlled copy or reference;
* which version was processed;
* whether the original has since changed;
* whether the downstream conclusion remains current.

---

# 8. Provider strategy

The application should use a canonical document model independent of the underlying VDR provider.

The banker-facing UI should not change substantially when a provider changes.

Common concepts should remain:

* Source;
* folder;
* document;
* version;
* permission;
* synchronization;
* processing;
* evidence reference.

Provider-specific fields should remain inside:

* Source details;
* connection configuration;
* diagnostic views.

## MVP boundary

The repository specifies **Papermark as the sole enabled MVP VDR**, with iDeals and Intralinks treated as later enterprise integrations requiring real authenticated validation.

The UI should therefore:

* Support a generic provider abstraction;
* Avoid implying that every provider is already production-ready;
* Clearly distinguish connected, simulated and unavailable sources;
* Never represent a mock or fallback response as a successful live synchronization.

## Pitch treatment

Use:

> **Connected document source**

or:

> **Deal source synchronized**

Do not use real iDeals, Intralinks or Papermark logos in the static pitch mock unless the integration being demonstrated is genuinely operational and appropriately disclosed.

---

# 9. Primary users

## 9.1 Analyst

Needs to:

* Browse files;
* classify uncategorized documents;
* review processing failures;
* compare versions;
* link documents to facts;
* create information requests;
* identify duplicates.

## 9.2 Associate

Needs to:

* Monitor document completeness;
* review changed evidence;
* assign missing-document requests;
* confirm authoritative versions;
* inspect downstream use;
* prepare diligence workstreams.

## 9.3 Vice President

Needs to:

* Understand whether evidence is sufficient;
* identify material changes;
* review conflicts;
* determine whether conclusions became stale;
* approve source or classification changes where required.

## 9.4 Managing Director or Partner

Needs:

* High-level readiness;
* material document gaps;
* source freshness;
* critical access or dependency issues;
* limited direct file browsing.

## 9.5 Specialist reviewer

Needs:

* Workstream-specific documents;
* exact citations;
* processing state;
* version history;
* restricted access;
* document requests.

## 9.6 Deal administrator

Needs to:

* Connect sources;
* manage synchronization;
* resolve authentication;
* map folders;
* control access;
* monitor provider failures;
* perform controlled disconnects.

## 9.7 External participant

May be able to:

* Upload requested files;
* see submission status;
* replace rejected files;
* answer a request.

They should not automatically see:

* Internal classifications;
* extracted findings;
* valuation dependencies;
* banker notes;
* internal access structure.

---

# 10. Primary job to be done

> When transaction evidence is distributed across a VDR, uploads and changing document versions, give the deal team one controlled place to understand what exists, what is usable, what changed and which decisions depend on it.

## Secondary jobs

The user should also be able to:

* Search document contents and metadata;
* browse the original folder structure;
* filter by workstream;
* upload files;
* synchronize the source;
* inspect exact citations;
* classify documents;
* mark authoritative versions;
* compare versions;
* review extraction failures;
* identify possible duplicates;
* map missing checklist items;
* create an information request;
* restrict access;
* see source audit history;
* open a linked dossier fact or diligence finding;
* export an authorized document index.

---

# 11. Core screen model

The screen should be organized around five conceptual layers.

## Layer 1 — Source state

Is the connected source available and current?

## Layer 2 — Document inventory

What files and folders exist?

## Layer 3 — Processing state

Can M&Ai use each document?

## Layer 4 — Evidence use

Which facts, findings and calculations depend on it?

## Layer 5 — Exception workflow

What is missing, conflicting, failed or changed?

---

# 12. Recommended workspace structure

The page should have four principal subviews:

1. **Library**
2. **Requests**
3. **Changes**
4. **Source & Access**

Optional later subview:

5. **Readiness**

## Library

Canonical document registry and preview.

## Requests

Missing-document and information-request workflow.

## Changes

New, updated, removed and conflicting source material.

## Source & Access

Connection, synchronization and permission controls.

## Readiness

Structured comparison against the transaction’s required document set.

For the MVP, Readiness may be integrated into Library and Requests rather than added as a separate tab.

---

# 13. Page header

## Recommended title

> **Documents & Evidence**

Supporting description:

> Control source documents, processing, evidence references and missing information for this transaction.

## Header status

Example:

* **127 documents synchronized**
* **121 processed**
* **6 requests open**
* **4 changes require review**
* **2 processing failures**

Source state:

> Connected source · Synchronized 4 min ago

## Primary action

Adapt to current state:

* **Synchronize source**
* **Upload documents**
* **Review changes**
* **Resolve failures**
* **Connect source**

## Secondary actions

* Create request;
* export index;
* source settings.

---

# 14. Evidence-readiness summary

## Purpose

Give users a concise view of whether the available document set can support transaction analysis.

## Recommended dimensions

1. Documents expected;
2. documents available;
3. documents current;
4. documents processed;
5. unresolved failures;
6. open requests;
7. contradictory or replaced evidence;
8. restricted material;
9. downstream decisions requiring review.

## Example

> **Evidence readiness: Attention required**

Reasons:

* 6 required documents remain missing;
* 2 files failed extraction;
* 4 updated documents affect approved outputs;
* Tax workstream has 71% required coverage.

## Summary cards

Use no more than five:

| Summary       |   Value | Meaning                         |
| ------------- | ------: | ------------------------------- |
| Synchronized  | **127** | Available from connected source |
| Ready for use | **121** | Processed and searchable        |
| Missing       |   **6** | Required items not received     |
| Changed       |   **4** | New versions require review     |
| Failed        |   **2** | Processing could not complete   |

These should function as filters.

## Avoid

Do not show:

* Total tokens indexed;
* vector count;
* embedding dimensions;
* chunk count;
* OCR confidence as a principal KPI;
* agent reads;
* storage consumption as a hero metric.

---

# 15. Source status

## Purpose

The source-status component establishes whether M&Ai’s view of the evidence is trustworthy and current.

## Required information

* Connection name;
* source type;
* connection state;
* synchronization mode;
* last successful synchronization;
* synchronization owner;
* folders in scope;
* permission mode;
* latest failure;
* next scheduled synchronization, where applicable.

## Example

> **Connected document source**
> Continuous synchronization
> Last successful sync: Today at 10:24
> 14 folders in scope · 127 documents
> Authorized by Marina Alves

## Source states

* Not connected;
* authorization required;
* connected;
* synchronizing;
* synchronized;
* delayed;
* partially synchronized;
* authentication failed;
* provider unavailable;
* rate limited;
* disconnected;
* archived.

## UX rule

Do not reduce source state to a green dot.

Show the user-relevant consequence.

Example:

> **Authentication expired**
> Documents remain available from the previous synchronization, but new changes cannot be imported.

---

# 16. Library view

## Purpose

The Library is the canonical document inventory.

It should support two complementary navigation models:

1. **Source folder structure**
2. **M&Ai classification**

## Source folder structure

Preserves the organization used in the VDR.

Example:

```text
00 Administrative
01 Corporate
02 Financial & Accounting
03 Tax
04 Labor
05 Commercial & Operational
06 Real Estate & Assets
07 Technology & IP
08 Environmental & Safety
09 Litigation
10 Insurance, Compliance & ESG
```

## M&Ai classification

Provides normalized workstream categories independent of provider folder names.

Examples:

* Corporate;
* financial;
* tax;
* legal;
* labor;
* commercial;
* operational;
* technology;
* regulatory;
* environmental;
* litigation;
* compliance;
* transaction process.

## UX direction

The user should be able to switch between:

> **Source structure**

and:

> **M&Ai classification**

The original folder path must never be lost.

---

# 17. Folder navigator

## Purpose

Allow rapid browsing without making the interface feel like an operating-system file explorer.

## Required folder information

* Folder name;
* source path;
* document count;
* processing exception count;
* missing requirement count;
* restricted state;
* changed-since-sync state.

Example:

> **02 Financial & Accounting**
> 31 documents · 2 changed · 1 failure

## Folder states

* Ready;
* incomplete;
* processing;
* changed;
* restricted;
* empty;
* inaccessible;
* unmapped.

## Folder mapping

A source may contain:

> Finance / Historical / DREs

while M&Ai classifies it as:

> Financial → Income Statements

The mapping should remain visible.

## UX rule

Do not force the source’s folder organization to determine M&Ai’s entire workflow.

Poorly organized VDRs are common. M&Ai should normalize them without hiding the original structure.

---

# 18. Document registry

## Purpose

The registry is the authoritative deal-level list of synchronized and uploaded documents.

## Recommended default columns

1. Document;
2. classification;
3. source folder;
4. period;
5. processing state;
6. evidence use;
7. version state;
8. access;
9. updated;
10. actions.

## Optional columns

* Mime type;
* size;
* uploader;
* source provider;
* checksum;
* language;
* page count;
* workstream;
* request;
* extraction method;
* source creation date;
* source modification date;
* last synchronized;
* last opened;
* citation count;
* downstream dependency count.

Do not show every column by default.

---

# 19. Document row anatomy

## 19.1 Identity

Primary:

> **Receita_por_Cliente_2025.xlsx**

Secondary:

> Financial & Accounting / Revenue Analysis

## 19.2 Classification

Example:

> Financial · Customer revenue

Classification states:

* Confirmed;
* suggested;
* needs review;
* conflicting;
* not classified;
* not applicable.

## 19.3 Period

Example:

> Jul-25–Jun-26

Possible states:

* Exact;
* inferred;
* multiple periods;
* unknown.

## 19.4 Processing

Example:

> **Ready**

Other states:

* Queued;
* downloading;
* validating;
* scanning;
* extracting;
* classifying;
* indexing;
* ready;
* partial;
* failed;
* unsupported;
* encrypted;
* corrupted;
* restricted;
* excluded.

## 19.5 Evidence use

Example:

> **7 references**

Supporting:

* 4 dossier facts;
* 2 diligence findings;
* 1 valuation assumption.

## 19.6 Version state

Examples:

* Current;
* new version;
* superseded;
* source changed;
* removed from source;
* possible duplicate.

## 19.7 Access

Examples:

* Deal team;
* financial workstream;
* restricted;
* read-only;
* external submission;
* access inherited.

## 19.8 Updated

Prefer:

> New version synchronized 18 min ago

over:

> Updated 18 min ago

## 19.9 Row actions

* Preview;
* inspect evidence use;
* compare versions;
* download, where permitted;
* copy source link;
* classify;
* create request;
* manage access;
* exclude from processing;
* view history.

---

# 20. Processing lifecycle

The screen should expose a business-readable processing pipeline.

```text
Synchronized
  ↓
Integrity validation
  ↓
Security inspection
  ↓
Text and table extraction
  ↓
Classification
  ↓
Deal-scoped indexing
  ↓
Evidence ready
```

## Recommended states

### Synchronized

Metadata or file received from the source.

### Validating

Checking file integrity, type, size, encryption and duplication.

### Security review

Checking potentially unsafe or malformed content.

### Extracting

Reading text, tables, clauses and metadata.

### Classifying

Assigning document category, period and workstream.

### Indexing

Making approved extracted content available to deal-scoped retrieval.

### Ready

Usable as evidence.

### Partial

Some content was processed, but limitations remain.

### Failed

The document cannot safely support evidence use.

## UX principle

Use business-relevant labels.

Avoid primary states such as:

* Embedding;
* chunking;
* tokenizer running;
* vectorizing;
* parser worker failed.

Technical details may appear in diagnostics.

---

# 21. Processing state details

Selecting the processing status should expose:

* Current stage;
* start time;
* latest successful stage;
* extracted content types;
* limitations;
* retry behavior;
* technical diagnostic identifier;
* affected downstream work.

Example:

> **Partial processing**

Processed:

* Text content;
* 43 of 51 pages;
* basic metadata.

Unavailable:

* Tables on pages 44–51;
* two scanned appendices.

Consequence:

> This document may support narrative review but should not be used for financial extraction until the table issue is resolved.

Actions:

* Retry;
* upload searchable version;
* mark manually reviewed;
* request replacement;
* exclude from automated use.

---

# 22. Document preview

## Purpose

Allow users to inspect the original source and evidence references without leaving M&Ai.

## Required capabilities

* PDF viewing;
* spreadsheet preview;
* presentation preview;
* text preview;
* image preview;
* document metadata;
* page or sheet navigation;
* zoom;
* search within document;
* citation highlighting;
* version selector;
* access notice.

## Spreadsheet preview

Should support:

* Sheet selection;
* visible row and column headers;
* highlighted cells;
* formula/value distinction where available;
* frozen citation position;
* source range.

Example:

> Sheet: Revenue by Customer
> Cells: B12:M14

## PDF preview

Should support:

* Page navigation;
* highlighted clause;
* adjacent context;
* citation label;
* source link.

## UX rule

The preview is for verification.

It should not attempt to replace Excel, Word or the original VDR viewer for complete document editing.

---

# 23. Evidence references

## Purpose

Show how a document is used throughout the transaction.

## Reference types

* Dossier fact;
* diligence finding;
* valuation assumption;
* matching criterion;
* negotiation term;
* closing condition;
* information request;
* generated deliverable;
* Copilot citation.

## Example

> **Used by 7 transaction objects**

### Target Dossier

* LTM revenue · R$ 310,4 mi;
* customer concentration · 41,2%;
* recurring revenue · 68,0%.

### Diligence

* Customer-concentration finding;
* revenue-quality review.

### Valuation

* Downside revenue scenario v4;
* base revenue forecast.

## Reference states

* Current;
* stale;
* superseded;
* under review;
* restricted.

## Core UX behavior

Selecting a reference should open the exact downstream context.

Example:

> Customer-concentration finding
> Open Diligence Decision Room with finding selected.

---

# 24. Evidence graph without graph visualization

The product needs evidence relationships, but the main interface should not default to an abstract node graph.

Use a practical dependency list:

```text
Receita_por_Cliente_2025.xlsx
  ├── LTM revenue
  ├── Customer concentration
  ├── Recurring revenue
  ├── Customer-concentration finding
  ├── Revenue-risk scenario v4
  └── Diligence report v3
```

A visual graph may become an advanced diagnostic later.

The banker-facing experience should prioritize:

* What depends on this file;
* whether it remains current;
* what needs review if it changes.

---

# 25. Version control

## Purpose

Preserve the evidentiary history of documents that change during a transaction.

## Version concepts

* Source version;
* synchronized version;
* authoritative version;
* superseded version;
* duplicate version;
* removed source version.

## Version identity

Use:

* Provider version identifier, if available;
* checksum;
* modified timestamp;
* synchronized timestamp;
* uploader;
* source path.

## Current authoritative version

A document may have several versions, but only one should normally be marked:

> **Current for analysis**

This state may be:

* Automatically proposed;
* manually confirmed;
* controlled by source semantics.

## UX rule

Never silently replace the version cited by an approved decision.

The historical citation must continue pointing to the exact version originally reviewed.

---

# 26. Version comparison

## Purpose

Help users understand whether a new version creates a material change.

## Comparison types

### Text document

* Added paragraphs;
* removed paragraphs;
* changed clauses;
* changed dates;
* changed monetary values;
* changed parties.

### Spreadsheet

* Changed cells;
* new rows or columns;
* formula changes;
* deleted sheets;
* changed period;
* changed totals.

### Presentation

* Changed slides;
* revised claims;
* changed financial metrics;
* removed disclosures.

## Example

> **Receita_por_Cliente_2025.xlsx**

Version 3 compared with version 2:

* Customer Atlas revenue increased by R$ 3,2 mi;
* customer Nova revenue decreased by R$ 1,1 mi;
* top-three concentration changed from 39,8% to 41,2%;
* two rows added;
* no formula changes detected.

## Actions

* Accept new version for analysis;
* keep previous version authoritative;
* request clarification;
* assign review;
* create finding;
* mark as immaterial;
* open affected outputs.

---

# 27. Change-impact review

This is one of the screen’s most differentiated components.

## Purpose

When a source changes, identify which approved outputs may no longer be valid.

## Example

> **New customer-revenue schedule detected**

Affected:

* Customer concentration dossier fact;
* high-severity diligence finding;
* valuation scenario v4;
* diligence report v3;
* buyer-risk summary.

Current state:

> **5 downstream outputs require review**

## Actions

* Review changes;
* assign reviewer;
* accept immaterial update;
* mark affected outputs stale;
* defer with reason.

## UX rule

A synchronized source change should not automatically alter approved decisions.

It should create a controlled review sequence:

> **New evidence → Difference detected → Dependencies identified → Human review → Outputs updated**

---

# 28. Changes view

## Purpose

Consolidate meaningful source changes after synchronization.

## Change categories

* New document;
* updated document;
* removed document;
* moved document;
* renamed document;
* access changed;
* classification changed;
* processing changed;
* duplicate detected;
* authoritative version changed.

## Recommended grouping

### Requires review

Changes affecting active transaction objects.

### Informational

Changes without current downstream consequence.

### Resolved

Reviewed and accepted changes.

## Change item anatomy

* Document;
* change type;
* detected time;
* material difference;
* affected outputs;
* reviewer;
* state;
* action.

Example:

> **Updated · Receita_por_Cliente_2025.xlsx**
> Top-three concentration changed by +1,4 p.p.
> Affects 1 fact, 1 finding and 1 valuation scenario.
>
> **Review impact**

---

# 29. Missing-document readiness

## Purpose

Compare the available document set with the transaction’s required evidence framework.

## Requirement sources

* Deal workflow template;
* workstream checklist;
* jurisdiction;
* transaction type;
* current phase;
* specialist request;
* institution playbook;
* custom deal requirement.

## Requirement states

* Available;
* partially available;
* outdated;
* submitted;
* under review;
* rejected;
* missing;
* not applicable;
* restricted;
* waived.

## Example

> **Tax certificates**

Required:

* Federal certificate;
* State certificate;
* municipal certificate;
* labor-debt certificate;
* FGTS regularity certificate.

State:

* 3 available;
* 1 expired;
* 1 missing.

## UX direction

Show the requirement, not only the absent file.

Instead of:

> Missing `CND_Municipal.pdf`

Use:

> **Municipal tax-clearance certificate required**
> No current document has been identified.

---

# 30. Readiness by workstream

| Workstream | Required | Available | Needs review | Missing | State      |
| ---------- | -------: | --------: | -----------: | ------: | ---------- |
| Corporate  |       14 |        14 |            1 |       0 | Attention  |
| Financial  |       26 |        24 |            2 |       2 | Incomplete |
| Tax        |       18 |        13 |            2 |       5 | At risk    |
| Labor      |       12 |        11 |            1 |       1 | Attention  |
| Commercial |       16 |        15 |            3 |       1 | In review  |
| Legal      |       21 |        19 |            2 |       2 | Incomplete |

These numbers should derive from explicit requirements.

Do not invent an untraceable “VDR completeness score.”

---

# 31. Information Requests view

## Purpose

Manage requests for missing, replacement or clarifying documents.

## Request types

* Missing document;
* updated version;
* readable replacement;
* supporting schedule;
* signed copy;
* current certificate;
* reconciliation explanation;
* missing page or appendix;
* access request;
* clarification.

## Request anatomy

* Requested item;
* category;
* rationale;
* requested from;
* owner;
* due date;
* urgency;
* related requirement;
* affected output;
* submission state;
* reviewer.

Example:

> **Provide FY2023 monthly revenue by customer**

Reason:

> Required to assess concentration trend.

Requested from:

> Target CFO

Owner:

> Felipe Rocha

Due:

> 1 August 2026

Impact:

> Blocks customer-concentration trend analysis.

## Request states

* Draft;
* internal review;
* sent;
* acknowledged;
* response received;
* partial response;
* rejected;
* overdue;
* resolved;
* withdrawn.

---

# 32. Request-to-document reconciliation

When a document is uploaded in response to a request, M&Ai should attempt to match it automatically.

Example:

> `Revenue_by_Customer_2023_Final.xlsx`

Possible match:

> Request: FY2023 monthly revenue by customer

Confidence should not be the only basis for closure.

Actions:

* Confirm match;
* attach as partial response;
* reject submission;
* request replacement;
* assign reviewer.

## Closure behavior

A request should close only when:

* The correct document or information is received;
* processing succeeds or manual review confirms usability;
* the responsible reviewer marks the requirement resolved.

---

# 33. Upload workflow

## Entry points

* Page primary action;
* Folder action;
* Request submission;
* Drag and drop;
* External submission portal;
* Source import.

## Upload metadata

* Filename;
* source type;
* intended folder;
* classification;
* document period;
* related request;
* confidentiality;
* uploader;
* authoritative-version intent.

## Validation

Check:

* Duplicate file;
* unsupported type;
* encrypted file;
* corrupt file;
* excessive size;
* malware or unsafe content;
* filename conflict;
* restricted-category access;
* missing required metadata.

## UX rule

Uploading a file should not imply that it is immediately approved evidence.

The initial state should be:

> Uploaded · Processing

---

# 34. Duplicate detection

## Duplicate types

* Exact binary duplicate;
* same content, different filename;
* same filename, different content;
* probable revised version;
* partial duplicate;
* source and manual-upload duplicate.

## Example

> **Possible revised version**

Existing:

> `Financial_Statements_2025.pdf`
> Synchronized 18 July

Uploaded:

> `Financial_Statements_2025_Final.pdf`
> Uploaded today

Differences:

* Same first 47 pages;
* three revised notes;
* updated signature page.

Actions:

* Treat as new version;
* keep separate;
* replace pending review;
* cancel upload.

---

# 35. Document classification

## Purpose

Normalize inconsistent VDR naming and folder structures.

## Suggested classification fields

* Workstream;
* document type;
* entity;
* period;
* jurisdiction;
* language;
* confidentiality;
* required-document mapping;
* transaction phase;
* source classification.

## Classification states

* Confirmed;
* suggested;
* needs review;
* conflict;
* unclassified.

## Bulk classification

Allow users to:

* Confirm suggestions;
* assign workstream;
* assign period;
* map folder;
* mark not relevant;
* restrict access.

## UX principle

Classification suggestions should remain reviewable.

Do not use vague labels such as:

> AI confidence 94%

Prefer:

> Suggested based on filename, folder and extracted content.

---

# 36. Document period and entity

Many M&A documents are unusable without correct context.

The system should explicitly model:

* Entity;
* period start;
* period end;
* effective date;
* fiscal year;
* signing date;
* expiration date;
* currency;
* reporting basis.

## Example

> `Balancete_Junho_2026.xlsx`

Entity:

> Atlas Industrial S.A.

Period:

> 1–30 June 2026

Reporting basis:

> Management accounts

Currency:

> BRL

State:

> Confirmed

## UX rule

Do not infer temporal comparability from filenames alone.

---

# 37. Document authority

The interface should support a source hierarchy.

## Source classifications

* Primary source;
* supporting source;
* management representation;
* external research;
* user-entered evidence;
* contradictory source;
* historical source;
* outdated source;
* generated artifact.

## Example

> Audited financial statements
> **Primary**

> Information memorandum
> **Supporting**

> Management presentation
> **Management representation**

This hierarchy supports reconciliation without implying that every source is equally authoritative.

---

# 38. Access and permissions

## Access dimensions

* Deal-level access;
* workstream access;
* folder access;
* document access;
* preview access;
* download permission;
* print permission;
* external access;
* generated-evidence access;
* Copilot usage.

## Recommended document access states

* Full;
* preview only;
* no download;
* restricted workstream;
* explicitly assigned;
* external submission only;
* hidden;
* inherited from source.

## Example

> **Employee_Census_2026.xlsx**
> Human Resources workstream
> Preview restricted · Download disabled
> Accessible to 4 assigned reviewers

## UX rule

M&Ai should not imply that source-provider permissions are automatically identical to M&Ai permissions.

The UI should explain:

> Source permission imported

or:

> M&Ai restriction added

---

# 39. Sensitive-data treatment

Potential sensitive content includes:

* Personal identifiers;
* employee records;
* compensation;
* medical information;
* customer personal data;
* bank details;
* litigation data;
* tax identifiers;
* cybersecurity documentation.

## Recommended controls

* Restricted classification;
* preview redaction;
* masked search results;
* download prohibition;
* watermarking where supported;
* access review;
* retention policy;
* audit logging.

## Redaction state

* Original;
* M&Ai redacted view;
* externally shareable version;
* redaction review required.

## UX principle

Never present redacted content as if the original source were changed.

---

# 40. Unsafe document content

Documents are untrusted inputs.

The repository’s diligence-agent guidance explicitly treats VDR content as potentially manipulative and requires instructions contained inside documents to be ignored rather than executed.

## Security flags

The screen may surface:

* Suspicious embedded instruction;
* malformed file;
* executable content;
* active macro;
* external link;
* password protection;
* unexpected script;
* extraction anomaly;
* content mismatch.

## Banker-facing state

Use:

> **Security review required**

Supporting text:

> This document contains content that cannot be used by automated analysis until it is reviewed.

Do not show alarmist technical language unless needed.

## Actions

* Quarantine;
* preview safely;
* mark trusted;
* exclude from automation;
* request clean replacement;
* escalate to administrator.

---

# 41. Search

## Search scopes

* Filename;
* metadata;
* extracted text;
* spreadsheet values;
* clauses;
* categories;
* people;
* entities;
* document requests;
* evidence references.

## Placeholder

> Search documents, clauses, values or requests

## Search result anatomy

> **Contrato_Cliente_Atlas.pdf**
> Page 14 · Clause 8.2
> “Termination permitted with 90 days’ notice.”
> Commercial & Operational · Current

## Scope controls

* All documents;
* current folder;
* selected workstream;
* current versions only;
* exact metadata;
* document content.

## UX rule

Search results must preserve:

* Document identity;
* source;
* version;
* location;
* access;
* processing state.

---

# 42. Filtering

## Primary filters

* Workstream;
* processing state;
* document state;
* period;
* access;
* change state.

## Advanced filters

* Source;
* folder;
* document type;
* entity;
* required-document status;
* evidence use;
* request state;
* reviewer;
* version;
* date synchronized;
* date modified;
* language;
* source authority;
* security flag;
* downstream dependency;
* stale citation.

## Useful saved views

* Documents needing review;
* financial documents;
* missing requirements;
* changed since last sync;
* failed processing;
* documents affecting valuation;
* restricted files;
* submitted this week;
* current versions only.

---

# 43. Selection and bulk actions

## Appropriate bulk actions

* Confirm classification;
* assign workstream;
* assign reviewer;
* retry processing;
* export index;
* add access restriction;
* mark not relevant;
* link to request;
* move within M&Ai classification;
* download authorized files.

## Controlled bulk actions

Require confirmation:

* Exclude from analysis;
* mark authoritative;
* remove M&Ai copy;
* change access;
* disconnect references.

## Inappropriate bulk actions

* Delete source files;
* approve evidence;
* overwrite versions;
* remove downstream citations;
* share restricted documents externally.

---

# 44. Document actions

## Preview

Open controlled document viewer.

## Open source

Open the original VDR document where supported.

## Download

Available only with explicit permission.

## Copy citation

Creates a citation containing:

* Document;
* version;
* page, sheet, cell or clause;
* source link;
* synchronized date.

## Create evidence reference

Links an exact excerpt or range to:

* Dossier;
* diligence;
* valuation;
* negotiation;
* closing.

## Request replacement

Creates a structured request preserving the problem.

## Compare versions

Opens version-difference workspace.

## Restrict

Opens effective-access review.

## Exclude from analysis

Requires reason and audit record.

---

# 45. Citation model

A citation should identify more than a filename.

## Minimum citation fields

* Document ID;
* document version;
* label;
* source provider;
* source path;
* page, sheet, cell range or clause;
* excerpt;
* synchronized timestamp;
* access classification.

## Example

> `Receita_por_Cliente_2025.xlsx`
> Version 3
> Sheet: Receita Mensal
> Cells: B12:M14
> Synchronized: 27 July 2026 at 10:24

## Citation durability

A citation should continue resolving even after:

* The source document is renamed;
* moved;
* replaced;
* superseded;
* removed from the live VDR.

The user should see its historical state and whether it remains current.

---

# 46. Citation health

Citation states:

* Current;
* source changed;
* source removed;
* version superseded;
* access revoked;
* location changed;
* unresolved;
* archived.

## Example

> **Citation requires review**

The cited cells changed in the latest version.

Affected:

* LTM revenue dossier fact;
* customer-concentration finding;
* valuation scenario v4.

This is more important than simply stating that a document was updated.

---

# 47. Source synchronization

## Synchronization modes

### Continuous

Provider changes detected automatically.

### Scheduled

Runs on configured intervals.

### Manual

Authorized user triggers synchronization.

### One-time import

No subsequent provider monitoring.

## Synchronization sequence

```text
Authenticate source
  ↓
Read folder and document metadata
  ↓
Compare source inventory
  ↓
Download or reference changed documents
  ↓
Validate and process
  ↓
Identify affected evidence
  ↓
Create review tasks
```

## UX rule

Synchronization success means:

> The expected source operations completed.

It must not mean:

> M&Ai fell back to cached or mocked content.

---

# 48. Synchronization report

After sync, display a concise report:

> **Synchronization completed**

* 4 new documents;
* 3 updated documents;
* 1 removed document;
* 2 access changes;
* 4 downstream outputs require review;
* 1 document failed processing.

Actions:

* Review changes;
* review failure;
* dismiss report.

## Detailed audit

Available separately:

* Start and end time;
* provider;
* user or schedule;
* folders checked;
* documents compared;
* errors;
* rate-limit events;
* authentication state;
* diagnostic ID.

---

# 49. Source failure states

## Invalid credentials

> **Source authorization expired**
> Existing synchronized evidence remains available. New changes cannot be imported.

## Provider unavailable

> **Document source unavailable**
> Last successful synchronization: 26 July at 18:32.

## Rate limited

> **Synchronization delayed**
> The source temporarily limited requests. M&Ai will retry after the permitted interval.

## Malformed response

> **Source response could not be validated**
> No document changes were applied.

## Missing source document

> **Document no longer available at source**
> Existing historical evidence is preserved, but the source cannot currently be opened.

## Partial synchronization

> **118 of 127 documents synchronized**
> Nine documents remain unchanged from the previous successful synchronization.

## UX principle

Never show:

> Synced

when the operation actually used stale, fallback or simulated data.

---

# 50. Disconnection behavior

Disconnecting a source is consequential.

## Confirmation should explain

* Continuous synchronization stops;
* existing synchronized files or references remain according to policy;
* citations retain historical source data;
* new source changes are not detected;
* document-related workflows may become stale;
* generated outputs are preserved;
* reconnection remains possible.

## Options

* Disconnect but retain synchronized evidence;
* disconnect and schedule retention review;
* cancel.

Deleting all synchronized evidence should be a separate governance action.

---

# 51. Source & Access view

## Purpose

Provide a controlled administrative view without turning the main Library into a configuration console.

## Sections

### Connection

* Provider;
* connection state;
* authorization owner;
* data-room identifier;
* source URL or reference;
* connection date.

### Synchronization

* Mode;
* schedule;
* last successful run;
* last failed run;
* next run.

### Scope

* Included folders;
* excluded folders;
* file-type restrictions;
* date limits.

### Access

* Effective deal-team permissions;
* source-derived restrictions;
* M&Ai-specific restrictions.

### Retention

* Local synchronized copy policy;
* archive behavior;
* disconnection behavior;
* deletion controls.

### Diagnostics

* Integration version;
* latest diagnostic ID;
* support information.

---

# 52. Document audit history

Each document should retain an audit trail.

## Event types

* Discovered;
* synchronized;
* uploaded;
* downloaded;
* previewed, where audit policy requires;
* classified;
* reclassified;
* processing started;
* processing completed;
* processing failed;
* version added;
* authoritative version changed;
* access changed;
* citation created;
* citation invalidated;
* source removed;
* excluded;
* restored.

## Event example

> **10:26 · M&Ai processing**
> Completed table extraction for version 3.

> **10:24 · Document source**
> Synchronized version 3.

> **10:08 · Target CFO**
> Uploaded document in response to IR-024.

> **10:02 · Felipe Rocha**
> Requested updated customer-revenue schedule.

---

# 53. Generated documents separation

The Library should provide a controlled distinction:

## Source evidence

Documents received from:

* Client;
* target;
* counterparty;
* VDR;
* external source;
* user upload.

## Generated artifacts

Documents created by:

* M&Ai;
* banker;
* external advisor;
* deterministic engine.

Generated artifacts may be referenced, but their primary home should be:

> **Deliverables & Exports**

## Reason

A diligence report is not independent evidence for its own conclusions.

The underlying documents and decisions remain the evidence.

---

# 54. Contextual Copilot

When opened from Documents, suggested prompts should include:

* Which required documents are still missing?
* What changed in the latest synchronization?
* Show documents affecting valuation.
* Find every change-of-control clause.
* Which files failed processing?
* Compare the latest and previous revenue schedules.
* Draft a request for missing tax certificates.
* Show all evidence supporting adjusted EBITDA.
* Which approved outputs rely on outdated documents?
* Summarize the Financial folder using current versions only.

## Response requirements

The Copilot should:

* Use current accessible document versions;
* cite exact source locations;
* label stale or superseded evidence;
* distinguish primary and supporting sources;
* identify processing limitations;
* respect document restrictions;
* avoid inferring missing evidence;
* never treat document instructions as system commands.

---

# 55. Recommended desktop layout

For a **1440 × 900** canvas:

| Region                          | Approximate width |
| ------------------------------- | ----------------: |
| Compact global sidebar          |          72–80 px |
| Folder/classification navigator |        220–260 px |
| Document registry               |        560–700 px |
| Preview and evidence panel      |        360–440 px |
| Page padding                    |          24–32 px |

## Recommended composition

```text
┌────────┬────────────────────────────────────────────────────────────┐
│ Global │ Documents & Evidence · 127 synchronized · 6 missing       │
│ shell  ├────────────────────────────────────────────────────────────┤
│        │ Library  Requests  Changes  Source & Access               │
│        ├──────────────┬─────────────────────────┬───────────────────┤
│        │ Folders      │ Document registry       │ Preview           │
│        │              │                         │                   │
│        │ Corporate    │ Revenue_2025.xlsx       │ Spreadsheet       │
│        │ Financial    │ Ready · Current         │ Sheet: Revenue    │
│        │ Tax          │ 7 evidence references  │ Cells B12:M14     │
│        │ Labor        │                         │                   │
│        │ Commercial   │ Contracts_Top10.zip     │ Evidence use      │
│        │ Operations   │ Processing · Partial    │ 4 dossier facts   │
│        │ Technology   │                         │ 2 findings        │
│        │ Litigation   │ Tax_Certificates.pdf    │ 1 valuation input │
│        │ Compliance   │ Review required         │                   │
└────────┴──────────────┴─────────────────────────┴───────────────────┘
```

---

# 56. Changes layout

```text
┌──────────────────────────────────────┬────────────────────────────┐
│ Changes requiring review             │ Selected change            │
│                                      │                            │
│ Updated revenue schedule             │ Version 2 → Version 3      │
│ Affects 3 outputs                    │ Top-3 concentration        │
│                                      │ 39,8% → 41,2%              │
│ New tax certificate                  │                            │
│ Resolves 1 request                   │ Affected outputs           │
│                                      │ Dossier fact               │
│ Contract removed from source         │ DD finding                 │
│ Affects 1 citation                   │ Valuation v4               │
│                                      │                            │
│                                      │ [ Review impact ]          │
└──────────────────────────────────────┴────────────────────────────┘
```

---

# 57. Requests layout

```text
┌──────────────────────────────────────┬────────────────────────────┐
│ Information requests                 │ Request detail             │
│                                      │                            │
│ FY2023 revenue by customer           │ Requested from Target CFO  │
│ Due 1 August · Open                  │ Due 1 August                │
│                                      │                            │
│ Municipal tax certificate            │ Blocks concentration trend │
│ Overdue · High                       │                            │
│                                      │ Related requirement        │
│ Readable shareholder register        │ Customer revenue history   │
│ Response received                    │                            │
│                                      │ [ Send reminder ]          │
└──────────────────────────────────────┴────────────────────────────┘
```

---

# 58. UI design direction

## Overall visual character

Aim for:

> **A controlled evidence registry combining documentary rigor with transaction intelligence**

The screen should feel:

* Precise;
* secure;
* current;
* auditable;
* information-dense;
* operational;
* restrained.

It should not feel:

* Like consumer cloud storage;
* like a generic file manager;
* like a technical ETL dashboard;
* like an AI chat product;
* like a document-card gallery.

---

# 59. Visual hierarchy

Prioritize:

1. Document identity;
2. evidence usability;
3. version state;
4. material change;
5. downstream use;
6. access;
7. technical metadata.

The largest visual emphasis should not be:

* File size;
* page count;
* upload timestamp;
* processing percentage.

A document’s transaction consequence is more important.

---

# 60. Color application

Use the existing M&Ai foundation:

* Canvas Cream: `#F3F0EE`;
* Lifted Cream: `#FCFBFA`;
* Ink Black: `#141413`;
* Signal Orange: `#CF4500`;
* Light Signal Orange: `#F37338`;
* Dust Taupe: `#D1CDC7`;
* Slate Gray: `#696969`.

## Semantic treatment

* Ready: green;
* processing: blue or neutral;
* review required: orange;
* failed: red;
* missing: outlined amber;
* restricted: dark neutral;
* stale: gray;
* source removed: muted red;
* changed: Signal Orange;
* current selected document: restrained orange marker.

Avoid using Signal Orange for every document icon.

---

# 61. Typography

Use **Sofia Sans** as the canonical product font.

| Element        |     Size |  Weight |
| -------------- | -------: | ------: |
| Page title     | 26–30 px | 500–600 |
| Document name  | 13–15 px | 600–700 |
| Folder name    | 13–14 px | 550–650 |
| Section title  | 15–17 px | 650–700 |
| Preview title  | 17–20 px | 600–700 |
| Evidence value | 14–17 px | 550–650 |
| Body           | 14–15 px | 450–500 |
| Metadata       | 12–13 px | 450–550 |
| Status         | 11–12 px | 650–700 |

Use tabular numerals for:

* File size;
* dates;
* page numbers;
* cells;
* counts;
* financial values in evidence excerpts.

---

# 62. Geometry and density

## Recommended

* Registry surface: 6–12 px radius;
* row height: 52–64 px;
* folder rows: 40–48 px;
* status badges: compact pills;
* preview: rectangular document surface;
* drawers: flush to viewport;
* filters: compact controls.

## Avoid

* One floating card per document;
* oversized document icons;
* 100 px registry rows;
* large shadows;
* gradient processing bars;
* decorative folder illustrations.

---

# 63. UX design principles

## 63.1 Evidence before automation

A document is only useful when its origin, version and processing limitations remain visible.

## 63.2 The source remains identifiable

M&Ai should normalize the evidence without obscuring where it came from.

## 63.3 Never overwrite silently

Source changes create reviewable versions.

## 63.4 Processing success is not factual approval

“Ready” means the document can be used—not that every extracted value is correct.

## 63.5 Preserve citations historically

An approved conclusion must continue pointing to the reviewed document version.

## 63.6 Material changes before routine changes

Prioritize changes affecting facts, findings, calculations and approvals.

## 63.7 Missing evidence is a first-class state

Do not hide incompleteness behind empty folders.

## 63.8 Separate source and generated artifacts

Incoming evidence and outgoing deliverables have different evidentiary roles.

## 63.9 Explicit access

Users should understand whether access comes from the VDR, M&Ai or both.

## 63.10 Avoid false integration success

Cached, fallback, simulated and live states must remain distinct.

## 63.11 Exact-context routing

A source reference should open the exact page, sheet, cells or clause.

## 63.12 No blind document approval

Material classification, version and evidence-use decisions should show their consequences.

---

# 64. System states

## 64.1 No source connected

> **Connect transaction evidence**

Options:

* Connect document source;
* upload files;
* create workspace without documents.

Explain:

> Document-linked analysis remains unavailable until evidence is added.

## 64.2 Connected but empty

> **No documents found in the selected source scope**

Actions:

* Review folder scope;
* upload document;
* synchronize again;
* open source settings.

## 64.3 Synchronizing

Show:

* Metadata comparison;
* documents discovered;
* changes found;
* errors.

The rest of the Library should remain usable with the previous successful state.

## 64.4 Processing

Show document-level progress.

Do not block ready documents.

## 64.5 Partial processing

Explain what is usable and what is not.

## 64.6 Processing failed

Show:

* Reason category;
* business consequence;
* next action;
* retry.

## 64.7 Authentication expired

Retain previously synchronized evidence but mark freshness.

## 64.8 Provider unavailable

Show last successful sync and current limitation.

## 64.9 Rate limited

Show scheduled retry rather than repeated error notifications.

## 64.10 Removed source document

Preserve historical version and citations.

## 64.11 Access revoked

Hide content immediately while preserving restricted audit references.

## 64.12 Unsupported file

Allow metadata retention and manual classification, but exclude automated evidence use.

## 64.13 Encrypted file

Request password-free or authorized replacement.

## 64.14 Corrupted file

Create replacement request.

## 64.15 Archived deal

Read-only:

* Source history retained;
* synchronization disabled;
* preview allowed by permission;
* evidence and citations preserved.

## 64.16 Offline

Allow access to safely cached metadata or previews where policy permits.

Disable:

* Sync;
* upload;
* classification changes;
* access changes;
* request sending.

---

# 65. Responsive behavior

## Desktop — 1280 px and above

* Compact global sidebar;
* persistent folder navigator;
* full registry;
* persistent preview/evidence panel;
* complete filter controls.

## Tablet — 768–1279 px

* Folder navigator collapsible;
* registry remains primary;
* preview opens as drawer;
* optional columns hidden;
* filters move into popover.

## Mobile — below 768 px

Use structured document cards.

Each card shows:

* Document name;
* category;
* processing state;
* version state;
* evidence count;
* access;
* updated state.

Recommended order:

1. Source status;
2. review-required changes;
3. missing documents;
4. search and filters;
5. document list;
6. requests.

Complex version comparison and spreadsheet evidence review remain desktop-first.

---

# 66. Accessibility requirements

The screen should support:

* Semantic tree or navigation structure for folders;
* accessible table markup;
* row headers using document names;
* keyboard folder navigation;
* keyboard registry navigation;
* sortable-column announcements;
* accessible document previews;
* text descriptions for processing states;
* no color-only changes or failures;
* visible focus;
* minimum 44 × 44 px targets;
* accessible upload control;
* announced sync completion;
* accessible version-difference tables;
* explicit page, sheet and cell labels;
* screen-reader descriptions for restricted documents;
* alternative table representation for visual diffs;
* correct distinction between missing, failed and restricted.

Avoid links labeled:

> View

Prefer:

> Preview Receita_por_Cliente_2025.xlsx

---

# 67. Figma component architecture

## `DocumentsHeader`

Properties:

* Connected;
* not connected;
* syncing;
* delayed;
* failed;
* archived.

## `EvidenceReadinessSummary`

Variants:

* Synchronized;
* ready;
* missing;
* changed;
* failed;
* selected.

## `DocumentWorkspaceTabs`

* Library;
* requests;
* changes;
* source and access;
* readiness.

## `FolderNavigator`

Properties:

* Source structure;
* M&Ai classification;
* ready;
* incomplete;
* changed;
* restricted;
* empty;
* collapsed.

## `DocumentRegistry`

States:

* Populated;
* filtered;
* empty;
* loading;
* partial;
* error;
* selection mode.

## `DocumentRow`

Properties:

* Ready;
* processing;
* partial;
* failed;
* restricted;
* changed;
* new version;
* superseded;
* removed;
* duplicate;
* selected.

## `ProcessingStatus`

Variants:

* Queued;
* validating;
* security review;
* extracting;
* classifying;
* indexing;
* ready;
* partial;
* failed.

## `DocumentPreview`

Variants:

* PDF;
* spreadsheet;
* presentation;
* image;
* text;
* unsupported;
* restricted;
* unavailable.

## `EvidenceReferenceList`

Properties:

* Dossier;
* diligence;
* valuation;
* matching;
* negotiation;
* closing;
* deliverable;
* current;
* stale.

## `VersionSelector`

Properties:

* Current;
* previous;
* authoritative;
* superseded;
* removed.

## `VersionComparison`

Variants:

* Text;
* spreadsheet;
* presentation;
* metadata only;
* unavailable.

## `ChangeItem`

Properties:

* New;
* updated;
* removed;
* moved;
* access changed;
* material;
* informational;
* resolved.

## `MissingRequirement`

Properties:

* Missing;
* outdated;
* partial;
* submitted;
* under review;
* resolved;
* waived.

## `InformationRequest`

Properties:

* Draft;
* sent;
* received;
* partial;
* overdue;
* resolved;
* rejected.

## `SourceStatus`

Properties:

* Connected;
* synchronizing;
* synchronized;
* auth expired;
* unavailable;
* rate limited;
* partially synchronized;
* disconnected.

## `AccessState`

Properties:

* Full;
* preview only;
* no download;
* workstream restricted;
* hidden;
* inherited;
* external submission.

## `UploadQueue`

States:

* Empty;
* uploading;
* validating;
* duplicate;
* completed;
* partial failure;
* rejected.

## `SyncReport`

States:

* Success;
* changes detected;
* partial;
* failed;
* no changes.

---

# 68. Production object model

## `DocumentSource`

```text
id
dealId
providerType
providerWorkspaceId
displayName
connectionState
syncMode
authorizedBy
lastSuccessfulSyncAt
lastFailedSyncAt
nextSyncAt
includedFolderIds
excludedFolderIds
permissionMode
retentionPolicyId
createdAt
updatedAt
```

## `SourceFolder`

```text
id
sourceId
providerFolderId
name
parentId
sourcePath
mappedCategory
accessLevel
documentCount
changedDocumentCount
missingRequirementCount
createdAt
updatedAt
```

## `DealDocument`

```text
id
dealId
sourceId
providerDocumentId
currentVersionId
name
mimeType
size
sourceFolderId
mappedCategory
documentType
entityId
periodStart
periodEnd
effectiveAt
language
classificationState
processingState
accessLevel
requiredDocumentId
createdAt
updatedAt
```

## `DocumentVersion`

```text
id
documentId
providerVersionId
checksum
size
mimeType
sourceCreatedAt
sourceUpdatedAt
synchronizedAt
uploadedBy
processingState
authoritativeForAnalysis
supersededBy
removedFromSourceAt
createdAt
```

## `DocumentProcessingRun`

```text
id
documentVersionId
state
currentStage
startedAt
completedAt
extractedPageCount
totalPageCount
textAvailable
tablesAvailable
limitations
failureCode
failureMessage
diagnosticId
createdAt
```

## `EvidenceReference`

```text
id
dealId
documentId
documentVersionId
referenceType
referenceObjectId
label
page
sheet
cellRange
clause
excerpt
sourceClassification
state
createdBy
createdAt
updatedAt
```

## `DocumentRequirement`

```text
id
dealId
workstream
documentType
title
description
required
periodRequirement
jurisdiction
transactionPhase
materiality
state
matchedDocumentIds
waivedBy
waivedAt
createdAt
```

## `InformationRequest`

```text
id
dealId
requirementId
title
description
reason
requestedFrom
ownerId
urgency
dueAt
status
blocking
affectedObjectIds
submittedDocumentIds
reviewedBy
resolvedAt
createdAt
updatedAt
```

## `DocumentChange`

```text
id
dealId
documentId
fromVersionId
toVersionId
changeType
materiality
summary
changedFields
affectedReferenceIds
affectedObjectIds
reviewState
assignedTo
reviewedBy
reviewedAt
createdAt
```

## `SourceSyncRun`

```text
id
sourceId
triggerType
triggeredBy
state
startedAt
completedAt
documentsDiscovered
documentsAdded
documentsUpdated
documentsRemoved
accessChanges
processingFailures
providerFailureCode
diagnosticId
createdAt
```

The document domain should be versioned and append-oriented. Historical evidence should not depend on mutable provider filenames or paths.

---

# 69. Suggested routes

Primary:

```text
/deals/:dealId/documents
```

Selected folder:

```text
/deals/:dealId/documents?folder=:folderId
```

Selected document:

```text
/deals/:dealId/documents?document=:documentId
```

Selected version:

```text
/deals/:dealId/documents?document=:documentId&version=:versionId
```

Changes:

```text
/deals/:dealId/documents?view=changes
```

Requests:

```text
/deals/:dealId/documents?view=requests
```

Processing failures:

```text
/deals/:dealId/documents?filter=processing-failed
```

Missing requirements:

```text
/deals/:dealId/documents?filter=missing-required
```

Evidence-use deep link:

```text
/deals/:dealId/documents?document=:documentId&panel=evidence
```

Source settings:

```text
/deals/:dealId/documents/source
```

---

# 70. Repository direction

The repository already contains useful foundations:

* A canonical `VDRProvider` interface;
* canonical VDR document metadata;
* provider adapters;
* deal-scoped document access concepts;
* VDR document lists in the agentic workspace;
* citation events containing document, excerpt and page;
* deal-scoped RAG and document retrieval concepts;
* a standardized Brazilian M&A VDR directory;
* structured missing-document request schemas.

However, the current domain model is too thin for the final screen.

The existing canonical document type primarily contains:

* ID;
* name;
* size;
* MIME type;
* folder ID;
* created timestamp;
* updated timestamp.

That is sufficient for a provider adapter, but not for the banker workspace.

## Keep

* Provider abstraction;
* Papermark MVP direction;
* provider-specific normalization;
* deal-scoped retrieval;
* source-document citations;
* current agentic citation interactions;
* standardized VDR folder concepts;
* explicit provider failures;
* no-successful-fallback rule.

## Add

* Document version model;
* source synchronization runs;
* document-processing runs;
* classifications;
* entity and period;
* evidence references;
* downstream dependencies;
* missing-document requirements;
* request workflow;
* access state;
* authoritative-version state;
* document-change model;
* citation health;
* source freshness;
* security-review state;
* historical source preservation.

## Reposition

The current Agentic Workspace’s **VDR documents ingested** card should become a compact supporting element.

The full document lifecycle should live in Documents & Evidence.

## Avoid

* Hardcoded fallback documents appearing as real evidence;
* successful UI states from mocked provider responses;
* provider-specific field names in the banker interface;
* treating `updatedAt` as sufficient version history;
* using filename as citation identity;
* classifying every processing failure as an empty result;
* exposing vector or RAG implementation details as banker concepts.

---

# 71. What not to include

Avoid the following in Documents & Evidence:

* Generic storage KPIs;
* agent-run counts;
* token usage;
* vector counts;
* embedding model labels;
* raw chunks;
* permanent RAG debug panel;
* one large folder tree as the complete screen;
* document cards with no table view;
* file size as primary hierarchy;
* automatic approval after processing;
* silent document replacement;
* citations tied only to filenames;
* one-click source disconnection;
* unrestricted downloads;
* hidden access inheritance;
* generated reports mixed with primary evidence;
* untraceable completeness percentages;
* raw provider errors without user consequences;
* green “connected” state when the source is stale;
* fallback data presented as synchronized evidence;
* real enterprise provider logos in a fictional pitch fixture;
* unsupported claims about live integrations;
* deletion of historical evidence when a source file disappears.

---

# 72. MOCKED — Pitch and demo specification

## 72.1 Purpose of the mocked screen

The mocked Documents & Evidence screen should demonstrate that M&Ai does not stop at file storage.

Its pitch narrative is:

> **M&Ai synchronizes the existing VDR, detects missing and changed evidence and shows exactly which transaction conclusions depend on each source.**

This screen is useful for:

* Explaining VDR integration;
* demonstrating document intelligence;
* showing evidence traceability;
* showing change-impact control;
* starting a live due-diligence demo.

It is not the strongest standalone hero image because document-management screens are familiar.

Its value emerges when the demo moves from:

> Document change

to:

> Diligence finding

to:

> Valuation impact

to:

> Human approval.

---

# 73. Mocked shell state

Institution:

> **Atlas M&A Advisory**

User:

> **Ana Costa · Vice President**

Deal:

> **Project Horizon**
> Atlas Industrial · Sell-side
> Due Diligence · Restricted workspace

Breadcrumb:

> Deals / Project Horizon / Documents

Deal navigation:

* Overview;
* Dossier;
* **Documents**;
* Diligence;
* Valuation;
* Buyer Universe;
* Negotiation;
* Closing.

---

# 74. Mocked page header

Title:

> **Documents & Evidence**

Description:

> Source documents, processing and evidence dependencies for Project Horizon.

Summary:

* **127 synchronized**
* **121 ready**
* **6 missing**
* **4 changed**
* **2 failed**

Source:

> Connected document source · Synchronized 4 min ago

Primary action:

> **Review 4 changes**

Secondary:

> Upload documents

---

# 75. Mocked folders

Display:

* Administrative — 8
* Corporate — 16
* **Financial & Accounting — 31**
* Tax — 14
* Labor — 11
* Commercial & Operational — 18
* Real Estate & Assets — 6
* Technology & IP — 9
* Environmental & Safety — 4
* Litigation — 7
* Compliance & Insurance — 3

Selected:

> **Financial & Accounting**

State:

> 2 changed · 1 processing failure

For pitch scale, show only six or seven categories.

---

# 76. Mocked document registry

Show five documents.

## Selected document

> **Receita_por_Cliente_2025.xlsx**
> Customer revenue · LTM Jun-26
> **Changed · Review required**
> 7 evidence references
> Version 3 synchronized 18 min ago

## Document 2

> **Informações_Financeiras_Jun-2026.xlsx**
> Management accounts · LTM Jun-26
> **Ready · Current**
> 12 evidence references
> Synchronized 18 min ago

## Document 3

> **Dívida_Líquida_2025.xlsx**
> Debt schedule · Jun-26
> **Ready · Conflict detected**
> 4 evidence references
> Synchronized today

## Document 4

> **Demonstrações_Financeiras_2025.pdf**
> Audited statements · FY2025
> **Ready · Primary source**
> 18 evidence references
> Synchronized yesterday

## Document 5

> **Aging_Contas_Receber_Jun-2026.xlsx**
> Receivables aging · Jun-26
> **Processing failed**
> Encrypted file
> Replacement requested

---

# 77. Mocked selected-document preview

Document:

> **Receita_por_Cliente_2025.xlsx**

Location:

> Financial & Accounting / Revenue Analysis

Version:

> Version 3 · Current source version

Spreadsheet preview:

* Sheet: Receita Mensal;
* cells B12:M14 highlighted;
* top-three customer rows highlighted;
* 41,2% calculation visible.

Processing:

> Ready for evidence use

Classification:

> Financial · Customer revenue

Access:

> Financial workstream · Preview and download permitted

---

# 78. Mocked version change

Display:

> **Version 3 compared with Version 2**

Changes:

* Top-three customer concentration: **39,8% → 41,2%**
* Customer Atlas revenue: **+R$ 3,2 mi**
* Customer Nova revenue: **−R$ 1,1 mi**
* Two customer rows added;
* no formula changes.

Status:

> **Material change · Review required**

---

# 79. Mocked downstream impact

Title:

> **Evidence use**

Display:

### Target Dossier

* LTM revenue · R$ 310,4 mi;
* top-three concentration · 41,2%;
* recurring revenue · 68,0%.

### Diligence

* Customer-concentration finding;
* revenue-quality review.

### Valuation

* Downside revenue scenario v4.

Alert:

> **3 active outputs may require review**

Primary action:

> **Review impact**

This is the most important portion of the pitch mock.

---

# 80. Mocked requests

Show three compact requests:

> **FY2023 monthly revenue by customer**
> Open · Due 1 August
> Blocks concentration trend

> **Current municipal tax certificate**
> Overdue · High priority
> Blocks Tax workstream

> **Readable accounts-receivable aging**
> Response received
> Processing review required

---

# 81. Mocked processing exceptions

> **2 documents require attention**

### Aging_Contas_Receber_Jun-2026.xlsx

> Encrypted · Replacement requested

### Contratos_Materiais_Clientes.zip

> Partial extraction · 2 files unsupported

Do not show a generic technical stack trace.

---

# 82. Recommended static pitch composition

```text
┌──────────────────────────────────────────────────────────────────┐
│ Documents & Evidence · 127 synced · 6 missing · 4 changed       │
├─────────────┬──────────────────────────────┬─────────────────────┤
│ Folders     │ Documents                    │ Selected evidence   │
│             │                              │                     │
│ Corporate   │ Revenue_by_Client.xlsx       │ Sheet: Revenue      │
│ Financial   │ Changed · Review required    │ Cells B12:M14       │
│ Tax         │ 7 evidence references        │                     │
│ Labor       │                              │ 39,8% → 41,2%       │
│ Commercial  │ Financial_Jun26.xlsx         │                     │
│ Technology  │ Ready · Current              │ Affects             │
│ Litigation  │                              │ 3 dossier facts     │
│             │ AR_Aging_Jun26.xlsx           │ 2 DD findings       │
│             │ Failed · Encrypted           │ 1 valuation input   │
│             │                              │ [ Review impact ]   │
└─────────────┴──────────────────────────────┴─────────────────────┘
```

This communicates:

* Existing source structure;
* processing;
* changed evidence;
* exact spreadsheet location;
* downstream impact.

---

# 83. Pitch-specific simplification

## Keep visible

* 127 synchronized;
* 6 missing;
* 4 changed;
* Financial folder;
* selected revenue document;
* changed value;
* exact cells;
* evidence references;
* downstream impact;
* Review impact action.

## Hide

* Provider identity;
* advanced filters;
* upload queue;
* complete folder tree;
* access diagnostics;
* processing stages;
* source configuration;
* full request queue;
* all registry columns;
* audit history;
* bulk actions.

## Readability requirement

At deck scale, these must remain readable:

* **Documents & Evidence**
* **127 synchronized**
* **4 changed**
* **Receita_por_Cliente_2025.xlsx**
* **39,8% → 41,2%**
* **Cells B12:M14**
* **2 diligence findings**
* **1 valuation input**
* **Review impact**

---

# 84. Recommended demo flow

## Flow A — Source change to decision

```text
Documents & Evidence
  ↓
Review 4 changes
  ↓
Revenue spreadsheet Version 3
  ↓
Top-three concentration changed to 41,2%
  ↓
Open downstream impact
  ↓
Customer-concentration finding
  ↓
Diligence Decision Room
  ↓
Review −R$ 42 mi valuation impact
  ↓
Approve or request review
```

This is the strongest demonstration of the complete product thesis.

## Flow B — Missing document request

```text
Documents
  ↓
Missing requirements
  ↓
FY2023 customer revenue missing
  ↓
Create information request
  ↓
Assign Target CFO
  ↓
Response uploaded
  ↓
Processing completed
  ↓
Requirement resolved
```

## Flow C — Processing failure

```text
Documents
  ↓
Processing failures
  ↓
Encrypted AR aging file
  ↓
Inspect limitation
  ↓
Request readable replacement
  ↓
Link to existing request
```

## Flow D — Citation verification

```text
Diligence finding
  ↓
Open cited document
  ↓
Documents & Evidence
  ↓
Exact spreadsheet sheet and cells highlighted
  ↓
Return to finding
```

## Flow E — Version comparison

```text
Updated document
  ↓
Compare Version 2 and Version 3
  ↓
Review changed cells
  ↓
Identify affected facts and valuation
  ↓
Assign review
```

## Flow F — Source failure

```text
Source & Access
  ↓
Authentication expired
  ↓
Existing evidence remains available
  ↓
Reconnect source
  ↓
Synchronization resumes
```

---

# 85. UX prototype tasks to validate

Test with bankers using tasks such as:

1. Find a specific financial document.
2. Determine whether it is current.
3. Identify the source folder.
4. Identify whether processing is complete.
5. Open the exact cells cited by a diligence finding.
6. Compare two document versions.
7. Explain which values changed.
8. Identify which outputs depend on the changed document.
9. Find every missing Tax document.
10. Create a request for an updated certificate.
11. Determine whether a submitted response resolves the request.
12. Find every processing failure.
13. Request a replacement for an encrypted file.
14. Distinguish source documents from generated deliverables.
15. Determine who can download an employee file.
16. Find documents affecting valuation.
17. Identify whether the VDR is currently synchronized.
18. Explain the consequence of an expired source authorization.
19. Open a historical cited version after the source file changed.
20. Return to the selected document without losing context.

## Measures

Record:

* Time to find a document;
* time to verify citation;
* whether current and superseded versions are understood;
* whether processing success is confused with factual approval;
* whether users understand downstream evidence use;
* whether missing documents are actionable;
* whether source and M&Ai classifications are confused;
* whether the interface feels like a generic file browser;
* whether permission states are clear;
* whether users trust the change-impact workflow;
* whether users notice source freshness.

---

# 86. Design validation criteria

The screen is ready for approval when:

1. Users understand that M&Ai does not replace the VDR.
2. Source state is visible and explainable.
3. The original folder path remains available.
4. M&Ai classification remains independent of source structure.
5. Current and historical document versions are distinct.
6. Approved citations continue resolving to historical versions.
7. New versions do not overwrite reviewed evidence silently.
8. Processing success is distinct from factual approval.
9. Partial processing explains its limitation.
10. Missing-document requirements are explicit.
11. Requests inherit their document and transaction context.
12. Submitted files do not automatically close requests.
13. Source changes identify affected outputs.
14. Material changes route to human review.
15. Provider failure cannot appear as successful synchronization.
16. Cached, simulated and live states are distinguishable.
17. Restricted documents do not leak through search or Copilot.
18. Generated artifacts remain separate from source evidence.
19. Every evidence reference includes an exact location.
20. Version comparison works for PDFs and spreadsheets.
21. Folder browsing does not dominate the complete experience.
22. The registry supports search, filters and keyboard navigation.
23. The screen remains useful without Copilot.
24. Partial service failure does not hide existing evidence.
25. Archived evidence remains read-only and auditable.
26. The pitch mock avoids unsupported integration claims.
27. The static pitch version remains readable.
28. The screen can route directly into Diligence and Valuation.
29. Security-review states prevent unsafe automated use.
30. Document removal from the source does not destroy transaction history.

---

# 87. Final design target

The correct design target is not:

> “A modern VDR browser with AI classification.”

It is:

> **A controlled evidence layer that connects the existing VDR to every fact, finding, calculation and human decision in the transaction.**

The screen should make document operations feel consequential rather than administrative.

Its defining interaction is:

> **Find the source → verify its usability → understand what changed → see what depends on it → route the consequence for human review**

**Next iteration: Valuation Lab.**
