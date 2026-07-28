---
canonical_name: "Deliverables & Exports"
definition_id: "BD-22"
definition_status: "Governed for MAI-90"
screen_family: "deal-governance"
owning_task: "MAI-93"
canonical_routes:
  - "/deals/:dealId/deliverables"
figma_file_key: "otMJE31OKIxdXogV4RNbGQ"
figma_status: "Planned in MAI-93"
figma_area: "MAI Banker Workspace — Design System & Product UI / 06 Application Shell"
figma_nodes: []
related_definitions:
  - "design/26_Cross_Screen_Interaction_Map.md"
  - "design/27_Shared_State_Model.md"
  - "design/0_Implementaion_Roadmap.md"
last_reviewed_task: "MAI-90"
implementation_capability_boundary: "Product definition only; no frontend, backend, Storybook, token export, or runtime behavior implemented by this file."
mock_demo_data_boundary: "Use fictional/demo transaction data only; do not encode real client, counterparty, credential, or confidential deal data."
---
# Deliverables & Exports

## 1. Recommended product naming

Use:

* **Deal navigation:** `Deliverables & Exports`
* **Page title:** `Deliverables & Exports`
* **Business output:** `Deliverable`
* **Immutable output version:** `Deliverable Version`
* **Generated file:** `Export File`
* **Grouped output:** `Deliverable Package`
* **Source boundary:** `Source Snapshot`
* **Pre-release control:** `Release Authorization`
* **External transmission:** `Distribution`
* **Supporting record:** `Export Manifest`
* **Reusable structure:** `Deliverable Template`

The screen should remain inside the deal-level **More** menu.

The canonical architecture defines this workspace as a controlled library of generated transaction artifacts, including diligence reports, valuation reports, information-request lists, proposals, closing checklists and audit packages. Every deliverable should identify its source date, version, preparation status and approval state. 

---

# 2. Screen definition

**Deliverables & Exports** is the deal-level workspace where authorized users prepare, review, approve, release and preserve transaction outputs.

It manages artifacts such as:

* Diligence committee briefs;
* diligence reports;
* findings registers;
* information-request lists;
* valuation reports;
* scenario packages;
* buyer or target shortlists;
* outreach materials;
* proposal comparisons;
* negotiation memoranda;
* term-sheet previews;
* closing checklists;
* funds-flow packages;
* closing binders;
* decision registers;
* audit packages;
* structured data exports.

It should answer:

1. **Which transaction outputs currently exist?**
2. **Which version is current?**
3. **Which sources and object versions were used?**
4. **Is the content still current?**
5. **Who prepared and reviewed it?**
6. **Has the content been approved?**
7. **Has it been authorized for the intended audience?**
8. **Which redactions and confidentiality controls apply?**
9. **Which file was exported or distributed?**
10. **Has a newer source or decision made it stale?**
11. **Who received it, and when?**
12. **Can the output be reproduced?**

Its central operating sequence is:

> **Source snapshot → Structured draft → Validation → Human review → Content approval → Release authorization → Export or distribution → Immutable history**

---

# 3. Primary intention

## Operational intention

Turn deal data and approved transaction work into controlled business outputs without returning to unmanaged document assembly.

## User intention

A banker should be able to say:

> “I know exactly which information is included in this report, which versions support it, who approved it and whether it may be sent.”

## Product intention

The workspace should demonstrate that M&Ai’s outputs do not end as ephemeral AI responses.

They become:

* Versioned;
* evidence-linked;
* reviewable;
* approval-controlled;
* audience-specific;
* auditable transaction artifacts.

This extends the product’s decision-grade sequence from evidence and calculation through human approval into a controlled deliverable.

---

# 4. Strategic product role

Deliverables & Exports is the controlled boundary between internal transaction intelligence and the artifacts used by:

* Deal teams;
* investment or diligence committees;
* clients;
* counterparties;
* lenders;
* counsel;
* auditors;
* closing participants.

```text
Documents and approved facts
  ↓
Findings and calculations
  ↓
Human decisions
  ↓
Deliverable source snapshot
  ↓
Reviewed artifact
  ↓
Approved release
  ↓
Export or secure distribution
```

Without this workspace, users are likely to:

* Copy values manually into PowerPoint;
* rebuild reports in Word;
* export spreadsheets without context;
* circulate obsolete versions;
* omit citations;
* send internal commentary externally;
* lose track of who approved the output;
* distribute files without an audit trail.

---

# 5. What Deliverables & Exports is not

The screen should not become:

* A generic file manager;
* a document editor equivalent to Word;
* a presentation-design tool;
* a VDR;
* a public file-sharing service;
* a template marketplace;
* an email client;
* an unrestricted download center;
* a final legal-document drafting system;
* a place where generated content is automatically treated as approved;
* a place where AI responses can be sent externally without review;
* a replacement for Documents & Evidence;
* a replacement for Activity & Audit;
* a folder containing every temporary calculation file.

The central question is not:

> “Which files can I download?”

It is:

> **“Which reviewed transaction artifact may be released, to whom, based on which authoritative source snapshot?”**

---

# 6. Relationship to adjacent screens

| Screen                       | Primary responsibility                                    |
| ---------------------------- | --------------------------------------------------------- |
| **Deliverables & Exports**   | Builds and controls transaction outputs                   |
| **Documents & Evidence**     | Manages source documents and evidence                     |
| **Target Dossier**           | Provides approved transaction facts                       |
| **Diligence**                | Provides findings, evidence and approved treatments       |
| **Valuation**                | Provides approved assumptions, methods and ranges         |
| **Buyer or Target Universe** | Provides counterparty assessments and shortlist decisions |
| **Negotiation**              | Provides proposals, comparisons and approved responses    |
| **Closing**                  | Provides completion evidence and closing status           |
| **Agentic Workspace**        | May prepare draft artifacts and supporting analysis       |
| **Tasks & Approvals**        | Routes review and release decisions                       |
| **Activity & Audit**         | Records generation, approval, export and distribution     |
| **Deal Team & Access**       | Governs audience, confidentiality and export authority    |
| **Templates & Playbooks**    | Maintains reusable institution-level output structures    |

---

# 7. Deliverable versus export

## Deliverable

The governed business artifact inside M&Ai.

It includes:

* Content structure;
* source snapshot;
* version;
* review state;
* approval state;
* intended audience;
* confidentiality;
* history.

Example:

> Diligence Committee Brief · Version 3

## Export

A file representation of one deliverable version.

Examples:

* PDF;
* DOCX;
* XLSX;
* CSV;
* ZIP.

A deliverable may have several export files.

Example:

> Diligence Committee Brief v3
> PDF for committee circulation
> XLSX findings appendix for internal analysis

---

# 8. Deliverable versus source document

## Source document

Evidence received from the VDR, client or another controlled source.

Example:

> `Receita_por_Cliente_2025.xlsx`

## Deliverable

An output created from reviewed transaction information.

Example:

> Customer Concentration Review Package

The deliverable may cite the spreadsheet, but it must not become the new authoritative source for the underlying fact.

---

# 9. Deliverable versus generated artifact

A generated artifact may initially be:

* An AI-prepared summary;
* a draft table;
* a chart;
* a document preview;
* a calculation appendix.

It becomes a governed **Deliverable Version** only after it is registered with:

* Defined scope;
* source snapshot;
* owner;
* version;
* status;
* audience;
* review requirements.

Temporary agent outputs should not automatically appear as approved deliverables.

---

# 10. Content approval versus release authorization

These must remain separate.

## Content approval

Confirms that the artifact’s content is acceptable.

Example:

> The financial analysis and valuation references are correct.

## Release authorization

Confirms that the approved version may be distributed to a defined audience.

Example:

> Version 3 may be sent to the client’s investment committee.

An internally approved report may still be prohibited from external distribution.

---

# 11. Export versus distribution

## Export

Creates a file.

Example:

> PDF generated and downloaded by Ana Costa.

## Distribution

Sends or grants access to the file or deliverable.

Example:

> Secure link sent to Helena Duarte.

Creating an export does not prove that it was sent.

Sending a file should require a separate controlled distribution action.

---

# 12. Primary users

## Analyst

Needs to:

* Prepare draft reports;
* select content;
* verify source coverage;
* resolve validation issues;
* update appendices;
* submit for review.

## Associate

Needs to:

* Own report assembly;
* reconcile sections;
* manage version history;
* coordinate reviewers;
* prepare distribution packages.

## Vice President

Needs to:

* Review conclusions;
* validate transaction messaging;
* approve internal outputs;
* control audience-specific content;
* ensure consistency across workstreams.

## Managing Director or Partner

Needs:

* Concise current reports;
* release authorization;
* client-ready materials;
* version certainty;
* awareness of unresolved limitations.

## Specialist reviewer

Needs to:

* Review a defined section;
* inspect supporting evidence;
* approve or request changes;
* prevent unsupported conclusions from being released.

## Client approver

May review:

* Selected client-facing content;
* redacted reports;
* distribution-ready versions;
* controlled approval requests.

They should not see internal drafting history or restricted sources.

## Auditor

Needs:

* Source manifest;
* version history;
* approval record;
* export history;
* distribution record;
* integrity and reproducibility state.

---

# 13. Primary job to be done

> When transaction analysis must become a committee, client, counterparty or closing artifact, create a controlled version whose sources, approvals, audience and distribution history can be verified.

## Secondary jobs

The user should also be able to:

* Find current reports;
* create a deliverable;
* select a template;
* freeze a source snapshot;
* preview generated content;
* inspect source coverage;
* detect stale sections;
* request review;
* approve one section;
* approve complete content;
* authorize external release;
* create a PDF or spreadsheet;
* apply redactions;
* watermark an export;
* create a package;
* distribute securely;
* revoke a link;
* inspect receipt state;
* compare versions;
* reproduce an earlier export.

---

# 14. Core conceptual model

The workspace should separate nine layers.

## Layer 1 — Deliverable definition

What business output is being prepared?

## Layer 2 — Source snapshot

Which exact transaction objects and versions support it?

## Layer 3 — Content

Which structured sections, values and narratives are included?

## Layer 4 — Generation

How was the draft assembled?

## Layer 5 — Validation

Which consistency and completeness checks passed or failed?

## Layer 6 — Review and approval

Who reviewed and authorized the content?

## Layer 7 — Audience and redaction

Who may receive which version?

## Layer 8 — Export and distribution

Which file was created, downloaded or sent?

## Layer 9 — History

Which versions were superseded, withdrawn or archived?

---

# 15. Recommended deliverable families

## Diligence

* Diligence committee brief;
* full diligence report;
* findings register;
* risk summary;
* information-request list;
* open-issues report;
* red-flag report.

## Valuation

* Valuation report;
* scenario package;
* valuation committee brief;
* comparable-company appendix;
* DCF appendix;
* EBITDA normalization bridge;
* enterprise-to-equity bridge.

## Counterparty process

* Buyer shortlist;
* target shortlist;
* counterparty profile pack;
* market map;
* outreach package;
* process-status report.

## Negotiation

* Offer comparison;
* negotiation memorandum;
* counterproposal summary;
* approved response package;
* term-sheet preview;
* agreed-terms summary.

## Closing

* Closing-readiness report;
* conditions-precedent register;
* signature-status report;
* funds-flow package;
* closing checklist;
* closing binder;
* completion memorandum.

## Governance

* Decision register;
* approval register;
* access register;
* source manifest;
* audit package.

---

# 16. Audience taxonomy

Recommended audiences:

* Internal deal team;
* investment or diligence committee;
* institution leadership;
* client working team;
* client principal;
* target management;
* buyer or bidder;
* lender;
* external counsel;
* external advisor;
* regulator;
* auditor;
* closing parties;
* custom restricted group.

Audience must be an explicit property of each release authorization.

Avoid a generic:

> External

---

# 17. Confidentiality levels

Recommended:

* Internal;
* internal restricted;
* client confidential;
* counterparty confidential;
* clean-team restricted;
* legally privileged;
* personal-data restricted;
* funds-flow restricted;
* external approved;
* public, rarely applicable.

Confidentiality should derive from both:

* Deliverable policy;
* included source restrictions.

A document cannot be classified as less restrictive than its most sensitive unredacted content.

---

# 18. Deliverable lifecycle

Recommended states:

1. Draft definition;
2. generating;
3. generation failed;
4. draft prepared;
5. validation required;
6. review required;
7. in review;
8. changes requested;
9. content approved;
10. release approval required;
11. release authorized;
12. exported;
13. distributed;
14. superseded;
15. withdrawn;
16. expired;
17. archived;
18. restricted.

Not every deliverable needs distribution.

An internal working report may stop at:

> Content approved

---

# 19. Version lifecycle

Recommended:

```text
Draft v1
  ↓
Review
  ↓
Changes requested
  ↓
Draft v2
  ↓
Content approved
  ↓
Release authorized
  ↓
Exported
```

When source information changes:

```text
Approved v2
  ↓
Dependency changed
  ↓
Marked stale
  ↓
Draft v3 created
  ↓
Review and approval repeated
```

The approved version remains historically preserved.

---

# 20. Current-version rules

The current version should normally be:

* The latest approved version;
* or the latest active draft where no approved version exists.

The interface should distinguish:

> **Current approved:** v2

from:

> **Latest draft:** v3

Do not automatically make an unreviewed draft the current authoritative deliverable.

---

# 21. Immutable approved versions

Once a version is approved:

* Its content cannot be edited;
* its source snapshot cannot change;
* its approval record cannot change;
* its export manifest remains fixed.

Corrections require a new version.

Example:

> Version 3 approved
> Version 4 created to correct the customer-concentration narrative

---

# 22. Recommended workspace structure

Use six principal views:

1. **Library**
2. **In Review**
3. **Approved**
4. **Packages**
5. **Distribution**
6. **History**

## Library

All current deliverables and drafts.

## In Review

Deliverables awaiting human review or changes.

## Approved

Current approved versions, including release state.

## Packages

Collections of related deliverables and files.

## Distribution

Export, recipient and delivery history.

## History

Superseded, withdrawn and archived versions.

---

# 23. Default view: Library

The default should use a dense table or structured list.

Recommended grouping:

* Requires attention;
* recently updated;
* approved;
* draft;
* historical.

The default should not use:

* Large document cards;
* thumbnail-heavy galleries;
* a folder tree;
* generic cloud-drive presentation.

---

# 24. Page header

## Recommended title

> **Deliverables & Exports**

Supporting description:

> Prepare, review and release controlled transaction outputs for Project Horizon.

## Header summary

Example:

* **12 deliverables**
* **3 in review**
* **5 approved**
* **2 distributed**
* **2 stale**

## Primary action

> **Create deliverable**

## Secondary actions

* Create package;
* export approved output.

---

# 25. Recommended Library columns

1. **Deliverable**
2. **Type**
3. **Current version**
4. **Audience**
5. **Preparation state**
6. **Content approval**
7. **Release state**
8. **Source current through**
9. **Freshness**
10. **Owner**
11. **Last updated**
12. **Actions**

Optional:

* Format;
* workstream;
* confidentiality;
* reviewers;
* package;
* distributed date;
* template;
* source coverage.

---

# 26. Deliverable-row anatomy

## Identity

> **Diligence Committee Brief**

Supporting:

> Committee Report · Version 3

## Audience

> Internal Diligence Committee

## Preparation

> Draft prepared

## Approval

> Financial review pending

## Release

> Not authorized

## Source snapshot

> Current through 28 jul. 2026 · 10:18 BRT

## Freshness

> Current

## Owner

> Felipe Rocha

---

# 27. Deliverable detail architecture

Selecting a deliverable should open a full detail workspace or right-side preview.

Recommended sections or tabs:

1. **Overview**
2. **Content**
3. **Sources**
4. **Versions**
5. **Approvals**
6. **Distribution**

For complex reports, a full-page detail is preferable to a narrow drawer.

---

# 28. Overview tab

The Overview should show:

* Deliverable purpose;
* audience;
* confidentiality;
* current version;
* latest draft;
* source cutoff;
* owner;
* reviewers;
* preparation state;
* content approval;
* release authorization;
* freshness;
* export files;
* recent activity.

---

# 29. Content tab

The Content tab should show the artifact as structured sections.

Example:

1. Executive summary;
2. transaction overview;
3. material findings;
4. financial impact;
5. valuation reference;
6. unresolved requests;
7. recommended next actions;
8. appendices.

Each section should expose:

* Source coverage;
* authoring state;
* reviewer;
* approval state;
* freshness;
* audience visibility.

---

# 30. Content blocks

Recommended block types:

* Title and metadata;
* narrative summary;
* approved fact;
* finding;
* metric table;
* chart;
* valuation bridge;
* scenario comparison;
* counterparty table;
* term comparison;
* conditions register;
* task summary;
* decision summary;
* source appendix;
* signature or approval page;
* disclaimer;
* custom reviewed text.

---

# 31. Linked versus detached content

## Linked block

Remains connected to a canonical M&Ai object.

Example:

> Current approved valuation range

If the source changes, the block becomes stale.

## Detached block

Manually edited and no longer automatically synchronized.

Example:

> Custom client narrative

The interface should clearly mark:

> **Detached from source**

Detaching should require a reason because it weakens reproducibility.

---

# 32. Source snapshot

Every deliverable version should freeze a source snapshot containing:

* Deal state;
* source cutoff timestamp;
* included object IDs;
* exact object versions;
* document versions;
* calculation runs;
* approval decisions;
* access and redaction policy.

The snapshot should remain unchanged after generation.

---

# 33. Source cutoff

Display:

> **Sources current through 28 jul. 2026 · 10:18 BRT**

This does not necessarily mean every source document was created at that time.

It means the version uses transaction state known and processed through that boundary.

---

# 34. Source manifest

A source manifest should list:

* Source object;
* object type;
* version;
* status;
* exact document citation, where applicable;
* included sections;
* source date;
* current validity.

Example:

| Source                         | Version | Used in             |
| ------------------------------ | ------- | ------------------- |
| Customer concentration finding | v3      | Key Risks           |
| Risk-adjusted valuation        | v4      | Valuation Reference |
| Revenue workbook               | v3      | Evidence Appendix   |
| Treatment approval             | AP-027  | Decision Summary    |

---

# 35. Source coverage

Useful states:

* Complete;
* complete with limitations;
* partial;
* unresolved contradiction;
* stale;
* restricted;
* unavailable.

Avoid a generic source-coverage percentage unless its calculation is defined.

Prefer:

> 14 of 15 required sections have current approved sources.

---

# 36. Freshness

A deliverable may be:

## Current

No included dependency has materially changed.

## Review suggested

A related source changed but may not affect the output.

## Stale

An included source or decision materially changed.

## Invalidated

The deliverable contains a conclusion that is no longer approved.

## Historical

Preserved for a prior transaction state.

---

# 37. Staleness detection

A deliverable should become stale when:

* An included document version changes;
* an approved fact is superseded;
* a finding is reopened;
* a valuation scenario is invalidated;
* a proposal is replaced;
* a closing condition changes;
* a decision is withdrawn;
* a source is removed;
* a redaction policy changes.

The event should identify affected sections.

---

# 38. Stale-section behavior

Example:

> **Valuation Reference is stale**

Cause:

> Scenario v4 superseded scenario v3.

Affected:

* Executive Summary;
* Valuation Reference;
* Appendix B.

Actions:

* Refresh sections;
* create new version;
* retain historical version.

Do not silently regenerate an approved report.

---

# 39. Generation modes

A deliverable may be assembled through:

## Template generation

Structured blocks populated from approved objects.

## AI-assisted drafting

Narrative is proposed using approved and cited context.

## Deterministic generation

Tables, calculations or bridges are produced through fixed logic.

## Manual drafting

A banker writes or edits content directly.

## Imported deliverable

An external file is registered and connected to a source snapshot.

The mode should be visible at section or version level.

---

# 40. AI-assisted content

AI-assisted content should begin as:

> **Draft · Human review required**

It should preserve:

* Source references;
* generation time;
* model or capability reference where operationally required;
* user instruction;
* limitations;
* edited sections.

The deliverable should not expose private model reasoning.

---

# 41. Deterministic content

Deterministic blocks may include:

* Valuation tables;
* sensitivity matrices;
* enterprise-to-equity bridges;
* concentration calculations;
* consideration waterfalls;
* conditions registers;
* funds-flow totals.

They should preserve:

* Calculation run;
* inputs;
* formula version;
* rounding policy;
* output values.

---

# 42. Manual content

Manual content should record:

* Author;
* created date;
* latest editor;
* edit history;
* review status;
* supporting references.

Manual does not mean uncontrolled.

A manual executive summary can still require evidence and approval.

---

# 43. Create-deliverable flow

Recommended sequence:

1. Select deliverable type;
2. select template;
3. define purpose;
4. choose audience;
5. set confidentiality;
6. select source cutoff;
7. choose included sections;
8. configure redaction;
9. assign owner and reviewers;
10. choose output formats;
11. review preflight;
12. generate draft.

---

# 44. Template selection

A template should define:

* Deliverable type;
* default sections;
* required source objects;
* optional blocks;
* formatting;
* disclaimers;
* review workflow;
* release policy;
* default formats.

Templates should be institution-governed.

Deal users may customize a copy without modifying the institution template.

---

# 45. Template versioning

The deliverable should preserve:

> Diligence Committee Brief Template · Version 4

A later template update should not modify existing deliverable versions.

Creating a new version may offer:

* Retain existing template version;
* upgrade to latest template;
* compare template changes.

---

# 46. Content selection

The user should be able to include:

* All approved findings;
* selected findings;
* high-severity findings;
* current valuation scenario;
* selected assumptions;
* open information requests;
* approved decisions;
* selected appendices.

Selection should be explicit and saved in the source snapshot.

---

# 47. Audience profiles

An audience profile may control:

* Available sections;
* terminology;
* evidence detail;
* redactions;
* financial granularity;
* internal comments;
* document citations;
* disclaimers;
* download controls.

Example:

## Internal committee

Includes:

* Full rationale;
* internal risk assessment;
* alternative scenarios;
* unresolved debate.

## Client principal

Includes:

* Approved conclusions;
* agreed valuation references;
* selected risks;
* action recommendations.

Excludes:

* Internal relationship notes;
* unapproved negotiation strategy;
* restricted sources.

---

# 48. Redaction

Redactions may remove:

* Customer identities;
* employee personal information;
* bank details;
* privileged legal analysis;
* internal negotiation limits;
* restricted counterparties;
* internal comments;
* source excerpts.

Every redaction should record:

* Rule;
* affected section;
* audience;
* reviewer;
* reason;
* status.

---

# 49. Derived sanitized content

Restricted raw evidence may produce an approved sanitized output.

Example:

> Raw customer-level revenue is restricted to the Financial Clean Team.

Client-facing deliverable includes:

> Top-three customer concentration: 41,2%

It excludes:

* Customer names;
* individual revenue values;
* pricing terms.

The source manifest should preserve the restricted provenance without exposing it to the recipient.

---

# 50. Preflight validation

Before generation or review, validate:

* Required sections exist;
* all required sources are available;
* values use consistent currency and basis;
* current versions are selected;
* restricted content is permitted for the audience;
* unresolved contradictions are identified;
* linked calculations completed successfully;
* required disclaimers are present;
* reviewer chain is defined;
* output format is supported.

---

# 51. Financial consistency validation

Checks may include:

* Enterprise value versus equity value;
* net-debt bridge;
* valuation date;
* currency;
* FX basis;
* decimal and rounding consistency;
* scenario version;
* EBITDA definition;
* percentage totals;
* consideration component totals.

Example:

> **Export blocked**

> Executive Summary shows R$ 475 mi equity value, while the linked approved object is R$ 475 mi enterprise value.

---

# 52. Cross-section consistency

The system should detect conflicts such as:

* Executive summary uses valuation v3;
* appendix uses valuation v4;
* one section states six high findings;
* another states five;
* proposal summary uses an obsolete round;
* closing checklist count differs from Closing.

The user should resolve or explicitly explain each discrepancy.

---

# 53. Content review

A reviewer should be able to:

* Review complete artifact;
* review assigned sections;
* inspect sources;
* suggest edits;
* request changes;
* approve assigned scope;
* flag insufficient evidence;
* escalate.

Section approval should not automatically approve the complete deliverable.

---

# 54. Review comments

Comments should attach to:

* Deliverable version;
* section;
* paragraph;
* table row;
* chart;
* source reference.

Once a version is approved, unresolved review comments should normally block release.

Internal comments must never appear in exported content unless explicitly included.

---

# 55. Review states

Recommended:

* Not assigned;
* assigned;
* in review;
* clarification requested;
* changes requested;
* approved;
* approved with condition;
* not applicable;
* superseded.

---

# 56. Approval layers

A deliverable may require several distinct approvals:

1. **Section review**
2. **Financial approval**
3. **Legal approval**
4. **Content-owner approval**
5. **Deal Lead approval**
6. **Client approval**
7. **Release authorization**

The applicable chain should derive from:

* Deliverable type;
* audience;
* confidentiality;
* transaction policy.

---

# 57. Content approval

The approval request should state:

> **Approve Diligence Committee Brief v3**

Scope:

* Executive Summary;
* six high-severity findings;
* valuation reference;
* open information requests.

Sources current through:

> 28 jul. 2026 · 10:18 BRT

Outcome:

* Approve;
* approve with conditions;
* request changes;
* reject.

---

# 58. Release authorization

A separate request should state:

> **Authorize Diligence Committee Brief v3 for Internal Diligence Committee**

Format:

> PDF

Confidentiality:

> Internal Restricted

Recipients:

> Eight committee members

Expiration:

> None

This authorization should not cover a different audience or future version.

---

# 59. Approval invalidation

Approval should be invalidated when:

* The deliverable content changes;
* source dependencies materially change;
* redactions change;
* audience expands;
* confidentiality is reduced;
* recipient list materially changes;
* an approved conclusion is invalidated.

A new export from an unchanged approved version may not require new content approval, but may require new release authorization.

---

# 60. Approved with conditions

Example:

> **Content approved subject to Legal disclaimer update**

Condition:

> Replace the preliminary regulatory statement with approved counsel language.

State:

> Release blocked until condition completed.

The condition should create a linked task.

---

# 61. Export formats

Recommended formats:

* PDF;
* DOCX;
* XLSX;
* CSV;
* ZIP package;
* JSON or structured export for authorized technical use.

Not every deliverable supports every format.

Example:

* Committee brief: PDF and DOCX;
* findings register: XLSX and CSV;
* audit package: PDF and ZIP;
* funds-flow schedule: XLSX and PDF;
* source manifest: CSV and JSON.

---

# 62. File naming

Use predictable controlled naming.

Example:

```text
Project_Horizon_Diligence_Committee_Brief_v3_2026-07-28.pdf
```

Recommended components:

* Deal codename;
* deliverable type;
* version;
* date;
* optional audience;
* confidentiality marker.

Avoid filenames such as:

* `FINAL.pdf`
* `FINAL_v2.pdf`
* `LATEST_FINAL_USE_THIS.pdf`

---

# 63. Export manifest

Every export should have a manifest containing:

* Deliverable ID;
* version;
* export format;
* filename;
* generation time;
* generated by;
* source snapshot;
* template version;
* approval records;
* release authorization;
* audience;
* redaction policy;
* confidentiality;
* checksum;
* page or sheet count;
* generation limitations.

---

# 64. Watermarking

Watermark policies may include:

* Confidential;
* client confidential;
* draft;
* not for distribution;
* recipient name;
* export date;
* deal codename;
* unique export ID.

Example:

> CONFIDENTIAL — Helena Duarte — 28 JUL 2026 — EXPORT E-0042

Watermarking should derive from policy and audience.

---

# 65. Draft markings

Unapproved exports should display:

> **DRAFT — NOT FOR DISTRIBUTION**

Where technically possible, draft files should also contain:

* Version;
* generation timestamp;
* review state.

The user should not be able to remove mandatory draft markings without release authorization.

---

# 66. PDF behavior

A PDF export should preserve:

* Page numbers;
* headings;
* table continuity;
* financial formatting;
* confidentiality markings;
* source appendix;
* selectable text where permitted;
* accessible document structure where feasible.

Generated PDFs should be previewed before distribution.

---

# 67. Spreadsheet exports

XLSX exports should preserve:

* Clearly labeled sheets;
* units;
* currency;
* dates;
* formula versus value distinction;
* source references;
* version metadata;
* assumptions;
* protected areas where applicable.

Do not export a number without enough context to understand its basis.

Example:

> R$ 57,8 mi · Adjusted EBITDA · LTM Jun-2026

---

# 68. Structured data exports

Structured exports should include:

* Schema version;
* object IDs;
* object versions;
* units;
* currencies;
* timestamps;
* approval states;
* access classification.

They should not expose:

* Restricted source text;
* internal prompts;
* hidden reasoning;
* credentials;
* unrelated deal objects.

---

# 69. Deliverable packages

A package groups related deliverables for one purpose.

Examples:

* Diligence Committee Package;
* Client Review Package;
* Buyer Outreach Package;
* Negotiation Committee Package;
* Signing Package;
* Closing Binder;
* Audit Response Package.

A package may contain:

* Deliverables;
* source documents;
* appendices;
* manifests;
* cover note;
* recipient instructions.

---

# 70. Package lifecycle

Recommended:

* Draft;
* assembling;
* validation required;
* in review;
* approved;
* release authorized;
* exported;
* distributed;
* superseded;
* withdrawn;
* archived.

Package approval should verify every included item.

---

# 71. Package consistency

The system should verify that:

* Every included artifact is approved;
* all versions are compatible;
* source cutoff dates are understood;
* confidentiality is consistent;
* recipient permissions allow every item;
* no package item is stale;
* no withdrawn file remains included.

---

# 72. Distribution

Distribution methods may include:

* Secure portal;
* expiring secure link;
* controlled email delivery;
* approved VDR upload;
* approved storage destination;
* manual delivery record.

The product should distinguish:

* M&Ai-performed distribution;
* user-recorded external distribution.

---

# 73. Secure-link controls

Recommended:

* Named recipient;
* authentication required;
* expiry;
* download policy;
* watermark;
* view limit, where appropriate;
* revocation;
* activity record.

Avoid anonymous permanent links for confidential deliverables.

---

# 74. Recipient model

A recipient should be:

* An internal team member;
* a registered Contact;
* an external participant;
* an approved email identity;
* an approved distribution group.

The system should detect:

* Unknown recipient;
* personal email;
* restricted organization;
* recipient without authority;
* recipient outside the approved audience.

---

# 75. Distribution preflight

Before sending, verify:

* Version is approved;
* release authorization is current;
* recipient is in approved audience;
* access has not expired;
* redaction policy matches recipient;
* export is current;
* required watermark is applied;
* secure link has appropriate expiry;
* no relevant restriction changed.

---

# 76. Distribution confirmation

Example:

> **Send Diligence Committee Brief v3**

Recipients:

> Internal Diligence Committee · 8 members

File:

> PDF · 42 pages · 6,8 MB

Classification:

> Internal Restricted

Link expires:

> 15 ago. 2026

Actions:

* Send securely;
* cancel.

---

# 77. Distribution states

Recommended:

* Prepared;
* authorization required;
* scheduled;
* sent;
* delivered;
* opened;
* downloaded;
* failed;
* revoked;
* expired;
* recipient access removed.

Opening and download tracking should be used for security and delivery confirmation, not engagement scoring.

---

# 78. Manual distribution record

Where the user sends a file outside M&Ai, they may record:

* File;
* recipient;
* channel;
* date;
* sender;
* reason;
* confirmation.

State:

> **Externally distributed · User recorded**

This is less verifiable than platform delivery and should be labeled accordingly.

---

# 79. Distribution revocation

Revoking a secure link should:

* Prevent future access;
* preserve prior delivery history;
* notify the sender;
* optionally notify recipients;
* create an audit event.

Revocation cannot recall a file already downloaded.

The interface should state that limitation explicitly.

---

# 80. Withdrawn deliverable

A deliverable may be withdrawn because:

* Material error discovered;
* source invalidated;
* wrong audience;
* legal issue;
* incorrect version distributed;
* transaction status changed.

Withdrawal should:

* Preserve the version;
* stop new distribution;
* revoke active links where possible;
* identify affected recipients;
* create remediation tasks;
* record rationale.

---

# 81. Supersession

A new approved version should mark earlier versions as:

> Superseded by v4

Prior recipients may be notified when policy requires.

The product should not delete the superseded version or its distribution history.

---

# 82. Version comparison

Comparison should show:

* Sections added;
* sections removed;
* narrative changes;
* financial value changes;
* source changes;
* redaction changes;
* audience changes;
* approval differences.

Example:

| Field                   | v2            | v3            |
| ----------------------- | ------------- | ------------- |
| Top-three concentration | 39,8%         | 41,2%         |
| Valuation range         | R$ 480–520 mi | R$ 438–478 mi |
| High findings           | 5             | 6             |
| Source cutoff           | 27 jul.       | 28 jul.       |

---

# 83. Reproducibility

A deliverable version should indicate:

* Reproducible;
* reproducible with archived dependencies;
* partially reproducible;
* imported external artifact;
* generation environment unavailable;
* source unavailable.

Reproduction should generate a new export file from the same immutable content and source snapshot.

It should not silently use current data.

---

# 84. Imported deliverables

Users may register an externally created artifact.

Required:

* Title;
* type;
* version;
* file;
* source date;
* owner;
* audience;
* confidentiality;
* approval state;
* relationship to M&Ai objects.

State:

> **Imported artifact**

The system should not imply that imported content was generated or validated by M&Ai.

---

# 85. Deliverable search

Search should include:

* Title;
* type;
* version;
* owner;
* reviewer;
* audience;
* included finding;
* scenario;
* counterparty;
* source document;
* recipient;
* export filename.

Placeholder:

> Search deliverables, versions or recipients

---

# 86. Filters

## Primary filters

* Deliverable type;
* status;
* audience;
* owner;
* freshness;
* approval state.

## Advanced filters

* Workstream;
* confidentiality;
* source cutoff;
* reviewer;
* release state;
* export format;
* distributed;
* recipient;
* package;
* stale dependency;
* imported;
* withdrawn;
* archived.

---

# 87. Saved views

Recommended:

* Requires my review;
* stale outputs;
* client deliverables;
* committee reports;
* approved but not released;
* externally distributed;
* audit packages;
* closing packages;
* withdrawn artifacts.

---

# 88. Contextual Copilot

Suggested prompts:

* Prepare a Diligence Committee Brief from approved findings.
* Which reports are stale?
* Explain why Valuation Report v2 is no longer current.
* Compare Diligence Brief v2 and v3.
* Which sources support the executive summary?
* Draft a client-safe risk summary.
* Which deliverables are approved but not authorized for release?
* Prepare a source manifest.
* Which recipients received the previous version?
* Create a draft closing-readiness report.

## Response requirements

The Copilot should:

* Use the selected source snapshot;
* distinguish approved and draft content;
* cite included sources;
* respect audience restrictions;
* identify stale dependencies;
* never release or distribute a deliverable;
* route review and authorization through controlled workflows.

---

# 89. Recommended desktop layout

For a **1440 × 900** canvas:

| Region                  | Approximate width |
| ----------------------- | ----------------: |
| Compact global sidebar  |          72–80 px |
| Deal context navigation |        112–136 px |
| View and filter rail    |        220–260 px |
| Deliverable library     |        560–680 px |
| Detail or preview panel |        380–460 px |
| Page padding            |          24–32 px |

## Recommended composition

```text
┌────────┬──────────────────────────────────────────────────────────────┐
│ Global │ Project Horizon · Deliverables & Exports                   │
│ shell  ├──────────────────────────────────────────────────────────────┤
│        │ Library  In Review  Approved  Packages  Distribution        │
│        ├──────────────┬─────────────────────────┬─────────────────────┤
│        │ Views        │ Deliverables            │ Selected output     │
│        │              │                         │                     │
│        │ In review  3 │ Diligence Committee    │ Committee Brief v3  │
│        │ Approved   5 │ Brief · v3             │                     │
│        │ Stale      2 │ Financial review       │ 6 high findings     │
│        │ Distributed 2│ pending                 │ R$ 438–478 mi       │
│        │              │                         │                     │
│        │ Type         │ Valuation Report · v2  │ Sources current     │
│        │ Diligence    │ Stale                   │ through 10:18 BRT   │
│        │ Valuation    │                         │                     │
│        │ Negotiation  │ Buyer Shortlist Pack   │ Release not         │
│        │ Closing      │ Approved                │ authorized          │
│        │              │                         │ [ Open deliverable ]│
└────────┴──────────────┴─────────────────────────┴─────────────────────┘
```

---

# 90. Deliverable-detail layout

```text
┌──────────────────────────────────────────┬───────────────────────────┐
│ Diligence Committee Brief · v3           │ Review and release        │
│                                          │                           │
│ Executive Summary                        │ Financial review          │
│ 6 high-severity findings                 │ Pending · Ana Costa       │
│                                          │                           │
│ Key Risks                                │ Legal review              │
│ Customer concentration · 41,2%           │ Approved                  │
│ Tax contingency · R$ 8,4 mi              │                           │
│                                          │ Deal Lead approval        │
│ Valuation Reference                      │ Waiting                   │
│ R$ 438 mi–R$ 478 mi                     │                           │
│ −R$ 42 mi midpoint                      │ Release                   │
│                                          │ Not authorized            │
│ Open Requests · 6                        │                           │
│                                          │ [ Submit financial review]│
└──────────────────────────────────────────┴───────────────────────────┘
```

---

# 91. UI design direction

## Overall character

Aim for:

> **A controlled transaction-publication workspace where evidence-backed analysis becomes an approved business artifact**

The screen should feel:

* Editorial;
* precise;
* controlled;
* version-aware;
* approval-conscious;
* confidentiality-aware;
* institutional.

It should not feel:

* Like a cloud drive;
* like a consumer design tool;
* like a chat transcript;
* like a one-click AI report generator.

---

# 92. Visual hierarchy

Prioritize:

1. Deliverable identity;
2. current version;
3. content state;
4. approval state;
5. freshness;
6. audience;
7. source cutoff;
8. release state;
9. export and distribution history.

Do not prioritize:

* File icon;
* thumbnail;
* download count;
* AI generation label;
* raw file size.

---

# 93. Color application

Use the established M&Ai palette:

* Canvas Cream: `#F3F0EE`
* Lifted Cream: `#FCFBFA`
* Ink Black: `#141413`
* Signal Orange: `#CF4500`
* Light Signal Orange: `#F37338`
* Dust Taupe: `#D1CDC7`
* Slate Gray: `#696969`

## Semantic application

* Review required: Signal Orange;
* approved content: green;
* release authorized: dark green or differentiated approval state;
* stale: amber;
* invalidated or withdrawn: red;
* draft: gray-blue;
* distributed: blue-neutral;
* restricted: dark neutral;
* export failed: red-orange.

Content approval and release authorization must not rely on two similar green badges without labels.

---

# 94. Typography

Use **Sofia Sans**.

| Element              |     Size |  Weight |
| -------------------- | -------: | ------: |
| Page title           | 26–30 px | 500–600 |
| Deliverable name     | 14–16 px | 650–700 |
| Selected deliverable | 20–24 px | 600–700 |
| Financial value      | 18–24 px | 550–650 |
| Section heading      | 15–18 px | 650–700 |
| Body                 | 13–15 px | 450–500 |
| Metadata             | 11–13 px | 450–550 |
| Status               | 11–12 px | 650–700 |
| File metadata        | 11–13 px | 500–600 |

Use tabular numerals for:

* Versions;
* dates;
* financial values;
* percentages;
* page counts;
* file sizes;
* export IDs.

Use pt-BR formatting:

* `R$ 438 mi–R$ 478 mi`
* `41,2%`
* `28 jul. 2026 · 10:18 BRT`

---

# 95. Accessibility requirements

The screen should support:

* Semantic deliverable tables;
* accessible document-preview structure;
* keyboard navigation;
* visible focus;
* no color-only approval or freshness state;
* descriptive version labels;
* accessible source manifest;
* accessible financial tables;
* minimum 44 × 44 px controls;
* announced generation progress;
* accessible review comments;
* explicit draft and restricted labels;
* accessible redaction descriptions;
* descriptive export and distribution actions;
* focus preservation after opening a source;
* correct reading order in generated accessible PDFs where supported.

Avoid:

> Download

Prefer:

> Export Diligence Committee Brief v3 as PDF

---

# 96. System states

## No deliverables

> **Create the first transaction deliverable**

Primary action:

> Create deliverable

## Generation in progress

Show stages such as:

* Freezing source snapshot;
* assembling sections;
* validating values;
* creating preview.

## Generation failed

Preserve the deliverable definition and source snapshot.

Show the exact failed stage.

## Validation failed

List actionable issues.

## Review required

Identify reviewer and scope.

## Changes requested

Show unresolved comments and affected sections.

## Stale

Show changed dependencies and affected sections.

## Approval invalidated

Preserve historical approval and require a new version.

## Release not authorized

Permit internal preview but block distribution.

## Export failed

Approved deliverable remains valid.

Only the file generation failed.

## Distribution failed

The export remains intact.

Show which recipients failed.

## Recipient access revoked

Preserve prior delivery record.

## Source unavailable

Show retained source metadata and limitation.

## Restricted deliverable

Show only permission-safe metadata.

## Archived deal

Allow read-only history and authorized export.

## Offline

Allow safely cached viewing.

Disable:

* Generation;
* approval;
* export;
* distribution;
* redaction changes.

---

# 97. Figma component architecture

## `DeliverablesHeader`

Properties:

* Populated;
* review required;
* stale;
* distribution;
* empty;
* partial failure.

## `DeliverableTabs`

* Library;
* review;
* approved;
* packages;
* distribution;
* history.

## `DeliverableLibrary`

States:

* Populated;
* grouped;
* filtered;
* empty;
* loading;
* partial error.

## `DeliverableRow`

Properties:

* Draft;
* generating;
* review;
* approved;
* authorized;
* distributed;
* stale;
* withdrawn;
* restricted.

## `DeliverableIdentity`

Properties:

* Report;
* spreadsheet;
* presentation;
* package;
* audit;
* imported.

## `DeliverableStatus`

Properties:

* Preparation;
* content approval;
* release;
* freshness.

## `DeliverableDetail`

States:

* Overview;
* content;
* sources;
* versions;
* approvals;
* distribution.

## `ContentBlock`

Properties:

* Narrative;
* fact;
* finding;
* financial table;
* chart;
* decision;
* appendix;
* custom;
* restricted.

## `SourceSnapshot`

Properties:

* Current;
* partial;
* stale;
* archived;
* restricted.

## `SourceManifest`

Properties:

* Complete;
* missing;
* conflict;
* restricted;
* unavailable.

## `DeliverableFreshness`

Properties:

* Current;
* review suggested;
* stale;
* invalidated;
* historical.

## `GenerationProgress`

Properties:

* Snapshot;
* drafting;
* validation;
* preview;
* complete;
* failed.

## `PreflightValidation`

Properties:

* Passed;
* warning;
* blocked;
* restricted.

## `DeliverableReview`

Properties:

* Assigned;
* in review;
* changes requested;
* approved;
* conditional.

## `ReleaseAuthorization`

Properties:

* Not required;
* required;
* pending;
* approved;
* expired;
* invalidated.

## `VersionComparison`

Properties:

* Content;
* financial;
* source;
* audience;
* redaction.

## `ExportFlow`

States:

* Format;
* filename;
* watermark;
* manifest;
* generate;
* complete;
* failed.

## `DistributionFlow`

States:

* Audience;
* recipients;
* access;
* expiry;
* review;
* send;
* delivered;
* partial failure.

## `DeliverablePackage`

Properties:

* Draft;
* inconsistent;
* review;
* approved;
* distributed;
* withdrawn.

---

# 98. Production object model

## `Deliverable`

```text
id
dealId
deliverableType
title
purpose
ownerParticipantId
defaultAudienceType
confidentialityLevel
templateId
currentApprovedVersionId
latestDraftVersionId
status
createdBy
createdAt
updatedAt
```

## `DeliverableVersion`

```text
id
deliverableId
versionNumber
versionLabel
sourceSnapshotId
templateVersionId
preparationState
contentApprovalState
releaseState
freshnessState
createdBy
createdAt
approvedAt
supersededAt
withdrawnAt
```

## `DeliverableSection`

```text
id
deliverableVersionId
sectionType
title
position
contentMode
content
sourceReferenceIds
reviewOwnerId
reviewState
freshnessState
audienceVisibility
createdAt
updatedAt
```

## `DeliverableSourceSnapshot`

```text
id
dealId
sourceCutoffAt
dealStateSnapshot
objectReferences
documentReferences
calculationRunReferences
decisionReferences
accessPolicySnapshot
createdBy
createdAt
```

## `DeliverableSourceReference`

```text
id
sourceSnapshotId
sourceObjectType
sourceObjectId
sourceObjectVersion
documentId
documentVersionId
sourceLocation
includedSectionIds
validityState
accessLevel
createdAt
```

## `DeliverableGenerationRun`

```text
id
deliverableVersionId
generationMode
capabilityType
instructionSnapshot
inputSnapshotId
status
startedAt
completedAt
limitationSummary
error
createdBy
```

## `DeliverableValidationResult`

```text
id
deliverableVersionId
validationType
severity
sectionId
message
affectedObjectIds
status
resolvedBy
resolvedAt
createdAt
```

## `DeliverableReviewRequest`

```text
id
deliverableVersionId
reviewType
sectionIds
assignedTo
status
submittedBy
submittedAt
dueAt
completedAt
outcome
```

## `DeliverableApproval`

```text
id
deliverableVersionId
approvalType
scope
decision
conditions
authoritySnapshot
decidedBy
decidedAt
invalidatedAt
invalidationReason
```

## `ReleaseAuthorization`

```text
id
deliverableVersionId
audienceType
recipientScope
approvedFormats
confidentialityLevel
redactionPolicyId
distributionPolicy
effectiveFrom
expiresAt
status
authorizedBy
authorizedAt
```

## `RedactionPolicy`

```text
id
dealId
name
audienceType
redactionRules
restrictedZoneIds
watermarkPolicyId
status
createdAt
updatedAt
```

## `DeliverableExport`

```text
id
deliverableVersionId
releaseAuthorizationId
format
filename
fileReference
fileSize
pageOrSheetCount
watermarkPolicyId
manifestId
checksum
status
requestedBy
generatedAt
```

## `ExportManifest`

```text
id
deliverableExportId
sourceSnapshotId
templateVersionId
approvalIds
authorizationId
audienceSnapshot
redactionSnapshot
generationMetadata
limitations
createdAt
```

## `DeliverablePackage`

```text
id
dealId
title
packageType
purpose
audienceType
confidentialityLevel
status
ownerId
createdAt
updatedAt
```

## `DeliverablePackageItem`

```text
id
packageId
deliverableVersionId
exportId
position
required
status
createdAt
```

## `DistributionRecord`

```text
id
dealId
deliverableExportId
packageId
distributionMethod
releaseAuthorizationId
senderId
status
sentAt
completedAt
revokedAt
failureSummary
createdAt
```

## `DistributionRecipient`

```text
id
distributionRecordId
recipientType
recipientId
recipientAddress
accessPolicy
expiresAt
deliveryState
deliveredAt
openedAt
downloadedAt
revokedAt
```

## `DeliverableEvent`

```text
id
dealId
deliverableId
deliverableVersionId
eventType
actorType
actorId
summary
beforeSnapshot
afterSnapshot
occurredAt
```

---

# 99. Suggested routes

Primary:

```text
/deals/:dealId/deliverables
```

In review:

```text
/deals/:dealId/deliverables?view=review
```

Approved:

```text
/deals/:dealId/deliverables?view=approved
```

Packages:

```text
/deals/:dealId/deliverables?view=packages
```

Distribution:

```text
/deals/:dealId/deliverables?view=distribution
```

History:

```text
/deals/:dealId/deliverables?view=history
```

Selected deliverable:

```text
/deals/:dealId/deliverables/:deliverableId
```

Selected version:

```text
/deals/:dealId/deliverables/:deliverableId/versions/:versionId
```

Create:

```text
/deals/:dealId/deliverables/new
```

Export:

```text
/deals/:dealId/deliverables/:deliverableId/export
```

Distribute:

```text
/deals/:dealId/deliverables/:deliverableId/distribute
```

Package detail:

```text
/deals/:dealId/deliverables/packages/:packageId
```

---

# 100. API direction

Recommended endpoints:

```text
GET    /api/deals/:dealId/deliverables
POST   /api/deals/:dealId/deliverables
GET    /api/deals/:dealId/deliverables/:deliverableId
PATCH  /api/deals/:dealId/deliverables/:deliverableId

POST   /api/deliverables/:deliverableId/versions
GET    /api/deliverable-versions/:versionId
POST   /api/deliverable-versions/:versionId/generate
POST   /api/deliverable-versions/:versionId/validate
POST   /api/deliverable-versions/:versionId/submit-review
POST   /api/deliverable-versions/:versionId/approvals
POST   /api/deliverable-versions/:versionId/release-authorizations
POST   /api/deliverable-versions/:versionId/withdraw

POST   /api/deliverable-versions/:versionId/exports
GET    /api/deliverable-exports/:exportId
POST   /api/deliverable-exports/:exportId/distributions
POST   /api/distributions/:distributionId/revoke

GET    /api/deals/:dealId/deliverable-packages
POST   /api/deals/:dealId/deliverable-packages
PATCH  /api/deliverable-packages/:packageId
```

Writes should support:

* Version checks;
* idempotency;
* source-snapshot immutability;
* authority validation;
* audience validation;
* access-zone enforcement;
* audit creation;
* safe retry behavior.

---

# 101. Repository direction

The current repository contains a narrow document-generation foundation:

* A document-generator engine;
* PDF generation through `pdf-lib`;
* LaTeX generation and compilation;
* a basic term-sheet data structure;
* PDF watermark and signature-label support;
* a CLI flow that produces term-sheet `.tex` and `.pdf` files.

The canonical repository documentation explicitly limits the current capability: the present global PDF tool writes a term-sheet PDF after validation, while closing workflows require preview and human approval. The existing code is not evidence of a complete banker-facing deliverable library or general report-generation system.

## Keep

* PDF generation utilities;
* structured document inputs;
* watermark primitives;
* preview-before-release direction;
* deterministic document sections;
* term-sheet generation as one specialized output;
* explicit human approval boundary.

## Reframe

### Term-sheet generator

Treat it as:

> One output adapter within the Negotiation and Closing workflows

Do not treat it as the entire Deliverables domain.

### Direct filesystem writes

The current CLI writes artifacts to a requested path.

Production should instead use:

* Controlled object storage;
* tenant and deal isolation;
* artifact IDs;
* checksums;
* access policies;
* retention;
* audit records.

### Signatures

Current signature labels or injected text are not proof of:

* Legally valid electronic signature;
* signer authentication;
* signature-provider integration;
* completion.

Use an actual signature integration and Closing workflow for legally significant execution.

### LaTeX generation

LaTeX is an implementation option.

It should not appear as the banker-facing document model.

## Add

* Deliverable registry;
* deliverable and version lifecycles;
* templates;
* structured content blocks;
* source snapshots;
* dependency freshness;
* validation;
* section review;
* content approvals;
* release authorization;
* audience profiles;
* redaction;
* export manifests;
* controlled storage;
* packages;
* distribution;
* recipient state;
* withdrawal;
* audit integration.

---

# 102. Production validation tests

Critical tests should cover:

* Source snapshot immutability;
* current versus latest draft;
* stale dependency detection;
* invalidated approval;
* content and release approval separation;
* incompatible currency or value basis;
* incorrect EV/equity labeling;
* audience restriction;
* clean-team redaction;
* restricted-source exclusion;
* recipient eligibility;
* export watermarking;
* filename versioning;
* checksum creation;
* package consistency;
* withdrawn version blocking;
* secure-link expiry;
* revocation;
* concurrent edits;
* duplicate generation retries;
* export and distribution audit events.

---

# 103. What not to include

Avoid:

* A generic file browser;
* one-click “Generate final report”;
* generated content presented as approved;
* content approval automatically authorizing distribution;
* unapproved drafts without watermarking;
* mutable approved versions;
* source references updated after approval;
* stale outputs presented as current;
* anonymous permanent links;
* unrestricted external email attachments;
* client and internal content in the same uncontrolled file;
* raw restricted evidence in sanitized outputs;
* unrestricted spreadsheet exports;
* file downloads without a manifest;
* legal-signature claims based only on a PDF label;
* raw LaTeX or generation internals in the banker UI;
* direct filesystem paths;
* real client names in mocked fixtures.

---

# 104. MOCKED — Product and demo specification

## Purpose

The mocked Deliverables & Exports screen should demonstrate:

* Source-linked report preparation;
* version control;
* human review;
* release authorization;
* stale-output detection;
* controlled external distribution.

Its narrative is:

> **M&Ai converts approved transaction work into controlled outputs where every number, conclusion, version and recipient remains traceable.**

This screen is useful in a live demo and enterprise product walkthrough.

It is not a primary pitch hero. The screen is classified as a POC expansion, while Diligence, Valuation, Negotiation and Closing provide stronger static product narratives. 

---

# 105. Mocked shell state

Institution:

> **Atlas M&A Advisory**

User:

> **Ana Costa · Vice President**

Deal:

> **Project Horizon**
> Atlas Industrial · Sell-side
> Due Diligence · Restricted workspace

Breadcrumb:

> Deals / Project Horizon / Deliverables & Exports

Header:

* 12 deliverables;
* 3 in review;
* 5 approved;
* 2 distributed;
* 2 stale.

---

# 106. Mocked Library

## Diligence Committee Brief — selected

> **Version 3**

Audience:

> Internal Diligence Committee

State:

> In review

Source cutoff:

> 28 jul. 2026 · 10:18 BRT

Review:

* Legal section approved;
* Financial review pending;
* Deal Lead approval waiting.

Freshness:

> Current

---

## Risk Summary

> **Version 2**

Audience:

> Client Principal

State:

> Content approved

Release:

> Awaiting authorization

Freshness:

> Current

---

## Valuation Report

> **Version 2**

Audience:

> Internal Deal Team

State:

> Approved

Freshness:

> **Stale**

Cause:

> Scenario v4 superseded scenario v3.

---

## Buyer Shortlist Package

> **Version 1**

Audience:

> Client Review

State:

> Approved and released

Distribution:

> Sent 26 jul. 2026

---

## Northbridge Proposal Comparison

> **Version 4**

Audience:

> Client Negotiation Committee

State:

> Content approved

Release:

> Authorized

Export:

> PDF available

---

## Closing Readiness Report

> **Draft Version 1**

Audience:

> Internal Closing Team

State:

> Source requirements incomplete

---

# 107. Mocked selected deliverable

Title:

> **Diligence Committee Brief**

Version:

> 3

Owner:

> Felipe Rocha · Associate

Purpose:

> Prepare the internal committee review of material Diligence findings and valuation consequences.

Audience:

> Internal Diligence Committee

Classification:

> Internal Restricted

Sources current through:

> 28 jul. 2026 · 10:18 BRT

---

# 108. Mocked content

## Executive summary

> Six high-severity findings remain active. Customer concentration is the largest quantified valuation issue.

## Customer concentration

> Top-three customers increased from **39,8% to 41,2%**.

Threshold:

> 35,0%

## Valuation reference

Approved base:

> **R$ 480 mi–R$ 520 mi**

Risk-adjusted proposal:

> **R$ 438 mi–R$ 478 mi**

Midpoint movement:

> **−R$ 42 mi · −8,4%**

## Open information requests

> 6 open · 2 overdue

---

# 109. Mocked source manifest

Included:

* 18 Diligence findings;
* 6 high-severity findings;
* Target Dossier version 6;
* Valuation scenario version 4;
* 3 approval decisions;
* 127 synchronized documents;
* 14 primary evidence references.

Selected source:

> `Receita_por_Cliente_2025.xlsx`
> Version 3 · Receita Mensal · B12:M14

Coverage:

> 14 of 15 required report sections have current approved sources.

Limitation:

> Tax contingency narrative remains under specialist review.

---

# 110. Mocked approval state

## Financial review

Reviewer:

> Ana Costa

State:

> Pending

Due:

> Today · 16:00 BRT

## Legal review

Reviewer:

> Camila Nunes

State:

> Approved

Scope:

> Legal risk and disclaimer sections only

## Deal Lead approval

Reviewer:

> Marina Alves

State:

> Waiting on Financial review

## Release

State:

> Not authorized

Reason:

> Content approval incomplete

---

# 111. Mocked stale deliverable

> **Valuation Report v2 is stale**

Source used:

> Scenario v3 · R$ 480 mi–R$ 520 mi

Current source:

> Scenario v4 · R$ 438 mi–R$ 478 mi

Affected:

* Executive Summary;
* valuation range;
* sensitivity appendix;
* recommendation.

Action:

> Create version 3 from current sources

---

# 112. Recommended static composition

```text
┌──────────────────────────────────────────────────────────────────┐
│ Deliverables & Exports · 3 in review · 2 stale                 │
├───────────────────────────────┬──────────────────────────────────┤
│ Deliverable library           │ Diligence Committee Brief · v3  │
│                               │                                  │
│ Committee Brief · v3          │ 6 high-severity findings         │
│ Financial review pending      │                                  │
│                               │ 39,8% → 41,2%                   │
│ Risk Summary · v2             │                                  │
│ Approved · Release pending    │ Valuation reference              │
│                               │ R$ 438 mi–R$ 478 mi             │
│ Valuation Report · v2         │ −R$ 42 mi midpoint              │
│ Stale                         │                                  │
│                               │ Sources current through 10:18    │
│ Buyer Shortlist · v1          │                                  │
│ Distributed                   │ Release not authorized           │
│                               │ [ Open deliverable ]             │
└───────────────────────────────┴──────────────────────────────────┘
```

This communicates:

* Governed outputs;
* source-linked values;
* review state;
* version state;
* release boundary;
* stale-output detection.

---

# 113. Recommended demo flows

## Flow A — Create committee brief

```text
Approved findings and scenario
  ↓
Create deliverable
  ↓
Select committee template
  ↓
Freeze source snapshot
  ↓
Generate draft
  ↓
Review linked sections
```

## Flow B — Source change invalidates report

```text
Valuation scenario v4 approved
  ↓
Valuation Report v2 marked stale
  ↓
Affected sections identified
  ↓
Create version 3
  ↓
Review again
```

## Flow C — Content approval and release

```text
Financial review approved
  ↓
Deal Lead approves content
  ↓
Release authorization requested
  ↓
Audience and redactions confirmed
  ↓
PDF exported
```

## Flow D — Secure distribution

```text
Approved PDF
  ↓
Select committee recipients
  ↓
Apply watermark and expiry
  ↓
Send secure link
  ↓
Delivery recorded
```

## Flow E — Restricted evidence

```text
Customer-level evidence
  ↓
Financial Clean Team only
  ↓
Sanitized concentration metric
  ↓
Client-safe risk summary
  ↓
Redaction review
```

## Flow F — Package creation

```text
Create Diligence Committee Package
  ↓
Add committee brief
  ↓
Add findings appendix
  ↓
Add valuation appendix
  ↓
Validate versions
  ↓
Approve package
```

## Flow G — Withdraw distributed version

```text
Material error identified
  ↓
Withdraw version
  ↓
Revoke active links
  ↓
Identify prior downloads
  ↓
Prepare corrected version
  ↓
Notify recipients
```

---

# 114. UX prototype tasks to validate

Test whether users can:

1. Find the current approved report.
2. distinguish the current approved version from the latest draft.
3. identify who owns a deliverable.
4. determine its intended audience.
5. find the source cutoff.
6. inspect exact source versions.
7. identify a stale report.
8. understand why it became stale.
9. create a new version from current sources.
10. review one assigned section.
11. request changes.
12. approve content.
13. distinguish content approval from release authorization.
14. authorize one audience.
15. export a PDF.
16. inspect the export manifest.
17. create a client-safe redacted version.
18. identify restricted content.
19. create a package.
20. detect inconsistent package versions.
21. send an approved file securely.
22. revoke a distribution link.
23. determine whether a recipient downloaded the file.
24. withdraw an incorrect deliverable.
25. reproduce a historical export.
26. inspect the export in Activity & Audit.

---

# 115. Design validation criteria

Deliverables & Exports is ready when:

1. Deliverables and source documents remain separate.
2. Deliverables and export files remain separate.
3. Exports and distributions remain separate.
4. Content approval and release authorization remain separate.
5. Every deliverable version has a source snapshot.
6. Approved versions are immutable.
7. The current approved version and latest draft are distinguishable.
8. Source cutoff is visible.
9. Source objects and versions are inspectable.
10. Linked content becomes stale when dependencies change.
11. Stale sections are identified precisely.
12. Approved reports are not silently regenerated.
13. AI-assisted content remains draft until reviewed.
14. Deterministic blocks preserve calculation provenance.
15. Manual content preserves authorship and review.
16. Financial consistency checks are enforced.
17. EV and equity value cannot be confused silently.
18. Currency, units and dates are explicit.
19. Audience profiles control content and redactions.
20. Restricted evidence cannot leak into broader outputs.
21. Every export has a manifest.
22. Draft exports are visibly marked.
23. Release authorization is version- and audience-specific.
24. Unknown recipients are blocked or reviewed.
25. External distribution uses controlled access.
26. Secure links support expiry and revocation.
27. Revocation does not claim to recall downloaded files.
28. Packages validate every included version.
29. Withdrawn outputs cannot be newly distributed.
30. Historical versions preserve distribution history.
31. Imported artifacts are labeled honestly.
32. Export or distribution failure does not invalidate approved content.
33. Every generation, approval, export and distribution creates an audit event.
34. The current repository’s term-sheet PDF generator is not presented as a complete deliverables product.
35. Legal signature status is not inferred from a PDF label.
36. The screen remains useful without Copilot.
37. Mobile supports review and controlled export.
38. The pitch fixture remains fictional.
39. Every state has a clear next action.

---

# 116. Final design target

The correct design target is not:

> “A folder where users download generated reports.”

It is:

> **A controlled transaction-publication workspace where every deliverable preserves its exact source snapshot, human approvals, audience restrictions, export manifest and distribution history.**

Its defining interaction is:

> **Choose the output → freeze authoritative sources → generate and validate → review and approve → authorize the audience → export or distribute → preserve immutable history**

**Next iteration: Deal Settings & Archive.**
