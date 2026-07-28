---
canonical_name: "Global Search"
definition_id: "BD-19"
definition_status: "Governed for MAI-90"
screen_family: "institution-wide"
owning_task: "MAI-91"
canonical_routes:
  - "/search"
figma_file_key: "otMJE31OKIxdXogV4RNbGQ"
figma_status: "Planned in MAI-91"
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
# Global Search

## 1. Recommended product naming

Use:

* **Top-bar field:** `Search`
* **Expanded utility:** `Global Search`
* **Deal-scoped placeholder:** `Search this deal…`
* **Institution-scoped placeholder:** `Search deals, organizations, evidence or decisions…`
* **Keyboard shortcut:** `⌘ K` or `Ctrl K`
* **Full-page route:** `/search`
* **Result explanation:** `Why this result`
* **Source preview:** `Matched evidence`

Global Search should remain a persistent top-bar utility rather than a primary sidebar destination.

The shell architecture already defines search as one of the product’s principal productivity tools and requires it to return both **transaction objects and contextual actions**, rather than behaving like a basic text filter. 

---

# 2. Screen definition

**Global Search** is the permission-aware retrieval layer used to find transaction objects, evidence, decisions and destinations across the user’s authorized M&Ai workspace.

It should search:

* Deals;
* organizations;
* contacts;
* documents;
* Dossier facts;
* diligence findings;
* valuation scenarios and assumptions;
* counterparties;
* negotiation proposals and terms;
* closing requirements;
* tasks and approvals;
* decisions;
* generated artifacts;
* selected audit events.

It should answer:

1. **Where is the object I need?**
2. **Which deal does it belong to?**
3. **Is this the current authoritative version?**
4. **Why did this result match my query?**
5. **Can I inspect the exact source location?**
6. **Is the result a fact, finding, decision or document?**
7. **Which related action can I perform?**
8. **Am I searching this deal or the entire institution?**
9. **Are any results incomplete because of processing or access?**
10. **Where should I continue the workflow?**

Its central interaction is:

> **Enter query → Confirm scope → Find authoritative object → Inspect match and context → Open exact destination**

---

# 3. Primary intention

## Operational intention

Allow bankers to move directly to relevant transaction information without manually navigating through several deals, folders and workspaces.

## User intention

A banker should be able to say:

> “I can find the exact document, fact, finding or decision I remember—even when I do not know which screen contains it.”

## Product intention

Search should reinforce that M&Ai is a structured transaction system rather than a collection of disconnected files.

It should retrieve:

* Business objects;
* evidence;
* versions;
* relationships;
* workflow actions.

It should not merely return documents containing matching words.

The canonical shell design specifically requires global search to cover deals, organizations, contacts, documents, findings, tasks, decisions and deliverables, while deal-scoped search should prioritize the current transaction’s evidence, assumptions, terms and conditions. 

---

# 4. Strategic product role

Global Search is a high-value usability layer, but not a primary pitch screen.

Its strategic value comes from making the transaction graph accessible:

```text
Document
  ↓
Extracted fact
  ↓
Diligence finding
  ↓
Valuation treatment
  ↓
Approval decision
  ↓
Negotiation or closing consequence
```

A search for:

> customer concentration

should therefore find more than the spreadsheet containing those words.

It should also find:

* The approved Dossier fact;
* the active finding;
* the affected valuation treatment;
* the related decision;
* the review artifact.

This is materially more useful than generic VDR search.

---

# 5. What Global Search is not

The screen should not become:

* A generic document-search bar;
* a consumer web-search interface;
* an unrestricted cross-deal data browser;
* a replacement for the Agentic Workspace;
* a replacement for page-level filters;
* an audit-log explorer by default;
* a command-line interface;
* a raw vector-search debugger;
* a prompt box labeled as search;
* a technical index-status console;
* an automatic answer generator;
* a source-free semantic search;
* a place where inaccessible records are partially exposed.

The central question is not:

> “Which text fragments contain these words?”

It is:

> **“Which authorized transaction object best represents what the user is trying to find?”**

---

# 6. Relationship to adjacent experiences

| Experience             | Primary responsibility                                   |
| ---------------------- | -------------------------------------------------------- |
| **Top-bar Search**     | Fast navigation and command execution                    |
| **Global Search page** | Broad retrieval, filtering and result exploration        |
| **Deal-scoped Search** | Prioritizes the current transaction                      |
| **Page filters**       | Refine the objects already displayed on one screen       |
| **Contextual Copilot** | Explains, compares or reasons about selected information |
| **Documents & VDR**    | Browses document hierarchy and processing state          |
| **Activity & Audit**   | Reconstructs complete event history                      |
| **Tasks & Approvals**  | Shows required actions                                   |
| **Global navigation**  | Opens known principal destinations                       |

Global Search is part of the institution-level workspace catalogue and should remain available from every authenticated internal screen. 

---

# 7. Global search versus deal-scoped search

The search scope must always be explicit.

## Global scope

Used from institution-level screens.

Searches all authorized:

* Deals;
* organizations;
* contacts;
* transaction work;
* evidence;
* decisions;
* deliverables.

Label:

> **All accessible workspace**

## Deal scope

Used inside a deal.

Prioritizes:

* Deal documents;
* Dossier facts;
* findings;
* valuation assumptions;
* counterparties;
* proposals;
* closing requirements;
* decisions;
* activity.

Label:

> **Project Horizon**

## Scope switch

The user may switch from:

> Project Horizon

to:

> All accessible workspace

The product must not silently broaden a deal search to other transactions.

---

# 8. Search versus Copilot

## Search

Best for:

* Finding an object;
* opening a document;
* locating a decision;
* retrieving a known fact;
* navigating to a workspace.

Example:

> `Customer_Revenue_2025.xlsx`

## Copilot

Best for:

* Explaining a finding;
* comparing scenarios;
* synthesizing several results;
* answering a transaction question;
* preparing a draft.

Example:

> Why did customer concentration reduce the valuation midpoint?

## Handoff

Search results may offer:

> **Ask M&Ai about these results**

The Copilot should inherit:

* Query;
* selected results;
* scope;
* deal context.

Search should not automatically convert every query into a generated answer.

---

# 9. Search versus page filters

## Search

Finds an object across the workspace.

Example:

> Northbridge Round 3

## Filter

Restricts an existing dataset.

Example:

> Negotiation proposals · Northbridge · Current

A page search within Documents or Organizations may use the same search infrastructure, but the user interface should remain scoped to the current object type.

---

# 10. Primary users

## Analyst

Needs to:

* Find source documents;
* locate facts;
* revisit prior reviews;
* search exact identifiers;
* retrieve current versions.

## Associate

Needs to:

* Find related evidence;
* locate earlier decisions;
* move across workstreams;
* investigate document changes;
* prepare review context.

## Vice President

Needs to:

* Find material findings;
* locate approved scenarios;
* inspect decisions;
* retrieve negotiation or closing context;
* find work requiring review.

## Partner or Managing Director

Needs:

* Fast deal navigation;
* current transaction status;
* approved valuation;
* material decisions;
* client and counterparty records.

## Specialist

Needs:

* Workstream-scoped documents;
* relevant findings;
* assigned reviews;
* exact legal, tax or financial evidence.

## Administrator or auditor

Needs:

* Organization records;
* membership and access events;
* approved artifacts;
* selected audit records;
* permission-aware history.

---

# 11. Primary job to be done

> When the user remembers a name, number, phrase, file or transaction concept but not its location, retrieve the correct authorized object and route them directly into its current transaction context.

## Secondary jobs

The user should also be able to:

* Switch deals quickly;
* search by filename;
* search by organization alias;
* search by identifier;
* find an exact value;
* locate a finding;
* locate a prior approval;
* find an artifact;
* search archived records;
* inspect historical versions;
* refine results;
* identify why a result matched;
* continue through a contextual action.

---

# 12. Core conceptual model

Search should separate six layers.

## Layer 1 — Query

What the user entered.

## Layer 2 — Scope

Which institution, deal or object family is allowed.

## Layer 3 — Match

Which indexed terms, aliases, fields or content matched.

## Layer 4 — Authority

Whether the user may know the object exists and inspect it.

## Layer 5 — Result

The business object presented to the user.

## Layer 6 — Destination

The exact screen, panel, version or evidence location to open.

---

# 13. Permission boundary

Search permissions must be enforced before result delivery.

The sequence should be:

```text
Query
  ↓
Authorized search scope
  ↓
Permission-filtered candidate retrieval
  ↓
Permission-safe ranking
  ↓
Permission-safe result rendering
```

Do not retrieve broadly and attempt to hide sensitive fields only in the interface.

Search authorization should account for:

* Institution;
* deal;
* workstream;
* document;
* object type;
* field;
* historical version;
* external-participant restrictions.

---

# 14. Searchable object taxonomy

Recommended searchable object families:

## Transaction identity

* Deals;
* organizations;
* legal entities;
* contacts.

## Evidence

* Documents;
* document versions;
* Dossier facts;
* evidence references.

## Analysis

* Findings;
* assumptions;
* valuation scenarios;
* candidate assessments;
* proposal terms;
* closing conditions.

## Workflow

* Tasks;
* reviews;
* approvals;
* decisions;
* material audit events.

## Outputs

* Reports;
* briefs;
* information-request packages;
* term sheets;
* closing checklists;
* audit packages.

## Actions

* Open workspace;
* create deal;
* create information request;
* ask M&Ai;
* open assigned work.

---

# 15. Two search surfaces

The product should provide two coordinated surfaces.

## Command Search

Fast modal opened from the top bar or keyboard shortcut.

Used for:

* Navigation;
* recent objects;
* quick exact matches;
* commands;
* short queries.

## Global Search page

Full workspace used for:

* Broader result sets;
* filters;
* type comparisons;
* preview;
* historical versions;
* complex queries.

Both surfaces should use the same search domain and permission logic.

---

# 16. Command Search

Recommended shortcut:

> `⌘ K` or `Ctrl K`

Recommended initial state:

```text
Search M&Ai

Recent
Project Horizon
Northbridge Automation
Customer concentration finding

Actions
Create new deal
Open my approvals
Ask M&Ai
```

After query:

```text
customer concentration

Findings
Customer concentration increased to 41,2%

Facts
Top-three customer concentration · 41,2%

Documents
Customer_Revenue_2025.xlsx

Decisions
Customer-concentration treatment approved
```

Maximum initial result count:

* Approximately 8–12 entries;
* grouped by type;
* “View all results” at the bottom.

---

# 17. Full Global Search page

The full page should support:

* Persistent query;
* scope selector;
* type tabs;
* filters;
* result list;
* result preview;
* sorting;
* history;
* exact deep links.

Recommended page title:

> **Search**

Supporting:

> Find transaction objects, evidence and decisions across your authorized workspace.

---

# 18. Entry points

Search should be accessible from:

* Global top bar;
* deal top bar;
* keyboard shortcut;
* mobile navigation;
* “Search all” links from local empty states;
* Copilot source references;
* notification context;
* Tasks & Approvals.

The query and scope should persist when the user opens the full page.

---

# 19. Query lifecycle

Recommended sequence:

```text
User enters query
  ↓
Suggestions appear
  ↓
Scope and permissions applied
  ↓
Results grouped and ranked
  ↓
User selects result
  ↓
Preview opens
  ↓
User opens exact destination
```

Search should begin suggesting after a small input threshold, but must also support:

* One-character shortcuts;
* exact identifiers;
* recently opened objects;
* command names.

---

# 20. Initial state

Before the user types, show:

## Recent

Recently opened objects.

## Pinned

User-pinned deals or organizations.

## Suggested actions

* Open my approvals;
* create deal;
* search Project Horizon;
* ask M&Ai.

## Search tips

Keep concise:

> Search by deal, company, document, value or decision.

Avoid an empty white modal with only a blinking cursor.

---

# 21. Query interpretation

Search may interpret:

* Exact names;
* aliases;
* filenames;
* identifiers;
* phrases;
* amounts;
* dates;
* workstream terms;
* deal codenames;
* natural-language intent.

Examples:

* `Project Horizon`
* `North Bridge`
* `CNPJ 12.345`
* `customer concentration`
* `R$ 42 mi`
* `approvals due today`
* `tax certificate`
* `Northbridge Round 3`

The interface should not require users to learn query syntax.

---

# 22. Exact matches

Exact matches should receive strong priority.

Examples:

* Deal codename;
* legal name;
* registration identifier;
* document filename;
* scenario version;
* proposal round;
* task ID;
* exact monetary value.

An exact identifier match should generally appear before a semantically similar document.

---

# 23. Semantic retrieval

Semantic retrieval is useful for queries such as:

> concentration risk

matching:

> Top-three customers represent 41,2% of revenue.

It should support:

* Synonyms;
* related transaction terminology;
* banker shorthand;
* normalized domain language.

However, semantic similarity should not override:

* Permissions;
* current-version state;
* exact identifiers;
* authoritative object status.

---

# 24. Typographical tolerance and aliases

Search should support:

* Minor spelling mistakes;
* punctuation variation;
* accents;
* abbreviations;
* prior organization names;
* legal-name variants;
* common file-name variation.

Example:

> `North Bridge`

may match:

> Northbridge Automation

Supporting label:

> Matched organization alias

The result should explain the alias rather than silently treating the names as identical.

---

# 25. Identifier search

Search should normalize jurisdiction-specific identifiers.

Examples:

* CNPJ with or without punctuation;
* EIN;
* company number;
* LEI;
* internal deal reference;
* document reference;
* approval reference.

Sensitive identifiers may be masked in results while still supporting exact lookup.

Example:

> Atlas Industrial S.A.
> Matched CNPJ: 12.345.678/0001-••

---

# 26. Query refinements

After the first results, offer structured refinements.

Example query:

> customer concentration

Suggested refinements:

* Project Horizon;
* Findings;
* Current versions;
* Approved decisions;
* Financial workstream.

These should appear as removable query chips.

---

# 27. Type navigation

Recommended result tabs:

1. **All**
2. **Deals & Organizations**
3. **Evidence**
4. **Analysis**
5. **Work & Decisions**
6. **Deliverables**

Avoid creating one permanent tab for every object type.

Fine-grained types belong in filters.

---

# 28. Result grouping

The All view should group results by business object.

Example:

```text
DEALS
Project Horizon

FINDINGS
Customer concentration increased to 41,2%

FACTS
Top-three customer concentration · Approved

DOCUMENTS
Customer_Revenue_2025.xlsx

DECISIONS
Customer-concentration treatment approved

ACTIONS
Open Project Horizon Diligence
Ask M&Ai about customer concentration
```

Group counts should be permission-safe.

---

# 29. Result ranking

Recommended ranking considerations:

1. Exact name or identifier match;
2. current deal context;
3. current authoritative version;
4. object title or filename match;
5. approved or active state;
6. matched business field;
7. semantic relevance;
8. recent meaningful access;
9. user responsibility;
10. archived or superseded status.

## UX rule

Do not display a generic:

> Relevance score: 93%

Use an explainable label:

> Exact filename match

or:

> Matched approved fact and current deal

---

# 30. Why this result

Each result may expose a compact explanation.

Examples:

* Exact deal codename;
* matched legal-name alias;
* found in current document version;
* matched approved Dossier fact;
* linked to selected finding;
* recently opened;
* assigned to you;
* exact identifier match.

This is particularly important for semantic or alias-based results.

---

# 31. Common result anatomy

Every result should contain:

* Object title;
* object type;
* deal or institution context;
* current state;
* matched field or excerpt;
* version or effective date;
* permission-safe metadata;
* primary destination;
* optional contextual actions.

---

# 32. Deal result

Example:

> **Project Horizon**

> Atlas Industrial · Sell-side
> Due Diligence · At risk
> R$ 480 mi–R$ 520 mi

Matched:

> Deal codename

Actions:

* Open Deal Overview;
* open Diligence;
* ask M&Ai.

---

# 33. Organization result

Example:

> **Northbridge Automation**

> Operating company · United States
> Established counterparty
> Buyer candidate · Project Horizon

Matched:

> Organization alias “North Bridge”

Actions:

* Open organization;
* open candidate assessment;
* add to deal.

---

# 34. Contact result

Example:

> **Sofia Mendes**

> Head of Corporate Development
> Northbridge Automation
> Primary contact · Project Horizon

Matched:

> Name and organization

Actions:

* Open contact;
* open organization;
* open deal role.

Sensitive contact methods should not appear unless permitted.

---

# 35. Document result

Example:

> **Customer_Revenue_2025.xlsx**

> Project Horizon · Commercial
> Version 3 · Current
> Updated 28 jul. 2026 · 09:42

Matched:

> Sheet Receita Mensal · Cells B12:M14

Actions:

* Open evidence;
* compare versions;
* view downstream impact.

---

# 36. Dossier fact result

Example:

> **Top-three customer concentration**

> Project Horizon · Target Dossier
> **41,2%** · Approved
> 2 primary sources

Matched:

> Fact label and value

Actions:

* Open fact;
* inspect evidence;
* review dependencies.

---

# 37. Finding result

Example:

> **Customer concentration increased above threshold**

> Project Horizon · Diligence
> High severity · Approved finding
> Valuation treatment under review

Matched:

> Finding title and approved fact

Actions:

* Open finding;
* inspect evidence;
* open valuation effect.

---

# 38. Valuation result

Example:

> **Risk-adjusted scenario v4**

> Project Horizon · Valuation
> R$ 438 mi–R$ 478 mi
> Under final review

Matched:

> Customer-concentration treatment

Actions:

* Open scenario;
* compare with v3;
* view approval.

---

# 39. Counterparty result

Example:

> **Northbridge Automation**

> Project Horizon · Buyer Universe
> Proposed shortlist
> Strategic buyer

Matched:

> Candidate organization

Actions:

* Open candidate assessment;
* open organization;
* review restrictions.

---

# 40. Negotiation result

Example:

> **Northbridge proposal · Round 3**

> Project Horizon · Negotiation
> R$ 472 mi EV
> 85% cash · 10% earn-out · 5% escrow

Matched:

> Round and counterparty

Actions:

* Open proposal;
* compare rounds;
* inspect term.

---

# 41. Closing result

Example:

> **Municipal tax certificate**

> Project Atlas · Closing
> Condition precedent · Blocked
> Replacement requested

Matched:

> Requirement title

Actions:

* Open condition;
* inspect evidence;
* open linked task.

---

# 42. Task or approval result

Example:

> **Approve customer-concentration treatment**

> Project Horizon · Valuation
> Assigned to Ana Costa
> Due today at 17:00 BRT

Matched:

> Approval title

Action:

> Open in Tasks & Approvals

Do not expose approval controls inside search.

---

# 43. Decision result

Example:

> **Customer-concentration treatment approved**

> Project Horizon · Valuation
> Approved by Ana Costa
> 28 jul. 2026 · 10:18

Matched:

> Decision rationale

Actions:

* View decision;
* open affected scenario;
* inspect evidence snapshot.

---

# 44. Deliverable result

Example:

> **Customer Concentration Review Package**

> Project Horizon · Draft v1
> Human review required
> Prepared 28 jul. 2026

Matched:

> Artifact title and included finding

Actions:

* Open deliverable;
* open source mission;
* view review status.

---

# 45. Audit-event result

Audit results should appear only when:

* The query is specific;
* the user selects Activity;
* the event is materially relevant;
* the user has appropriate authority.

Example:

> **Valuation approval invalidated**

> Project Horizon · Activity
> Source document changed after approval
> 28 jul. 2026 · 09:46

Do not allow low-level events to dominate normal results.

---

# 46. Action results

Search should support commands and contextual actions.

Examples:

* Open Project Horizon;
* create new deal;
* open my approvals;
* ask M&Ai about this deal;
* create information request;
* review document changes;
* open recently viewed scenario.

Actions must remain:

* Permission-aware;
* context-aware;
* explicit about consequences.

A search command should not silently execute a material write.

---

# 47. Result preview panel

Selecting a result should open a preview containing:

1. Object identity;
2. deal or institution context;
3. matched field;
4. current state;
5. version;
6. concise details;
7. related objects;
8. primary destination;
9. contextual actions.

The preview should allow triage without duplicating the complete destination screen.

---

# 48. Matched evidence preview

For evidence-backed objects, the preview should show:

* Document;
* exact page, sheet, cell or clause;
* excerpt;
* version;
* source state;
* linked fact or finding.

Example:

> `Customer_Revenue_2025.xlsx`
> Version 3 · Sheet Receita Mensal
> Cells B12:M14

A spreadsheet range or PDF clause should be highlighted where supported.

---

# 49. Current versus historical versions

Search results must distinguish:

* Current;
* historical;
* superseded;
* archived;
* removed at source;
* stale.

Default behavior:

> Show current versions first.

Historical versions may appear when:

* The query matches them strongly;
* the user selects Include historical;
* they are referenced by a decision;
* the current version no longer contains the match.

---

# 50. Superseded results

Example:

> **Risk-adjusted scenario v3**

> Superseded by scenario v4

Action:

* Open historical scenario;
* compare with current;
* view superseding decision.

Do not present a superseded object as current merely because its text matches more closely.

---

# 51. Cross-deal search

Institution-level search may retrieve across several authorized deals.

Every result must display its deal context prominently.

Example:

> **Customer concentration**

* Project Horizon · Finding;
* Project Aurora · Dossier fact;
* Project Atlas · Closing covenant.

The user should never have to infer which transaction owns the result.

---

# 52. Permission enforcement

Permissions should apply at:

* Index creation;
* query execution;
* facet generation;
* snippet generation;
* result counts;
* preview;
* destination navigation;
* search history.

A result must not be returned merely because its document text was indexed before access changed.

---

# 53. Side-channel protection

Restricted information must not leak through:

* Result counts;
* auto-complete;
* spelling suggestions;
* aliases;
* snippets;
* facets;
* query history;
* recently opened objects;
* semantic similarity;
* result timing;
* Copilot handoff.

An unauthorized user should not learn:

* That a deal exists;
* that an organization is involved;
* that a document contains a sensitive term;
* that a decision was made.

---

# 54. Restricted-result behavior

Depending on policy, the system may:

## Hide completely

No existence signal.

## Show safe placeholder

> Restricted transaction result

## Show limited identity

> Northbridge Automation · Restricted relationship

The behavior must be determined by policy, not by the search interface.

---

# 55. Search freshness

Each result should expose freshness when material.

Examples:

* Indexed 4 min ago;
* source synchronization pending;
* current through 28 jul. 2026;
* search index updating;
* historical version.

Do not imply that search is current when document processing is incomplete.

---

# 56. Indexing lifecycle

Recommended states:

```text
Source available
  ↓
Metadata indexed
  ↓
Text processed
  ↓
Structured objects indexed
  ↓
Permissions applied
  ↓
Searchable
```

Possible result states:

* Metadata only;
* partially processed;
* fully searchable;
* failed processing;
* restricted;
* removed;
* reindexing.

---

# 57. Document-search granularity

Search should support:

* Filename;
* folder path;
* metadata;
* extracted document text;
* table labels;
* spreadsheet sheet names;
* cell ranges;
* clause references;
* approved classifications.

A document match should distinguish:

> Matched filename

from:

> Matched document content

---

# 58. Spreadsheet search

Spreadsheet results should identify:

* Workbook;
* sheet;
* cell or range;
* current version;
* interpreted value;
* linked objects.

Example:

> `Management_Accounts_Jun_2026.xlsx`
> Sheet: Consolidado
> Cell M18 · Adjusted EBITDA · R$ 57,8 mi

The result should not imply that every raw cell has been semantically validated.

---

# 59. Non-text and unsupported files

Where text extraction is unavailable, search may return:

* Filename;
* metadata;
* classification;
* related structured references.

State:

> Content search unavailable

Action:

> Open original document

Search must not fabricate document content from filenames or classifications.

---

# 60. Filters and facets

Recommended filters:

## Scope

* Current deal;
* all accessible workspace;
* selected deals.

## Type

* Deal;
* organization;
* contact;
* document;
* fact;
* finding;
* valuation;
* negotiation;
* closing;
* task;
* decision;
* deliverable.

## State

* Current;
* active;
* approved;
* draft;
* historical;
* archived.

## Workstream

* Financial;
* commercial;
* legal;
* tax;
* operational;
* valuation;
* negotiation;
* closing.

## Date

* Updated;
* created;
* approved;
* effective.

## Owner or actor

* Created by;
* assigned to;
* approved by;
* relationship owner.

---

# 61. Recent searches and history

Recent searches may help repeat common navigation.

Example:

* customer concentration;
* Northbridge;
* Project Horizon valuation;
* tax certificate;
* approvals due today.

Users should be able to:

* Remove one query;
* clear history;
* disable query-history retention where policy permits.

Search history must not expose objects after access is revoked.

---

# 62. Pinned objects

Users may pin:

* Deals;
* organizations;
* documents;
* findings;
* deliverables.

Pinned objects appear in the initial Command Search state.

Pinning:

* Does not grant access;
* does not follow every notification;
* is personal by default;
* should be removed or redacted after access loss.

---

# 63. Query suggestions

Useful suggestions include:

* Recent queries;
* exact alias matches;
* object-type refinements;
* current-deal objects;
* available commands.

Avoid:

* Suggestions based on restricted activity;
* speculative confidential counterparties;
* generic popular searches;
* organization-wide search trends.

---

# 64. No-results state

Example:

> **No results for “customer renewal covenant”**

Suggestions:

* Search all accessible workspace;
* include historical versions;
* remove selected type filter;
* search documents only;
* ask M&Ai using the current scope.

Do not suggest that inaccessible results exist.

---

# 65. Partial-results state

Example:

> **Some documents are still being processed**

Available:

* Metadata results;
* approved facts;
* existing findings.

Unavailable:

* Full-text search for two recently uploaded spreadsheets.

Action:

> Review processing state

Existing results should remain usable.

---

# 66. Search service unavailable

Example:

> **Search is temporarily unavailable**

Supporting:

> Direct navigation and recent objects remain available.

Actions:

* Retry;
* open recent deal;
* use global navigation.

Do not return fabricated cached results without labeling them.

---

# 67. Offline state

Where permitted, show:

* Recent cached objects;
* recent query history;
* pinned destinations.

State:

> **Offline results**

Disable:

* New full search;
* result freshness claims;
* uncached previews;
* search-history synchronization.

---

# 68. Performance targets

Recommended product targets:

* Command suggestions should feel effectively immediate;
* exact-name and recent-object results should appear before broader content search;
* full results should progressively render;
* previews should not block the result list;
* permission validation must not be deferred.

Where slower source processing is required, show:

> Searching document content…

rather than freezing the interface.

---

# 69. Keyboard behavior

Recommended shortcuts:

* `⌘ K` / `Ctrl K`: Open search;
* `↑` / `↓`: Navigate results;
* `Enter`: Open selected result;
* `⌘ Enter` / `Ctrl Enter`: Open in new tab, where supported;
* `Tab`: Move into preview actions;
* `Esc`: Close command search;
* `/`: Focus search when no field is active.

Material actions should not have one-key execution shortcuts.

---

# 70. Responsive behavior

## Desktop

* Top-bar command field;
* full-page filters;
* result list and preview;
* keyboard-first navigation.

## Tablet

* Filters collapse;
* preview opens as drawer;
* type tabs remain horizontally scrollable;
* results retain matched excerpts.

## Mobile

Recommended order:

1. Search field;
2. scope;
3. type chips;
4. results;
5. filters;
6. recent searches.

The result preview opens full screen.

Mobile should support:

* Navigation;
* source inspection;
* quick filtering;
* opening tasks or decisions.

Complex historical-version comparison remains desktop-first.

---

# 71. Accessibility requirements

Global Search should support:

* Combobox semantics;
* correct active-descendant behavior;
* accessible result groups;
* keyboard navigation;
* visible focus;
* result-count announcements;
* controlled live-region updates;
* descriptive result types;
* explicit current and historical labels;
* accessible highlighted excerpts;
* minimum 44 × 44 px touch targets;
* no color-only match or state;
* focus restoration after closing search;
* readable shortcut descriptions;
* accessible filter chips.

Do not announce every result as the user types.

Use:

> 12 results across five categories

after the result set stabilizes.

---

# 72. UI design direction

## Overall character

Aim for:

> **A transaction-native command layer combining fast navigation with evidence-grade retrieval**

The experience should feel:

* Fast;
* precise;
* controlled;
* structured;
* permission-aware;
* context-rich;
* quiet.

It should not feel:

* Like a public search engine;
* like an AI prompt page;
* like a file-storage search;
* like a technical database query tool.

---

# 73. Visual hierarchy

Prioritize:

1. Search query;
2. scope;
3. result title;
4. object type;
5. deal context;
6. matched field;
7. current state;
8. destination.

Do not prioritize:

* Search score;
* indexing technology;
* model name;
* raw embeddings;
* long excerpts.

---

# 74. Color application

Use the M&Ai palette:

* Canvas Cream: `#F3F0EE`
* Lifted Cream: `#FCFBFA`
* Ink Black: `#141413`
* Signal Orange: `#CF4500`
* Light Signal Orange: `#F37338`
* Dust Taupe: `#D1CDC7`
* Slate Gray: `#696969`

Semantic use:

* Selected result: restrained Ink or cream contrast;
* query match: subtle warm highlight;
* current object: neutral-positive;
* historical: gray;
* restricted: dark neutral;
* processing: blue-neutral;
* stale: amber;
* unavailable: red-orange.

Do not assign a different bright color to every result type.

---

# 75. Typography

Use **Sofia Sans**.

| Element               |     Size |  Weight |
| --------------------- | -------: | ------: |
| Search input          | 16–18 px | 500–600 |
| Page title            | 26–30 px | 500–600 |
| Result title          | 14–16 px | 650–700 |
| Selected result title | 19–23 px | 600–700 |
| Result context        | 12–14 px | 450–550 |
| Matched excerpt       | 13–15 px | 450–500 |
| Group heading         | 11–12 px |     700 |
| Metadata              | 11–13 px | 450–550 |
| Status                | 11–12 px | 650–700 |

Use tabular figures for:

* Monetary values;
* percentages;
* dates;
* document versions;
* proposal rounds;
* identifiers.

Use pt-BR formatting:

* `R$ 438 mi–R$ 478 mi`
* `41,2%`
* `28 jul. 2026 · 09:42`

---

# 76. Geometry and density

Recommended:

* Command palette width: 640–760 px;
* command result row: 48–60 px;
* full-page result row: 64–84 px;
* filter rail: 220–260 px;
* preview panel: 360–440 px;
* 6–10 px surface radius;
* thin dividers;
* restrained shadows.

Avoid:

* Large search hero;
* oversized input taking half the screen;
* one large card per result;
* excessive whitespace;
* decorative AI gradients.

---

# 77. Figma component architecture

Figma mapping: planned in MAI-91 in the governed file
`otMJE31OKIxdXogV4RNbGQ`, using the approved Application Shell area as the
navigation and component context. The intended design area covers command
search, the full `/search` page, deal-scoped search, filters, result preview,
restricted/no-result states, safe destination routing, and mobile search/detail
behavior.

## `GlobalSearchControl`

Properties:

* Global;
* deal scoped;
* focused;
* query;
* loading;
* unavailable.

## `CommandSearch`

States:

* Initial;
* suggestions;
* results;
* no results;
* partial;
* offline.

## `SearchScope`

Properties:

* Current deal;
* institution;
* selected deals;
* restricted.

## `SearchResultGroup`

Properties:

* Deals;
* organizations;
* evidence;
* analysis;
* workflow;
* outputs;
* actions.

## `SearchResultRow`

Properties:

* Deal;
* organization;
* contact;
* document;
* fact;
* finding;
* scenario;
* proposal;
* condition;
* task;
* decision;
* artifact;
* historical;
* restricted.

## `SearchMatchReason`

Properties:

* Exact;
* alias;
* content;
* identifier;
* semantic;
* recent;
* assigned.

## `SearchResultState`

Properties:

* Current;
* draft;
* approved;
* stale;
* historical;
* superseded;
* archived;
* processing;
* restricted.

## `SearchPreview`

Properties:

* Identity;
* evidence;
* analysis;
* workflow;
* deliverable;
* unavailable.

## `MatchedEvidence`

Properties:

* PDF;
* spreadsheet;
* document;
* fact;
* decision;
* unsupported.

## `SearchFilters`

Properties:

* Default;
* applied;
* collapsed;
* mobile.

## `SearchTypeTabs`

* All;
* identity;
* evidence;
* analysis;
* work;
* deliverables.

## `SearchEmptyState`

Properties:

* Initial;
* no results;
* inaccessible;
* service error;
* offline.

---

# 78. Production object model

## `SearchQuery`

```text
id
membershipId
institutionId
queryText
normalizedQuery
scopeType
scopeIds
filterSnapshot
createdAt
completedAt
resultCount
```

## `SearchIndexRecord`

```text
id
institutionId
dealId
objectType
objectId
objectVersion
title
subtitle
searchableText
structuredFields
aliases
effectiveState
accessPolicyReference
sourceUpdatedAt
indexedAt
removedAt
```

## `SearchResult`

```text
queryId
indexRecordId
objectType
objectId
objectVersion
matchType
matchedFields
matchedExcerpt
resultState
destination
rankBucket
explanation
```

## `SearchAlias`

```text
id
objectType
objectId
alias
aliasType
effectiveFrom
effectiveTo
reviewState
createdAt
```

## `SearchRecentObject`

```text
id
membershipId
objectType
objectId
objectVersion
lastOpenedAt
accessValidatedAt
```

## `SearchPinnedObject`

```text
id
membershipId
objectType
objectId
pinnedAt
```

## `SearchIndexJob`

```text
id
institutionId
dealId
sourceType
sourceId
status
recordsAdded
recordsUpdated
recordsRemoved
startedAt
completedAt
error
```

Search should reference canonical domain objects rather than creating independent copies of transaction truth.

---

# 79. Suggested routes

Primary:

```text
/search
```

Query:

```text
/search?q=customer+concentration
```

Deal-scoped:

```text
/search?q=customer+concentration&scope=deal&deal=:dealId
```

Type-filtered:

```text
/search?q=northbridge&type=organization,proposal
```

Historical versions:

```text
/search?q=valuation&includeHistorical=true
```

Selected result:

```text
/search?q=customer+concentration&result=:resultId
```

The search route should preserve the query when the user returns from a destination.

---

# 80. API direction

Recommended endpoints:

```text
GET    /api/search
GET    /api/search/suggestions
GET    /api/search/recent
GET    /api/search/pinned
POST   /api/search/pinned
DELETE /api/search/pinned/:id
DELETE /api/search/recent
GET    /api/search/index-status
```

Query parameters should support:

* Query text;
* scope;
* deal;
* object type;
* state;
* workstream;
* date;
* historical inclusion;
* pagination;
* selected result.

The API should return permission-safe:

* Results;
* facets;
* counts;
* excerpts;
* destinations;
* partial-index warnings.

---

# 81. Repository direction

The repository already provides local search and filtering patterns within some screen families, including organizations and deal lists.

The final product needs a canonical cross-domain search service.

## Keep

* Existing route-aware navigation;
* local search components;
* table filtering;
* deal and organization APIs;
* document references;
* citations;
* stable object IDs;
* permission context.

## Add

* Global search index;
* business-object search schema;
* deal-scoped search;
* exact destination mapping;
* aliases;
* full-text evidence indexing;
* current-version ranking;
* result previews;
* recent and pinned objects;
* permission-safe facets;
* partial-index states;
* index-update events.

## Replace

### Local-only top-bar behavior

Add one consistent command-search control across institution and deal shells.

### Generic text results

Return typed domain objects with:

* Context;
* state;
* version;
* match reason;
* destination.

### Technical result language

Avoid:

* Vector result;
* embedding score;
* RAG chunk;
* engine record.

Use:

* Finding;
* document;
* approved fact;
* valuation scenario;
* decision.

---

# 82. What not to include

Avoid:

* Search as a primary sidebar item;
* unrestricted cross-deal retrieval;
* raw relevance scores;
* raw vector matches;
* technical chunks;
* hidden scope expansion;
* generated answers without citations;
* historical objects presented as current;
* restricted results leaking through counts;
* full sensitive excerpts in suggestions;
* auto-execution of material commands;
* every audit event in ordinary results;
* stale results without state;
* fabricated document content;
* one universal search result layout;
* real client data in mock fixtures.

---

# 83. MOCKED — Product and demo specification

## Purpose

The mocked Global Search screen should demonstrate that M&Ai searches the **transaction graph**, not only filenames.

Its narrative is:

> **A single query retrieves the source document, approved fact, active finding, valuation impact and human decision connected to the same transaction issue.**

This screen is well suited to a live demo.

It is moderately useful in an architecture or product-depth slide, but should not replace the Diligence Decision Room as the primary hero.

---

# 84. Mocked shell state

Institution:

> **Atlas M&A Advisory**

User:

> **Ana Costa · Vice President**

Scope:

> **All accessible workspace**

Search query:

> **customer concentration**

Header:

* 12 results;
* 5 object types;
* current versions first.

---

# 85. Mocked results

## Finding — selected

> **Customer concentration increased above threshold**

> Project Horizon · Diligence
> High severity · Approved finding
> Top three customers: **41,2%**

Matched:

> Finding title and approved Dossier fact

---

## Dossier fact

> **Top-three customer concentration**

> Project Horizon · Target Dossier
> **41,2%** · Approved
> 2 primary sources

---

## Document

> **Customer_Revenue_2025.xlsx**

> Project Horizon · Documents
> Version 3 · Current
> Sheet Receita Mensal · Cells B12:M14

---

## Valuation scenario

> **Risk-adjusted scenario v4**

> Project Horizon · Valuation
> **R$ 438 mi–R$ 478 mi**
> Midpoint impact: **−R$ 42 mi**

---

## Decision

> **Customer-concentration treatment approved**

> Project Horizon · Valuation
> Approved by Ana Costa
> 28 jul. 2026 · 10:18

---

## Deliverable

> **Customer Concentration Review Package**

> Project Horizon · Draft v1
> Human review required

---

# 86. Mocked selected-result preview

Title:

> **Customer concentration increased above threshold**

Context:

> Project Horizon · Diligence

State:

> High severity · Approved finding

Observation:

> Top-three customer concentration increased from 39,8% to 41,2%.

Threshold:

> 35,0%

Evidence:

> `Customer_Revenue_2025.xlsx`
> Version 3 · Receita Mensal · B12:M14

Valuation impact:

> R$ 438 mi–R$ 478 mi
> Midpoint movement: −R$ 42 mi

Primary action:

> **Open finding**

Secondary:

* Inspect evidence;
* open valuation impact;
* ask M&Ai.

---

# 87. Alternative mocked query

Query:

> **Northbridge**

Results:

* Northbridge Automation — Organization;
* Project Horizon buyer-candidate record;
* Northbridge proposal Round 3;
* Sofia Mendes — Contact;
* Northbridge term sheet v2;
* Project Meridian historical buyer role.

This demonstrates entity resolution and transaction-specific roles without merging them.

---

# 88. Recommended static composition

```text
┌──────────────────────────────────────────────────────────────────┐
│ Search: customer concentration · 12 results                     │
├───────────────────────────────┬──────────────────────────────────┤
│ Results                       │ Selected finding                 │
│                               │                                  │
│ Finding                       │ Project Horizon · Diligence      │
│ Customer concentration        │                                  │
│ 41,2% · High                  │ 39,8% → 41,2%                   │
│                               │ Threshold: 35,0%                 │
│ Fact                          │                                  │
│ Top-three concentration       │ Evidence                         │
│ 41,2% · Approved              │ Customer_Revenue_2025.xlsx       │
│                               │ Receita Mensal · B12:M14         │
│ Document                      │                                  │
│ Customer_Revenue_2025.xlsx    │ Valuation impact                 │
│                               │ −R$ 42 mi midpoint              │
│ Decision                      │                                  │
│ Treatment approved            │ [ Open finding ]                 │
└───────────────────────────────┴──────────────────────────────────┘
```

This communicates that the search result is a connected transaction object rather than a text fragment.

---

# 89. Pitch-specific simplification

## Keep visible

* Search query;
* Project Horizon;
* finding;
* approved fact;
* document;
* decision;
* 41,2%;
* exact spreadsheet cells;
* −R$ 42 mi;
* Open finding.

## Hide

* Complete filters;
* recent searches;
* technical index state;
* historical results;
* all 12 results;
* raw excerpts;
* search preferences;
* keyboard shortcuts.

## Readability requirement

At deck scale, these should remain readable:

* **customer concentration**
* **41,2%**
* **Customer_Revenue_2025.xlsx**
* **B12:M14**
* **−R$ 42 mi**
* **Treatment approved**
* **Open finding**

---

# 90. Recommended demo flows

## Flow A — Search to evidence

```text
⌘ K
  ↓
Search “customer concentration”
  ↓
Select Dossier fact
  ↓
Inspect spreadsheet cells
  ↓
Open Target Dossier
```

## Flow B — Search across transaction graph

```text
Search “customer concentration”
  ↓
Finding
  ↓
Valuation scenario
  ↓
Approval decision
  ↓
Open exact workflow context
```

## Flow C — Organization alias

```text
Search “North Bridge”
  ↓
Alias match displayed
  ↓
Open Northbridge Automation
  ↓
Review active transaction roles
```

## Flow D — Deal-scoped search

```text
Project Horizon
  ↓
Search this deal
  ↓
“tax credit”
  ↓
Document, finding, information request and closing condition
```

## Flow E — Historical version

```text
Search scenario v3
  ↓
Historical result
  ↓
Superseded by v4
  ↓
Compare versions
```

## Flow F — Copilot handoff

```text
Search results selected
  ↓
Ask M&Ai about these results
  ↓
Explain valuation movement
  ↓
Citations preserved
```

---

# 91. UX prototype tasks to validate

Test whether users can:

1. Find Project Horizon by codename.
2. Find Atlas Industrial by legal name.
3. Find an organization by CNPJ.
4. Find a document by filename.
5. Find a document using a phrase inside it.
6. Find an approved Dossier fact.
7. find the associated diligence finding.
8. locate the valuation consequence.
9. find the approval decision.
10. determine which result is current.
11. open a historical version.
12. switch between deal and institution scope.
13. identify why a semantic result matched.
14. search an organization alias.
15. filter to documents only.
16. include archived records.
17. open the exact spreadsheet range.
18. distinguish Search from Copilot.
19. use a contextual action.
20. return to the same result set after opening a destination.
21. identify partial indexing.
22. handle a restricted or redacted result safely.

---

# 92. Design validation criteria

Global Search is ready when:

1. Search is accessible from every internal screen.
2. Global and deal scope are always explicit.
3. Search returns objects and actions, not only text fragments.
4. Exact matches receive appropriate priority.
5. Current versions rank above superseded versions.
6. Historical results are clearly labeled.
7. Every result identifies its deal or institution context.
8. Every result identifies its object type.
9. Semantic matches expose why they matched.
10. Aliases remain distinguishable from canonical names.
11. Identifier lookup supports jurisdictional formats.
12. Document matches expose exact location where possible.
13. Facts, findings and decisions remain separate objects.
14. Search does not generate unsupported answers.
15. Copilot handoff preserves selected context.
16. Permission checks occur before result presentation.
17. Restricted information cannot leak through counts or suggestions.
18. Search history respects access changes.
19. Partial processing is visible.
20. Search service failure does not block direct navigation.
21. Keyboard navigation is complete.
22. Screen-reader announcements remain controlled.
23. Mobile supports search, filtering and source navigation.
24. Search remains useful without semantic retrieval.
25. Search remains useful without Copilot.
26. The full page does not resemble a public web-search engine.
27. The command palette remains fast and compact.
28. Material commands require their normal controlled workflows.
29. The pitch fixture remains fictional.
30. Every result has a valid destination or a clear unavailable state.

---

# 93. Final design target

The correct design target is not:

> “A search bar for finding files.”

It is:

> **A permission-aware transaction retrieval layer that connects names, evidence, analysis, decisions and actions while preserving deal scope, version authority and confidentiality.**

Its defining interaction is:

> **Search the remembered concept → identify the authoritative object → verify why it matched → inspect the evidence and state → open the exact transaction context**

**Next iteration: Deal Activity & Audit.**
