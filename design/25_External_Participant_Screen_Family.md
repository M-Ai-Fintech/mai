---
canonical_name: "External-Participant Screen Family"
definition_id: "BD-25"
definition_status: "Governed for MAI-90"
screen_family: "external-participant"
owning_task: "MAI-91"
canonical_routes:
  - "/portal/project/:externalWorkspaceId"
  - "/portal/project/:externalWorkspaceId/requests"
  - "/portal/project/:externalWorkspaceId/approvals"
  - "/portal/project/:externalWorkspaceId/submissions"
  - "/portal/project/:externalWorkspaceId/documents"
  - "/portal/project/:externalWorkspaceId/activity"
  - "/portal/project/:externalWorkspaceId/security"
  - "/submit/:submissionToken"
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
# External-Participant Screen Family

## 1. Recommended product naming

Use:

* **Family name:** `External Participation`
* **Shell mode:** `Secure Transaction Portal`
* **General external user:** `External Participant`
* **Internal accountable owner:** `Internal Sponsor`
* **Client-facing workspace:** `Client Portal`
* **Structured evidence workflow:** `Information Request Portal`
* **Restricted decision interface:** `External Approval Portal`
* **Upload-only interface:** `Secure Document Submission`
* **External work item:** `Request`
* **Submitted response:** `Submission`
* **External decision:** `Approval Decision`
* **Visible permission boundary:** `Access Scope`
* **Access expiration:** `Access Expiry`
* **User-facing activity record:** `Portal Activity`

Avoid using:

* Guest;
* public user;
* client mode;
* external dashboard;
* data-room lite;
* collaboration user.

“External Participant” is more accurate because the person may be:

* A client;
* target management;
* a buyer;
* external counsel;
* a specialist;
* an auditor;
* a lender;
* a closing participant.

The canonical architecture reserves four restricted external experiences: Client Portal, Information Request Portal, External Approval Portal and Secure Document Submission. These should use a reduced shell and must not expose internal findings, negotiation strategy or unrestricted agent reasoning. 

---

# 2. Family definition

The **External-Participant Screen Family** is the controlled interface through which people outside the advisory institution interact with selected parts of a transaction.

It supports narrowly defined activities such as:

* Reviewing approved transaction summaries;
* responding to information requests;
* submitting requested evidence;
* answering clarification questions;
* reviewing client-facing deliverables;
* completing restricted approvals;
* signing acknowledgements;
* checking submission and approval status;
* accessing selected closing materials.

It should answer:

1. **Why have I been invited?**
2. **Which transaction am I participating in?**
3. **What am I expected to do?**
4. **Which information may I see?**
5. **Which information remains unavailable?**
6. **What is due, overdue or awaiting review?**
7. **Which documents have I submitted?**
8. **Has my response been accepted?**
9. **Which decision am I being asked to make?**
10. **When does my access expire?**
11. **Who should I contact for assistance?**
12. **What record will remain after I complete the work?**

Its central operating sequence is:

> **Internal sponsor defines purpose → External access is scoped → Participant authenticates → Restricted work is completed → Internal review or approval occurs → Activity is preserved → Access expires or is revoked**

---

# 3. Primary intention

## Operational intention

Allow external collaboration without exposing the complete internal M&Ai workspace.

## External-user intention

An external participant should be able to say:

> “I understand what has been requested, what I may access and what remains outstanding—without needing training on the internal M&A process.”

## Banker intention

The internal deal team should be able to say:

> “External participants can submit evidence and complete defined decisions without seeing internal analysis, negotiation strategy or unrelated deal information.”

## Product intention

External participation should extend M&Ai’s evidence and approval workflows beyond the advisory institution while preserving:

* Deal isolation;
* least privilege;
* explicit purpose;
* source provenance;
* human authority;
* time-bound access;
* audit history.

---

# 4. Strategic product role

External collaboration is necessary because a transaction cannot be executed entirely inside the advisory team.

Evidence and decisions frequently depend on:

* Target management;
* client executives;
* external counsel;
* accounting advisors;
* tax specialists;
* financing parties;
* counterparties;
* signatories.

The external family completes the transaction loop:

```text
Internal request
  ↓
External participant receives restricted task
  ↓
Evidence, response or decision submitted
  ↓
Internal team reviews
  ↓
Accepted information enters governed workflow
  ↓
External participant sees final status
```

Without a controlled external experience, teams will revert to:

* Email attachments;
* unstructured spreadsheets;
* unsecured links;
* messaging applications;
* ambiguous approval emails;
* manually maintained request lists;
* unmanaged document versions.

---

# 5. Product priority

These screens should not block the initial banker-facing MVP.

Recommended sequencing:

| External screen            | Recommended phase    |
| -------------------------- | -------------------- |
| Secure Document Submission | Early POC capability |
| Information Request Portal | POC                  |
| Client Portal              | POC expansion        |
| External Approval Portal   | Enterprise expansion |

The architecture already places client information-request capability in the POC expansion and more advanced external approvals in the enterprise expansion. 

A thin Secure Document Submission interface may be introduced before the complete Information Request Portal because it solves one narrow problem without exposing a broader workspace.

---

# 6. Screen catalogue

| Screen                         | Principal user                                    | Primary intention                                                                      |
| ------------------------------ | ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Client Portal**              | Seller, buyer or advisory client                  | Review approved transaction information, deliverables, requests and selected decisions |
| **Information Request Portal** | Target management, client team or counterparty    | Respond to structured information requests and submit evidence                         |
| **External Approval Portal**   | Executive, client principal, advisor or signatory | Complete one or more tightly scoped approvals                                          |
| **Secure Document Submission** | Any authorized external source                    | Upload requested files without accessing the wider transaction workspace               |

These are distinct interfaces.

Do not make them four tabs inside one universal external dashboard.

---

# 7. What the external family is not

It should not become:

* A copy of the internal deal workspace;
* an internal shell with hidden navigation items;
* a client-view toggle for bankers;
* a generic VDR;
* an external CRM;
* a public deal website;
* unrestricted document search;
* unrestricted Copilot;
* a collaboration chat product;
* a place to expose internal findings;
* a place to expose valuation deliberation;
* a place to expose bidder rankings;
* a place to expose negotiation limits;
* a self-service permissions editor;
* a way for external users to invite other users freely;
* an anonymous file-upload service;
* an email approval link with no identity verification.

“Banker,” “Institution” and “Client” represent different authorization models and should not be interchangeable view modes. 

---

# 8. Core trust boundary

The external experience should apply a stronger boundary than ordinary internal role-based access.

The sequence should be:

```text
Authenticated external identity
  ↓
Active deal participation
  ↓
Defined participation purpose
  ↓
Named internal sponsor
  ↓
Permitted portal
  ↓
Permitted objects and actions
  ↓
Expiry and review
```

A person’s ability to sign in does not prove that they may access:

* The deal;
* a portal;
* a request;
* a document;
* an approval;
* another external participant’s submission.

---

# 9. External shell

The external shell should be visibly different from the banker shell.

It should contain:

* Institution identity;
* safe deal identity;
* participant role;
* restricted navigation;
* outstanding work;
* security controls;
* support contact;
* access-expiry indicator;
* sign out.

It should not contain:

* Global institution navigation;
* Deals Portfolio;
* Organizations;
* Team;
* internal Tasks & Approvals;
* deal switcher across unrelated transactions;
* internal notifications;
* internal Agentic Workspace;
* unrestricted Global Search;
* administration.

The application-shell architecture explicitly defines an External mode with reduced navigation, clear role and access limitations. 

---

# 10. Safe deal identity

The portal should show only the deal identity approved for external disclosure.

Possible labels:

> **Project Horizon**

or:

> **Strategic Transaction Workspace**

depending on policy.

The shell may show:

* Institution;
* safe transaction title;
* participant organization;
* participant role;
* work purpose.

Example:

> Atlas M&A Advisory
> Project Horizon
> Management Information Contributor

It should not automatically show:

* Counterparty names;
* transaction value;
* competing bidders;
* internal codename;
* confidential stage;
* valuation range.

---

# 11. Recommended external navigation

The navigation should adapt to the participant’s purpose.

## Client Portal

* Overview;
* Requests;
* Shared Documents;
* Reviews & Approvals;
* Activity;
* Help.

## Information Request Portal

* Requests;
* My Submissions;
* Messages;
* Help.

## External Approval Portal

* Pending Decisions;
* Completed Decisions;
* Help.

## Secure Document Submission

* Submission;
* Receipt;
* Help.

Do not show an unavailable navigation destination merely to advertise internal product breadth.

External users should not see internal navigation such as Negotiation when they have no permission to know that workspace exists. 

---

# 12. External-participant taxonomy

Recommended participant types:

## Client Principal

Examples:

* CEO;
* CFO;
* investment-committee member;
* board representative.

May review approved outputs and complete selected approvals.

## Client Working Team

May:

* respond to requests;
* review selected facts;
* comment on approved drafts;
* coordinate management submissions.

## Target Management Contributor

May:

* submit evidence;
* answer questions;
* revise rejected submissions.

## Counterparty Contributor

May:

* provide requested transaction information;
* upload proposals or supporting evidence;
* complete restricted acknowledgements.

## External Counsel

May:

* review selected Legal materials;
* submit legal documents;
* complete Legal approvals;
* access privileged zones where explicitly authorized.

## External Specialist

Examples:

* Tax;
* accounting;
* environmental;
* technology;
* actuarial.

May receive one workstream and related evidence.

## External Auditor

May receive controlled read-only evidence or audit packages.

## Signatory or Closing Participant

May review and complete a narrow signing or closing action.

---

# 13. Internal sponsor

Every external participation record should have an active internal sponsor.

The sponsor is responsible for:

* Business purpose;
* participant identity;
* access scope;
* invitation;
* extension;
* review;
* revocation;
* support;
* unresolved work.

Example:

> **Internal sponsor:** Ana Costa · Vice President

The sponsor should be visible in the external portal as the primary transaction contact unless another support contact is assigned.

---

# 14. Participation purpose

Every external participant should have one or more explicit purposes.

Examples:

* Submit Financial Diligence evidence;
* respond to tax information requests;
* review client-facing risk summary;
* approve buyer shortlist;
* approve negotiation response;
* review closing documents;
* complete signature;
* provide external audit evidence.

Purpose should determine:

* Portal type;
* visible objects;
* actions;
* expiry;
* authentication level;
* notifications.

---

# 15. Invitation lifecycle

Recommended states:

1. Draft;
2. approval required;
3. sent;
4. delivered;
5. accepted;
6. identity verification required;
7. security setup required;
8. confidentiality acknowledgement required;
9. active;
10. expires soon;
11. expired;
12. suspended;
13. revoked;
14. failed;
15. superseded.

An accepted email invitation does not automatically activate transaction access.

---

# 16. Invitation content

An external invitation should state:

* Inviting institution;
* safe transaction identity;
* participation purpose;
* internal sponsor;
* access-expiry date;
* authentication requirements;
* confidentiality notice;
* support route.

Email subject:

> Atlas M&A Advisory invited you to a secure transaction workspace

Avoid:

> Project Horizon — R$ 500 mi Atlas Industrial sale data room invitation

---

# 17. Authentication

Recommended options:

* Enterprise SSO, where available;
* verified email plus MFA;
* passkey;
* time-limited secure activation;
* identity-provider login;
* stronger verification for high-risk approvals.

The authentication method should reflect the action risk.

Example:

| Action                                | Minimum control                          |
| ------------------------------------- | ---------------------------------------- |
| Upload routine requested document     | Verified email and active request        |
| Review client report                  | MFA                                      |
| Approve material transaction response | MFA and reauthentication                 |
| View funds-flow instruction           | Strong reauthentication and named access |
| Complete signature                    | Approved signature-provider workflow     |

---

# 18. Session behavior

External sessions should support:

* Shorter maximum duration;
* idle timeout;
* reauthentication for sensitive actions;
* named-device or browser history;
* session revocation;
* visible expiration warning.

Example:

> Your secure session expires in 5 minutes.

Actions:

* Continue securely;
* sign out.

Do not preserve sensitive external portal state indefinitely in the browser.

---

# 19. Confidentiality acknowledgement

Before first access, the participant may need to acknowledge:

* Confidentiality terms;
* permitted use;
* no unauthorized redistribution;
* document-handling requirements;
* portal-specific restrictions.

The system should preserve:

* Document version;
* accepted by;
* accepted at;
* IP or device metadata where permitted;
* language.

This is an acknowledgement record, not necessarily a legally sufficient contract by itself.

---

# 20. Least-privilege presentation

External users should see only what they can access.

Do not show:

* Locked internal sections;
* counts of hidden findings;
* redacted bidder names that reveal bidder count;
* unavailable deal tabs;
* internal terminology indicating sensitive work exists.

A participant with access only to Requests should see:

* Requests;
* their submissions;
* support.

They should not see a disabled Valuation tab.

---

# 21. Object-level isolation

External access should support restriction at:

* Portal;
* deal;
* workstream;
* request;
* document;
* document version;
* deliverable;
* approval;
* section;
* field.

Example:

> Helena Duarte may review the approved Executive Summary but not the internal Valuation Appendix.

Example:

> Pedro Azevedo may view Request IR-014 and documents he submitted against it, but not Request IR-015 assigned to another manager.

---

# 22. External search

The default should avoid a general search capability.

Where search is useful, limit it to:

* Requests assigned to the participant;
* documents they submitted;
* approved shared documents;
* their completed approvals.

Search must not expose hidden results through:

* Autocomplete;
* result counts;
* snippets;
* aliases;
* filter values.

---

# 23. External Copilot

Do not provide unrestricted internal Copilot access.

A limited assistant may be introduced for procedural support such as:

* Explain what this request asks for;
* show accepted file formats;
* summarize my outstanding items;
* help locate a submitted file;
* explain why a submission was returned.

It must not:

* Reveal internal findings;
* answer questions from restricted documents;
* disclose valuation;
* expose internal comments;
* disclose negotiation strategy;
* provide hidden chain-of-thought;
* broaden access.

Recommended label:

> **Portal Help**

not:

> Ask the Deal AI

---

# 24. External notifications

Appropriate notifications:

* Invitation sent;
* request assigned;
* due date approaching;
* clarification requested;
* submission accepted;
* submission returned;
* approval assigned;
* decision recorded;
* access expiring;
* secure link revoked.

Inappropriate notifications:

* Internal finding created;
* valuation recalculated;
* bidder excluded;
* internal approval rejected;
* negotiation strategy changed.

---

# 25. External activity history

External users should see a limited activity record containing:

* Their invitation;
* their access activation;
* requests assigned to them;
* submissions made by them;
* clarification messages visible to them;
* decisions completed by them;
* access expiry.

They should not see the internal deal audit timeline.

---

# 26. External comments and messages

Communication should be object-scoped.

Examples:

* Comment on Request IR-014;
* clarification for Document Submission DS-022;
* question about Approval AP-018.

Avoid a universal deal chat.

Each message should identify:

* Sender;
* recipient scope;
* object;
* timestamp;
* visibility;
* resolution state.

Internal comments should never become externally visible unless deliberately published.

---

# 27. Attachments

Attachments should inherit the object’s access scope.

A file attached to:

> Request IR-014

should not automatically appear in:

* Shared Documents;
* another request;
* Client Portal;
* internal deliverables.

Every external file should enter controlled processing before becoming evidence.

---

# 28. Download and copy restrictions

Possible controls:

* Preview only;
* download allowed;
* watermarked download;
* print prohibited;
* copy prohibited;
* secure viewer;
* link expiration;
* recipient-specific watermark.

The portal should explain restrictions plainly:

> This file can be reviewed in the secure viewer but cannot be downloaded.

---

# 29. Access expiry

External access should normally have:

* Activation date;
* expiry;
* review date;
* sponsor;
* automatic revocation behavior.

The portal should display:

> Access expires 30 set. 2026

Where open work remains:

> Two requests remain outstanding before access expiry.

---

# 30. Revocation

When access is revoked:

* Active sessions terminate;
* future portal access stops;
* secure links become invalid;
* outstanding work is reassigned or closed;
* historical submissions remain;
* internal audit records remain.

The portal may display:

> Your access to this transaction workspace has ended.

Support contact:

> Ana Costa · Atlas M&A Advisory

---

# 31. Common desktop layout

For a **1440 × 900** canvas:

| Region                | Approximate width |
| --------------------- | ----------------: |
| External navigation   |        220–240 px |
| Top bar               |             64 px |
| Main canvas           |        760–920 px |
| Context or help panel |        300–380 px |
| Page padding          |          24–32 px |

The external experience should be less dense than the banker workspace.

---

# 32. External shell layout

```text
┌──────────────────┬───────────────────────────────────────────────────┐
│ Atlas M&A        │ Project Horizon           Access expires 30 Sep │
│ Advisory         ├───────────────────────────────────────────────────┤
│                  │                                                   │
│ OVERVIEW         │ Page title                                        │
│ Requests         │                                                   │
│ Shared Documents │ Restricted external workspace                     │
│ Approvals        │                                                   │
│ Activity         │ Main content                                      │
│                  │                                                   │
│ Help             │                                                   │
│ Security         │                                                   │
│                  │                                                   │
│ Helena Duarte    │                                                   │
│ Client CFO       │                                                   │
└──────────────────┴───────────────────────────────────────────────────┘
```

---

# 33. Mobile behavior

External portals must work reliably on mobile because executives and contributors may access them outside a desktop workflow.

Mobile should support:

* Authentication;
* request review;
* clarification response;
* photo or file submission;
* approval review;
* decision confirmation;
* receipt download;
* access and security controls.

Complex document comparison and large spreadsheet review remain desktop-oriented.

---

# 34. Shared accessibility requirements

The family should support:

* Semantic navigation;
* clear external-role label;
* visible access-expiry state;
* keyboard navigation;
* visible focus;
* minimum 44 × 44 px controls;
* accessible upload control;
* upload-progress announcements;
* no color-only request state;
* accessible approval summaries;
* readable document previews;
* clear session-expiration announcements;
* correct focus after authentication;
* language appropriate to non-specialist users;
* no internal jargon without explanation.

---

# 35. Shared visual direction

Aim for:

> **A secure, purpose-specific transaction interface that feels controlled without feeling hostile**

The family should feel:

* Trustworthy;
* simple;
* focused;
* calm;
* secure;
* task-oriented.

It should not feel:

* Like an internal admin panel;
* like a generic file-transfer site;
* like a consumer collaboration application;
* like a marketing portal.

---

# 36. Shared color and typography

Use the same M&Ai design system:

* Canvas Cream: `#F3F0EE`
* Lifted Cream: `#FCFBFA`
* Ink Black: `#141413`
* Signal Orange: `#CF4500`
* Light Signal Orange: `#F37338`
* Dust Taupe: `#D1CDC7`
* Slate Gray: `#696969`

Use Sofia Sans.

External layouts should use:

* Slightly larger body text;
* fewer simultaneous panels;
* clearer instructions;
* less financial density;
* stronger state explanation.

---

# Client Portal

## 37. Screen definition

The **Client Portal** is the restricted client-facing workspace for reviewing approved transaction information, managing client work and completing selected decisions.

It may provide:

* Safe transaction overview;
* approved status summary;
* information-request progress;
* shared deliverables;
* selected approved findings;
* selected valuation summaries;
* client approvals;
* key milestones;
* external activity;
* support.

It should not expose the internal deal workspace.

---

# 38. Client Portal users

Potential users:

* Client CEO;
* CFO;
* corporate-development lead;
* general counsel;
* board representative;
* investment-committee member;
* transaction working team.

Different client users may receive different portal configurations.

Example:

## CFO

* Financial requests;
* selected Dossier facts;
* approved valuation summary;
* client approvals.

## General Counsel

* Legal requests;
* selected Legal deliverables;
* closing approvals.

## Board Representative

* Approved executive summary;
* material decisions;
* selected deliverables.

---

# 39. Client Portal job to be done

> When a client needs transaction visibility or must provide a decision, present only the approved information and outstanding client actions relevant to their role.

---

# 40. Recommended Client Portal navigation

1. **Overview**
2. **Requests**
3. **Shared Documents**
4. **Reviews & Approvals**
5. **Activity**
6. **Help**

Optional:

* Closing;
* signatures;

only when explicitly enabled.

---

# 41. Client Portal overview

The overview should answer:

* What requires my attention?
* What has the advisory team shared?
* Which requests remain open?
* Which approvals are pending?
* What is the next milestone?
* Who is my contact?

Recommended sections:

1. Required actions;
2. transaction status;
3. information-request progress;
4. shared deliverables;
5. upcoming milestones;
6. recent external activity.

---

# 42. Client transaction status

Use safe, approved status language.

Example:

> **Current stage: Due Diligence Review**

> The advisory team is reviewing submitted financial, tax and legal information.

Do not expose:

* Internal risk rating;
* unapproved findings;
* confidential buyer behavior;
* internal probability of completion;
* internal team performance.

---

# 43. Client-facing attention

Example:

> **3 actions require attention**

* Approve the Financial Diligence scope;
* respond to two overdue information requests;
* review Diligence Committee Brief v3.

This is more useful than generic project metrics.

---

# 44. Client-facing progress

Appropriate progress indicators:

* Requests completed;
* documents accepted;
* approvals completed;
* shared milestones.

Example:

> **Information requests**

> 34 of 41 completed
> 5 in review
> 2 overdue

Avoid a single “deal completion percentage.”

---

# 45. Shared deliverables

A client should see only deliverables with:

* Approved content;
* valid release authorization;
* matching audience;
* current access;
* permitted distribution.

Example:

> **Client Risk Summary v2**

> Approved · Current through 28 jul. 2026
> Client Confidential

Actions:

* Review;
* download watermarked PDF;
* ask a scoped question;
* acknowledge receipt.

---

# 46. Client-facing valuation

Where authorized, show a controlled summary.

Example:

> **Indicative valuation reference**

> R$ 438 mi–R$ 478 mi

Supporting:

> Approved for client review · Scenario v4

Do not expose:

* Internal scenario alternatives;
* rejected assumptions;
* internal negotiation floor;
* bidder-specific willingness to pay;
* unapproved adjustment debate.

---

# 47. Client-facing findings

Where selected findings are shared, show:

* Approved client-safe title;
* approved summary;
* business consequence;
* requested action;
* current status.

Example:

> **Customer concentration**

> The three largest customers represent 41,2% of reported revenue.

Action:

> Confirm whether current renewal discussions change the concentration outlook.

Do not expose internal severity or valuation treatment unless explicitly approved.

---

# 48. Client comments

Clients may comment on:

* Shared deliverables;
* selected facts;
* requests;
* approval packages.

Their comment visibility should be explicit:

> Visible to Atlas M&A Advisory deal team

Do not allow a comment to become visible to other external organizations automatically.

---

# 49. Client approvals

The Client Portal may summarize pending approvals but should route each decision through the External Approval Portal.

Example:

> **Approve Buyer Shortlist v2**

> 12 proposed counterparties
> Due 5 ago. 2026

Action:

> Review decision

---

# 50. Client milestones

Appropriate milestones:

* Information-request deadline;
* management meeting;
* committee review;
* shortlist review;
* indication deadline;
* signing target;
* closing target.

Only client-approved milestone names should be visible.

---

# 51. Client activity

Visible activity may include:

* Client user invited;
* request submitted;
* document accepted;
* deliverable shared;
* approval completed;
* secure link revoked.

Internal analysis activity should remain hidden.

---

# 52. Client Portal system states

## No required actions

> No client action is currently required.

## Shared information unavailable

> The advisory team has not yet released transaction materials to this portal.

## Deliverable stale

Do not show a stale deliverable.

Display:

> A previously shared version is under review.

## Access limited

Explain exact visible scope.

## Deal paused

> The transaction workspace is temporarily paused. Existing shared records remain available.

## Deal archived

Read-only access according to retention and external-access policy.

---

# 53. Client Portal mocked fixture

User:

> **Helena Duarte · Client CFO**

Institution:

> Atlas Industrial Holding S.A.

Internal sponsor:

> Ana Costa · Atlas M&A Advisory

Portal state:

* 3 actions required;
* 34 of 41 requests completed;
* 4 shared deliverables;
* 2 approvals pending;
* access expires 31 dez. 2026.

Shared valuation reference:

> R$ 438 mi–R$ 478 mi

The fixture should not expose internal findings or negotiation limits.

---

# Information Request Portal

## 54. Screen definition

The **Information Request Portal** is the structured external workspace for receiving, answering and tracking transaction information requests.

It replaces uncontrolled request-list spreadsheets and email attachments with:

* Defined requests;
* responsible contributors;
* due dates;
* response requirements;
* file submission;
* clarification;
* review status;
* evidence acceptance;
* complete history.

---

# 55. Primary users

* Target management;
* client finance team;
* legal team;
* tax team;
* operational management;
* external advisors;
* seller or buyer representatives;
* counterparty information providers.

---

# 56. Primary job to be done

> When the deal team needs information from an external party, provide a structured request that explains what is required, accepts traceable evidence and clearly communicates whether the response was accepted.

---

# 57. Recommended portal navigation

1. **Requests**
2. **My Submissions**
3. **Messages**
4. **Help**

Optional:

* Organization Requests;

for contributors authorized to coordinate a wider response team.

---

# 58. Request-list columns

Recommended:

1. Request;
2. category;
3. status;
4. priority;
5. due date;
6. assigned contributor;
7. required response;
8. last update.

Avoid exposing internal:

* Finding ID;
* internal severity;
* valuation impact;
* review strategy;
* request-generation agent.

---

# 59. Request categories

Examples:

* Corporate;
* Financial;
* Tax;
* Legal;
* Commercial;
* Human Resources;
* Technology;
* Environmental;
* Operational;
* Closing.

External category names should use terminology understandable to the contributor.

---

# 60. Request states

Recommended:

* Not started;
* in progress;
* clarification requested;
* ready to submit;
* submitted;
* under review;
* additional information required;
* partially accepted;
* accepted;
* rejected;
* withdrawn;
* no longer required;
* overdue.

The internal request workflow may contain more detailed states, but the external state should remain clear.

---

# 61. Request-row anatomy

> **Monthly revenue by customer — FY2024 and FY2025**

Category:

> Financial

Required:

> Spreadsheet with monthly revenue by customer and currency.

Due:

> 31 jul. 2026

State:

> Additional information required

Reviewer note:

> Please include customer identifiers consistently across both periods.

---

# 62. Request detail

A request should contain:

* Plain-language request;
* purpose, where disclosure is appropriate;
* required period;
* required format;
* mandatory fields;
* example or template;
* due date;
* responsible contributor;
* confidentiality;
* reviewer notes;
* submission history.

Do not expose unnecessary internal rationale.

---

# 63. Response types

A request may accept:

* File upload;
* structured form;
* narrative response;
* confirmation;
* date;
* monetary value;
* table;
* no-document explanation;
* external-link reference;
* combination of these.

Example:

> Upload the customer-revenue workbook and confirm whether the data is gross or net of taxes.

---

# 64. Request templates

The deal team may provide:

* Spreadsheet template;
* document checklist;
* naming guidance;
* sample response;
* accepted-period definition;
* required currency basis.

Example:

> Revenue template · XLSX
> Use R$ and report values before indirect taxes.

---

# 65. Structured forms

Where appropriate, use structured fields instead of document uploads.

Example:

> **Outstanding litigation**

* Matter name;
* claimant;
* jurisdiction;
* claimed amount;
* estimated exposure;
* current status;
* supporting document.

Structured responses reduce extraction ambiguity but should not replace evidence where evidence is required.

---

# 66. Submission draft

External contributors should be able to save an incomplete draft.

Draft state should show:

* Completed fields;
* missing required fields;
* uploaded files;
* validation warnings;
* last saved time.

Drafts are not visible as submitted evidence until explicitly submitted.

---

# 67. Submission action

Before submission, show:

> **Submit response to Request IR-014**

Included:

* 1 spreadsheet;
* 2 supporting contracts;
* 1 management confirmation.

Statement:

> I confirm that this submission is complete to the best of my knowledge.

Primary action:

> Submit for review

---

# 68. Submission receipt

After submission, provide:

* Receipt ID;
* request;
* file list;
* versions;
* submitted by;
* submitted at;
* checksum or integrity reference;
* review state.

Example:

> Submission SUB-028 received
> 28 jul. 2026 · 14:18 BRT

---

# 69. File processing

External files should pass through controlled processing.

Possible states:

* Uploading;
* uploaded;
* security scan;
* file-type validation;
* processing;
* available for review;
* processing failed;
* quarantined;
* rejected.

The external portal should use safe language.

Example:

> The file was received but cannot yet be reviewed because processing failed.

---

# 70. Accepted file types

Each request should state:

* Permitted formats;
* maximum size;
* password-protected-file policy;
* naming guidance;
* spreadsheet requirements;
* image-quality requirements.

Do not allow every file type by default.

---

# 71. File versioning

Uploading a replacement should create a new version.

Example:

> `Customer_Revenue_2025.xlsx`

* Version 1 · Submitted 27 jul.;
* Version 2 · Submitted 28 jul. · Current external submission.

The prior version remains available to authorized reviewers.

---

# 72. Duplicate detection

The portal may warn:

> This file appears identical to a document already submitted for Request IR-011.

Actions:

* Use existing submission;
* upload as a new version;
* cancel.

It should not expose documents submitted by another unauthorized participant.

---

# 73. Clarification workflow

Internal reviewer:

> Please confirm whether revenue is net of indirect taxes.

External contributor may:

* Reply;
* attach evidence;
* update structured fields;
* submit a revised version.

The clarification should remain attached to the request.

---

# 74. Additional information required

When a response is returned, show:

* What is incomplete;
* why it matters, where appropriate;
* required action;
* due date;
* accepted portions;
* rejected portions.

Example:

> The workbook was accepted. Three customer contracts remain missing.

---

# 75. Partial acceptance

The system should allow:

* Accepted file;
* rejected file;
* accepted fields;
* fields requiring revision.

The external participant should not have to resubmit accepted material.

---

# 76. No-document response

External users should be able to state:

* Document does not exist;
* not applicable;
* unavailable;
* held by another party;
* expected later.

A no-document response should require:

* Reason;
* responsible person;
* expected availability date where applicable;
* optional supporting explanation.

Internal review decides whether that response is accepted.

---

# 77. Responsibility delegation

A contributor may assign or forward a request only when policy permits.

Possible flow:

> Pedro Azevedo assigns the Legal subrequest to Camila Nunes.

The internal sponsor should retain visibility.

External participants should not freely invite arbitrary recipients.

---

# 78. Due dates

Show:

* Due date;
* time zone;
* days remaining;
* approved extension;
* overdue state.

Example:

> Due 31 jul. 2026 · 17:00 BRT

The portal should not use threatening language for overdue requests.

---

# 79. Extension request

An external contributor may request:

* New date;
* reason;
* partial submission plan;
* responsible person.

The extension becomes active only after internal approval.

---

# 80. Bulk submission

Appropriate for related requests:

* Upload files;
* assign each file to a request;
* validate missing mappings;
* submit as a package.

Do not accept an unstructured ZIP without requiring request mapping unless the specific workflow allows it.

---

# 81. Request dependency

A request may depend on another response.

Example:

> Customer contract sample cannot be finalized until the customer list is accepted.

The portal may explain this relationship without disclosing internal analysis.

---

# 82. Request completion

A request is complete only when the internal reviewer accepts the required response.

External submission is not completion.

Distinguish:

* Submitted;
* accepted.

This distinction is essential for transaction control.

---

# 83. Information Request mocked fixture

User:

> **Pedro Azevedo · Management Contributor**

Requests:

* 41 total;
* 34 accepted;
* 5 under review;
* 2 overdue.

Selected request:

> Monthly Revenue by Customer — FY2024 and FY2025

State:

> Additional information required

Files:

* `Receita_por_Cliente_2025.xlsx` v2;
* 2 customer contracts.

Reviewer note:

> Include customer identifiers consistently and confirm whether values are net of taxes.

---

# External Approval Portal

## 84. Screen definition

The **External Approval Portal** is a narrow, high-assurance interface for external executives, clients, advisors or signatories to review and decide a specific transaction matter.

It should be optimized for:

* One decision;
* one defined scope;
* one evidence package;
* one authority check;
* one recorded outcome.

It should not resemble the complete internal Tasks & Approvals workspace.

---

# 85. Primary users

* Client CEO or CFO;
* board member;
* investment-committee member;
* external counsel;
* client general counsel;
* authorized signatory;
* lender representative;
* external advisor;
* independent reviewer.

---

# 86. Primary job to be done

> When an external decision is required, present the exact proposal, approved supporting information, consequences and authority so the participant can record a defensible decision.

---

# 87. Recommended navigation

1. **Pending Decisions**
2. **Completed Decisions**
3. **Help**

A single-use approval link may open directly into one decision without exposing a decision list.

---

# 88. Approval package

Every external approval should contain:

1. Decision requested;
2. deal and participant context;
3. current proposal;
4. approved supporting evidence;
5. material consequence;
6. conditions;
7. authority;
8. deadline;
9. confidentiality;
10. decision controls.

---

# 89. Approval title

Good:

> **Approve Project Horizon Buyer Shortlist v2**

> **Authorize Diligence Committee Brief v3 for client distribution**

> **Approve closing-condition waiver**

Poor:

* Approval needed;
* review item;
* M&Ai recommendation;
* please confirm;
* transaction update.

---

# 90. External evidence package

External evidence should contain only approved information appropriate to the participant.

Examples:

* Approved executive summary;
* selected source excerpts;
* current proposal terms;
* client-safe valuation reference;
* legal opinion approved for disclosure;
* comparison against prior approved version.

It should not include:

* Internal comments;
* agent reasoning;
* rejected options unless intentionally included;
* confidential alternative strategies;
* hidden counterparties.

---

# 91. Decision consequences

The portal should state:

> **What happens if approved**

and:

> **What happens if rejected**

Example:

## If approved

* The 12 named counterparties may enter the outreach-preparation workflow;
* no external outreach occurs until separately authorized.

## If rejected

* The shortlist returns to the deal team for revision;
* current candidate restrictions remain unchanged.

---

# 92. Decision options

Recommended:

* Approve;
* approve with conditions;
* reject;
* request changes;
* request clarification;
* recuse;
* delegate, where policy permits.

Do not use:

> Accept recommendation

because the participant is approving a transaction action, not merely agreeing with AI.

---

# 93. Approval with conditions

A conditional approval should require:

* Condition;
* owner;
* due date;
* whether the action may proceed before satisfaction;
* reviewer.

Example:

> Approved subject to removal of two restricted counterparties.

The condition becomes governed work.

---

# 94. Rejection

Rejection should require a rationale.

Example:

> Reject Buyer Shortlist v2

Reason:

> Remove organizations with current distribution conflicts and resubmit.

The system should preserve the rejected version.

---

# 95. Request changes

Use when the participant does not want to make a final negative decision.

State:

> Changes requested

The original approval remains unresolved or is superseded according to policy.

---

# 96. Recusal

A participant should be able to recuse when:

* Conflict exists;
* authority is incorrect;
* they participated in preparation;
* information is insufficient;
* another person should decide.

Recusal should route to the internal owner.

---

# 97. Delegation

External approval delegation should be tightly controlled.

Before delegation:

* Verify eligible delegate;
* verify organization;
* verify authority;
* define scope;
* obtain sponsor review;
* prevent self-created privilege expansion.

A user should not forward an approval email to another person as a valid delegation.

---

# 98. Authority display

Show:

> **You are being asked to decide as Client CFO under the Project Horizon approval policy.**

Where authority is uncertain:

> Your authority must be confirmed before the decision can be recorded.

Do not infer legal authority solely from email domain or job title.

---

# 99. Reauthentication

Require reauthentication before a material external decision.

Example:

> Confirm your identity to record this approval.

Possible controls:

* MFA;
* passkey;
* corporate SSO;
* approved signature provider;
* one-time challenge.

---

# 100. Decision confirmation

Before final submission:

> **Record approval**

Decision:

> Approve Buyer Shortlist v2

Scope:

> 12 counterparties

Conditions:

> None

Effective:

> Immediately after internal validation

Statement:

> I confirm that I am authorized to make this decision.

Primary action:

> Confirm approval

---

# 101. Decision receipt

After completion, provide:

* Decision;
* decision ID;
* object version;
* decided by;
* authority;
* time;
* conditions;
* current validity;
* support contact.

Example:

> Approval AP-041 recorded
> 28 jul. 2026 · 15:42 BRT

---

# 102. Decision invalidation

If the approved object changes materially:

> This approval is no longer current because Buyer Shortlist v3 replaced v2.

The historical decision remains visible.

A new approval is required.

---

# 103. Time-limited approval

Some approval requests should expire.

Example:

> This approval request expires 5 ago. 2026 · 17:00 BRT.

After expiry:

> The request is no longer active. Contact Ana Costa for a new review package.

---

# 104. External Approval mocked fixture

User:

> **Helena Duarte · Client CFO**

Decision:

> Approve Diligence Committee Brief v3 for client committee review

Included:

* Six approved material risks;
* valuation reference of R$ 438 mi–R$ 478 mi;
* six open information requests;
* client-safe recommendations.

Excluded:

* Internal negotiation strategy;
* raw customer identities;
* unapproved valuation scenarios.

State:

> Approval required · Due 2 ago. 2026

---

# Secure Document Submission

## 105. Screen definition

**Secure Document Submission** is the narrowest external interface.

It allows an authorized person to upload one or more requested files without receiving access to:

* The Client Portal;
* the Information Request Portal;
* deal documents;
* internal requests;
* other submissions;
* approvals.

It is appropriate for:

* One-time evidence collection;
* large-file submission;
* specialist document delivery;
* closing-document receipt;
* counterparty proposal upload;
* signed-document return.

---

# 106. Primary job to be done

> When an external person must deliver a file but does not need transaction-workspace access, provide a secure request-bound upload flow with a verifiable receipt.

---

# 107. Submission-link requirements

Every link should be tied to:

* Institution;
* deal;
* submission request;
* expected sender;
* permitted files;
* expiry;
* maximum use;
* internal sponsor;
* access policy.

Avoid generic reusable upload links.

---

# 108. Link states

* Active;
* not yet active;
* expires soon;
* expired;
* used;
* maximum submissions reached;
* revoked;
* identity mismatch;
* request closed;
* suspended.

---

# 109. Identity verification

Possible controls:

* Email challenge;
* one-time password;
* verified external identity;
* corporate SSO;
* passkey;
* request-specific code.

For low-risk submissions, the user may not need a complete persistent portal account.

The resulting submission still requires an attributable identity.

---

# 110. Submission page

The page should show:

* Institution;
* safe transaction label;
* requested files;
* accepted formats;
* maximum size;
* due date;
* internal sponsor;
* confidentiality notice;
* upload control.

Example:

> **Submit updated municipal tax certificate**

> Requested by Atlas M&A Advisory
> Project Horizon
> Due 31 jul. 2026

---

# 111. Upload behavior

Support:

* Drag and drop;
* file picker;
* mobile photo or scan;
* resumable upload;
* multiple files where permitted;
* upload progress;
* cancel and resume;
* checksum verification.

The user should not lose a large upload because of a brief connection interruption.

---

# 112. Upload validation

Validate:

* File type;
* file size;
* number of files;
* filename;
* duplicate;
* password protection;
* corruption;
* malware or unsafe content;
* expected document category.

Do not provide detailed security-detection information that could help bypass controls.

---

# 113. Metadata

The submitter may need to provide:

* Document date;
* document type;
* issuing organization;
* period covered;
* language;
* currency;
* confidentiality;
* notes.

Example:

> Document date: 25 jul. 2026
> Issuer: Município de São Paulo
> Valid through: 24 ago. 2026

---

# 114. Password-protected files

Recommended options:

* Reject and request unprotected version;
* accept through an approved secure password workflow;
* allow only for selected document types.

Do not ask users to place passwords in free-text notes.

---

# 115. Processing state

After upload:

1. Received;
2. integrity validation;
3. security scan;
4. processing;
5. delivered for review;
6. accepted or returned.

The external receipt should distinguish:

> File received

from:

> Evidence accepted

---

# 116. Submission receipt

Provide:

* Receipt ID;
* filename;
* file size;
* submitted by;
* submitted at;
* request;
* integrity state;
* review state.

Example:

> Receipt SUB-042
> `Certidao_Tributaria_Municipal.pdf`
> Received 28 jul. 2026 · 16:04 BRT

---

# 117. Replacement submission

Where permitted, the user may replace a file before review.

The replacement creates:

* New version;
* new receipt;
* relationship to prior submission.

The previous file remains historically preserved.

---

# 118. Withdrawal

A submitter may request withdrawal before internal acceptance where policy permits.

Withdrawal does not necessarily delete the file immediately.

State:

> Withdrawal requested

The internal team determines evidence and retention consequences.

---

# 119. Submission failure

Possible messages:

## Upload failed

> Your file was not received. Retry the upload.

## Processing failed

> The file was received, but it cannot yet be reviewed.

## Unsafe file

> The file cannot be accepted. Contact the request owner.

## Link expired

> This submission link has expired.

Provide the internal sponsor or support route.

---

# 120. No cross-submission visibility

A one-time submitter should not see:

* Other requests;
* other submitters;
* existing evidence;
* internal review notes;
* deal status;
* other filenames;
* total document count.

After submission, the user should see only their receipt and approved status updates.

---

# 121. Secure Submission mocked fixture

Submitter:

> **Carlos Mendes · Municipal Tax Advisor**

Request:

> Updated municipal tax certificate

Allowed:

* PDF;
* maximum 25 MB;
* one current certificate;
* one supporting receipt.

Due:

> 31 jul. 2026 · 17:00 BRT

Internal sponsor:

> Camila Nunes

State:

> Link active · Expires after successful submission

---

# 122. Common security controls

The family should support:

* Tenant and deal isolation;
* participant-specific authorization;
* link expiration;
* MFA for sensitive actions;
* session timeout;
* file security scanning;
* secure storage;
* watermarking;
* download policy;
* audit events;
* notification redaction;
* rate limiting;
* replay protection;
* identity verification;
* revocation.

Do not claim that a front-end portal alone provides these controls.

---

# 123. Data minimization

Store and display only information required for the participant’s purpose.

Examples:

* A one-time submitter may not require a full profile.
* A Client CFO may require organization and authority metadata.
* An external approver may require stronger identity evidence.
* A management contributor does not need access to internal findings.

---

# 124. Privacy

External-user records may contain:

* Name;
* email;
* organization;
* role;
* authentication events;
* submissions;
* decisions;
* access history.

The portal should provide:

* Privacy notice;
* correction path;
* support contact;
* retention explanation where appropriate.

A personal-data request should not automatically erase transaction decisions or mandatory audit records.

---

# 125. Common system states

## Invitation pending

The user has not activated access.

## Identity verification required

Access remains blocked.

## Access expired

Historical receipt or decision may remain available according to policy.

## Access suspended

Support contact provided.

## Request withdrawn

Submission disabled.

## Deal paused

Existing records available; new actions depend on pause policy.

## Deal archived

Read-only or revoked according to archive policy.

## Partial failure

Other portal functions remain available.

## Offline

Safely cached non-sensitive records may be viewable.

Disable:

* Submission;
* approval;
* messages;
* access changes.

---

# 126. Figma component architecture

## `ExternalShell`

Variants:

* Client;
* request;
* approval;
* submission;
* archived;
* restricted.

## `ExternalIdentityHeader`

Properties:

* Client;
* management;
* advisor;
* signatory;
* one-time submitter.

## `ExternalAccessNotice`

Properties:

* Active;
* expires soon;
* expired;
* suspended;
* restricted.

## `ExternalNavigation`

Properties:

* Client Portal;
* Request Portal;
* Approval Portal;
* upload only.

## `ClientPortalOverview`

States:

* Actions;
* no actions;
* paused;
* archived;
* partial error.

## `ExternalRequestList`

States:

* Active;
* filtered;
* complete;
* overdue;
* empty;
* loading.

## `ExternalRequestRow`

Properties:

* Not started;
* draft;
* submitted;
* review;
* returned;
* accepted;
* overdue.

## `ExternalRequestDetail`

Properties:

* File;
* form;
* narrative;
* confirmation;
* mixed response.

## `SubmissionDraft`

Properties:

* Incomplete;
* ready;
* validation error;
* autosaved.

## `ExternalFileUpload`

Properties:

* Idle;
* uploading;
* paused;
* validating;
* complete;
* failed;
* quarantined.

## `SubmissionReceipt`

Properties:

* Received;
* processing;
* accepted;
* returned;
* withdrawn.

## `ExternalApprovalCard`

Properties:

* Pending;
* conditional;
* approved;
* rejected;
* changes requested;
* expired;
* invalidated.

## `ExternalDecisionConfirmation`

Properties:

* Approve;
* reject;
* conditional;
* recuse;
* delegate.

## `ExternalActivity`

Properties:

* Request;
* submission;
* decision;
* access;
* distribution.

## `ExternalHelp`

Properties:

* Sponsor;
* technical support;
* security;
* expired access.

---

# 127. Production object model

## `ExternalParticipant`

```text
id
institutionId
personId
organizationId
participantType
identityState
status
createdAt
updatedAt
```

## `ExternalDealParticipation`

```text
id
dealId
externalParticipantId
participationPurpose
portalTypes
internalSponsorId
effectiveFrom
expiresAt
status
confidentialityLevel
createdBy
createdAt
updatedAt
```

## `ExternalAccessPolicy`

```text
id
externalDealParticipationId
scopeType
scopeId
allowedCapabilities
restrictedCapabilities
downloadPolicy
searchPolicy
assistantPolicy
effectiveFrom
expiresAt
status
createdAt
updatedAt
```

## `ExternalInvitation`

```text
id
externalDealParticipationId
email
safeDealLabel
invitationType
identityPolicy
status
sentBy
sentAt
expiresAt
acceptedAt
activatedAt
revokedAt
createdAt
```

## `ExternalAcknowledgement`

```text
id
externalDealParticipationId
documentType
documentVersion
language
acceptedBy
acceptedAt
evidenceReference
createdAt
```

## `InformationRequest`

```text
id
dealId
requestReference
category
title
description
responseType
requiredFields
acceptedFileTypes
assignedParticipantIds
dueAt
priority
externalState
internalState
createdBy
createdAt
updatedAt
version
```

## `ExternalSubmission`

```text
id
informationRequestId
externalParticipantId
submissionVersion
responseData
fileReferenceIds
statement
state
submittedAt
receivedAt
reviewedAt
createdAt
updatedAt
```

## `ExternalSubmissionFile`

```text
id
externalSubmissionId
filename
fileReference
contentType
fileSize
checksum
documentDate
metadata
processingState
securityState
reviewState
createdAt
```

## `ExternalClarification`

```text
id
informationRequestId
externalSubmissionId
senderType
senderId
recipientScope
message
visibility
state
createdAt
resolvedAt
```

## `ExternalApprovalRequest`

```text
id
dealId
externalDealParticipationId
approvalType
targetObjectType
targetObjectId
targetObjectVersion
title
summary
evidencePackageId
authorityRequirement
dueAt
expiresAt
state
createdBy
createdAt
```

## `ExternalApprovalDecision`

```text
id
externalApprovalRequestId
externalParticipantId
decision
conditions
rationale
authoritySnapshot
identityVerificationReference
decidedAt
validityState
invalidatedAt
createdAt
```

## `SecureSubmissionRequest`

```text
id
dealId
requestType
safeDealLabel
expectedSenderReference
allowedFileTypes
maximumFileSize
maximumSubmissions
metadataRequirements
internalSponsorId
effectiveFrom
expiresAt
state
createdAt
```

## `SecureSubmissionToken`

```text
id
secureSubmissionRequestId
tokenReference
identityPolicy
maximumUses
useCount
state
expiresAt
createdAt
revokedAt
```

## `ExternalPortalEvent`

```text
id
institutionId
dealId
externalParticipantId
eventType
objectType
objectId
actorType
actorId
summary
accessLevel
occurredAt
```

---

# 128. Suggested route hierarchy

The external route family should remain separate from internal deal routes.

Recommended:

```text
/portal
/portal/activate/:invitationToken
/portal/project/:externalWorkspaceId

/portal/project/:externalWorkspaceId/overview
/portal/project/:externalWorkspaceId/requests
/portal/project/:externalWorkspaceId/requests/:requestId
/portal/project/:externalWorkspaceId/submissions
/portal/project/:externalWorkspaceId/documents
/portal/project/:externalWorkspaceId/approvals
/portal/project/:externalWorkspaceId/approvals/:approvalId
/portal/project/:externalWorkspaceId/activity
/portal/project/:externalWorkspaceId/security

/submit/:submissionToken
/submit/:submissionToken/receipt/:receiptId
```

Do not expose the internal `dealId` where avoidable.

Use an external workspace identifier or opaque token.

---

# 129. API direction

Recommended endpoints:

```text
GET    /api/external/session
POST   /api/external/activate
POST   /api/external/reauthenticate

GET    /api/external/workspaces
GET    /api/external/workspaces/:workspaceId
GET    /api/external/workspaces/:workspaceId/overview

GET    /api/external/workspaces/:workspaceId/requests
GET    /api/external/requests/:requestId
POST   /api/external/requests/:requestId/drafts
POST   /api/external/requests/:requestId/submissions
POST   /api/external/requests/:requestId/clarifications
POST   /api/external/requests/:requestId/extension-requests

GET    /api/external/workspaces/:workspaceId/documents
GET    /api/external/documents/:documentId/preview

GET    /api/external/workspaces/:workspaceId/approvals
GET    /api/external/approvals/:approvalId
POST   /api/external/approvals/:approvalId/decisions
POST   /api/external/approvals/:approvalId/recuse
POST   /api/external/approvals/:approvalId/delegation-requests

GET    /api/secure-submissions/:token
POST   /api/secure-submissions/:token/uploads
POST   /api/secure-submissions/:token/complete
GET    /api/secure-submissions/:token/receipts/:receiptId
```

Every external endpoint should independently validate:

* Identity;
* active participation;
* portal permission;
* object scope;
* expiry;
* request or approval state;
* download policy;
* rate limits.

---

# 130. Repository direction

The current repository does not yet contain an external-participant portal implementation.

Current relevant foundations are limited:

* `/clients` redirects to the internal `/entities` route;
* `teamMemberSchema` models internal team members rather than external participants;
* deal assignments contain only member, assignment role, transaction side and lead state;
* the General Diligence agent includes a `vdr-request` schema with requested document categories, urgency and received or rejected status;
* there is no separate external shell;
* there is no external identity, invitation, submission, approval or portal-access domain;
* there is no request-bound upload route.

## Keep

* Stable deal IDs internally;
* typed Zod contracts;
* request category and item concepts;
* requested, received and rejected direction;
* document-processing foundations;
* existing internal Team and Contact concepts;
* audit-oriented workflow direction.

## Reframe

### `/clients`

The current redirect is an internal relationship-navigation alias.

It is not a Client Portal.

### `vdr-request`

The current schema is a useful agent-facing request representation.

It is not yet:

* An external request workflow;
* a submission domain;
* a permissions model;
* a contributor interface;
* an acceptance workflow.

### Team members

Do not reuse internal `TeamMember` records directly as external identities.

External participants need:

* Organization;
* sponsor;
* purpose;
* expiry;
* portal access;
* identity state;
* external authentication.

## Add

* External shell;
* invitation activation;
* external identity;
* participant-purpose model;
* portal-scoped authorization;
* information requests;
* drafts and submissions;
* secure upload;
* clarification;
* external approvals;
* decision receipts;
* download restrictions;
* access expiry;
* portal audit events.

---

# 131. Production enforcement requirements

Critical server-side tests should cover:

* Expired invitation;
* revoked participation;
* request belonging to another participant;
* approval belonging to another organization;
* hidden document access;
* changed object version;
* expired approval request;
* reused submission token;
* submission-token guessing;
* revoked secure link;
* direct internal-route attempt;
* search side-channel;
* download restriction;
* watermark policy;
* session revocation;
* MFA requirement;
* identity mismatch;
* rate limiting;
* file-type validation;
* unsafe file handling;
* idempotent decision submission.

The browser interface cannot be the authorization boundary.

---

# 132. What not to include

Avoid:

* Internal global navigation;
* client perspective switcher;
* internal deal IDs in public URLs;
* unrestricted deal search;
* unrestricted Copilot;
* internal findings;
* internal valuation assumptions;
* negotiation limits;
* buyer scoring;
* internal comments;
* unrelated requests;
* arbitrary participant invitations;
* anonymous reusable upload links;
* approval by forwarded email;
* uploaded file treated as accepted evidence;
* access with no expiry;
* external activity presented as employee performance;
* unverified legal-signature claims;
* real client information in fixtures.

---

# 133. MOCKED — Family demo specification

## Purpose

The mocked external family should demonstrate that M&Ai supports controlled collaboration outside the advisory institution.

Its narrative is:

> **Management submits evidence, clients review approved outputs and executives complete decisions without receiving access to internal deal intelligence.**

This family is useful in a live enterprise or design-partner walkthrough.

It should not be the principal pitch screenshot because:

* The core differentiation remains internal evidence-to-decision execution;
* external portals are familiar product patterns;
* the main value is their integration with governed internal workflows.

---

# 134. Mocked shell state

Institution:

> **Atlas M&A Advisory**

Transaction:

> **Project Horizon**

Participant:

> **Helena Duarte · Client CFO**

Organization:

> Atlas Industrial Holding S.A.

Internal sponsor:

> Ana Costa · Vice President

Access:

> Client Portal · Financial requests and selected approvals

Expiry:

> 31 dez. 2026

---

# 135. Mocked Client Portal overview

Required actions:

* Review Diligence Committee Brief v3;
* approve Information Request extension;
* complete two management confirmations.

Request progress:

* 34 accepted;
* 5 under review;
* 2 overdue.

Shared deliverables:

* Client Risk Summary v2;
* Diligence Committee Brief v3;
* Information Request Register;
* approved Valuation Summary v4.

---

# 136. Mocked Information Request

Selected:

> **Monthly Revenue by Customer — FY2024 and FY2025**

State:

> Additional information required

Submitted:

* `Receita_por_Cliente_2025.xlsx` v2;
* two customer contracts;
* management confirmation.

Reviewer message:

> Confirm whether workbook values are net of indirect taxes and use consistent customer identifiers.

Due:

> 31 jul. 2026 · 17:00 BRT

---

# 137. Mocked External Approval

Decision:

> **Authorize Diligence Committee Brief v3 for client committee review**

Included:

* Six approved material risks;
* R$ 438 mi–R$ 478 mi valuation reference;
* six open requests;
* approved client-safe recommendations.

State:

> Approval required

Due:

> 2 ago. 2026 · 17:00 BRT

---

# 138. Mocked Secure Submission

Submitter:

> Carlos Mendes · Municipal Tax Advisor

Request:

> Updated municipal tax certificate

Upload:

> `Certidao_Tributaria_Municipal.pdf`

State:

> Received · Security validation complete · Under internal review

Receipt:

> SUB-042

---

# 139. Recommended static composition

```text
┌──────────────────────────────────────────────────────────────────┐
│ Atlas M&A Advisory · Project Horizon · Client Portal            │
├───────────────────────────────┬──────────────────────────────────┤
│ Required actions              │ Selected information request     │
│                               │                                  │
│ Review Committee Brief v3     │ Monthly revenue by customer      │
│ Due 2 Aug                     │                                  │
│                               │ Additional information required  │
│ Approve request extension     │                                  │
│ Due today                     │ Workbook v2 received             │
│                               │ 2 contracts received             │
│ Submit 2 confirmations        │                                  │
│                               │ Confirm tax basis and customer   │
│ Requests                      │ identifiers                      │
│ 34 accepted · 5 review        │                                  │
│ 2 overdue                     │ [ Update response ]              │
└───────────────────────────────┴──────────────────────────────────┘
```

This demonstrates:

* Restricted external scope;
* actionable requests;
* submission state;
* client decision;
* no internal analysis exposure.

---

# 140. Recommended demo flows

## Flow A — Client activation

```text
Invitation
  ↓
Identity verification
  ↓
MFA
  ↓
Confidentiality acknowledgement
  ↓
Client Portal
```

## Flow B — Information request

```text
Request assigned
  ↓
Contributor opens requirements
  ↓
Uploads workbook
  ↓
Adds management confirmation
  ↓
Submits
  ↓
Receives traceable receipt
```

## Flow C — Clarification

```text
Internal reviewer requests clarification
  ↓
Contributor receives notification
  ↓
Updates structured answer
  ↓
Uploads workbook v2
  ↓
Resubmits
```

## Flow D — External approval

```text
Client CFO opens decision
  ↓
Reviews approved evidence package
  ↓
Reauthenticates
  ↓
Approves with condition
  ↓
Decision receipt created
```

## Flow E — Secure one-time submission

```text
Specialist receives secure link
  ↓
Verifies email
  ↓
Uploads certificate
  ↓
File validated
  ↓
Receipt issued
  ↓
Link expires
```

## Flow F — Access revocation

```text
External work completed
  ↓
Sponsor reviews access
  ↓
Access revoked
  ↓
Active session ends
  ↓
Submissions and decisions remain preserved
```

---

# 141. UX prototype tasks to validate

Test whether external users can:

1. Understand who invited them.
2. understand why they have access.
3. identify the transaction safely.
4. find their internal sponsor.
5. complete activation.
6. configure MFA.
7. understand access expiry.
8. find outstanding requests.
9. distinguish draft from submitted response.
10. upload the requested format.
11. identify a processing failure.
12. obtain a receipt.
13. replace an incorrect file.
14. respond to a clarification.
15. understand why a response was returned.
16. identify accepted portions.
17. request a due-date extension.
18. find a shared deliverable.
19. distinguish an approved deliverable from a draft.
20. complete an approval.
21. understand the effect of approval or rejection.
22. approve with conditions.
23. recuse.
24. identify an invalidated approval.
25. submit a file using a one-time link.
26. understand that receipt is not acceptance.
27. locate help.
28. sign out securely.

Test whether internal users can:

29. Invite an external participant.
30. define purpose and sponsor.
31. restrict portal scope.
32. assign requests.
33. review submissions.
34. accept or return evidence.
35. create an external approval package.
36. revoke access.
37. trace external activity in the internal audit.

---

# 142. Design validation criteria

The External-Participant Screen Family is ready when:

1. External mode is visually distinct from the banker workspace.
2. External users do not receive internal global navigation.
3. Client access cannot be simulated with an internal view toggle.
4. Every participant has an internal sponsor.
5. Every participation record has a defined purpose.
6. Every access scope has an effective period.
7. Invitation acceptance and access activation remain separate.
8. Sensitive actions support reauthentication.
9. External navigation contains only permitted destinations.
10. Hidden internal workspaces do not leak through disabled tabs.
11. External search is narrowly scoped.
12. External assistant behavior is procedural and permission-bound.
13. Internal findings remain hidden unless deliberately published.
14. Internal valuation deliberation remains hidden.
15. Negotiation strategy remains hidden.
16. Requests contain clear response requirements.
17. Submission and acceptance remain separate states.
18. External drafts are not treated as evidence.
19. File replacements create versions.
20. Clarifications remain object-scoped.
21. Partial acceptance is supported.
22. No-document responses are supported.
23. External users cannot invite arbitrary participants.
24. External approval packages contain approved evidence only.
25. Approval authority is verified.
26. Material decisions require explicit confirmation.
27. Approval receipts preserve object version and authority.
28. Changed objects invalidate prior approvals where required.
29. One-time submission links are request-bound and expiring.
30. Submission receipts do not claim internal acceptance.
31. Files pass controlled validation.
32. Passwords are not collected through free-text notes.
33. Access revocation terminates active sessions.
34. Historical submissions and decisions remain preserved.
35. External activity does not expose the internal audit timeline.
36. External notification content is safe for email and mobile previews.
37. Restricted data does not leak through counts or autocomplete.
38. Server-side authorization protects every external endpoint.
39. The current `/clients` redirect is not represented as a Client Portal.
40. The existing `vdr-request` schema is not represented as a complete external workflow.
41. The family remains usable without unrestricted AI.
42. Mobile supports core submission and approval flows.
43. Accessibility supports non-specialist participants.
44. The mocked fixture remains fictional.
45. Every external state provides a clear next action or support route.

---

# 143. Final design target

The correct design target is not:

> “A simplified version of the internal M&Ai interface for clients.”

It is:

> **A set of purpose-specific, time-bound transaction portals where external participants can provide evidence, review approved information and complete defined decisions without gaining access to internal deal intelligence.**

Its defining interaction is:

> **Receive a scoped invitation → authenticate → understand the required action → submit evidence or record a decision → receive a verifiable status → exit when the purpose is complete**

This completes the canonical screen-family sequence.

**Next phase: Cross-screen interaction map, shared state model and implementation roadmap.**
