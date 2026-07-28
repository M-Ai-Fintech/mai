---
canonical_name: "Deal Settings & Archive"
definition_id: "BD-23"
definition_status: "Governed for MAI-90"
screen_family: "deal-governance"
owning_task: "MAI-93"
canonical_routes:
  - "/deals/:dealId/settings"
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
# Deal Settings & Archive

## 1. Recommended product naming

Use:

* **Deal navigation:** `Deal Settings`
* **Page title:** `Deal Settings & Archive`
* **Business configuration:** `Deal Configuration`
* **Operational suspension:** `Pause Deal`
* **Unsuccessful conclusion:** `Terminate Mandate`
* **Successful conclusion:** `Transaction Completed`
* **Administrative preservation:** `Archive Deal`
* **Permanent-removal workflow:** `Deletion Request`
* **Retention control:** `Data Retention`
* **Configuration history:** `Settings History`
* **Configuration version:** `Deal Configuration Version`
* **Administrative risk area:** `Controlled Actions`

Use **Controlled Actions** as the visible section name rather than the more consumer-oriented “Danger Zone.”

The canonical architecture defines this screen as the location for deal metadata, currency, jurisdiction, workflow template, review thresholds, retention, connected sources, archive behavior, pause or termination, deletion requests and access reviews. Materially destructive actions must be strongly controlled.

---

# 2. Screen definition

**Deal Settings & Archive** is the transaction-specific administrative workspace where authorized users maintain the deal’s operating configuration and control its administrative lifecycle.

It manages:

* Deal identity and metadata;
* transaction type and side;
* primary organizations and transaction perimeter;
* currency and valuation basis;
* jurisdictions and time zone;
* confidentiality classification;
* workflow template;
* workstream configuration;
* materiality and escalation thresholds;
* approval-routing settings;
* connected document sources;
* deal-level automation boundaries;
* access-review schedule;
* retention policy;
* pause, termination and archive behavior;
* deletion requests;
* configuration history.

It should answer:

1. **What is the authoritative administrative configuration of this deal?**
2. **Which currency, jurisdiction and time zone govern its workspace?**
3. **Which workflow template and thresholds are currently active?**
4. **Which connected sources supply its evidence?**
5. **Which settings are inherited from the institution?**
6. **Which changes require approval?**
7. **What would be affected by changing a setting?**
8. **Can the deal be paused, terminated or archived safely?**
9. **Which records will be retained after archive?**
10. **Is a legal hold or other restriction active?**
11. **Can a deletion request be submitted?**
12. **Who changed the configuration, and when?**

Its central operating sequence is:

> **Inspect current configuration → Propose change → Review affected workflows and data → Approve material change → Apply versioned configuration → Preserve audit history**

For lifecycle controls:

> **Assess deal state → Resolve or acknowledge dependencies → Authorize lifecycle action → Freeze or transition workspace → Preserve transaction record**

---

# 3. Primary intention

## Operational intention

Provide one controlled location for the administrative settings that determine how the transaction operates.

## User intention

A Deal Lead or administrator should be able to say:

> “I know which configuration governs this transaction, what a proposed change will affect and whether the deal is ready to be paused, terminated or archived.”

## Product intention

Deal Settings should prevent consequential configuration from being dispersed across:

* Ad hoc database fields;
* workflow screens;
* role assignments;
* integration settings;
* hidden engine parameters;
* administrator-only APIs.

The page should expose business-relevant controls without exposing raw platform internals.

---

# 4. Strategic product role

Deal Settings & Archive is the deal’s administrative control plane.

It establishes the rules beneath the visible transaction workflow:

```text
Deal configuration
  ↓
Workflow and workstreams
  ↓
Evidence and calculation behavior
  ↓
Review and approval routing
  ↓
Access and external participation
  ↓
Retention and archive behavior
```

The workspace is not a core analytical differentiator, but it is necessary for:

* Consistent deal creation;
* transaction governance;
* configuration transparency;
* source control;
* defensible approval routing;
* retention;
* administrative closure;
* safe destruction requests.

It belongs in the deal-level **More** menu with Activity & Audit, Deal Team & Access and Deliverables rather than the primary transaction-phase navigation.

---

# 5. What Deal Settings & Archive is not

The screen should not become:

* A general institution-settings page;
* a raw environment-variable editor;
* an agent prompt editor;
* a model-selection interface;
* a complete integration-administration console;
* a role-policy designer;
* a deal-progress dashboard;
* a document-management screen;
* an unrestricted database editor;
* a collection of immediate destructive buttons;
* a route around Closing;
* a replacement for Deal Team & Access;
* a legal opinion about retention requirements;
* an instant deletion control;
* a place to change approved transaction facts.

The central question is not:

> “Which technical parameters can the administrator modify?”

It is:

> **“Which governed business settings control this deal, and how may they be changed without compromising its evidence, workflow or history?”**

---

# 6. Relationship to adjacent screens

| Screen                         | Primary responsibility                                                   |
| ------------------------------ | ------------------------------------------------------------------------ |
| **Deal Settings & Archive**    | Maintains deal-specific configuration and administrative lifecycle       |
| **Institution Settings**       | Defines institution-wide defaults                                        |
| **Templates & Playbooks**      | Defines reusable workflow and threshold templates                        |
| **Roles & Permissions**        | Defines institution-level permission and approval policies               |
| **Integrations**               | Connects and administers external systems                                |
| **Security & Data Governance** | Defines institution-level data, model, encryption and retention policies |
| **Deal Team & Access**         | Applies transaction-specific participant access                          |
| **Documents & Evidence**       | Operates connected sources and document processing                       |
| **Activity & Audit**           | Records configuration and lifecycle changes                              |
| **Closing Control Room**       | Controls legal and operational completion                                |
| **Deals Portfolio**            | Displays active, paused, completed, terminated and archived deals        |
| **Tasks & Approvals**          | Routes material settings and lifecycle decisions                         |

---

# 7. Deal settings versus institution settings

## Institution Settings

Defines defaults and allowed boundaries.

Examples:

* Default transaction currency;
* supported jurisdictions;
* default retention policy;
* permitted workflow templates;
* mandatory approval policies;
* allowed document connectors;
* default confidentiality classification.

## Deal Settings

Applies or overrides those defaults for one transaction where policy permits.

Examples:

* Project Horizon uses BRL;
* Brazil is the primary transaction jurisdiction;
* Sell-side Mid-Market Playbook v3 applies;
* a R$ 5 mi financial materiality threshold applies;
* the deal uses one Papermark source;
* the archive retention period begins after archive.

## UX rule

Every deal setting should identify whether it is:

* Inherited;
* customized;
* mandatory;
* locked by institution policy;
* temporarily excepted.

---

# 8. Deal settings versus Target Dossier

Deal Settings contains administrative identity.

Target Dossier contains evidence-backed transaction facts.

## Appropriate Deal Settings data

* Codename;
* transaction type;
* deal side;
* primary currency;
* workflow template;
* confidentiality;
* connected source;
* Deal Lead.

## Appropriate Target Dossier data

* Revenue;
* EBITDA;
* ownership structure;
* products;
* customers;
* operating locations;
* transaction-specific interpretations.

Changing Deal Settings must not overwrite approved Dossier facts.

---

# 9. Deal settings versus Deal Overview

## Deal Overview

Explains current transaction state and immediate attention.

## Deal Settings

Defines underlying administrative configuration.

Example:

Deal Overview:

> Project Horizon · Due Diligence · Active

Deal Settings:

> Status: Active
> Workflow template: Sell-side Mid-Market v3
> Primary currency: BRL
> Time zone: America/Sao_Paulo

The Overview may link to settings, but should not expose complete administrative controls.

---

# 10. Deal settings versus Closing

Closing owns:

* Conditions precedent;
* signature status;
* funds flow;
* closing authorization;
* legal completion.

Deal Settings owns:

* Pausing the workspace;
* recording mandate termination;
* archiving after completion;
* retention;
* deletion requests.

A user should not mark a transaction legally completed through Deal Settings merely to remove it from active views.

---

# 11. Business state versus administrative state

These should remain separate.

## Business state

What happened to the transaction?

* In progress;
* completed;
* withdrawn;
* terminated;
* lost;
* abandoned.

## Administrative state

How is the workspace operated?

* Active;
* paused;
* read only;
* archived;
* deletion requested;
* under legal hold.

Example:

> Business outcome: Transaction completed
> Administrative state: Active workspace

The team may continue preparing the closing binder before archiving.

---

# 12. Primary users

## 12.1 Deal Lead

Needs to:

* Review configuration;
* approve material changes;
* change workflow where justified;
* pause or terminate a deal;
* initiate archive;
* confirm unresolved exceptions.

## 12.2 Vice President

Needs to:

* Maintain metadata;
* configure workstreams;
* review thresholds;
* coordinate source settings;
* prepare archive readiness.

## 12.3 Deal Administrator

Needs to:

* Apply templates;
* maintain source connections;
* administer retention;
* coordinate access review;
* execute approved lifecycle transitions.

## 12.4 Security or Data-Governance Administrator

Needs to:

* Review retention exceptions;
* place or remove legal holds;
* authorize deletion;
* validate source disconnection;
* review high-risk settings changes.

## 12.5 Partner or Managing Director

Needs:

* Transaction status;
* workflow policy;
* material thresholds;
* termination and archive approval;
* administrative outcome.

## 12.6 Auditor

Needs:

* Configuration versions;
* change rationale;
* approval records;
* retention policy;
* archive snapshot;
* deletion history.

Ordinary external participants should not access this workspace.

---

# 13. Primary job to be done

> When a transaction’s operating rules or administrative state must change, provide a controlled workflow that shows the current configuration, affected dependencies, required authority and preserved historical record.

## Secondary jobs

The user should also be able to:

* Rename the deal;
* update its codename;
* change the Deal Lead;
* configure a time zone;
* change permitted workflow options;
* update thresholds;
* review source connections;
* schedule an access review;
* inspect inherited policies;
* pause and resume the deal;
* record termination;
* prepare archive;
* reopen an archived deal;
* request deletion;
* inspect settings history.

---

# 14. Core conceptual model

The screen should separate eight layers.

## Layer 1 — Deal identity

Codename, title, transaction type and organizations.

## Layer 2 — Operating context

Currency, jurisdiction, dates, time zone and confidentiality.

## Layer 3 — Workflow configuration

Template, workstreams, milestones and escalation rules.

## Layer 4 — Governance configuration

Materiality, review and approval thresholds.

## Layer 5 — Source and automation configuration

Connected sources, synchronization and permitted automated behavior.

## Layer 6 — Access governance

Review schedule and required access posture.

## Layer 7 — Administrative lifecycle

Pause, resume, terminate, complete, archive and reopen.

## Layer 8 — Retention and disposition

Retention, legal hold, deletion request and final disposition.

---

# 15. Recommended workspace structure

Use structured sub-navigation rather than one long form.

Recommended views:

1. **Overview**
2. **Transaction**
3. **Workflow & Governance**
4. **Sources & Automation**
5. **Retention & Archive**
6. **Controlled Actions**
7. **Settings History**

## Overview

Current configuration and required attention.

## Transaction

Deal identity, commercial context, currencies and jurisdictions.

## Workflow & Governance

Template, workstreams, thresholds, milestones and approvals.

## Sources & Automation

Connected evidence sources and deal-specific automation boundaries.

## Retention & Archive

Retention policy, archive readiness and archived behavior.

## Controlled Actions

Pause, termination, reopening and deletion requests.

## Settings History

Versioned configuration changes and lifecycle events.

The broader product architecture likewise requires Settings areas to use structured sub-navigation rather than one excessively long page. 

---

# 16. Page header

## Recommended title

> **Deal Settings & Archive**

Supporting description:

> Manage Project Horizon configuration, connected sources and administrative lifecycle.

## Header summary

Example:

* **Configuration v8**
* **3 customized settings**
* **1 policy exception**
* **Archive not ready**

## Primary action

Adapt to state:

* **Review proposed changes**
* **Save configuration**
* **Prepare archive**
* **Resolve policy exception**

## Secondary actions

* View settings history;
* export configuration summary.

Destructive actions should not appear in the page header.

---

# 17. Overview composition

The Overview should contain:

1. **Deal configuration summary**
2. **Inherited policies**
3. **Customized settings**
4. **Connected sources**
5. **Governance thresholds**
6. **Access-review state**
7. **Archive readiness**
8. **Recent configuration changes**

It should not display generic system-health metrics.

---

# 18. Configuration summary

Example:

> **Project Horizon**

* Sell-side transaction;
* primary currency: BRL;
* primary jurisdiction: Brazil;
* time zone: America/Sao_Paulo;
* workflow: Sell-side Mid-Market v3;
* confidentiality: Internal Restricted;
* document source: Papermark;
* Deal Lead: Marina Alves.

State:

> Configuration version 8 · Effective 25 July 2026

---

# 19. Configuration edit mode

The screen should distinguish:

## Current configuration

Effective and read-only by default.

## Proposed configuration

Draft changes not yet applied.

## Scheduled configuration

Approved changes with a future effective date.

## Historical configuration

Prior immutable versions.

Users should not make consequential settings changes through uncontrolled inline editing.

---

# 20. Save behavior

Routine metadata changes may save immediately after validation.

Material configuration changes should require:

1. Change summary;
2. impact analysis;
3. rationale;
4. required approval;
5. effective time;
6. version creation.

Example:

> **Proposed configuration v9**

Changes:

* Financial materiality: R$ 3 mi → R$ 5 mi;
* Valuation escalation threshold: 3% → 5%;
* Legal workstream added.

Affected:

* 12 open findings;
* 3 pending reviews;
* one workflow routing rule.

---

# 21. Transaction identity

Recommended fields:

* Deal codename;
* internal title;
* optional external title;
* transaction type;
* transaction side;
* primary target;
* buyer or seller organization;
* client organization;
* transaction perimeter;
* Deal Lead;
* creation date;
* mandate reference.

---

# 22. Codename

The codename should remain the principal internal transaction identifier.

Example:

> **Project Horizon**

Changing it should:

* Preserve the prior codename as a searchable alias;
* update future display;
* preserve historical exports and citations;
* create an audit event;
* avoid renaming already distributed files silently.

Example:

> Previous codename: Project Atlas
> Current codename: Project Horizon

---

# 23. Internal and external titles

## Internal title

May contain internal context.

Example:

> Atlas Industrial Sell-side

## External title

Must be safe for approved external use.

Example:

> Strategic Transaction Workspace

External invitations and notification emails should use the external title when the codename is restricted.

---

# 24. Transaction type and side

Recommended transaction types:

* Acquisition;
* divestiture;
* merger;
* capital raise;
* joint venture;
* refinancing;
* restructuring;
* other.

Recommended side:

* Buy-side;
* sell-side;
* bilateral;
* neutral advisor;
* other.

Changing type or side after deal creation is material because it may affect:

* Navigation terminology;
* workflow template;
* required workstreams;
* matching label;
* approval policy;
* deliverable templates;
* transaction roles.

---

# 25. Transaction-type change

A type change should require an impact preview.

Example:

> **Change Sell-side to Bilateral?**

Affected:

* Buyer Universe will become Counterparties;
* seller-specific outreach workflow will be disabled;
* three deliverable templates require review;
* existing candidate records remain preserved;
* workflow template requires migration.

The system should never delete incompatible objects automatically.

---

# 26. Transaction perimeter

The perimeter identifies which organization or legal entities are included in the contemplated transaction.

Recommended fields:

* Primary organization;
* included legal entities;
* excluded entities;
* included business units;
* perimeter state;
* approved by;
* effective date.

The perimeter is administrative context here.

Evidence supporting the perimeter belongs in the Target Dossier.

---

# 27. Deal Lead

The current Deal Lead should be visible and editable by authorized users.

Changing the Deal Lead may affect:

* Approval routing;
* access administration;
* escalation ownership;
* client communication;
* external sponsorship;
* archive authorization.

The change should use Team Workspace and Deal Team data rather than a free-text field.

---

# 28. Currency model

Distinguish:

## Transaction currency

The currency principally used to describe transaction value.

Example:

> BRL

## Reporting currency

The currency used in selected internal reports.

Example:

> BRL

## Source currencies

Currencies used in evidence or calculations.

Examples:

* BRL;
* USD;
* EUR.

## UX rule

Changing the transaction currency must not convert existing values automatically without an approved FX basis.

---

# 29. Currency settings

Recommended fields:

* Primary transaction currency;
* permitted source currencies;
* reporting currency;
* FX source policy;
* FX date policy;
* rounding policy;
* display units.

Example:

> Primary currency: BRL
> Display unit: R$ mi
> Decimal precision: 1
> FX conversion: Explicit approved rate required

---

# 30. Currency-change impact

Example:

> **Change primary currency from BRL to USD?**

The system should state:

* Existing BRL values remain unchanged;
* no automatic conversion will occur;
* valuation scenarios require explicit USD versions;
* deliverable templates must be reviewed;
* historical versions remain in BRL.

A cosmetic display change must remain distinguishable from an economic conversion.

---

# 31. Jurisdiction model

Recommended fields:

* Primary transaction jurisdiction;
* target incorporation jurisdiction;
* governing-law jurisdiction;
* material operating jurisdictions;
* regulatory jurisdictions;
* tax jurisdictions.

Do not reduce a multinational transaction to one universal “Country” field.

---

# 32. Jurisdiction-change impact

Changing jurisdiction may affect:

* Required workstreams;
* legal and tax playbooks;
* document requests;
* approval policy;
* retention;
* terminology;
* external specialists.

The system should present these as proposed workflow changes, not as legal conclusions.

---

# 33. Time zone

Recommended:

> America/Sao_Paulo · BRT

The deal time zone should govern:

* Deadline display;
* milestone cutoffs;
* notification timing;
* closing sequence;
* audit summaries;
* export timestamps.

Historical audit events should retain their precise original timestamps.

---

# 34. Date conventions

Recommended deal-level configuration:

* Date format inherited from user locale;
* authoritative time zone;
* business-day calendar;
* optional holiday calendar;
* closing-day cutoff.

The screen should not imply that a business-day calendar replaces legal interpretation of contractual deadlines.

---

# 35. Confidentiality classification

Recommended levels:

* Internal;
* internal restricted;
* client confidential;
* clean-team restricted;
* legally privileged;
* counterparty confidential;
* highly restricted.

This setting establishes a default.

Specific documents and zones may remain more restrictive.

---

# 36. Confidentiality-change impact

Reducing confidentiality should require stronger control than increasing it.

Example:

> **Change Internal Restricted to Client Confidential?**

Impact:

* Does not automatically authorize client access;
* does not release internal findings;
* deliverables require audience-specific approval;
* restricted zones remain unchanged.

Confidentiality classification and participant access are related but not identical.

---

# 37. Workflow template

The active workflow template should define:

* Workstreams;
* standard phases;
* required responsibilities;
* default milestones;
* review gates;
* approval requirements;
* standard information requests;
* default deliverables;
* archive prerequisites.

Example:

> **Sell-side Mid-Market v3**

Source:

> Atlas M&A Advisory Playbooks

Effective:

> 10 July 2026

Customization:

> Three deal-specific overrides

---

# 38. Template versioning

A deal should preserve the exact template version used.

A later institution update should not silently alter an active transaction.

When a new version becomes available, offer:

* Keep current template;
* review upgrade;
* apply selected changes;
* defer;
* dismiss for this deal.

---

# 39. Template upgrade comparison

Example:

| Configuration            | Current v3 | Available v4             |
| ------------------------ | ---------- | ------------------------ |
| Tax review               | Optional   | Required above R$ 300 mi |
| Buyer shortlist approval | Deal Lead  | Deal Lead + Client       |
| Closing readiness        | 8 controls | 11 controls              |
| External access review   | Quarterly  | At phase transition      |

The user should select which compatible changes to apply.

---

# 40. Template migration

A migration should preserve:

* Existing objects;
* completed work;
* historical approvals;
* current responsibilities;
* exceptions.

It may create:

* New tasks;
* missing workstreams;
* additional reviews;
* future milestones.

It must not silently mark existing work compliant with newly added requirements.

---

# 41. Workstream configuration

Recommended workstreams:

* Deal Management;
* Financial;
* Commercial;
* Legal;
* Tax;
* Operational;
* Technology;
* Human Resources;
* Environmental;
* Valuation;
* Counterparty Process;
* Negotiation;
* Closing.

Each may be:

* Required;
* optional;
* not applicable;
* deferred;
* custom.

---

# 42. Disabling a workstream

Before disabling a workstream, show:

* Existing documents;
* facts;
* findings;
* tasks;
* assignments;
* approvals;
* deliverables.

Options:

* Keep historical work read-only;
* move active work;
* mark not applicable with rationale;
* cancel change.

Workstream data should never be silently deleted.

---

# 43. Materiality thresholds

Thresholds should determine:

* Which issues require escalation;
* which findings need senior review;
* which valuation changes require approval;
* which document changes reopen work;
* which exports require release authorization.

They should not determine whether a fact is true.

---

# 44. Threshold categories

Recommended:

* Financial materiality;
* valuation movement;
* customer concentration;
* tax exposure;
* litigation exposure;
* working-capital variance;
* net-debt variance;
* proposal deviation;
* closing-condition criticality;
* document-change impact;
* access-risk threshold.

---

# 45. Example deal thresholds

For the fictional Project Horizon fixture:

| Threshold                    |                                  Value |
| ---------------------------- | -------------------------------------: |
| Financial materiality        |                            **R$ 5 mi** |
| Senior financial escalation  |                           **R$ 15 mi** |
| Valuation-treatment approval | **R$ 25 mi or 5,0% midpoint movement** |
| Customer concentration       |                              **35,0%** |
| Working-capital variance     |                            **R$ 3 mi** |
| Closing blocker              |     Any unsatisfied critical condition |

These are deal-specific fictional settings, not universal M&A standards.

---

# 46. Threshold state

Each threshold should show:

* Value;
* unit;
* scope;
* source template;
* customization;
* approver;
* effective date;
* affected objects.

Example:

> **Financial materiality: R$ 5 mi**

Inherited from:

> Sell-side Mid-Market v3

Customized:

> No

---

# 47. Threshold-change behavior

The user should choose how a threshold change affects existing work.

Options:

## Future items only

Existing classifications remain historically valid.

## Re-evaluate open items

Open items are recalculated or reclassified.

## Re-evaluate all current items

Current approved objects are marked for review where affected.

A preview must show the impact before applying.

---

# 48. No silent retroactive reclassification

Changing customer concentration from 35,0% to 45,0% must not silently remove a previously approved high-severity finding.

Instead:

> Threshold changed
> Existing finding marked for governance review
> Historical decision remains preserved

---

# 49. Review policies

Deal-level review configuration may define:

* Required reviewer role;
* number of reviewers;
* independent review;
* client approval;
* specialist review;
* due-date policy;
* escalation.

The underlying authority policy remains in Roles & Permissions.

---

# 50. Approval-routing configuration

Example:

> **Final valuation scenario**

Required:

1. Financial Reviewer;
2. Deal Lead.

Conditional:

> Client Principal approval required before external use.

The deal setting applies the configured workflow.

It should not grant authority directly to a named user.

Named assignments belong in Deal Team & Access.

---

# 51. Milestone configuration

Recommended milestones:

* VDR opened;
* initial Dossier review;
* diligence committee;
* valuation committee;
* shortlist approval;
* first outreach;
* indication deadline;
* exclusivity;
* signing;
* closing;
* archive review.

Each milestone should have:

* Target date;
* owner;
* time zone;
* required predecessors;
* escalation policy.

---

# 52. Deadline and escalation policy

Settings may define:

* Reminder timing;
* overdue escalation;
* critical-deadline escalation;
* recipient role;
* quiet-hour treatment;
* external reminders.

Avoid allowing users to disable all critical closing alerts without policy review.

---

# 53. Connected sources

The Sources & Automation view should summarize:

* Connected document sources;
* manual uploads;
* external submission portals;
* email ingestion, when supported;
* source state;
* synchronization mode;
* last successful sync;
* permission scope.

Detailed source operation belongs in Documents & Evidence.

---

# 54. Connected-source row

Example:

> **Papermark — Project Horizon VDR**

State:

> Connected

Scope:

> Root folder and 12 subfolders

Synchronization:

> Manual and scheduled daily

Last successful sync:

> 28 July 2026 · 09:42 BRT

Access owner:

> Felipe Rocha

Action:

> Open source controls

---

# 55. Source connection versus imported data

Disconnecting a source should not automatically delete previously synchronized evidence.

The system should distinguish:

## Disconnect

Stops future synchronization.

## Remove local source copies

Deletes retained copies where policy permits.

## Remove source references

Breaks document dependencies and requires impact review.

## Delete external source

Not normally possible from M&Ai unless explicitly supported and authorized.

---

# 56. Source disconnection impact

Before disconnecting, show:

* Documents synchronized;
* current source versions;
* approved facts relying on the source;
* open processing jobs;
* generated deliverables;
* retention requirement;
* external participants.

Example:

> **Disconnect Papermark?**

Future synchronization will stop.

Existing:

* 127 documents;
* 34 approved facts;
* 18 findings;
* 5 deliverables;

will remain preserved according to retention policy.

---

# 57. Synchronization configuration

Recommended business-facing settings:

* Manual sync allowed;
* scheduled sync;
* change-detection mode;
* removed-document handling;
* processing-failure escalation;
* archive behavior.

Avoid technical controls such as:

* Queue size;
* worker count;
* embedding model;
* chunk size.

---

# 58. Removed-source handling

Recommended options:

* Preserve historical source version;
* mark affected evidence unavailable;
* notify object owners;
* create review tasks;
* prohibit automatic deletion.

A removed VDR document should not disappear silently from an approved decision snapshot.

---

# 59. Automation boundaries

Deal-specific settings may control permitted automated behavior.

Recommended controls:

* Document classification;
* fact extraction;
* change detection;
* draft finding generation;
* deterministic calculation;
* draft information requests;
* draft deliverables;
* automatic task creation.

Prohibited by default:

* Automatic fact approval;
* automatic valuation approval;
* autonomous external outreach;
* autonomous negotiation response;
* automatic closing authorization;
* autonomous deletion.

---

# 60. Automation state

Each capability should show:

* Enabled;
* disabled;
* inherited;
* restricted by zone;
* approval required;
* unavailable.

Example:

> **Draft finding generation**

Enabled

Constraint:

> Outputs require human review before entering Diligence.

---

# 61. Restricted-zone processing

The settings summary should identify whether restricted zones permit:

* Deterministic calculation;
* extraction;
* generative summaries;
* broader downstream outputs.

Detailed zone membership and policy remains in Deal Team & Access.

Example:

> Financial Clean Team
> Deterministic calculation permitted
> Generative output restricted to zone members

---

# 62. External-action safeguards

The configuration should state:

> External actions always require human authorization.

This applies to:

* Requests;
* outreach;
* proposal transmission;
* deliverable distribution;
* closing instructions.

Do not provide an “autonomous mode” toggle for consequential external actions.

---

# 63. Access-review schedule

Deal settings may configure when access reviews occur.

Recommended triggers:

* Quarterly;
* transaction-phase transition;
* external-access renewal;
* before signing;
* before closing;
* before archive;
* after Deal Lead change;
* after confidentiality change.

Execution belongs in Deal Team & Access.

---

# 64. Archive-access review

Before archive, the system should require an access disposition review.

Review:

* Internal participants;
* external participants;
* secure links;
* external portals;
* temporary access;
* clean-team zones;
* active sessions;
* pending invitations.

Recommended archive default:

> Revoke external access and convert internal workspace to read only.

---

# 65. Deal lifecycle states

Recommended business and administrative states:

## Active

Normal transaction operations.

## Paused

Work is temporarily suspended.

## Completed

The transaction reached its recorded business completion.

## Terminated

The mandate or transaction ended without completion.

## Archived

Workspace preserved in read-only administrative storage.

## Deletion requested

Permanent-removal workflow is active.

These states should not be collapsed into one `status` value without preserving their distinct semantics.

---

# 66. Pause Deal

Pausing should be used when:

* The client delays the process;
* market conditions interrupt activity;
* required information is unavailable;
* internal authorization is pending;
* the mandate is temporarily suspended.

Pause is reversible.

It is not a business outcome.

---

# 67. Pause configuration

The pause flow should require:

* Reason category;
* effective date;
* expected review date;
* treatment of open tasks;
* treatment of deadlines;
* external participant behavior;
* source synchronization behavior;
* communication note;
* approving authority.

---

# 68. Pause effects

Recommended defaults:

* New workflow escalations stop;
* open tasks remain visible;
* due dates may be frozen or retained explicitly;
* new external invitations are blocked;
* outbound external actions are disabled;
* scheduled source sync may continue or be paused;
* audit recording continues;
* read access remains according to policy.

The user should review these effects before confirmation.

---

# 69. Pause confirmation

Example:

> **Pause Project Horizon**

Reason:

> Client requested a temporary process suspension.

Effective:

> 31 July 2026

Review date:

> 31 August 2026

Effects:

* External outreach disabled;
* open deadlines frozen;
* VDR synchronization continues weekly;
* existing client access retained;
* running calculations allowed to finish.

Primary action:

> Submit pause for approval

---

# 70. Resume Deal

Resuming should require:

* Effective date;
* updated milestones;
* source resynchronization;
* access review;
* stale-work review;
* responsible owner.

Example:

> **Resume readiness**

* VDR synchronization required;
* two expired external users;
* four deliverables stale;
* valuation scenario requires review.

---

# 71. Transaction Completed

Completion should ordinarily originate from Closing Control Room after:

* Closing authorization;
* legal completion;
* required evidence;
* funds-flow state;
* completion decision.

Deal Settings may display the outcome and provide an administrative override only to highly authorized users.

An override should require:

* Rationale;
* evidence;
* secondary approval;
* audit annotation.

---

# 72. Terminate Mandate

Termination records that the transaction or engagement ended without completion.

Recommended reasons:

* Client withdrew;
* counterparty withdrew;
* mandate expired;
* commercial terms failed;
* financing unavailable;
* regulatory issue;
* diligence issue;
* market conditions;
* strategic change;
* other controlled reason.

Do not use “Delete deal” to represent termination.

---

# 73. Termination flow

Required review:

1. Business outcome;
2. effective date;
3. client communication state;
4. open work disposition;
5. external participant disposition;
6. source synchronization;
7. deliverable status;
8. fees or commercial record, where applicable;
9. retention;
10. archive plan.

---

# 74. Termination effects

Recommended:

* Deal becomes read only except for closure administration;
* outbound workflow actions stop;
* external access is reviewed;
* open approvals are cancelled or preserved as unresolved;
* active secure links are reviewed;
* a final outcome record is created;
* archive may be scheduled.

Termination should not erase work or imply failure by the team.

---

# 75. Archive Deal

Archiving is an administrative preservation action.

It should:

* Remove the deal from active operational views;
* preserve evidence, decisions and history;
* make the workspace read only;
* stop normal workflow execution;
* apply retention policy;
* revoke or reduce external access;
* preserve authorized historical exports;
* record an archive snapshot.

Archiving is not deletion.

---

# 76. Archive eligibility

Recommended prerequisites:

* Deal is paused, completed or terminated;
* running missions are stopped or completed;
* source synchronization state is known;
* pending approvals are resolved or explicitly preserved;
* open tasks are closed, transferred or accepted as unresolved;
* external access has a disposition;
* secure distributions have been reviewed;
* retention policy is known;
* legal hold state is known;
* final archive authority is available.

---

# 77. Archive readiness

Recommended states:

* Ready;
* ready with acknowledged exceptions;
* review required;
* blocked;
* unavailable.

Example:

> **Archive not ready**

Blocking:

* One active document synchronization;
* two pending approvals;
* one external participant without access disposition;
* retention policy requires confirmation.

---

# 78. Archive-readiness checklist

Recommended controls:

1. Business outcome recorded;
2. current deal state confirmed;
3. running execution resolved;
4. open work reviewed;
5. external access reviewed;
6. connected sources reviewed;
7. secure links reviewed;
8. deliverables classified;
9. audit package optionally generated;
10. retention confirmed;
11. legal hold checked;
12. archive approval completed.

---

# 79. Archive with exceptions

An authorized Deal Lead may archive with unresolved non-critical work.

The exception should state:

* Unresolved object;
* reason;
* owner;
* historical state;
* consequence;
* approving authority.

Example:

> Six information requests remained unanswered at mandate termination.

They remain historically open but no longer generate reminders.

---

# 80. Archive snapshot

The archive operation should capture:

* Deal configuration;
* business outcome;
* phase and status;
* participant and access state;
* connected sources;
* approved Dossier version;
* active findings;
* valuation state;
* negotiation state;
* closing state;
* deliverable register;
* open and resolved work;
* audit coverage;
* retention policy.

The snapshot should be immutable.

---

# 81. Archived workspace behavior

An archived deal should be:

* Read only;
* searchable according to access;
* available in archived portfolio views;
* available for audit export;
* protected by retention;
* clearly labeled.

Disabled:

* New agent missions;
* source synchronization;
* edits;
* new tasks;
* new approvals;
* external outreach;
* new distribution.

Authorized administrative annotations may remain possible where policy allows.

---

# 82. Reopen or unarchive

Reopening should require:

* Business reason;
* new active owner;
* access review;
* source reconnection review;
* workflow-template review;
* stale-output review;
* new effective date;
* approval.

Previously revoked external access must not reactivate automatically.

---

# 83. Reopen effects

A reopened deal should create a new configuration version.

It may require:

* New milestones;
* refreshed evidence;
* new approval routing;
* new external invitations;
* updated retention trigger;
* renewed commercial authorization.

Historical archive state remains preserved.

---

# 84. Data retention

Retention should identify:

* Policy source;
* retained data categories;
* retention-start event;
* retention period;
* planned disposition;
* legal hold;
* exceptions;
* reviewer.

Example:

> **Retention policy**

> Atlas Standard Transaction Retention
> Seven years after archive
> Inherited from institution policy

This is a fictional configured policy, not a universal legal requirement.

---

# 85. Retention categories

Possible categories:

* Source documents;
* extracted evidence;
* approved facts;
* findings;
* calculations;
* decisions;
* audit events;
* messages;
* deliverables;
* access history;
* external submissions;
* user-identifying metadata.

Different categories may have different disposition rules.

---

# 86. Retention policy inheritance

The screen should show:

> **Institution policy · Locked**

or:

> **Deal override approved**

A deal should not shorten mandatory retention through a routine settings edit.

---

# 87. Retention start event

Possible triggers:

* Deal archive;
* mandate termination;
* legal completion;
* last external distribution;
* institution-defined event.

The selected trigger should be explicit.

Example:

> Retention begins when the deal is archived.

---

# 88. Retention disposition

Possible outcomes:

* Retain complete record;
* retain metadata only;
* anonymize personal data;
* delete selected source copies;
* permanently delete eligible records;
* transfer to legal hold;
* manual review required.

Do not use one generic “Delete after X years” control for every data class.

---

# 89. Legal hold

A legal hold should:

* Prevent applicable deletion;
* prevent retention reduction;
* preserve relevant exports;
* record authority;
* identify scope;
* remain permission-controlled.

Visible state:

> **Legal hold active**

Detailed reason may remain restricted.

---

# 90. Legal-hold behavior

The screen should show:

* Hold state;
* scope;
* placed by;
* placed at;
* review date;
* affected deletion requests.

Removing a hold should require appropriate authority and create a separate audit event.

---

# 91. Connected sources after archive

Recommended default:

* Stop synchronization;
* preserve imported versions;
* preserve source metadata;
* revoke connector tokens where configured;
* retain historical citations;
* record final source checkpoint.

The archive flow should not delete evidence merely to reduce integration cost.

---

# 92. Deletion Request

Permanent deletion should be a governed request, not an immediate button.

Recommended states:

1. Draft;
2. impact assessment;
3. submitted;
4. approval pending;
5. waiting period;
6. scheduled;
7. on hold;
8. executing;
9. completed;
10. rejected;
11. cancelled.

---

# 93. Deletion eligibility

A request may be blocked by:

* Active deal;
* legal hold;
* mandatory retention;
* open investigation;
* unresolved client obligation;
* active external distribution;
* insufficient authority;
* incomplete archive;
* related institution record;
* unsupported integration state.

---

# 94. Deletion impact assessment

The assessment should identify:

* Documents;
* evidence references;
* facts;
* findings;
* calculations;
* decisions;
* audit events;
* deliverables;
* external links;
* organization associations;
* personal data;
* retained metadata;
* irreversible consequences.

---

# 95. Deletion-request confirmation

Example:

> **Request deletion of Project Horizon**

This request may permanently remove eligible transaction data after approval and retention review.

It will not:

* Override an active legal hold;
* bypass mandatory retention;
* erase records that policy requires to remain;
* remove external files already downloaded.

Required entry:

> Type `PROJECT HORIZON` to continue

This typed confirmation supplements—not replaces—authority and approval controls.

---

# 96. Deletion approvals

Recommended approvals may include:

* Deal Lead;
* institution administrator;
* security or data-governance administrator;
* legal or compliance reviewer;
* client authorization, where contractually required.

The requester should not be the sole approver.

---

# 97. Waiting period

A deletion request may include a configurable waiting period to permit:

* Cancellation;
* audit export;
* legal review;
* source disconnection;
* notification of affected owners.

The waiting period must be policy-driven.

---

# 98. Export before deletion

Before deletion, the system may require or offer:

* Final audit package;
* source manifest;
* decision register;
* retention manifest;
* deletion authorization record.

Export does not itself authorize deletion.

---

# 99. Deletion completion

Completion should record:

* Request;
* approvals;
* scope;
* excluded records;
* execution time;
* retained metadata;
* deletion verifier;
* limitations;
* disposition manifest.

The system should never state “everything deleted” unless that claim is technically verified.

---

# 100. Controlled Actions hierarchy

Recommended order from less to more consequential:

1. Pause deal;
2. resume deal;
3. record completion override;
4. terminate mandate;
5. archive deal;
6. reopen archived deal;
7. request deletion.

Actions should not appear as equal red buttons.

---

# 101. Destructive-action safeguards

Material actions should require:

* Appropriate permission;
* impact preview;
* typed or explicit confirmation;
* rationale;
* dependency review;
* secondary approval where required;
* immutable audit event;
* idempotent execution.

---

# 102. Action separation

Do not place these actions in one confirmation dialog.

Each has different semantics:

| Action         | Reversible      | Data preserved    | Normal workflow active |
| -------------- | --------------- | ----------------- | ---------------------- |
| Pause          | Yes             | Yes               | No                     |
| Terminate      | Limited         | Yes               | No                     |
| Archive        | Yes, controlled | Yes               | No                     |
| Delete request | Until execution | Depends on policy | No                     |

---

# 103. Configuration impact graph

A material settings change should expose affected objects.

Example:

```text
Financial materiality R$ 3 mi → R$ 5 mi
  ↓
12 open findings re-evaluated
  ↓
3 severity labels may change
  ↓
2 pending approvals need updated scope
  ↓
1 committee brief may become stale
```

The graph should distinguish predicted impact from completed impact.

---

# 104. Proposed-change comparison

Before applying a material configuration change, show:

| Setting               | Current   | Proposed         |
| --------------------- | --------- | ---------------- |
| Financial materiality | R$ 3 mi   | R$ 5 mi          |
| Valuation escalation  | 3,0%      | 5,0%             |
| Tax workstream        | Optional  | Required         |
| Access review         | Quarterly | Phase transition |

Supporting:

> 17 current objects may require review.

---

# 105. Effective dates

Configuration changes may be:

* Immediate;
* scheduled;
* effective at phase transition;
* effective after approval;
* effective on resume.

Historical objects should retain the configuration version that governed them.

---

# 106. Concurrent editing

The current configuration must use optimistic concurrency or another safe version mechanism.

Example:

> **Configuration changed while you were editing**

Changed by Marina Alves:

* Deal Lead;
* external-access review trigger.

Your draft:

* financial materiality;
* workflow template.

Actions:

* Compare;
* reload;
* reapply non-conflicting changes.

---

# 107. Settings History

The history should contain:

* Configuration version;
* change summary;
* changed by;
* approved by;
* effective date;
* rationale;
* affected objects;
* rollback or supersession state.

The authoritative immutable events also belong in Activity & Audit.

---

# 108. Rollback

A prior configuration may be used as the basis for a new version.

The system should not delete intervening versions.

Example:

> **Create configuration v10 using values from v7**

The user must still review:

* Current compatibility;
* affected objects;
* current institution policy;
* required approvals.

---

# 109. Contextual Copilot

Suggested prompts:

* Summarize the current deal configuration.
* Which settings differ from the institution template?
* What would change if financial materiality increased to R$ 5 mi?
* Is Project Horizon ready to archive?
* Which external participants must be reviewed before archive?
* Explain the retention policy.
* Which source connections remain active?
* Why is deletion currently blocked?
* Compare configuration versions 7 and 8.
* Prepare the archive-readiness summary.

## Response requirements

The Copilot should:

* Distinguish current from proposed configuration;
* cite settings versions and policies;
* explain inheritance;
* identify downstream impact;
* avoid changing settings directly;
* never perform a destructive action;
* route material changes through approval.

---

# 110. Recommended desktop layout

For a **1440 × 900** canvas:

| Region                  | Approximate width |
| ----------------------- | ----------------: |
| Compact global sidebar  |          72–80 px |
| Deal context navigation |        112–136 px |
| Settings navigation     |        220–260 px |
| Main settings canvas    |        680–820 px |
| Context or impact panel |        320–400 px |
| Page padding            |          24–32 px |

## Recommended composition

```text
┌────────┬──────────────────────────────────────────────────────────────┐
│ Global │ Project Horizon · Deal Settings & Archive                  │
│ shell  ├──────────────────────────────────────────────────────────────┤
│        │ Configuration v8 · 3 customized · Archive not ready        │
│        ├──────────────┬─────────────────────────┬─────────────────────┤
│        │ Settings     │ Transaction             │ Configuration       │
│        │              │                         │ summary             │
│        │ Overview     │ Codename                │                     │
│        │ Transaction  │ Project Horizon         │ Sell-side           │
│        │ Workflow     │                         │ BRL                 │
│        │ Sources      │ Primary currency        │ Brazil              │
│        │ Retention    │ BRL                     │ Workflow v3         │
│        │ Actions      │                         │                     │
│        │ History      │ Jurisdiction            │ Archive blockers    │
│        │              │ Brazil                  │ 4                   │
│        │              │                         │                     │
│        │              │ Workflow template       │ [ Review readiness ]│
│        │              │ Sell-side Mid-Market v3 │                     │
└────────┴──────────────┴─────────────────────────┴─────────────────────┘
```

---

# 111. Retention & Archive layout

```text
┌──────────────────────────────────────────┬───────────────────────────┐
│ Retention policy                         │ Archive readiness         │
│                                          │                           │
│ Atlas Standard Transaction Retention     │ Not ready                 │
│ 7 years after archive                    │                           │
│ Inherited · Locked                       │ 2 pending approvals       │
│                                          │ 1 external access review  │
│ Legal hold                               │ 1 active synchronization  │
│ None                                     │                           │
│                                          │ Ready                     │
│ Sources after archive                    │ Business outcome recorded │
│ Stop sync · Preserve imported versions   │ Retention confirmed       │
│                                          │                           │
│ External access                          │ [ Prepare archive ]       │
│ Revoke at archive                        │                           │
└──────────────────────────────────────────┴───────────────────────────┘
```

---

# 112. Controlled Actions layout

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Controlled Actions                                                   │
├──────────────────────────────────────────────────────────────────────┤
│ Pause deal                                                           │
│ Temporarily suspend workflow and external actions.                   │
│                                                     [ Review pause ] │
├──────────────────────────────────────────────────────────────────────┤
│ Terminate mandate                                                    │
│ Record that the transaction ended without legal completion.         │
│                                                 [ Review termination]│
├──────────────────────────────────────────────────────────────────────┤
│ Archive deal                                                        │
│ Preserve the workspace as read-only after readiness review.          │
│ 4 blockers                                              [ Disabled ] │
├──────────────────────────────────────────────────────────────────────┤
│ Request deletion                                                     │
│ Permanent-removal workflow subject to retention and legal hold.      │
│ Active deal and retention policy currently block request.            │
└──────────────────────────────────────────────────────────────────────┘
```

---

# 113. Responsive behavior

## Desktop — 1280 px and above

* Persistent settings navigation;
* two-column configuration layout;
* impact panel;
* full lifecycle readiness checklists.

## Tablet — 768–1279 px

* Settings navigation collapses;
* impact panel becomes drawer;
* tables reduce metadata;
* destructive actions remain full-width and isolated.

## Mobile — below 768 px

Recommended order:

1. Configuration attention;
2. transaction identity;
3. workflow summary;
4. connected sources;
5. retention;
6. archive readiness;
7. controlled actions;
8. history.

Mobile may support:

* Routine metadata edits;
* reviewing configuration;
* pause approval;
* urgent source disconnection.

Template migration, archive preparation and deletion requests remain desktop-first.

---

# 114. UI design direction

## Overall character

Aim for:

> **A restrained transaction-control panel where configuration and lifecycle actions are explicit, versioned and difficult to perform accidentally**

The screen should feel:

* Administrative;
* controlled;
* exact;
* policy-aware;
* consequence-aware;
* calm;
* auditable.

It should not feel:

* Like a technical configuration console;
* like a consumer account-settings page;
* like a collection of red warning cards;
* like a wizard for deleting data.

---

# 115. Visual hierarchy

Prioritize:

1. Current effective configuration;
2. inherited versus customized settings;
3. pending proposed changes;
4. policy exceptions;
5. archive readiness;
6. retention;
7. controlled lifecycle actions;
8. technical metadata.

Do not prioritize:

* Raw IDs;
* integration secrets;
* model parameters;
* infrastructure region;
* number of settings.

---

# 116. Color application

Use the established M&Ai palette:

* Canvas Cream: `#F3F0EE`
* Lifted Cream: `#FCFBFA`
* Ink Black: `#141413`
* Signal Orange: `#CF4500`
* Light Signal Orange: `#F37338`
* Dust Taupe: `#D1CDC7`
* Slate Gray: `#696969`

## Semantic use

* Inherited: neutral;
* customized: blue-neutral;
* proposed change: Signal Orange;
* policy exception: amber;
* archive ready: green;
* archive blocked: Signal Orange;
* paused: blue-gray;
* terminated: dark neutral;
* archived: gray;
* legal hold: deep red;
* deletion request: red.

Do not color every Controlled Action red.

---

# 117. Typography

Use **Sofia Sans**.

| Element              |     Size |  Weight |
| -------------------- | -------: | ------: |
| Page title           | 26–30 px | 500–600 |
| Settings-group title | 17–20 px | 600–700 |
| Field label          | 12–13 px | 650–700 |
| Field value          | 14–16 px | 500–600 |
| Section title        | 15–18 px | 650–700 |
| Body                 | 13–15 px | 450–500 |
| Metadata             | 11–13 px | 450–550 |
| Warning title        | 14–16 px | 650–700 |
| Version              | 12–13 px | 600–700 |

Use tabular numerals for:

* Thresholds;
* currency values;
* percentages;
* dates;
* versions;
* retention periods.

Use pt-BR formatting:

* `R$ 5 mi`
* `5,0%`
* `28 jul. 2026 · 10:18 BRT`

---

# 118. Geometry and density

Recommended:

* Setting section surfaces: 6–10 px radius;
* fields: 44–52 px;
* controlled-action rows: 72–96 px;
* impact table rows: 40–48 px;
* restrained dividers;
* minimal shadows;
* generous separation before deletion controls.

Avoid:

* One card per field;
* switches for destructive actions;
* tiny inline delete links;
* giant warning banners;
* bright red page backgrounds;
* hidden overflow actions for archive or deletion.

---

# 119. Accessibility requirements

The screen should support:

* Semantic settings navigation;
* proper form labels;
* accessible inherited and locked states;
* keyboard operation;
* visible focus;
* no color-only policy states;
* accessible impact comparisons;
* clear destructive-action descriptions;
* minimum 44 × 44 px controls;
* explicit confirmation-dialog titles;
* announced validation errors;
* focus restoration after cancellation;
* accessible archive-readiness checklist;
* clear current versus proposed versions;
* complete confirmation text for screen readers.

Avoid:

> Save

Prefer:

> Save Project Horizon configuration v9

Avoid:

> Delete

Prefer:

> Submit Project Horizon deletion request

---

# 120. System states

## 120.1 Complete configuration

> **Configuration current**

No material issues.

## 120.2 Incomplete configuration

Show exact missing settings.

Example:

* Primary jurisdiction missing;
* retention policy unresolved;
* Deal Lead not assigned.

## 120.3 Proposed changes

Show draft version and affected objects.

## 120.4 Approval pending

Current configuration remains active.

## 120.5 Configuration conflict

Two settings are incompatible.

Example:

> Client Portal enabled while external participation is prohibited.

## 120.6 Template update available

Show comparison; do not auto-upgrade.

## 120.7 Source unavailable

Keep configuration accessible and block unsafe source changes.

## 120.8 Policy locked

Explain the institution policy and route to authorized administration.

## 120.9 Exception expired

Show affected setting and required action.

## 120.10 Deal paused

Settings remain available according to authority.

## 120.11 Deal terminated

Permit archive preparation and final administrative updates.

## 120.12 Archive blocked

Show all blockers.

## 120.13 Archived

Read-only configuration and controlled reopen action.

## 120.14 Legal hold

Block deletion and retention reduction.

## 120.15 Deletion pending

Freeze incompatible configuration changes.

## 120.16 Concurrent edit

Compare versions before applying.

## 120.17 Partial service failure

Example:

> Retention service unavailable

Routine metadata remains viewable, but archive and deletion actions are disabled.

## 120.18 Offline

Allow safe cached review.

Disable:

* Configuration writes;
* lifecycle transitions;
* source changes;
* retention changes;
* deletion requests.

---

# 121. Figma component architecture

## `DealSettingsHeader`

Properties:

* Current;
* proposed;
* approval pending;
* policy exception;
* paused;
* archived.

## `DealSettingsNavigation`

* Overview;
* transaction;
* workflow;
* sources;
* retention;
* controlled actions;
* history.

## `ConfigurationSummary`

Properties:

* Inherited;
* customized;
* incomplete;
* conflict;
* historical.

## `SettingsField`

Properties:

* Editable;
* read only;
* inherited;
* locked;
* customized;
* proposed;
* invalid.

## `SettingsSection`

Properties:

* Default;
* changed;
* warning;
* blocked;
* collapsed.

## `ConfigurationVersion`

Properties:

* Current;
* draft;
* scheduled;
* superseded;
* rejected.

## `ConfigurationImpact`

Properties:

* Workflow;
* threshold;
* access;
* source;
* deliverable;
* archive.

## `TemplateVersion`

Properties:

* Current;
* update available;
* customized;
* incompatible;
* historical.

## `ThresholdEditor`

Properties:

* Monetary;
* percentage;
* count;
* date;
* state;
* locked.

## `SourceSettings`

Properties:

* Connected;
* degraded;
* disconnected;
* archive pending;
* restricted.

## `AutomationBoundary`

Properties:

* Enabled;
* disabled;
* review required;
* zone restricted;
* unavailable.

## `RetentionPolicy`

Properties:

* Inherited;
* customized;
* locked;
* legal hold;
* review required.

## `ArchiveReadiness`

Properties:

* Ready;
* exception;
* blocked;
* checking;
* archived.

## `LifecycleAction`

Properties:

* Pause;
* resume;
* complete;
* terminate;
* archive;
* reopen;
* deletion request.

## `LifecycleActionFlow`

States:

* Impact;
* dependencies;
* disposition;
* authority;
* confirmation;
* pending;
* completed;
* failed.

## `DeletionRequestFlow`

States:

* Eligibility;
* impact;
* retained records;
* approvals;
* waiting period;
* confirmation;
* submitted;
* blocked.

## `SettingsHistory`

Properties:

* Configuration;
* lifecycle;
* source;
* retention;
* exception;
* deletion.

---

# 122. Production object model

## `DealConfiguration`

```text
id
dealId
version
state
effectiveFrom
supersededAt
createdBy
createdAt
approvedBy
approvedAt
changeSummary
rationale
```

## `DealIdentityConfiguration`

```text
id
dealConfigurationId
codename
internalTitle
externalTitle
transactionType
transactionSide
primaryOrganizationId
clientOrganizationId
transactionPerimeterId
dealLeadParticipantId
mandateReference
```

## `DealOperatingContext`

```text
id
dealConfigurationId
primaryCurrency
reportingCurrency
permittedSourceCurrencies
fxPolicyId
roundingPolicy
displayUnits
primaryJurisdiction
governingLawJurisdiction
taxJurisdictions
timezone
businessCalendarId
confidentialityLevel
```

## `DealWorkflowConfiguration`

```text
id
dealConfigurationId
workflowTemplateId
workflowTemplateVersion
enabledWorkstreams
disabledWorkstreams
milestonePolicy
escalationPolicyId
accessReviewPolicyId
customizationSummary
```

## `DealThresholdConfiguration`

```text
id
dealConfigurationId
thresholdType
scopeType
scopeId
value
unit
currency
sourceType
sourceId
effectiveBehavior
approvalPolicyId
```

## `DealSourceConfiguration`

```text
id
dealConfigurationId
sourceConnectionId
sourceType
scope
syncMode
syncSchedule
removedSourcePolicy
processingFailurePolicy
archivePolicy
status
```

## `DealAutomationConfiguration`

```text
id
dealConfigurationId
capabilityType
state
allowedScope
restrictedZoneIds
approvalBoundary
externalActionAllowed
sourcePolicy
```

## `DealConfigurationChange`

```text
id
dealId
baseConfigurationVersion
proposedConfigurationVersion
changes
impactAssessment
rationale
state
submittedBy
submittedAt
approvedBy
approvedAt
effectiveAt
```

## `DealLifecycleRecord`

```text
id
dealId
businessState
administrativeState
effectiveAt
reasonCategory
rationale
authorizedBy
sourceObjectType
sourceObjectId
createdAt
```

## `DealPause`

```text
id
dealId
reasonCategory
effectiveFrom
reviewAt
taskPolicy
deadlinePolicy
sourceSyncPolicy
externalAccessPolicy
state
requestedBy
approvedBy
resumedAt
```

## `DealTermination`

```text
id
dealId
terminationType
effectiveAt
reasonCategory
rationale
clientCommunicationState
openWorkDisposition
externalAccessDisposition
archivePlan
approvedBy
createdAt
```

## `DealArchive`

```text
id
dealId
archiveSnapshotId
readinessState
exceptionIds
externalAccessDisposition
sourceDisposition
secureLinkDisposition
retentionPolicyId
archivedBy
archivedAt
reopenedBy
reopenedAt
state
```

## `DealArchiveSnapshot`

```text
id
dealId
configurationVersion
businessStateSnapshot
dealStateSnapshot
participantSnapshot
sourceSnapshot
dossierSnapshot
diligenceSnapshot
valuationSnapshot
negotiationSnapshot
closingSnapshot
deliverableSnapshot
workSnapshot
auditCoverageSnapshot
createdAt
checksum
```

## `DealRetentionAssignment`

```text
id
dealId
retentionPolicyId
policySource
retentionStartEvent
retentionStartAt
plannedDispositionAt
overrideState
legalHoldState
reviewedBy
reviewedAt
```

## `DealLegalHold`

```text
id
dealId
scope
state
placedBy
placedAt
reviewAt
releasedBy
releasedAt
restrictedReason
```

## `DealDeletionRequest`

```text
id
dealId
state
requestedScope
impactAssessment
retainedRecordPolicy
waitingPeriodEndsAt
requestedBy
requestedAt
approvalIds
scheduledAt
startedAt
completedAt
cancelledAt
completionManifestId
```

## `DealDeletionManifest`

```text
id
deletionRequestId
deletedCategories
retainedCategories
excludedRecords
executionSummary
verificationState
verifiedBy
verifiedAt
checksum
createdAt
```

## `DealSettingsEvent`

```text
id
dealId
configurationVersion
eventType
actorType
actorId
beforeSnapshot
afterSnapshot
rationale
occurredAt
```

---

# 123. Suggested routes

Primary:

```text
/deals/:dealId/settings
```

Transaction:

```text
/deals/:dealId/settings?view=transaction
```

Workflow:

```text
/deals/:dealId/settings?view=workflow
```

Sources:

```text
/deals/:dealId/settings?view=sources
```

Retention:

```text
/deals/:dealId/settings?view=retention
```

Controlled Actions:

```text
/deals/:dealId/settings?view=actions
```

History:

```text
/deals/:dealId/settings?view=history
```

Proposed configuration:

```text
/deals/:dealId/settings/changes/:changeId
```

Pause:

```text
/deals/:dealId/settings/pause
```

Terminate:

```text
/deals/:dealId/settings/terminate
```

Archive:

```text
/deals/:dealId/settings/archive
```

Reopen:

```text
/deals/:dealId/settings/reopen
```

Deletion request:

```text
/deals/:dealId/settings/deletion-requests/:requestId
```

The canonical route hierarchy already reserves `/deals/:dealId/settings` for this workspace. 
Archive, reopen, pause, terminate and deletion-request routes are controlled
subflows under that canonical Deal Settings workspace; they do not create
separate top-level deal workspaces.

---

# 124. API direction

Recommended endpoints:

```text
GET    /api/deals/:dealId/configuration
POST   /api/deals/:dealId/configuration-changes
GET    /api/deals/:dealId/configuration-changes/:changeId
POST   /api/deals/:dealId/configuration-changes/:changeId/submit
POST   /api/deals/:dealId/configuration-changes/:changeId/decisions
POST   /api/deals/:dealId/configuration-changes/:changeId/apply

GET    /api/deals/:dealId/archive-readiness
POST   /api/deals/:dealId/pause
POST   /api/deals/:dealId/resume
POST   /api/deals/:dealId/terminate
POST   /api/deals/:dealId/archive
POST   /api/deals/:dealId/reopen

GET    /api/deals/:dealId/retention
POST   /api/deals/:dealId/retention-overrides
POST   /api/deals/:dealId/legal-holds
POST   /api/deals/:dealId/legal-holds/:holdId/release

POST   /api/deals/:dealId/deletion-requests
GET    /api/deals/:dealId/deletion-requests/:requestId
POST   /api/deals/:dealId/deletion-requests/:requestId/decisions
POST   /api/deals/:dealId/deletion-requests/:requestId/cancel
```

Writes should support:

* Optimistic concurrency;
* idempotency;
* authority validation;
* impact assessment;
* policy evaluation;
* legal-hold enforcement;
* audit creation;
* safe retry;
* lifecycle transition validation.

---

# 125. Repository direction

The current repository provides a limited foundation for this workspace.

Current deal contracts support:

* Code;
* title;
* buy-side or sell-side type;
* target organization;
* valuation range;
* lead advisor;
* financial-structure object;
* active, completed and archived statuses;
* phase transitions;
* optimistic version checks.

The store also exposes an archive operation that currently:

* Sets status to `archived`;
* clears active organization associations;
* increments the deal version.

There is no complete production implementation for:

* Pause;
* resume;
* mandate termination;
* archive readiness;
* retention;
* legal hold;
* deletion request;
* source disposition;
* external-access revocation;
* archive snapshots;
* configuration approvals.

## Keep

* Stable deal identity;
* typed deal contracts;
* optimistic version checks;
* archive confirmation direction;
* phase history;
* current deal-edit flow;
* source and team API boundaries;
* clear status enum direction.

## Reframe

### Existing archive method

Treat it as an MVP state toggle only.

Do not present it as evidence that production archive behavior is complete.

### `financialStructure`

Replace an unstructured general record with typed transaction configuration and approved domain objects.

### Deal status

Expand the lifecycle model to distinguish:

* Business outcome;
* administrative state;
* archive;
* deletion request.

### Whole-object updates

Use granular configuration-change proposals for material settings rather than broad uncontrolled deal patches.

## Add

* Dedicated `/deals/:dealId/settings` screen;
* versioned Deal Configuration;
* institution-policy inheritance;
* transaction currency and jurisdiction model;
* workflow-template versioning;
* governed thresholds;
* source and automation settings;
* impact analysis;
* pause and termination;
* archive readiness;
* archive snapshot;
* retention and legal hold;
* deletion workflow;
* settings history.

## Persistence requirement

The current mock-backed in-memory store must not be used as the production basis for:

* Retention;
* legal hold;
* archive records;
* deletion authorization;
* immutable lifecycle history.

---

# 126. Production validation tests

Critical tests should cover:

* Locked institution settings;
* permitted deal overrides;
* configuration version conflict;
* transaction-type migration;
* currency change without silent conversion;
* jurisdiction-change impact;
* threshold re-evaluation;
* no retroactive approval rewrite;
* workflow-template upgrade;
* workstream disable with existing objects;
* source disconnect with retained evidence;
* restricted-zone automation;
* pause and resume;
* termination without deletion;
* archive eligibility;
* archive with acknowledged exceptions;
* external-access disposition;
* immutable archive snapshot;
* reopen without restoring external access;
* retention inheritance;
* legal-hold enforcement;
* deletion eligibility;
* requester and approver separation;
* waiting-period cancellation;
* deletion manifest;
* audit-event creation.

---

# 127. What not to include

Avoid:

* One unstructured settings form;
* raw model or agent parameters;
* hidden institution-policy inheritance;
* automatic template upgrades;
* currency changes that convert values silently;
* jurisdiction changes treated as cosmetic;
* threshold changes that rewrite historical approvals;
* disabling a workstream by deleting its history;
* disconnecting a source and deleting evidence automatically;
* autonomous external-action controls;
* archive presented as deletion;
* termination presented as archive;
* completion controlled only through settings;
* one-click permanent deletion;
* deletion that bypasses retention;
* legal hold editable by routine deal users;
* external-access restoration on reopen;
* mutable archive snapshots;
* uncontrolled configuration rollback;
* red buttons for every lifecycle action;
* production claims based on the current mock archive toggle;
* real client data in fixtures.

---

# 128. MOCKED — Product and demo specification

## 128.1 Purpose of the mocked screen

The mocked Deal Settings & Archive screen should demonstrate:

* Transparent transaction configuration;
* institution-policy inheritance;
* governed material thresholds;
* connected-source control;
* archive readiness;
* distinction among pause, termination, archive and deletion.

Its narrative is:

> **M&Ai keeps each transaction’s workflow, evidence boundaries and administrative lifecycle explicit—even when the deal pauses, terminates or moves into long-term retention.**

This screen is useful for:

* Enterprise product walkthroughs;
* implementation planning;
* security and governance discussions;
* demonstrating controlled archive behavior.

It should not be used as a principal pitch image.

The project architecture classifies Settings as operationally necessary but weak for the main product deck. 

---

# 129. Mocked shell state

Institution:

> **Atlas M&A Advisory**

User:

> **Ana Costa · Vice President**

Deal:

> **Project Horizon**
> Atlas Industrial · Sell-side
> Due Diligence · Active

Breadcrumb:

> Deals / Project Horizon / Deal Settings

Deal navigation:

* Overview;
* Dossier;
* Documents;
* Diligence;
* Valuation;
* Buyer Universe;
* Negotiation;
* Closing;
* More / **Deal Settings**.

---

# 130. Mocked page header

Title:

> **Deal Settings & Archive**

Description:

> Project Horizon configuration, connected sources and administrative lifecycle.

State:

* **Configuration v8**
* **3 customized settings**
* **1 policy exception**
* **Archive not ready**

Primary action:

> **Review archive readiness**

Secondary:

> View settings history

---

# 131. Mocked transaction configuration

## Identity

Codename:

> Project Horizon

Internal title:

> Atlas Industrial Sell-side

Transaction type:

> Divestiture

Side:

> Sell-side

Target:

> Atlas Industrial S.A.

Client:

> Atlas Industrial Holding S.A.

Deal Lead:

> Marina Alves

---

# 132. Mocked operating context

Primary currency:

> **BRL**

Display basis:

> R$ mi · one decimal

Primary jurisdiction:

> Brazil

Governing-law jurisdiction:

> Brazil

Time zone:

> America/Sao_Paulo · BRT

Confidentiality:

> Internal Restricted

---

# 133. Mocked workflow configuration

Template:

> **Sell-side Mid-Market v3**

Status:

> Current · Three customizations

Enabled workstreams:

* Financial;
* Commercial;
* Legal;
* Tax;
* Operational;
* Valuation;
* Buyer Universe;
* Negotiation;
* Closing.

Deferred:

> Technology Review

---

# 134. Mocked thresholds

| Threshold                |              Current |
| ------------------------ | -------------------: |
| Financial materiality    |          **R$ 5 mi** |
| Senior escalation        |         **R$ 15 mi** |
| Valuation approval       | **R$ 25 mi or 5,0%** |
| Customer concentration   |            **35,0%** |
| Working-capital variance |          **R$ 3 mi** |

Source:

> Sell-side Mid-Market v3

Customized:

> Valuation approval threshold only

Approved by:

> Marina Alves · 25 July 2026

---

# 135. Mocked sources and automation

## Papermark

> Project Horizon VDR

State:

> Connected

Last synchronization:

> 28 July 2026 · 09:42 BRT

Scope:

> 127 synchronized documents

Archive behavior:

> Stop sync · Preserve imported versions

## Manual Upload

State:

> Enabled

## Automated behavior

* Classification: Enabled;
* fact extraction: Enabled;
* change detection: Enabled;
* draft findings: Enabled;
* deterministic valuation: Enabled;
* automatic approval: Prohibited;
* external outreach: Human authorization required.

---

# 136. Mocked retention

Policy:

> **Atlas Standard Transaction Retention**

Period:

> Seven years after archive

Source:

> Institution policy · Locked

Legal hold:

> None

Archive source behavior:

> Preserve document versions and source metadata

External-access behavior:

> Revoke at archive

---

# 137. Mocked archive readiness

State:

> **Not ready**

Blocking:

1. Valuation treatment approval pending;
2. Diligence Committee Brief review pending;
3. Camila Nunes external-access disposition required;
4. Papermark synchronization currently running.

Ready:

* Business outcome field available;
* retention policy confirmed;
* no legal hold;
* source manifest current;
* audit coverage current.

Primary action:

> Resolve four blockers

---

# 138. Mocked Controlled Actions

## Pause Deal

State:

> Available

Supporting:

> Stops workflow escalation and external actions while preserving access according to the selected policy.

## Terminate Mandate

State:

> Partner approval required

Supporting:

> Records that the engagement ended without transaction completion.

## Archive Deal

State:

> Disabled · Four blockers

Supporting:

> Preserves Project Horizon as a read-only transaction record.

## Request Deletion

State:

> Unavailable

Reason:

> Active deal and mandatory retention policy.

---

# 139. Mocked configuration change

> **Proposed configuration v9**

Change:

> Valuation escalation threshold
> R$ 25 mi → R$ 20 mi

Impact:

* One approved treatment remains valid;
* two open treatments require Deal Lead review;
* one pending approval changes authority route;
* Diligence Committee Brief remains current.

Decision:

> Deal Lead approval required

---

# 140. Recommended static composition

```text
┌──────────────────────────────────────────────────────────────────┐
│ Deal Settings & Archive · Configuration v8 · Archive not ready  │
├───────────────────────────────┬──────────────────────────────────┤
│ Transaction configuration     │ Archive readiness                │
│                               │                                  │
│ Project Horizon               │ 4 blockers                       │
│ Sell-side · Brazil            │                                  │
│ BRL · America/Sao_Paulo       │ 2 pending approvals              │
│                               │ 1 external access review         │
│ Workflow                      │ 1 active synchronization         │
│ Sell-side Mid-Market v3       │                                  │
│                               │ Retention                        │
│ Materiality                   │ 7 years after archive            │
│ R$ 5 mi                       │ Institution policy · Locked       │
│                               │                                  │
│ Valuation approval            │ [ Review archive readiness ]     │
│ R$ 25 mi or 5,0%             │                                  │
└───────────────────────────────┴──────────────────────────────────┘
```

This communicates:

* Explicit deal configuration;
* governed thresholds;
* retention;
* controlled archive readiness.

---

# 141. Pitch-specific simplification

## Keep visible

* Project Horizon;
* sell-side;
* BRL;
* workflow template;
* R$ 5 mi materiality;
* R$ 25 mi or 5,0% approval threshold;
* archive not ready;
* four blockers;
* retention policy.

## Hide

* Deletion flow;
* legal-hold detail;
* technical source settings;
* full configuration history;
* all workstreams;
* institution-policy IDs;
* complete controlled-action area.

## Readability requirement

At deck scale, these should remain readable:

* **Deal Settings & Archive**
* **Configuration v8**
* **R$ 5 mi**
* **R$ 25 mi or 5,0%**
* **Archive not ready**
* **4 blockers**
* **7 years after archive**

---

# 142. Recommended demo flows

## Flow A — Change a threshold

```text
Workflow & Governance
  ↓
Change valuation escalation threshold
  ↓
Preview affected objects
  ↓
Submit configuration v9
  ↓
Deal Lead approves
  ↓
New configuration becomes effective
```

## Flow B — Template upgrade

```text
Template v4 available
  ↓
Compare v3 and v4
  ↓
Select compatible changes
  ↓
Preview new tasks and approvals
  ↓
Apply configuration version
```

## Flow C — Pause transaction

```text
Controlled Actions
  ↓
Pause Deal
  ↓
Select task and source behavior
  ↓
Review external access
  ↓
Approve pause
  ↓
Deal enters Paused state
```

## Flow D — Resume transaction

```text
Paused deal
  ↓
Review source freshness
  ↓
Review expired access
  ↓
Update milestones
  ↓
Resume
```

## Flow E — Prepare archive

```text
Retention & Archive
  ↓
Run readiness check
  ↓
Resolve approvals
  ↓
Review external access
  ↓
Stop source synchronization
  ↓
Create archive snapshot
  ↓
Archive
```

## Flow F — Archive with exception

```text
Unanswered information requests remain
  ↓
Record archive exception
  ↓
Deal Lead approves exception
  ↓
Archive as historical unresolved work
```

## Flow G — Reopen archived deal

```text
Archived Project Horizon
  ↓
Request reopen
  ↓
Assign active owner
  ↓
Review sources and access
  ↓
Create new configuration version
  ↓
Resume active workspace
```

## Flow H — Deletion request blocked

```text
Request deletion
  ↓
Legal retention check
  ↓
Mandatory retention active
  ↓
Request blocked
  ↓
Reason and next eligible date shown
```

---

# 143. UX prototype tasks to validate

Test whether users can:

1. Find the primary transaction currency.
2. find the governing time zone.
3. identify the active workflow template.
4. distinguish inherited and customized settings.
5. change routine metadata.
6. propose a material threshold change.
7. understand which objects are affected.
8. distinguish current and proposed configuration.
9. determine who must approve the change.
10. inspect a connected source.
11. disconnect it without deleting evidence.
12. determine which automated actions are permitted.
13. identify the access-review schedule.
14. pause the deal.
15. understand what pause affects.
16. resume the deal safely.
17. distinguish completion from archive.
18. record mandate termination.
19. determine why archive is blocked.
20. resolve archive blockers.
21. archive with an approved exception.
22. inspect the archive snapshot.
23. reopen an archived deal.
24. understand the retention policy.
25. identify an active legal hold.
26. determine why deletion is blocked.
27. submit an eligible deletion request.
28. find the settings audit event.

## Measures

Record:

* Whether users confuse business and administrative state;
* whether pause, termination and archive are understood;
* whether inherited policy is clear;
* whether impact previews are sufficient;
* whether thresholds are interpreted as analytical truth;
* whether users expect currency conversion;
* whether source disconnection is mistaken for deletion;
* whether archive is mistaken for deletion;
* whether controlled actions feel sufficiently deliberate;
* whether the screen resembles a technical administrator console.

---

# 144. Design validation criteria

Deal Settings & Archive is ready when:

1. The screen remains scoped to one deal.
2. Institution defaults and deal overrides are distinguishable.
3. Locked policies cannot be changed by ordinary deal users.
4. Current, proposed and historical configurations remain distinct.
5. Material changes produce new configuration versions.
6. Configuration changes show downstream impact.
7. Transaction type and side changes preserve existing work.
8. Codename changes preserve aliases and history.
9. Organization perimeter changes do not overwrite Dossier evidence.
10. Currency changes do not convert values silently.
11. Jurisdiction changes trigger workflow review.
12. Time zone governs deal deadlines consistently.
13. Confidentiality does not automatically grant access.
14. Workflow-template versions are preserved.
15. Template upgrades are never automatic.
16. Disabling a workstream preserves its history.
17. Thresholds govern review and escalation—not factual truth.
18. Threshold changes do not rewrite historical approvals.
19. Existing-item re-evaluation is explicit.
20. Approval routing remains separate from named participant authority.
21. Source disconnection does not delete retained evidence automatically.
22. Removed source documents remain historically traceable.
23. Business-facing automation controls avoid technical engine settings.
24. Automatic approval and autonomous external action remain prohibited.
25. Pause is reversible and distinct from termination.
26. Completion normally originates from Closing.
27. Termination preserves transaction history.
28. Archive is administrative preservation, not deletion.
29. Archive readiness identifies dependencies.
30. Archive exceptions require rationale and authority.
31. Archive creates an immutable snapshot.
32. Archived workspaces are read only.
33. Reopening does not restore external access automatically.
34. Retention policy identifies source, trigger and disposition.
35. Legal hold blocks incompatible deletion.
36. Deletion is a governed request, not an instant action.
37. Requester and sole approver are separated.
38. Deletion completion produces a disposition manifest.
39. Concurrent edits use version control.
40. Every material change creates an audit event.
41. The current repository archive toggle is not represented as a complete production archive system.
42. The screen remains useful without Copilot.
43. Mobile supports review and urgent lifecycle controls.
44. The pitch fixture remains fictional.
45. Every controlled action explains its reversibility and data consequence.

---

# 145. Final design target

The correct design target is not:

> “A settings page with an archive button.”

It is:

> **A governed transaction-control workspace where every operating rule, source boundary and lifecycle transition is versioned, impact-assessed and authorized before it changes the deal.**

Its defining interaction is:

> **Inspect effective configuration → propose a controlled change → understand downstream impact → obtain required approval → apply a new version → preserve the complete administrative history**

For lifecycle actions:

> **Assess readiness → resolve or acknowledge dependencies → authorize the transition → freeze or reopen the workspace → preserve evidence, decisions and retention state**

**Next iteration: Settings Screen Family.**
