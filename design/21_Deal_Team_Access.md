---
canonical_name: "Deal Team & Access"
definition_id: "BD-21"
definition_status: "Governed for MAI-90"
screen_family: "deal-governance"
owning_task: "MAI-93"
canonical_routes:
  - "/deals/:dealId/team"
figma_file_key: "otMJE31OKIxdXogV4RNbGQ"
figma_status: "Shared-pattern reuse documented in MAI-93"
figma_area: "MAI Banker Workspace — Design System & Product UI / 06 Application Shell / MAI-93 — Desktop Execution & Agentic MVP"
figma_nodes:
  - "239:921"
related_definitions:
  - "design/26_Cross_Screen_Interaction_Map.md"
  - "design/27_Shared_State_Model.md"
  - "design/0_Implementaion_Roadmap.md"
last_reviewed_task: "MAI-93"
implementation_capability_boundary: "Product definition only; no frontend, backend, Storybook, token export, or runtime behavior implemented by this file."
mock_demo_data_boundary: "Use fictional/demo transaction data only; do not encode real client, counterparty, credential, or confidential deal data."
---
# Deal Team & Access

## 1. Recommended product naming

Use:

* **Deal navigation:** `Deal Team & Access`
* **Page title:** `Deal Team & Access`
* **Internal participant:** `Deal Team Member`
* **External participant:** `External Participant`
* **Transaction responsibility:** `Deal Role`
* **Functional responsibility:** `Workstream Assignment`
* **Permission boundary:** `Access Scope`
* **Decision permission:** `Approval Authority`
* **Restricted evidence group:** `Access Zone`
* **Temporary permission:** `Temporary Access`
* **Periodic control:** `Access Review`
* **Account activation:** `Invitation`
* **Internal accountability:** `Sponsor`

The screen should remain inside the deal-level **More** menu rather than the principal transaction-phase navigation.

The canonical architecture defines it as the deal-specific workspace for internal members, external participants, transaction roles, access scope, workstreams, approval authority, document restrictions, invitations and activity. 

---

# 2. Screen definition

**Deal Team & Access** is the transaction-specific workspace where authorized users decide:

* Who participates in the deal;
* what responsibility each participant holds;
* which workstreams they may access;
* which evidence they may inspect;
* which actions they may perform;
* which decisions they may approve;
* how long access remains active;
* which restrictions and confidentiality zones apply.

It should answer:

1. **Who currently participates in this transaction?**
2. **Which participants are internal and external?**
3. **What responsibility does each participant hold?**
4. **Which workstreams can they see or contribute to?**
5. **Which documents or data remain restricted?**
6. **Who may review or approve material decisions?**
7. **Who may export or communicate transaction information?**
8. **When does temporary or external access expire?**
9. **Which permissions require review?**
10. **What changes if a participant is removed or reassigned?**

Its central operating sequence is:

> **Identify participant → Assign transaction responsibility → Define least-privilege access → Validate authority and restrictions → Activate access → Review and revoke when conditions change**

---

# 3. Primary intention

## Operational intention

Ensure every transaction participant has the access required to perform their responsibilities—and no broader access than necessary.

## User intention

A Deal Lead should be able to say:

> “I know exactly who can access this deal, what each person can do and which sensitive information remains restricted.”

## Product intention

The screen should provide the human-governance boundary around:

* Evidence;
* analyses;
* deterministic calculations;
* approvals;
* exports;
* external communication;
* AI-assisted work.

M&Ai’s decision-grade workflow depends on source evidence, deterministic engines and human approval gates. Access control determines who may inspect, change and authorize each layer.

---

# 4. Strategic product role

Deal Team & Access is the deal-specific enforcement layer connecting:

* Institution membership;
* transaction staffing;
* workstream responsibility;
* source confidentiality;
* approval policy;
* external participation;
* auditability.

```text
Institution member or external contact
  ↓
Deal participation
  ↓
Transaction responsibility
  ↓
Workstream access
  ↓
Object and document restrictions
  ↓
Review and approval authority
  ↓
Audited transaction action
```

Without this screen, the product risks reducing permissions to:

* “Has access” or “does not have access”;
* broad internal versus external categories;
* one generic Deal Team list;
* institution title alone;
* hidden backend rules.

That would be insufficient for confidential M&A workflows.

---

# 5. What Deal Team & Access is not

The screen should not become:

* The institution Team Workspace;
* the complete Roles & Permissions policy editor;
* a generic user-administration console;
* an identity-provider configuration page;
* an employee directory;
* a task-management screen;
* a contact database;
* a VDR folder browser;
* a complete security operations console;
* a spreadsheet of unexplained permission codes;
* a single “full access” toggle;
* a client-perspective simulator;
* a route around external portals;
* a place to approve transaction work;
* a view of employee productivity or surveillance data.

The central question is not:

> “Who has an account?”

It is:

> **“Who may perform which transaction action, using which evidence, under what restrictions and authority?”**

---

# 6. Relationship to adjacent screens

| Screen                         | Primary responsibility                                                        |
| ------------------------------ | ----------------------------------------------------------------------------- |
| **Team Workspace**             | Institution membership, capabilities, availability and cross-deal assignments |
| **Deal Team & Access**         | One deal’s participants, responsibilities, permissions and restrictions       |
| **Roles & Permissions**        | Defines reusable institution-level access and authority policies              |
| **Tasks & Approvals**          | Contains exact work and decisions assigned to participants                    |
| **Documents & Evidence**       | Maintains document-level evidence and source restrictions                     |
| **Activity & Audit**           | Records permission, invitation and access changes                             |
| **Deal Settings**              | Defines deal-wide confidentiality, retention and default access policies      |
| **Organizations**              | Maintains organizations employing external participants                       |
| **Contact Detail**             | Maintains the identity and relationship history of an external person         |
| **External portals**           | Provide reduced, purpose-specific experiences for non-internal users          |
| **Security & Data Governance** | Defines institution-wide security, authentication and data policy             |

---

# 7. Team Workspace versus Deal Team & Access

## Team Workspace

Institution-level.

It answers:

* Who belongs to Atlas M&A Advisory?
* Who has Financial Review capability?
* Who is available?
* Which deals is Ana assigned to?
* Which staffing gaps exist?

## Deal Team & Access

Transaction-level.

It answers:

* Can Ana view Project Horizon Legal evidence?
* May Felipe edit valuation assumptions?
* Can Camila download privileged documents?
* Who approves buyer outreach?
* Which users may access customer-level revenue?
* When does external counsel access expire?

## Example

Team Workspace:

> **Ana Costa**
> Vice President · Financial Review and Valuation
> Three active deals

Deal Team & Access:

> **Ana Costa · Project Horizon**
> Financial Review VP
> Financial and Valuation: Review
> Diligence: Contribute
> Negotiation: Summary only
> Closing bank details: No access
> Valuation-treatment approval: Authorized

---

# 8. Deal assignment versus deal access

A person may be assigned to a transaction responsibility without yet having active access.

Example:

> Daniel Ribeiro assigned as Tax Reviewer
> Access proposal awaiting Deal Administrator review

Conversely, a person may have read-only access without owning a responsibility.

Example:

> Roberto Lima · Partner Observer
> Deal Overview and approved deliverables only

The product should therefore maintain separate objects for:

* **Assignment**
* **access grant**
* **approval authority**
* **restriction**
* **invitation**

Do not assume one automatically proves the others.

---

# 9. Responsibility versus permission

## Responsibility

What the participant is accountable for.

Examples:

* Deal Lead;
* Financial Reviewer;
* Tax Specialist;
* Closing Coordinator;
* Client Approver.

## Permission

What the participant may technically do.

Examples:

* View financial evidence;
* edit Diligence findings;
* submit a valuation scenario;
* export a report;
* manage access.

## Authority

Which consequential decisions the participant may approve.

Examples:

* Approve a finding;
* authorize buyer outreach;
* approve a valuation scenario;
* waive a closing condition.

A participant can have:

* Responsibility without sufficient access;
* access without responsibility;
* review access without approval authority;
* approval authority without editing rights.

The screen must make these mismatches visible.

---

# 10. Professional title, institution role and deal role

These concepts should remain distinct.

## Professional title

> Vice President

## Institution role

> Banker Member

## Deal role

> Financial Review VP

## Workstream assignment

> Financial, Diligence and Valuation

## Approval authority

> May approve valuation treatments within configured policy

## Access scope

> Project Horizon · Financial and Valuation evidence

Do not show only:

> Role: VP

That is insufficient to explain transaction rights.

---

# 11. Internal members versus external participants

## Internal deal-team member

Belongs to the institution and may use the standard internal deal workspace.

Examples:

* Analyst;
* Associate;
* Vice President;
* Partner;
* internal specialist;
* deal administrator.

## External participant

Receives a restricted, purpose-specific experience.

Examples:

* Client CFO;
* target-management contributor;
* external legal counsel;
* accounting advisor;
* independent specialist;
* client approver;
* external auditor.

External participants should not appear as ordinary internal members with a different badge.

They require:

* An internal sponsor;
* explicit scope;
* expiry;
* defined authentication;
* reduced navigation;
* restricted search and Copilot;
* controlled exports.

Client and banker access models should remain separate rather than becoming interchangeable display modes. 

---

# 12. Primary users

## 12.1 Deal Lead

Needs to:

* Build the deal team;
* assign accountable roles;
* invite external participants;
* review workstream coverage;
* approve sensitive access;
* remove participants;
* conduct access reviews.

## 12.2 Deal Administrator

Needs to:

* Configure participant access;
* apply role templates;
* process access requests;
* manage invitations;
* resolve permission conflicts;
* maintain expiry and review schedules.

## 12.3 Vice President

Needs to:

* Review who can access financial and valuation work;
* assign analysts;
* request specialist access;
* identify approval-authority gaps;
* restrict sensitive sources.

## 12.4 Security or Compliance Administrator

Needs to:

* Review high-risk access;
* validate external participation;
* inspect clean-team membership;
* review exceptions;
* revoke inappropriate access.

## 12.5 Internal participant

Needs to:

* Understand personal access;
* request additional scope;
* identify responsibilities;
* understand restrictions;
* see who may approve their work.

## 12.6 External participant

Needs to:

* Understand the limited purpose of access;
* complete assigned work;
* view permitted evidence;
* submit documents or decisions;
* know when access expires.

---

# 13. Primary job to be done

> When people must collaborate on a confidential transaction, assign the minimum access and authority each participant needs while preserving accountability, external boundaries and a complete audit trail.

## Secondary jobs

The user should also be able to:

* Add an internal member;
* invite an external participant;
* assign a transaction role;
* grant workstream access;
* restrict selected documents;
* create a clean team;
* set access expiry;
* authorize an approval category;
* review access requests;
* transfer responsibility;
* suspend access;
* revoke access;
* conduct periodic access review;
* inspect recent access activity;
* export an authorized access register.

---

# 14. Core conceptual model

The screen should separate nine layers.

## Layer 1 — Identity

Who is the participant?

## Layer 2 — Participation

Why are they involved in this deal?

## Layer 3 — Responsibility

What transaction work do they own or support?

## Layer 4 — Scope

Which workstreams, objects or documents may they access?

## Layer 5 — Capability

What actions may they perform?

## Layer 6 — Authority

Which material decisions may they approve?

## Layer 7 — Restrictions

Which data, exports or communications remain prohibited?

## Layer 8 — Duration

When does access begin, expire or require review?

## Layer 9 — Audit

Who granted, changed, reviewed or revoked the access?

---

# 15. Least-privilege principle

The default should be:

> **No deal access until explicit participation is established**

After participation is added, access should be limited to:

* Required workstreams;
* necessary objects;
* appropriate actions;
* relevant duration.

The system should not default every internal employee to:

> Full Project Horizon access

Likewise, adding an external advisor should not automatically expose:

* Internal Diligence findings;
* valuation deliberation;
* negotiation strategy;
* buyer exclusions;
* internal comments;
* unrestricted search;
* Agentic Workspace history.

---

# 16. Need-to-know access

Permissions should consider:

* Participant responsibility;
* transaction phase;
* information sensitivity;
* client restrictions;
* legal privilege;
* personal data;
* clean-team protocol;
* competitive sensitivity;
* funds-flow security.

Example:

> The Tax Reviewer may access tax evidence and tax-related findings but not Buyer Universe strategy.

Example:

> The Client CFO may submit management evidence but cannot inspect internal valuation assumptions.

---

# 17. Permission dimensions

Access should not be represented by one scalar permission.

Recommended dimensions:

1. **Workspace visibility**
2. **Object visibility**
3. **Document visibility**
4. **Create and edit rights**
5. **Review rights**
6. **Approval authority**
7. **Export and download**
8. **External communication**
9. **Access administration**
10. **Duration and conditions**

---

# 18. Access capabilities

Recommended capability vocabulary:

* View summary;
* view;
* comment;
* contribute;
* create;
* edit;
* submit for review;
* review;
* export;
* download;
* communicate externally;
* manage participants;
* manage access;
* administer deal.

Approval actions should be modeled separately.

## Avoid

Do not use one generic:

> Write access

Editing a draft and approving a transaction decision are materially different.

---

# 19. Deal access scopes

Access may apply at several levels.

## Deal-wide

Permits access to the overall transaction.

## Workstream

Examples:

* Financial;
* Commercial;
* Legal;
* Tax;
* Operational;
* Valuation;
* Negotiation;
* Closing.

## Workspace

Examples:

* Target Dossier;
* Diligence;
* Buyer Universe;
* Deliverables.

## Object

Examples:

* One finding;
* one valuation scenario;
* one information request;
* one closing condition.

## Document zone

Examples:

* Legal privileged;
* customer-level data;
* employee personal data;
* funds-flow and bank details.

## Specific document

Example:

> `Customer_Revenue_2025.xlsx` Version 3

---

# 20. Workstream model

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
* Buyer or Target Universe;
* Negotiation;
* Closing;
* Administration.

Workstreams may adapt to the deal template.

A sell-side deal may require:

* Buyer Universe;
* management preparation;
* vendor diligence.

A buy-side deal may require:

* investment committee;
* acquisition financing;
* integration planning.

---

# 21. Workspace-to-workstream relationship

A workspace may contain several workstreams.

Example:

## Diligence

* Financial;
* Legal;
* Tax;
* Commercial;
* Operational.

## Documents

Contains evidence from every workstream.

## Valuation

Primarily Financial and Valuation, but may include:

* Tax;
* Legal;
* Commercial adjustments.

## Closing

May include:

* Legal;
* Tax;
* Financial;
* funds flow;
* regulatory.

Therefore, granting access to a workstream should not simply show or hide one navigation tab.

The object and document policy must still apply.

---

# 22. Permission inheritance

Recommended inheritance sequence:

```text
Institution policy
  ↓
Deal policy
  ↓
Role template
  ↓
Workstream grant
  ↓
Object or document restriction
  ↓
Temporary exception
```

The effective result should always be inspectable.

Example:

> **Effective access: View only**

Derived from:

* External Counsel template: Contribute to Legal;
* document restriction: privileged draft limited to internal counsel;
* explicit result: metadata only for this document.

---

# 23. Permission precedence

Recommended precedence from strongest to weakest:

1. Institution-wide prohibition;
2. legal or regulatory restriction;
3. explicit deal denial;
4. access-zone restriction;
5. object or document restriction;
6. temporary scoped grant;
7. role-template permission;
8. institution-role default.

A broad grant must not override a more specific restriction.

Example:

> “Legal workstream: Contribute” does not override “Internal privileged memorandum: No external access.”

---

# 24. Explicit deny

Use explicit deny sparingly for high-risk boundaries.

Appropriate:

* No access to bank instructions;
* no access to clean-team evidence;
* no external export;
* no visibility into negotiation strategy.

An explicit denial should show:

* Scope;
* reason category;
* authority;
* effective period;
* whether an exception may be requested.

---

# 25. Role templates

Deal-specific role templates should simplify configuration.

Recommended templates:

* Deal Lead;
* Deputy Deal Lead;
* Analyst;
* Associate;
* Financial Reviewer;
* Valuation Reviewer;
* Tax Specialist;
* Legal Coordinator;
* Document Administrator;
* External Counsel;
* Client Contributor;
* Client Approver;
* Management Contributor;
* External Auditor;
* Clean-Team Reviewer;
* Read-only Observer.

Templates define starting permissions.

They should not prevent controlled customization.

---

# 26. Template customization

When a template is changed, show:

> **Customized from External Counsel**

Differences:

* Valuation Summary added;
* document download removed;
* access expiry shortened;
* Negotiation remains restricted.

Material deviations may require:

* Reason;
* approver;
* access review;
* security review.

---

# 27. Deal-role model

Recommended deal roles:

* Deal Lead;
* Deputy Lead;
* Financial Lead;
* Legal Lead;
* Tax Reviewer;
* Commercial Reviewer;
* Valuation Owner;
* Buyer-Universe Owner;
* Negotiation Lead;
* Closing Coordinator;
* Client Principal;
* Client Contributor;
* Management Contributor;
* External Counsel;
* External Advisor;
* Auditor;
* Observer.

A participant may hold several roles.

One role should be designated as their primary display role.

---

# 28. Accountability types

For each workstream, distinguish:

* **Accountable owner**
* **Contributor**
* **Reviewer**
* **Approver**
* **Observer**

Example:

| Participant  | Financial Diligence            |
| ------------ | ------------------------------ |
| Felipe Rocha | Contributor                    |
| Ana Costa    | Accountable owner and reviewer |
| Marina Alves | Final approver                 |
| Roberto Lima | Observer                       |

This helps detect responsibility and authority gaps.

---

# 29. Approval authority

Approval authority should be a distinct section.

Recommended authority categories:

* Dossier facts;
* Diligence findings;
* Valuation treatments;
* Complete valuation scenario;
* Buyer or target shortlist;
* Outreach;
* Negotiation response;
* Commercial baseline;
* Closing waiver;
* Closing readiness;
* Funds flow;
* External deliverable;
* Access exception.

Each authority assignment should preserve:

* Policy;
* scope;
* threshold;
* effective dates;
* separation-of-duties constraints.

---

# 30. Authority thresholds

Authority may depend on:

* Financial impact;
* valuation percentage movement;
* transaction phase;
* object severity;
* external consequence;
* deal role;
* workstream;
* jurisdiction.

Example:

> Ana Costa may approve valuation treatments with an estimated midpoint impact up to R$ 25 mi.

Example:

> Complete valuation scenarios require the Deal Lead regardless of amount.

The exact policy should be defined in Roles & Permissions.

This screen applies it to the deal.

---

# 31. Approval authority does not imply editing

A participant may:

* Review and approve a prepared object;
* but not edit the underlying calculation.

Example:

> Marina Alves may approve scenario v4 but cannot silently change its assumptions during approval.

Conversely:

> Felipe Rocha may edit draft assumptions but cannot approve them.

---

# 32. External-action authority

Separate authority should govern actions such as:

* Send an information request;
* invite a bidder;
* release a management presentation;
* circulate a term sheet;
* grant document access;
* communicate a counterproposal;
* authorize closing;
* send payment instructions.

Access to view an object does not authorize external communication.

---

# 33. Access administration authority

Recommended levels:

## Participant manager

May add or remove routine internal participants.

## Access administrator

May configure workstream and document access.

## Restricted-zone administrator

May manage clean-team or privileged zones.

## Deal administrator

May manage ordinary deal configuration.

## Security administrator

May approve high-risk exceptions.

## Deal Lead

May approve transaction responsibility and selected access changes.

No participant should gain access-administration rights merely because they are a senior banker.

---

# 34. Recommended workspace structure

Use seven principal views:

1. **Overview**
2. **Participants**
3. **Access Matrix**
4. **Restricted Zones**
5. **Invitations**
6. **Access Reviews**
7. **History**

## Overview

Current participation and access posture.

## Participants

Internal and external deal participants.

## Access Matrix

Workstream and workspace permissions.

## Restricted Zones

Document, data and clean-team restrictions.

## Invitations

Pending and completed activation.

## Access Reviews

Scheduled and event-triggered permission review.

## History

Material access and participant changes.

---

# 35. Overview

The Overview should contain:

1. **Access posture**
2. **Internal team**
3. **External participants**
4. **Responsibility coverage**
5. **Approval coverage**
6. **Restricted zones**
7. **Access requiring review**
8. **Recent access changes**

It should not become a generic statistics dashboard.

---

# 36. Access posture

Recommended states:

## Controlled

All required responsibilities and reviews are assigned. No material access issue exists.

## Review required

One or more permissions require confirmation.

## Restricted exception

An approved access exception is active.

## Coverage gap

A required participant or authority is missing.

## High-risk issue

Sensitive access is inappropriate, expired or unverified.

Avoid a generic numeric:

> Access score: 87

---

# 37. Page header

## Recommended title

> **Deal Team & Access**

Supporting description:

> Manage Project Horizon participants, transaction responsibilities and access boundaries.

## Header summary

Example:

* **8 internal members**
* **3 external participants**
* **1 pending invitation**
* **2 access reviews**
* **1 restricted zone**

## Primary action

Adapt to state:

* **Add participant**
* **Review access**
* **Resolve high-risk access**
* **Complete staffing**

## Secondary actions

* Open Access Matrix;
* export access register.

---

# 38. Responsibility coverage

The Overview should show required accountable roles.

Example:

| Responsibility       | Owner          | State          |
| -------------------- | -------------- | -------------- |
| Deal Lead            | Marina Alves   | Covered        |
| Financial Review     | Ana Costa      | Covered        |
| Tax Review           | Daniel Ribeiro | Covered        |
| Legal Coordination   | Camila Nunes   | External       |
| Valuation Approval   | Marina Alves   | Covered        |
| Closing Coordination | Not assigned   | Required later |

A future-stage gap should not necessarily be a current blocker.

---

# 39. Approval coverage

Example:

> **Valuation treatment**

* Preparer: Felipe Rocha;
* reviewer: Ana Costa;
* final scenario approver: Marina Alves.

State:

> Separation of duties satisfied

Example:

> **Closing waiver**

State:

> No eligible client approver assigned

Action:

> Add client approver

---

# 40. Participants view

The Participants view should separate:

* Internal Team;
* external advisors;
* client and management;
* observers and auditors;
* historical participants.

A combined filter may show all.

The default should display current active participants.

---

# 41. Recommended participant columns

1. **Participant**
2. **Participant type**
3. **Primary deal role**
4. **Workstreams**
5. **Access summary**
6. **Approval authority**
7. **Restrictions**
8. **Access state**
9. **Expiry or review**
10. **Last deal activity**
11. **Actions**

Optional:

* Internal sponsor;
* organization;
* invitation status;
* authentication method;
* access template;
* temporary delegation;
* added by;
* added date.

---

# 42. Participant-row anatomy

## Identity

> **Ana Costa**

Supporting:

> Vice President · Atlas M&A Advisory

## Deal role

> Financial Review VP

## Workstreams

> Financial · Diligence · Valuation

## Access

> Contribute and review

## Authority

> Valuation treatment

## Restrictions

> No closing bank details

## State

> Active

## Last activity

> Reviewed finding · 24 min ago

---

# 43. External-participant row

> **Camila Nunes**

Supporting:

> External Counsel · Lume Legal Advisors

Sponsor:

> Marina Alves

Workstreams:

> Legal · Closing

Access:

> Contribute · Watermarked download

Restriction:

> No Financial, Valuation or Negotiation access

Expiry:

> 30 set. 2026

State:

> Active · Review due in 14 days

---

# 44. Selected-participant panel

Selecting a participant should open a right-side panel containing:

1. Identity;
2. participation purpose;
3. primary role;
4. responsibilities;
5. effective access;
6. approval authority;
7. restrictions;
8. temporary grants;
9. invitation or activation;
10. access review;
11. last meaningful activity;
12. history.

## Primary actions

Adapt to state:

* Edit access;
* review access;
* activate invitation;
* transfer responsibilities;
* suspend access.

## Overflow

* Replace template;
* extend expiry;
* revoke;
* remove participant;
* export participant record.

---

# 45. Access summary language

Avoid:

> Full access

unless it literally includes every current and future transaction object, which should be rare.

Prefer:

> All current internal workstreams except Funds Flow

or:

> Deal Administrator · Internal evidence and access management

For external users:

> Legal workstream only · No internal findings or exports

---

# 46. Access Matrix

The Access Matrix should provide a structured comparison of participants and workspaces.

Recommended rows:

* Overview;
* Target Dossier;
* Documents;
* Diligence;
* Valuation;
* Buyer or Target Universe;
* Negotiation;
* Closing;
* Agentic Workspace;
* Activity & Audit;
* Deliverables.

Recommended columns:

* Participant;
* access level;
* authority indicator;
* restrictions.

For large teams, allow the matrix to transpose:

* Participants as rows;
* workspaces as columns;

or:

* Workspaces as rows;
* participants as columns.

---

# 47. Workspace access levels

Recommended levels:

## No access

Workspace is hidden.

## Summary

Only approved or sanitized summary is visible.

## View

May inspect permitted content.

## Contribute

May create and edit drafts.

## Review

May assess submitted work and request changes.

## Manage

May administer domain workflow or participants where configured.

Approval authority remains separate.

---

# 48. Why approval is separate from the matrix level

A hierarchy such as:

> View → Edit → Approve

is misleading.

An approver may need:

* View;
* comment;
* decision rights;

without edit access.

Therefore, show approval authority through:

* A separate icon;
* dedicated authority column;
* participant panel;
* policy inspector.

---

# 49. Example access matrix

| Participant    | Dossier        | Documents   | Diligence          | Valuation        | Negotiation | Closing           |
| -------------- | -------------- | ----------- | ------------------ | ---------------- | ----------- | ----------------- |
| Marina Alves   | Review         | View        | Review             | Review           | Manage      | Review            |
| Ana Costa      | Review         | Contribute  | Review             | Review           | Summary     | No access         |
| Felipe Rocha   | Contribute     | Contribute  | Contribute         | Contribute       | No access   | No access         |
| Daniel Ribeiro | Tax scope      | Tax scope   | Tax scope          | Summary          | No access   | Tax scope         |
| Camila Nunes   | No access      | Legal scope | Legal scope        | No access        | No access   | Legal scope       |
| Helena Duarte  | Selected facts | Submit only | No internal access | Approved summary | No access   | Selected requests |

Authority should be shown separately.

---

# 50. Effective-permission inspector

Selecting one matrix cell should explain:

> **Ana Costa · Valuation**

Effective level:

> Review

Derived from:

* Financial Review VP template;
* Valuation workstream assignment;
* no object-level restriction.

Additional authority:

> May approve valuation treatments under Valuation Policy v3.

Restriction:

> Complete scenario approval requires Deal Lead.

---

# 51. Access Matrix editing

Editing should support:

* Apply template;
* change one workspace;
* change one workstream;
* add document restriction;
* add temporary access;
* remove access;
* compare proposed versus current.

Before saving, show:

* New visibility;
* new actions;
* authority changes;
* downstream assignments;
* affected open work;
* external-access consequence.

---

# 52. Internal participant addition

Recommended flow:

1. Search institution members;
2. select participant;
3. assign deal role;
4. assign workstreams;
5. apply access template;
6. review approval authority;
7. review restrictions;
8. set effective date;
9. confirm.

Because the user is already an active institution member, a new account invitation may not be required.

They should still receive:

* Deal assignment notification;
* confidentiality acknowledgement, where required;
* exact access summary.

---

# 53. Internal-member eligibility

Before assignment, validate:

* Active institution membership;
* required capability;
* conflicts;
* planned availability;
* separation of duties;
* restricted-zone eligibility;
* deal confidentiality policy.

Example:

> **Cannot assign as independent valuation approver**

> Felipe Rocha prepared scenario v4.

---

# 54. External participant addition

Recommended flow:

1. Find or create Contact;
2. confirm organization;
3. choose external-participant type;
4. assign internal sponsor;
5. define purpose;
6. select deal role;
7. choose workstreams and objects;
8. apply external template;
9. configure document restrictions;
10. set expiry;
11. review authentication;
12. send invitation.

---

# 55. External-participant purpose

Every external participant should have a stated purpose.

Examples:

* Legal diligence;
* tax review;
* management document submission;
* client approval;
* independent accounting review;
* closing signature;
* external audit.

The purpose should inform:

* Access template;
* duration;
* required portal;
* document zones;
* authority.

---

# 56. Internal sponsor

Every external participant should have an active internal sponsor.

The sponsor is accountable for:

* Business need;
* access scope;
* renewal;
* review;
* revocation;
* participant support.

The sponsor does not automatically become the external participant’s approver.

## Sponsor-change flow

Before changing sponsor, show:

* Current external participants;
* open reviews;
* pending invitations;
* upcoming expiries;
* active information requests.

---

# 57. Invitation lifecycle

Recommended invitation states:

* Draft;
* ready for approval;
* sent;
* delivered;
* accepted;
* identity verification required;
* security setup required;
* active;
* expired;
* revoked;
* failed;
* superseded.

An accepted invitation should not automatically mean all access is active if required security steps remain incomplete.

---

# 58. Invitation content

An invitation should state:

* Inviting institution;
* deal identity permitted for disclosure;
* participant role;
* purpose;
* accessible workspace;
* confidentiality obligations;
* expiry;
* authentication requirements;
* internal sponsor.

Sensitive deal details should not appear in the email subject.

Prefer:

> Atlas M&A Advisory invited you to a secure transaction workspace.

The complete context appears after authentication.

---

# 59. Invitation safeguards

Before sending, detect:

* Existing internal membership;
* existing external account;
* duplicate invitation;
* incorrect organization domain;
* expired Contact record;
* conflicting deal restriction;
* prohibited counterparty;
* missing sponsor;
* excessive access scope;
* no expiry;
* personal email policy.

Example:

> **Existing external participant found**

> Camila Nunes already has active Project Atlas access.

Actions:

* Use existing identity;
* create separate Project Horizon participation;
* cancel.

---

# 60. Identity verification

External participant activation may require:

* Verified email;
* MFA;
* enterprise SSO;
* identity-provider login;
* one-time identity check;
* confidentiality acceptance;
* organization confirmation.

The screen should show user-relevant status.

Example:

> **Identity verified · MFA configured**

Avoid exposing unnecessary authentication internals in the banker interface.

---

# 61. Invitation expiry

Every external invitation should have an expiry.

Recommended:

* Short activation period;
* separate access expiry after activation.

Example:

> Invitation expires 7 ago. 2026
> Activated access expires 30 set. 2026

An expired invitation does not necessarily revoke already activated access.

---

# 62. Access activation

Access becomes active only when all required conditions are satisfied.

Possible conditions:

* Invitation accepted;
* identity verified;
* MFA configured;
* NDA acknowledged;
* sponsor confirmed;
* restricted-zone approval completed;
* security review complete.

State:

> **Activation blocked · NDA acknowledgement required**

---

# 63. External shell

External participants should enter through a visibly reduced interface containing only permitted destinations.

Possible external destinations:

* Overview;
* information requests;
* document submission;
* selected documents;
* assigned approval;
* closing signature;
* help and security.

They should not see internal navigation such as:

* Diligence findings;
* unrestricted Valuation;
* Buyer Universe;
* negotiation strategy;
* internal Tasks & Approvals;
* full Agentic Workspace;
* Team;
* Organizations;
* global search.

---

# 64. Client participants

Client participants may receive different permissions according to role.

## Client Principal

May:

* Review approved summaries;
* approve selected outputs;
* authorize outreach;
* review negotiation alternatives;
* approve closing.

## Client Contributor

May:

* Submit information;
* review selected facts;
* respond to questions;
* comment on selected deliverables.

## Management Contributor

May:

* Fulfill information requests;
* upload documents;
* answer questions;
* confirm management representations.

They should not automatically see internal banker judgment.

---

# 65. External counsel

External counsel may need:

* Legal documents;
* Legal findings;
* contract review;
* closing requirements;
* signature workflows;
* privileged communication.

They should not automatically receive:

* Financial model;
* buyer strategy;
* commercial assessment;
* client-only communication;
* relationship notes.

Where legal privilege requires a separate zone, access should be explicitly managed.

---

# 66. External specialist

Examples:

* Tax specialist;
* accounting advisor;
* environmental consultant;
* technology reviewer.

A specialist should generally receive:

* Specific workstream;
* related documents;
* assigned questions;
* ability to submit findings;
* limited duration.

They should not receive full deal access merely for convenience.

---

# 67. External auditor

An external auditor may receive:

* Read-only approved records;
* selected evidence;
* Activity & Audit;
* export packages;
* no drafting or approval authority.

Historical audit access should be:

* Time-bound;
* scoped;
* logged;
* export-controlled.

---

# 68. Restricted Zones

The Restricted Zones view should manage high-sensitivity evidence and outputs.

Recommended zone types:

1. **Internal Deal Team**
2. **Legal Privileged**
3. **Financial Clean Team**
4. **Customer-Level Data**
5. **Employee and Personal Data**
6. **Buyer Strategy**
7. **Negotiation Strategy**
8. **Funds Flow and Bank Details**
9. **Client-Only**
10. **Custom Restricted Zone**

---

# 69. Access-zone anatomy

Each zone should contain:

* Name;
* purpose;
* sensitivity;
* included documents and objects;
* authorized participants;
* administrators;
* download rules;
* automated-processing policy;
* expiry;
* review state.

Example:

> **Financial Clean Team**

Purpose:

> Customer-level and commercially sensitive operating data.

Members:

* Marina Alves;
* Ana Costa;
* Felipe Rocha.

Restrictions:

* Watermarked access;
* no external export;
* no copying;
* derived outputs require review before wider visibility.

---

# 70. Clean-team behavior

A clean-team protocol should support:

* Named eligible participants;
* restricted raw evidence;
* sanitized derived outputs;
* no unrestricted export;
* separate audit;
* periodic review;
* controlled external disclosure.

Example:

```text
Raw customer-level revenue
  ↓
Financial Clean Team
  ↓
Concentration calculation
  ↓
Reviewed derived fact: 41,2%
  ↓
Approved finding and valuation treatment
```

Participants outside the clean team may see the approved derived fact without seeing raw customer names.

---

# 71. Sanitized downstream objects

When restricted evidence produces a broader transaction output, show:

* Raw source restriction;
* sanitized result;
* reviewer;
* approved audience;
* prohibited details.

Example:

> **Top-three concentration: 41,2%**

Visible to:

> Internal Deal Team

Hidden:

* Customer identities;
* customer-level revenue;
* contract terms.

Approved by:

> Ana Costa

---

# 72. Legal-privileged zone

Legal privilege may require:

* Restricted participant list;
* external-counsel membership;
* document watermarking;
* no general search snippets;
* no Copilot exposure outside the zone;
* restricted exports;
* separate audit visibility.

The page should not itself decide whether material is legally privileged.

It records the configured classification and authority.

---

# 73. Personal-data zone

Personal-data controls may restrict:

* Employee rosters;
* compensation;
* benefit information;
* identification records;
* health information;
* background checks.

Possible controls:

* Metadata only;
* masked values;
* no download;
* review in secure viewer;
* limited retention;
* named reviewer.

---

# 74. Funds-flow and bank-details zone

This should be one of the strongest restrictions.

Recommended controls:

* Named participants only;
* dual verification;
* no normal Copilot access;
* no email excerpts;
* no broad export;
* access expiry after closing;
* every view and change logged according to policy.

Changing payment instructions should trigger:

* High-risk alert;
* verification workflow;
* approval invalidation where appropriate.

---

# 75. Document restrictions

Document-level restrictions may control:

* Visibility;
* metadata visibility;
* preview;
* download;
* print;
* copy;
* watermark;
* offline access;
* external share;
* expiry;
* automated analysis.

Examples:

> View in secure viewer · Download disabled

> Metadata only

> Internal Legal only

> Clean Team · Watermarked download

---

# 76. Document permission inheritance

Document access may derive from:

* Source folder;
* document classification;
* workstream;
* access zone;
* participant exception.

A document moved into a more restricted folder should not remain accessible through:

* Search;
* old citation;
* notification;
* artifact;
* browser history;
* Copilot context.

Historical references should become redacted where required.

---

# 77. Automated-processing access

Deal Team & Access should display a concise deal-specific view of whether M&Ai may process restricted zones.

Possible states:

* Processing permitted;
* processing permitted with restricted outputs;
* selected capabilities only;
* processing excluded;
* human review required before output leaves zone.

Detailed model and data-governance policy belongs in Security & Data Governance.

## Example

> Financial Clean Team
> Automated calculation permitted
> Generative summaries restricted to zone members

---

# 78. Agentic Workspace restrictions

Agentic missions should inherit:

* User access;
* deal scope;
* selected source restrictions;
* external-participant limits;
* document-zone rules.

An agent must not gain access simply because the user asks:

> Search every legal document.

If the user lacks privileged-zone access, the mission should state:

> Restricted Legal sources were excluded.

---

# 79. Global Search restrictions

Search results should respect effective deal access.

A participant without Negotiation access should not learn:

* Proposal names;
* bidder identities;
* values;
* counts;
* negotiation terminology;
* related contact names.

Permission filtering should apply before:

* Suggestions;
* counts;
* snippets;
* result ranking.

---

# 80. Approval-authority view

The screen should provide a dedicated authority registry.

Recommended columns:

1. Approval category;
2. participant;
3. role;
4. threshold or scope;
5. separation-of-duties requirement;
6. effective period;
7. policy;
8. coverage state.

Example:

| Authority           | Participant   | Scope                     | State   |
| ------------------- | ------------- | ------------------------- | ------- |
| Diligence findings  | Ana Costa     | Financial findings        | Covered |
| Valuation treatment | Ana Costa     | Up to R$ 25 mi impact     | Covered |
| Final valuation     | Marina Alves  | Complete model            | Covered |
| Buyer outreach      | Marina Alves  | All candidates            | Covered |
| Client shortlist    | Helena Duarte | Selected portal           | Covered |
| Closing waiver      | —             | Client Principal required | Gap     |

---

# 81. Separation of duties

The screen should identify incompatible combinations.

Examples:

* Preparer cannot be final approver;
* access administrator cannot approve their own exception;
* payment verifier cannot perform both verification steps;
* external counsel cannot approve client commercial terms;
* analyst cannot grant themselves restricted-zone access;
* clean-team reviewer cannot release unsanitized evidence.

## State

> **Authority conflict**

Example:

> Felipe Rocha prepared scenario v4 and cannot be its independent approver.

---

# 82. Authority substitution

Temporary substitution may be needed during absence.

Required:

* Original authority holder;
* substitute;
* approval category;
* affected deals or objects;
* start and end;
* policy validation;
* separation-of-duties check;
* reason;
* approver.

Temporary authority should expire automatically.

---

# 83. Access requests

Participants should be able to request additional access.

Required:

* Requested scope;
* business reason;
* required actions;
* duration;
* related task;
* urgency;
* sponsor, for external users.

Example:

> **Request Legal workstream access**

Reason:

> Review tax indemnity provisions affecting the valuation bridge.

Duration:

> Until 7 ago. 2026

---

# 84. Access-request workflow

```text
Participant requests access
  ↓
Policy and conflicts checked
  ↓
Approver assigned
  ↓
Scope and duration reviewed
  ↓
Approve / reduce scope / reject
  ↓
Access activated
  ↓
Expiry or access review scheduled
```

The request should appear in Tasks & Approvals.

---

# 85. Access-request decision

Decision options:

* Approve requested scope;
* approve reduced scope;
* approve temporarily;
* request more information;
* reject;
* redirect to sanitized output;
* require clean-team membership.

The rationale and effective permission should be recorded.

---

# 86. Temporary access

Temporary access should require:

* Scope;
* start;
* expiry;
* purpose;
* approver;
* restrictions;
* review or automatic revocation.

Example:

> Daniel Ribeiro
> Temporary Legal document access
> 28 jul.–4 ago. 2026
> Tax-indemnity analysis only

---

# 87. Emergency access

An enterprise implementation may support **Emergency Access** or **Break Glass** for exceptional situations.

It should require:

* Named participant;
* exact scope;
* reason;
* short expiry;
* immediate audit event;
* security notification;
* retrospective review.

It should never become a convenient way to bypass ordinary permissions.

---

# 88. Emergency-access state

Example:

> **Emergency access active**

Participant:

> Marina Alves

Scope:

> Closing bank-detail zone

Expires:

> 28 jul. 2026 · 15:30 BRT

Reason:

> Funds-flow verifier unavailable

Required:

> Security review within 24 hours

---

# 89. Access expiry

Expiry may apply to:

* External participant;
* temporary workstream;
* restricted zone;
* approval substitution;
* auditor access;
* information-request portal;
* closing-day access.

The system should provide reminders before expiry.

Expired access should be revoked automatically where policy requires.

---

# 90. Expiry consequence

Before expiry, show:

> **Camila Nunes access expires in 14 days**

Affected:

* Legal Diligence;
* closing documents;
* three open tasks.

Actions:

* Extend;
* transfer work;
* allow expiry.

Expiry should not silently orphan tasks.

---

# 91. Access Reviews

Access reviews should occur:

* Periodically;
* at phase transition;
* before external renewal;
* after role change;
* after sponsor change;
* before closing;
* after source sensitivity changes;
* during deal archive.

Recommended views:

* Due now;
* upcoming;
* completed;
* exceptions;
* overdue.

---

# 92. Access-review anatomy

> **Quarterly external access review**

Participant:

> Camila Nunes · External Counsel

Current scope:

* Legal;
* Closing;
* privileged-zone access.

Open work:

* Two Legal reviews;
* one closing-document task.

Last activity:

> 24 jul. 2026

Decision required:

* Retain;
* reduce;
* extend;
* suspend;
* revoke.

---

# 93. Review by exception

For larger teams, the system should highlight changes since the previous review:

* New workstream;
* new restricted zone;
* new approval authority;
* no recent activity;
* sponsor changed;
* active work ended;
* expiry extended;
* deal phase changed.

Participants without changes may still require confirmation according to policy.

---

# 94. Last activity

The screen may show a participant’s last meaningful deal activity to identify:

* Dormant external access;
* unused invitations;
* inactive specialists;
* access remaining after work completed.

Appropriate examples:

* Submitted Legal review;
* opened restricted document;
* approved deliverable;
* completed information request.

Do not interpret last activity as:

* Productivity;
* performance;
* employee engagement;
* hours worked.

---

# 95. Dormant access

Example:

> **External access unused for 30 days**

Participant:

> Pedro Azevedo · Management Contributor

Open work:

> None

Access:

> Information Request Portal

Recommended action:

> Review continuing need

Dormancy should be an access-review signal, not an automatic accusation.

---

# 96. Participant removal

Removing a participant should distinguish:

## End responsibility

Stops new work assignment but may retain historical read access.

## Suspend access

Temporarily disables active access.

## Revoke access

Immediately removes current permissions.

## Remove from deal

Ends participation and access while preserving history.

## Expire external access

Ends access at the configured time.

---

# 97. Removal impact review

Before removal, show:

* Open tasks;
* pending approvals;
* draft artifacts;
* accountable responsibilities;
* restricted-zone membership;
* active invitations;
* external communications;
* owned information requests;
* audit consequence.

Example:

> **Remove Felipe Rocha from Project Horizon?**

Affected:

* 3 Diligence tasks;
* 1 valuation draft;
* Financial Clean Team membership;
* 2 document-review assignments.

Required:

> Transfer or close responsibilities before removal.

---

# 98. Responsibility transfer

Recommended sequence:

1. Select outgoing participant;
2. review deal roles;
3. select replacement;
4. validate capability;
5. validate access;
6. validate authority;
7. transfer open tasks;
8. transfer draft objects;
9. update access;
10. confirm effective time.

Historical actions remain attributed to the original participant.

---

# 99. Access reduction

Reducing access may affect:

* Current open page;
* active mission;
* cached source;
* export;
* task;
* selected evidence;
* browser session.

The system should invalidate current access immediately according to policy.

Example:

> Negotiation access removed

The user’s active Negotiation session should be closed or redacted.

---

# 100. Permission change comparison

Before saving a change, show:

| Scope               | Current   | Proposed           |
| ------------------- | --------- | ------------------ |
| Valuation           | View      | Review             |
| Negotiation         | No access | Summary            |
| Legal documents     | No access | View               |
| Downloads           | Disabled  | Disabled           |
| Valuation authority | None      | Treatment approval |

Highlight:

* Expanded access;
* reduced access;
* new authority;
* removed restrictions;
* expiry changes.

---

# 101. High-risk access changes

Changes requiring stronger control may include:

* Granting bank-detail access;
* adding a clean-team member;
* granting external download;
* granting negotiation strategy;
* assigning approval authority;
* extending expired external access;
* allowing restricted exports;
* granting access to an excluded counterparty.

These may require:

* Secondary approval;
* security review;
* client authorization;
* explicit rationale.

---

# 102. Conflict and exclusion checks

Before activating a participant, verify relevant restrictions.

Examples:

* Current competing mandate;
* client exclusion;
* counterparty conflict;
* legal conflict;
* clean-team incompatibility;
* personal relationship;
* previous bidder involvement;
* restricted organization.

The screen may show only a safe conflict summary.

Detailed review belongs in the appropriate conflict workflow.

---

# 103. Access exception

An exception should contain:

* Normal policy;
* approved deviation;
* reason;
* scope;
* participant;
* approver;
* effective period;
* compensating restrictions;
* review date.

Example:

> External Counsel permitted to download selected execution documents
> Watermark required · Expires at signing

---

# 104. Bulk actions

Appropriate:

* Request access review;
* assign a common workstream;
* set review date;
* add participants to a non-sensitive group;
* export selected participant register.

Controlled:

* Reduce access;
* extend several routine external expiries after individual review;
* apply a role template;
* revoke inactive invitations.

Inappropriate:

* Bulk grant all workstreams;
* bulk grant approval authority;
* bulk add clean-team access;
* bulk enable downloads;
* bulk approve exceptions;
* bulk remove active owners.

---

# 105. Search

Search should include:

* Participant name;
* organization;
* deal role;
* workstream;
* access zone;
* approval authority;
* sponsor;
* invitation email.

Placeholder:

> Search participants, roles or access scopes

Example:

> `valuation`

Results:

* Ana Costa — Valuation Review;
* Felipe Rocha — Valuation Contributor;
* Marina Alves — Final Valuation Approval;
* Financial Clean Team;
* Valuation access review.

---

# 106. Filters

## Primary filters

* Participant type;
* active state;
* deal role;
* workstream;
* access level;
* review state.

## Advanced filters

* Internal sponsor;
* approval authority;
* restricted-zone membership;
* expiry;
* invitation state;
* temporary access;
* external organization;
* no recent activity;
* high-risk access;
* access exception;
* work requiring transfer.

---

# 107. Saved views

Recommended:

* Internal deal team;
* external participants;
* access reviews due;
* expiring access;
* restricted-zone members;
* approvers;
* no recent activity;
* pending invitations;
* access exceptions;
* closing participants.

Saved views preserve:

* Filters;
* visible columns;
* grouping;
* sort;
* matrix orientation.

---

# 108. History

The History view should show material participant and access events:

* Participant added;
* invitation sent;
* invitation accepted;
* access activated;
* role changed;
* workstream added;
* restriction applied;
* authority granted;
* access reviewed;
* access suspended;
* access revoked;
* participant removed;
* exception approved.

The complete immutable event should also be available in Activity & Audit.

---

# 109. Access-event anatomy

> **Valuation review access granted**

Participant:

> Ana Costa

Previous:

> Contribute

Current:

> Review

Authority:

> Valuation-treatment approval added

Changed by:

> Marina Alves

Effective:

> 28 jul. 2026 · 10:36 BRT

Reason:

> Financial Review VP assignment

---

# 110. Export behavior

Appropriate exports:

* Current participant register;
* workstream access matrix;
* approval-authority register;
* external-participant register;
* invitation status;
* access-review report;
* restricted-zone membership;
* access-change history.

Every export should state:

* Deal;
* generated by;
* generated at;
* scope;
* redactions;
* current-through timestamp;
* confidentiality.

Exporting sensitive access information should create an audit event.

---

# 111. Contextual Copilot

Suggested prompts:

* Who can access customer-level revenue?
* Which external participants expire this month?
* Who may approve a valuation treatment?
* Does Felipe have access to Negotiation?
* Which responsibilities are unassigned?
* Explain Ana’s effective Valuation access.
* Which participants can download Legal documents?
* Show access changes made this week.
* Which external users have no recent activity?
* Prepare the quarterly access-review summary.

## Response requirements

The Copilot should:

* Use effective permissions, not only templates;
* distinguish responsibility from access;
* distinguish access from approval authority;
* respect restricted participant information;
* explain permission inheritance;
* never grant access directly;
* route changes through controlled workflows.

---

# 112. Recommended desktop layout

For a **1440 × 900** canvas:

| Region                       | Approximate width |
| ---------------------------- | ----------------: |
| Compact global sidebar       |          72–80 px |
| Deal context navigation      |        112–136 px |
| View and filter rail         |        220–260 px |
| Participant or matrix canvas |        600–760 px |
| Detail panel                 |        360–440 px |
| Page padding                 |          24–32 px |

## Recommended composition

```text
┌────────┬──────────────────────────────────────────────────────────────┐
│ Global │ Project Horizon · Deal Team & Access                        │
│ shell  ├──────────────────────────────────────────────────────────────┤
│        │ Overview Participants Matrix Zones Invitations Reviews      │
│        ├──────────────┬─────────────────────────┬─────────────────────┤
│        │ Views        │ Participants            │ Selected member     │
│        │              │                         │                     │
│        │ Internal  8  │ Marina Alves            │ Ana Costa · VP      │
│        │ External  3  │ Deal Lead · Internal    │                     │
│        │ Reviews   2  │                         │ Financial Review VP │
│        │ Expiring  1  │ Ana Costa               │                     │
│        │ Restricted   │ Financial Review VP     │ Diligence · Review  │
│        │ zones     3  │                         │ Valuation · Review   │
│        │              │ Felipe Rocha            │ Negotiation · Summary│
│        │ Workstreams  │ Associate · Contributor │                     │
│        │ Financial    │                         │ Authority           │
│        │ Legal        │ Camila Nunes            │ Treatment approval  │
│        │ Closing      │ External Counsel        │                     │
│        │              │ Expires 30 set.         │ [ Edit access ]     │
└────────┴──────────────┴─────────────────────────┴─────────────────────┘
```

---

# 113. Access Matrix layout

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Access Matrix · Effective permissions                               │
├──────────────────┬──────────┬──────────┬──────────┬────────┬─────────┤
│ Participant      │ Dossier  │ Documents│ Diligence│ Value  │ Negoti. │
├──────────────────┼──────────┼──────────┼──────────┼────────┼─────────┤
│ Marina Alves     │ Review   │ View     │ Review   │ Review │ Manage  │
│ Deal Lead        │          │          │          │  A     │   A     │
├──────────────────┼──────────┼──────────┼──────────┼────────┼─────────┤
│ Ana Costa        │ Review   │ Contrib. │ Review   │ Review │ Summary │
│ Financial VP     │          │          │   A      │   A    │         │
├──────────────────┼──────────┼──────────┼──────────┼────────┼─────────┤
│ Felipe Rocha     │ Contrib. │ Contrib. │ Contrib. │ Contrib│ None    │
├──────────────────┼──────────┼──────────┼──────────┼────────┼─────────┤
│ Camila Nunes     │ None     │ Legal    │ Legal    │ None   │ None    │
│ External Counsel│          │ scope    │ scope    │        │         │
└──────────────────┴──────────┴──────────┴──────────┴────────┴─────────┘

A = Approval authority exists; inspect policy for scope.
```

The matrix must provide a non-symbol-only accessible label for authority.

---

# 114. Restricted Zones layout

```text
┌──────────────────────────────────────────┬───────────────────────────┐
│ Restricted zones                         │ Financial Clean Team      │
│                                          │                           │
│ Financial Clean Team        3 members    │ Raw customer-level data  │
│ Customer and pricing data                │                           │
│                                          │ Members                   │
│ Legal Privileged            4 members    │ Marina · Ana · Felipe    │
│ Counsel communications                   │                           │
│                                          │ Controls                  │
│ Funds Flow                  2 members     │ No external export       │
│ Bank and payment details                 │ Watermark                 │
│                                          │ Sanitized outputs only    │
│ Client-Only                 2 members     │                           │
│ Selected approvals                       │ [ Manage zone ]           │
└──────────────────────────────────────────┴───────────────────────────┘
```

---

# 115. Mobile behavior

Recommended order:

1. Access posture;
2. actions requiring review;
3. internal team;
4. external participants;
5. restricted zones;
6. approval coverage;
7. invitations;
8. history.

Participant cards should show:

* Name;
* participant type;
* primary deal role;
* workstreams;
* access state;
* expiry;
* review status;
* primary action.

The complete access matrix may use:

* One selected participant at a time;
* vertical workspace rows;
* expandable effective-permission detail.

Complex zone administration remains desktop-first.

---

# 116. UI design direction

## Overall character

Aim for:

> **A transaction-specific confidentiality and accountability workspace designed around least privilege**

The screen should feel:

* Controlled;
* explicit;
* institutional;
* security-aware;
* calm;
* auditable;
* transaction-native.

It should not feel:

* Like a generic admin panel;
* like a spreadsheet of permission codes;
* like employee surveillance;
* like a social team directory;
* like an IT identity console.

---

# 117. Visual hierarchy

Prioritize:

1. Participant identity;
2. transaction responsibility;
3. effective access;
4. high-risk restrictions;
5. approval authority;
6. expiry or review;
7. sponsor;
8. administrative metadata.

Do not prioritize:

* Profile photo;
* last login;
* raw permission ID;
* number of clicks;
* broad institution title alone.

---

# 118. Color application

Use the established M&Ai palette:

* Canvas Cream: `#F3F0EE`
* Lifted Cream: `#FCFBFA`
* Ink Black: `#141413`
* Signal Orange: `#CF4500`
* Light Signal Orange: `#F37338`
* Dust Taupe: `#D1CDC7`
* Slate Gray: `#696969`

## Semantic application

* Active access: neutral-positive;
* access review due: amber;
* external participant: outlined neutral;
* restricted zone: dark neutral;
* pending invitation: blue-neutral;
* expiry soon: Signal Orange;
* suspended: red-orange;
* revoked: red;
* authority gap: Signal Orange;
* high-risk exception: deep red;
* historical participant: gray.

Do not use green to imply that access is universally safe.

---

# 119. Typography

Use **Sofia Sans**.

| Element              |     Size |  Weight |
| -------------------- | -------: | ------: |
| Page title           | 26–30 px | 500–600 |
| Participant name     | 14–16 px | 650–700 |
| Selected participant | 20–24 px | 600–700 |
| Access level         | 12–14 px | 600–700 |
| Section heading      | 15–17 px | 650–700 |
| Body                 | 13–15 px | 450–500 |
| Metadata             | 11–13 px | 450–550 |
| Status               | 11–12 px | 650–700 |
| Matrix cell          | 12–13 px | 550–650 |

Use tabular numerals for:

* Dates;
* times;
* thresholds;
* participant counts;
* expiry periods.

Use pt-BR formatting:

* `30 set. 2026`
* `28 jul. 2026 · 10:36 BRT`
* `R$ 25 mi`

---

# 120. Geometry and density

Recommended:

* Participant rows: 64–80 px;
* matrix cells: 48–60 px;
* summary surfaces: 6–10 px radius;
* status badges: compact;
* detail drawer: flush against viewport;
* restricted-zone rows: 56–68 px;
* strong column headers and dividers.

Avoid:

* Oversized member cards;
* giant avatars;
* circular security scores;
* dense raw checkbox grids;
* one card per permission;
* heavy shadows;
* decorative shield graphics.

---

# 121. UX design principles

## 121.1 Responsibility and access are separate

An assignment does not prove permission.

## 121.2 Access and authority are separate

Review access does not prove approval authority.

## 121.3 Least privilege is the default

Grant only the required scope and duration.

## 121.4 Specific restriction overrides broad access

Document and zone controls must remain enforceable.

## 121.5 External participants require sponsorship

Every external participant has an accountable internal owner.

## 121.6 External experiences remain reduced

Do not simulate client access through an internal view toggle.

## 121.7 Effective access must be explainable

Users should understand template, inheritance and restrictions.

## 121.8 Sensitive access expires

External, exceptional and clean-team access should be reviewed.

## 121.9 Removal preserves history

Past work and decisions remain attributed.

## 121.10 Permission changes are versioned

Concurrent changes must not overwrite each other silently.

## 121.11 Search and AI obey the same boundaries

Restricted information must not leak through adjacent features.

## 121.12 Access activity is not performance data

Last activity supports security review, not employee ranking.

---

# 122. System states

## 122.1 No participants

> **Build the deal team**

Primary action:

> Add participant

Supporting:

> Assign the people responsible for preparing, reviewing and approving transaction work.

## 122.2 Deal Lead missing

> **Deal Lead required**

The deal may remain in setup or restricted state until assigned.

## 122.3 Responsibility gap

Show exact missing role and consequence.

## 122.4 Approval-authority gap

> No eligible approver exists for final valuation.

## 122.5 Pending invitation

Show sent date, expiry and activation requirements.

## 122.6 Invitation expired

Actions:

* Send replacement invitation;
* revoke;
* remove proposed participant.

## 122.7 Activation incomplete

Show the unresolved condition.

## 122.8 Access review overdue

Show participant, current scope and risk.

## 122.9 External access expiring

Show affected work and sponsor.

## 122.10 Access conflict

> The proposed access violates a restricted-zone rule.

## 122.11 Separation-of-duties conflict

Explain the incompatible responsibilities.

## 122.12 Participant suspended

Disable active access while preserving assignments for review.

## 122.13 Access revoked

Historical record remains available.

## 122.14 Participant removed

Read-only historical participation.

## 122.15 Restricted participant

Show only permission-safe identity.

## 122.16 Partial service failure

Example:

> Document restrictions unavailable

Participant and workstream access remain visible, but changes are disabled.

## 122.17 Concurrent update

Show exact permission differences.

## 122.18 Archived deal

All access is read-only or revoked according to policy.

## 122.19 Offline

Allow safe cached review.

Disable:

* Invitations;
* access changes;
* authority changes;
* revocation;
* access-review decisions.

---

# 123. Accessibility requirements

The screen should support:

* Semantic participant tables;
* accessible matrix headers;
* participant names as row headers;
* workspace names as column headers;
* keyboard matrix navigation;
* visible focus;
* no color-only access states;
* complete textual authority labels;
* accessible comparison tables;
* minimum 44 × 44 px actions;
* correctly announced restrictions;
* accessible invitation states;
* accessible expiry dates;
* clear internal versus external labels;
* focus preservation after permission changes;
* accessible effective-permission explanation;
* reduced-motion behavior.

Avoid actions labeled:

> Edit

Prefer:

> Edit Ana Costa’s Project Horizon access

---

# 124. Figma component architecture

## `DealTeamAccessHeader`

Properties:

* Controlled;
* review required;
* gap;
* high risk;
* archived;
* restricted.

## `DealAccessTabs`

* Overview;
* participants;
* matrix;
* zones;
* invitations;
* reviews;
* history.

## `AccessPosture`

Properties:

* Controlled;
* review;
* exception;
* coverage gap;
* high risk.

## `ParticipantDirectory`

States:

* Populated;
* internal;
* external;
* filtered;
* empty;
* loading;
* partial error.

## `DealParticipantRow`

Properties:

* Internal;
* external;
* client;
* management;
* advisor;
* auditor;
* invited;
* expiring;
* suspended;
* removed;
* restricted.

## `DealParticipantIdentity`

Properties:

* Internal member;
* Contact;
* external organization;
* restricted;
* historical.

## `DealRole`

Properties:

* Lead;
* contributor;
* reviewer;
* approver;
* observer;
* external.

## `AccessSummary`

Properties:

* Summary;
* view;
* contribute;
* review;
* manage;
* restricted;
* customized.

## `ApprovalAuthoritySummary`

Properties:

* None;
* limited;
* full category;
* temporary;
* conflict;
* gap.

## `ParticipantDetail`

States:

* Active;
* invited;
* review due;
* expiring;
* suspended;
* removed;
* restricted.

## `AccessMatrix`

Properties:

* Participants by workspace;
* workspace by participants;
* filtered;
* editing;
* proposed changes;
* restricted.

## `AccessMatrixCell`

Properties:

* None;
* summary;
* view;
* contribute;
* review;
* manage;
* customized;
* restricted;
* authority present.

## `EffectivePermissionInspector`

Properties:

* Template;
* inherited;
* explicit grant;
* explicit deny;
* exception;
* conflict.

## `RestrictedZoneDirectory`

Properties:

* Clean Team;
* privileged;
* personal data;
* negotiation;
* funds flow;
* client only;
* custom.

## `RestrictedZoneDetail`

Properties:

* Controlled;
* review due;
* exception;
* no members;
* high risk.

## `InvitationFlow`

States:

* Identity;
* purpose;
* sponsor;
* role;
* access;
* restrictions;
* security;
* review;
* sent.

## `InvitationRow`

Properties:

* Draft;
* sent;
* accepted;
* activation;
* active;
* expired;
* revoked;
* failed.

## `AccessReview`

Properties:

* Due;
* upcoming;
* complete;
* overdue;
* exception;
* restricted.

## `PermissionChangeComparison`

Properties:

* Expanded;
* reduced;
* authority;
* restriction;
* expiry.

## `AccessRequest`

Properties:

* Draft;
* submitted;
* approved;
* reduced;
* rejected;
* expired.

## `ParticipantRemovalFlow`

States:

* Impact;
* transfer;
* access;
* confirm;
* complete;
* blocked.

---

# 125. Production object model

## `DealParticipant`

```text
id
dealId
participantType
institutionMembershipId
externalContactId
externalOrganizationId
primaryDealRole
participationPurpose
internalSponsorId
status
effectiveFrom
effectiveTo
confidentialityLevel
createdBy
createdAt
updatedAt
version
```

## `DealRoleAssignment`

```text
id
dealParticipantId
roleType
workstreamType
accountabilityType
primary
effectiveFrom
effectiveTo
assignedBy
status
createdAt
updatedAt
```

## `DealAccessGrant`

```text
id
dealParticipantId
scopeType
scopeId
accessLevel
capabilities
sourceType
sourceId
effectiveFrom
expiresAt
status
grantedBy
approvedBy
createdAt
updatedAt
version
```

## `DealAccessRestriction`

```text
id
dealParticipantId
scopeType
scopeId
restrictionType
restrictedCapabilities
reasonCategory
authorityReference
effectiveFrom
expiresAt
status
createdAt
updatedAt
```

## `DealApprovalAuthority`

```text
id
dealParticipantId
approvalCategory
workstreamType
scopeType
scopeId
thresholdPolicy
authorityPolicyId
effectiveFrom
expiresAt
status
grantedBy
approvedBy
createdAt
updatedAt
```

## `DealAccessTemplate`

```text
id
institutionId
name
participantType
dealRoleType
defaultGrants
defaultRestrictions
defaultAuthority
defaultExpiryPolicy
effectiveAt
supersededAt
createdAt
```

## `DealAccessZone`

```text
id
dealId
name
zoneType
purpose
sensitivity
administratorParticipantIds
processingPolicy
exportPolicy
reviewPolicy
status
createdAt
updatedAt
version
```

## `DealAccessZoneMembership`

```text
id
accessZoneId
dealParticipantId
accessLevel
effectiveFrom
expiresAt
approvedBy
status
createdAt
updatedAt
```

## `DealObjectAccessPolicy`

```text
id
dealId
objectType
objectId
accessZoneId
defaultAccessLevel
restrictedCapabilities
processingPolicy
effectiveFrom
effectiveTo
createdAt
updatedAt
```

## `DealInvitation`

```text
id
dealId
dealParticipantId
email
invitationType
status
sentBy
sentAt
expiresAt
acceptedAt
identityVerifiedAt
activatedAt
revokedAt
authenticationPolicy
createdAt
updatedAt
```

## `DealAccessRequest`

```text
id
dealId
requesterParticipantId
requestedScopeType
requestedScopeId
requestedCapabilities
businessReason
requestedFrom
requestedUntil
urgency
status
assignedApproverId
decision
decisionRationale
decidedBy
decidedAt
createdAt
updatedAt
```

## `DealAccessReview`

```text
id
dealId
reviewType
scopeType
scopeId
reviewPeriodStart
reviewPeriodEnd
dueAt
status
assignedTo
changeSummary
completedBy
completedAt
outcome
createdAt
updatedAt
```

## `DealAccessReviewItem`

```text
id
accessReviewId
dealParticipantId
currentAccessSnapshot
changeSincePriorReview
openResponsibilitySummary
lastMeaningfulActivityAt
recommendedAction
decision
decisionRationale
createdAt
updatedAt
```

## `DealAccessException`

```text
id
dealId
dealParticipantId
policyReference
exceptionScope
reason
compensatingControls
effectiveFrom
expiresAt
status
requestedBy
approvedBy
reviewedAt
createdAt
updatedAt
```

## `DealParticipantActivitySummary`

```text
id
dealParticipantId
lastMeaningfulActivityType
lastMeaningfulActivityObjectId
lastMeaningfulActivityAt
lastAccessReviewAt
openTaskCount
pendingApprovalCount
generatedAt
```

## `DealAccessEvent`

```text
id
dealId
dealParticipantId
eventType
actorType
actorId
beforeSnapshot
afterSnapshot
reason
occurredAt
```

---

# 126. Suggested routes

Primary:

```text
/deals/:dealId/team
```

Participants:

```text
/deals/:dealId/team?view=participants
```

Access Matrix:

```text
/deals/:dealId/team?view=matrix
```

Restricted Zones:

```text
/deals/:dealId/team?view=zones
```

Invitations:

```text
/deals/:dealId/team?view=invitations
```

Access Reviews:

```text
/deals/:dealId/team?view=reviews
```

History:

```text
/deals/:dealId/team?view=history
```

Selected participant:

```text
/deals/:dealId/team?participant=:participantId
```

Selected zone:

```text
/deals/:dealId/team?view=zones&zone=:zoneId
```

Invitation:

```text
/deals/:dealId/team/invitations/:invitationId
```

Access request:

```text
/deals/:dealId/team/access-requests/:requestId
```

Access review:

```text
/deals/:dealId/team/access-reviews/:reviewId
```

---

# 127. API direction

Recommended endpoints:

```text
GET    /api/deals/:dealId/participants
POST   /api/deals/:dealId/participants
GET    /api/deals/:dealId/participants/:participantId
PATCH  /api/deals/:dealId/participants/:participantId
POST   /api/deals/:dealId/participants/:participantId/suspend
POST   /api/deals/:dealId/participants/:participantId/revoke
POST   /api/deals/:dealId/participants/:participantId/remove

GET    /api/deals/:dealId/access-matrix
GET    /api/deals/:dealId/access-effective
POST   /api/deals/:dealId/access-grants
PATCH  /api/deals/:dealId/access-grants/:grantId
DELETE /api/deals/:dealId/access-grants/:grantId

POST   /api/deals/:dealId/access-restrictions
PATCH  /api/deals/:dealId/access-restrictions/:restrictionId

GET    /api/deals/:dealId/access-zones
POST   /api/deals/:dealId/access-zones
PATCH  /api/deals/:dealId/access-zones/:zoneId

POST   /api/deals/:dealId/invitations
POST   /api/deals/:dealId/invitations/:invitationId/resend
POST   /api/deals/:dealId/invitations/:invitationId/revoke

POST   /api/deals/:dealId/access-requests
POST   /api/deals/:dealId/access-requests/:requestId/decisions

GET    /api/deals/:dealId/access-reviews
POST   /api/deals/:dealId/access-reviews
POST   /api/deals/:dealId/access-reviews/:reviewId/complete
```

Every protected API should evaluate effective access independently.

The front end must not be treated as the enforcement boundary.

---

# 128. Permission-evaluation service

The production system needs a central authorization service that evaluates:

* Institution;
* deal;
* participant;
* active assignment;
* role template;
* access grant;
* restriction;
* zone membership;
* object policy;
* authority;
* expiry;
* separation of duties.

Recommended decision output:

```text
decision
allowedCapabilities
deniedCapabilities
effectiveScope
authority
restrictions
expiresAt
explanation
policyReferences
```

The same service should govern:

* UI;
* API;
* search;
* Copilot;
* agent tools;
* exports;
* notifications;
* document previews.

---

# 129. Repository direction

The current repository contains a narrow prototype foundation:

* `GET /api/team-members`;
* `GET /api/deals/:dealId/team-assignments`;
* versioned replacement through `PUT /api/deals/:dealId/team-assignments`;
* a basic `TeamMember` record containing name, email, role, firm, avatar and active state;
* a basic assignment containing member, assignment role, transaction side and lead flag;
* optimistic deal-version checking;
* validation preventing multiple lead assignments;
* a Deal Detail team card whose management action is currently disabled.

This is useful for displaying a basic deal-team list, but it is not yet an access-control implementation.

## Keep

* Stable Team member identity;
* deal-scoped assignments;
* optimistic version checks;
* single accountable Deal Lead direction;
* transaction-side context;
* existing Team list;
* Deal Detail summary;
* typed API contracts.

## Add

* Internal and external participant distinction;
* Contact and Organization association;
* invitation lifecycle;
* internal sponsor;
* workstream assignments;
* access grants;
* restrictions;
* approval authority;
* document zones;
* clean-team membership;
* temporary access;
* expiry;
* access requests;
* reviews;
* suspension and revocation;
* permission evaluation;
* access audit.

## Replace

### Whole-list assignment replacement

The current API replaces every assignment in one write.

Use granular operations for:

* Add participant;
* change role;
* transfer responsibility;
* revoke access;
* update one grant.

Whole-list replacement increases the risk of overwriting concurrent permission changes.

### Free-text assignment role

Replace unconstrained strings such as:

> `lead_advisor`

with governed role identifiers and institution-defined templates.

### Assignment side as access policy

The existing:

* buyer;
* seller;
* target;
* neutral;

may remain useful transaction context.

It must not determine permissions by itself.

### Lead flag as complete authority

`isLead` should designate the accountable Deal Lead.

It should not automatically imply unrestricted access or every approval authority.

### Disabled management action

Replace the disabled **Manage assignments** button with a link to this workspace once the participant and access APIs are available.

---

# 130. Production enforcement tests

Critical tests should cover:

* Unauthorized deal access;
* workstream restriction;
* document-level restriction;
* explicit deny precedence;
* expired temporary access;
* external-participant scope;
* clean-team membership;
* approval-authority threshold;
* separation of duties;
* revoked access during active session;
* search-result redaction;
* Copilot source exclusion;
* notification redaction;
* export restrictions;
* concurrent access changes;
* invitation replay;
* duplicate external identity;
* access-review completion;
* audit-event creation.

No UI-only test is sufficient for authorization.

---

# 131. What not to include

Avoid:

* One generic full-access toggle;
* approval authority inside a simple access-level hierarchy;
* professional title as the only permission signal;
* deal assignment automatically granting access;
* external participation without a sponsor;
* external access without expiry;
* client and banker view switching;
* unrestricted external global search;
* unrestricted external Copilot;
* hidden permission inheritance;
* role templates with no effective-access explanation;
* bulk clean-team grants;
* self-granted restricted access;
* self-approved access exceptions;
* removal without task transfer;
* last activity used as productivity data;
* raw backend permission codes as the default UI;
* mock permissions presented as enforced security;
* real participant identities in pitch fixtures.

---

# 132. MOCKED — Product and demo specification

## Purpose

The mocked Deal Team & Access screen should demonstrate:

* Deal-specific least privilege;
* internal and external separation;
* workstream access;
* approval coverage;
* clean-team restrictions;
* invitation and expiry control.

Its narrative is:

> **M&Ai gives every transaction participant the evidence and authority required for their responsibility—without exposing the rest of the deal.**

This screen is operationally important but weak as a primary pitch image.

It is useful for:

* Enterprise security discussions;
* live product walkthroughs;
* external-collaboration demonstrations;
* explaining deal isolation;
* proving human approval governance.

The architecture classifies Team and Settings surfaces as operationally necessary but weaker for the main deck. 

---

# 133. Mocked shell state

Institution:

> **Atlas M&A Advisory**

User:

> **Ana Costa · Vice President**

Deal:

> **Project Horizon**
> Atlas Industrial · Sell-side
> Due Diligence · Restricted workspace

Breadcrumb:

> Deals / Project Horizon / Deal Team & Access

Header state:

* 8 internal members;
* 3 external participants;
* 1 pending invitation;
* 2 access reviews;
* 1 restricted zone requiring review.

---

# 134. Mocked internal participants

## Marina Alves

> **Deal Lead · Managing Director**

Access:

* All internal workstreams;
* Negotiation management;
* Closing review;
* access administration.

Authority:

* Final valuation;
* buyer outreach;
* negotiation response;
* closing readiness.

Restriction:

> Funds-flow actions require second verifier.

---

## Ana Costa — selected

> **Financial Review VP · Vice President**

Workstreams:

* Financial;
* Diligence;
* Valuation.

Access:

* Dossier: Review;
* Documents: Financial contribute;
* Diligence: Review;
* Valuation: Review;
* Negotiation: Approved summary only;
* Closing: No bank-detail access.

Authority:

> Valuation treatments up to R$ 25 mi impact

Restricted zones:

> Financial Clean Team

---

## Felipe Rocha

> **Financial Associate**

Workstreams:

* Financial;
* Documents;
* Diligence;
* Valuation support.

Access:

* Contribute to drafts;
* submit for review;
* no approval authority;
* no Negotiation or Closing access.

Restricted zones:

> Financial Clean Team

---

## Daniel Ribeiro

> **Tax Specialist**

Access:

* Tax documents;
* Tax findings;
* selected Closing tax conditions;
* approved Valuation summary.

Restriction:

* No Buyer Universe;
* no Negotiation;
* no customer-level evidence.

---

# 135. Mocked external participants

## Camila Nunes

> **External Counsel · Lume Legal Advisors**

Sponsor:

> Marina Alves

Access:

* Legal Documents;
* Legal Diligence;
* Closing legal requirements;
* privileged zone.

Restrictions:

* No Financial;
* no Valuation;
* no Buyer Universe;
* no Negotiation;
* watermarked downloads.

Expiry:

> 30 set. 2026

State:

> Access review due in 14 days

---

## Helena Duarte

> **Client CFO · Atlas Industrial**

Sponsor:

> Ana Costa

Experience:

> Client Portal

Access:

* Information Requests;
* selected Dossier facts;
* approved deliverables;
* client approvals.

Restrictions:

* No internal findings;
* no internal Valuation assumptions;
* no Buyer Universe strategy;
* no internal comments.

---

## Pedro Azevedo

> **Management Contributor · Atlas Industrial**

Access:

* Information Request Portal;
* secure document submission;
* assigned management questions.

Restrictions:

* No internal workspace;
* no cross-request search;
* no approved findings;
* no downloads.

State:

> Active · No open requests

Review signal:

> No meaningful activity for 21 days

---

# 136. Mocked Financial Clean Team

Zone:

> **Financial Clean Team**

Purpose:

> Customer-level revenue and pricing evidence.

Members:

* Marina Alves;
* Ana Costa;
* Felipe Rocha.

Included evidence:

* `Customer_Revenue_2025.xlsx`;
* customer contracts;
* customer-level pricing schedules.

Restrictions:

* No external participants;
* no unrestricted export;
* watermarked viewing;
* raw customer identities hidden from downstream users.

Approved derived output:

> Top-three concentration: **41,2%**

---

# 137. Mocked Access Matrix

| Participant    | Dossier    | Documents | Diligence   | Valuation        | Negotiation | Closing           |
| -------------- | ---------- | --------- | ----------- | ---------------- | ----------- | ----------------- |
| Marina Alves   | Review     | View      | Review      | Review           | Manage      | Review            |
| Ana Costa      | Review     | Financial | Review      | Review           | Summary     | No bank details   |
| Felipe Rocha   | Contribute | Financial | Contribute  | Contribute       | None        | None              |
| Daniel Ribeiro | Tax        | Tax       | Tax         | Summary          | None        | Tax               |
| Camila Nunes   | None       | Legal     | Legal       | None             | None        | Legal             |
| Helena Duarte  | Selected   | Submit    | Portal only | Approved summary | None        | Selected approval |

Authority indicators:

* Marina: Final approvals;
* Ana: Financial finding and valuation-treatment approvals;
* Helena: Selected client approvals.

---

# 138. Mocked selected-participant panel

Title:

> **Ana Costa**

Supporting:

> Vice President · Financial Review VP

Effective access:

* Financial Diligence: Review;
* Valuation: Review;
* Financial Documents: Contribute;
* Negotiation: Approved summaries;
* Closing bank details: Restricted.

Authority:

> Valuation treatments with impact up to R$ 25 mi

Derived from:

* Financial Review VP template;
* Financial Clean Team membership;
* Valuation Policy v3;
* explicit bank-detail restriction.

Review:

> Current through 28 jul. 2026

Primary action:

> **Edit access**

Secondary:

> Review authority

---

# 139. Mocked pending invitation

> **Helena Duarte · Client CFO**

State:

> Invitation accepted · Security setup required

Completed:

* Email verified;
* confidentiality terms accepted.

Required:

* MFA setup.

Proposed access:

* Client Portal;
* approved Dossier summary;
* selected client approvals.

Access expiry:

> 31 dez. 2026

Primary action:

> View activation status

---

# 140. Mocked access review

> **External Counsel access review**

Participant:

> Camila Nunes

Current need:

> Legal diligence and closing-document review remain active.

Changes since prior review:

* Closing workstream added;
* seven privileged documents accessed;
* no download exceptions;
* expiry unchanged.

Recommended decision:

> Retain current scope through 30 set. 2026

Actions:

* Retain;
* reduce;
* revoke;
* open complete review.

---

# 141. Recommended static composition

```text
┌──────────────────────────────────────────────────────────────────┐
│ Deal Team & Access · 8 internal · 3 external · 2 reviews        │
├───────────────────────────────┬──────────────────────────────────┤
│ Participants                  │ Ana Costa · Financial Review VP  │
│                               │                                  │
│ Marina Alves                  │ Diligence        Review          │
│ Deal Lead · Internal          │ Valuation        Review          │
│                               │ Negotiation      Summary         │
│ Ana Costa                     │ Bank details     Restricted      │
│ Financial Review VP           │                                  │
│                               │ Approval authority               │
│ Felipe Rocha                  │ Treatment impact ≤ R$ 25 mi      │
│ Associate · Contributor       │                                  │
│                               │ Financial Clean Team             │
│ Camila Nunes                  │ Current through 28 jul.          │
│ External Counsel · Expiring   │                                  │
│                               │ [ Edit access ]                  │
├───────────────────────────────┴──────────────────────────────────┤
│ Restricted zone: Financial Clean Team · 3 members               │
└──────────────────────────────────────────────────────────────────┘
```

This communicates:

* Internal and external participants;
* scoped workstream access;
* separate approval authority;
* restricted evidence;
* access review.

---

# 142. Pitch-specific simplification

## Keep visible

* Deal Team & Access;
* internal and external counts;
* four participants;
* Ana Costa;
* Financial Review VP;
* workstream access;
* R$ 25 mi authority threshold;
* restricted bank details;
* Financial Clean Team;
* external-counsel expiry.

## Hide

* Complete permission matrix;
* technical policy IDs;
* invitation authentication details;
* complete access history;
* all restricted zones;
* bulk actions;
* audit metadata;
* every participant.

## Readability requirement

At deck scale, these should remain readable:

* **Deal Team & Access**
* **8 internal · 3 external**
* **Financial Review VP**
* **Valuation · Review**
* **Bank details · Restricted**
* **Approval ≤ R$ 25 mi**
* **Financial Clean Team**

---

# 143. Recommended demo flows

## Flow A — Add internal reviewer

```text
Deal Team & Access
  ↓
Add participant
  ↓
Select Ana Costa
  ↓
Role: Financial Review VP
  ↓
Apply role template
  ↓
Review Valuation authority
  ↓
Activate assignment
```

## Flow B — Invite external counsel

```text
Add external participant
  ↓
Select Camila Nunes
  ↓
Sponsor: Marina Alves
  ↓
Purpose: Legal diligence
  ↓
Legal and Closing workstreams
  ↓
Watermarked downloads
  ↓
Expiry: 30 set. 2026
  ↓
Send invitation
```

## Flow C — Clean-team restriction

```text
Financial Clean Team
  ↓
Add Felipe Rocha
  ↓
Review customer-level evidence
  ↓
No external export
  ↓
Approved derived fact remains wider
```

## Flow D — Access request

```text
Daniel requests Legal access
  ↓
Reason: Tax indemnity review
  ↓
Temporary scope proposed
  ↓
Legal Lead reviews
  ↓
Access approved for seven days
  ↓
Automatic expiry scheduled
```

## Flow E — Separation of duties

```text
Assign Felipe as valuation approver
  ↓
Conflict detected
  ↓
Felipe prepared scenario v4
  ↓
Select Ana Costa
  ↓
Authority validated
```

## Flow F — External-access review

```text
Camila access review due
  ↓
Review current work and activity
  ↓
Retain Legal and Closing
  ↓
Confirm expiry
  ↓
Review event recorded
```

## Flow G — Participant removal

```text
Remove Felipe Rocha
  ↓
Three tasks and one draft identified
  ↓
Transfer to another Associate
  ↓
Remove Clean Team membership
  ↓
Revoke deal access
  ↓
History preserved
```

---

# 144. UX prototype tasks to validate

Test with Deal Leads and administrators using tasks such as:

1. Find every current participant.
2. Distinguish internal and external participants.
3. Identify the Deal Lead.
4. Find who owns Financial Review.
5. Determine whether Ana can edit Valuation.
6. Determine whether Ana can approve a complete scenario.
7. Explain why the authority differs.
8. Find who may access customer-level revenue.
9. Add an internal Analyst.
10. Invite external counsel.
11. Set an internal sponsor.
12. restrict document download.
13. configure an expiry.
14. identify an activation blocker.
15. inspect effective access.
16. explain which template and restriction produced it.
17. grant temporary Legal access.
18. identify a separation-of-duties conflict.
19. find every access review due this month.
20. retain one external participant.
21. reduce another participant’s scope.
22. identify dormant external access.
23. remove a participant with open work.
24. transfer all responsibilities.
25. open the access-change audit event.
26. confirm that an external participant cannot access internal Search.
27. confirm that restricted documents do not appear in Copilot.
28. export the current access register.

## Measures

Record:

* Time to understand effective access;
* whether assignment and permission are confused;
* whether access and approval authority are confused;
* whether users trust role templates;
* whether restrictions are discoverable;
* whether external boundaries are clear;
* whether sponsors understand their responsibility;
* whether matrix editing is too dense;
* whether high-risk changes receive sufficient attention;
* whether last activity is interpreted as surveillance;
* whether removal consequences are understood.

---

# 145. Design validation criteria

Deal Team & Access is ready when:

1. The screen remains scoped to one deal.
2. Internal and external participants remain distinct.
3. Institution membership and deal participation remain separate.
4. Responsibility, access and approval authority remain separate.
5. Professional title does not determine access by itself.
6. Deal assignment does not automatically grant unrestricted access.
7. Role templates produce inspectable effective permissions.
8. Specific restrictions override broad grants.
9. Workstream, object and document scopes are supported.
10. Approval authority is not represented as a generic access level.
11. Authority thresholds and policies are visible.
12. Separation-of-duties conflicts are enforced.
13. External participants require an internal sponsor.
14. External access has expiry or an explicit reviewed exception.
15. External users receive a reduced workspace.
16. Client and banker access cannot be swapped through a view toggle.
17. Restricted zones support named membership.
18. Clean-team evidence can produce sanitized downstream outputs.
19. Document restrictions govern search, Copilot and exports.
20. Funds-flow and bank-detail access has enhanced control.
21. Automated processing respects restricted zones.
22. Access requests route through human approval.
23. Temporary access expires automatically.
24. Emergency access is exceptional and audited.
25. Access reviews support retain, reduce, suspend and revoke.
26. Last activity is not used as a productivity metric.
27. Participant removal identifies open responsibilities.
28. Responsibility transfer preserves historical attribution.
29. Access revocation affects active sessions.
30. Permission changes use version and concurrency controls.
31. Restricted information cannot leak through counts or filters.
32. External invitations support identity and security activation.
33. Duplicate identities are detected.
34. Access changes create immutable audit events.
35. The server—not only the UI—enforces authorization.
36. The current repository’s basic assignment list is not presented as complete access control.
37. The screen remains useful without Copilot.
38. Mobile supports participant review and urgent revocation.
39. The pitch fixture remains fictional.
40. Every participant state has a clear next action.

---

# 146. Final design target

The correct design target is not:

> “A list of people who have access to the deal.”

It is:

> **A deal-specific confidentiality and accountability workspace where every participant’s responsibility, evidence access, approval authority, restriction and duration can be understood and enforced.**

Its defining interaction is:

> **Identify the participant → assign responsibility → apply least-privilege scope → validate authority and restrictions → activate access → review, transfer or revoke as the transaction changes**

**Next iteration: Deliverables & Exports.**
