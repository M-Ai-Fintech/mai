---
canonical_name: "Team Workspace"
definition_id: "BD-17"
definition_status: "Governed for MAI-90"
screen_family: "institution-wide"
owning_task: "MAI-91"
canonical_routes:
  - "/team"
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
# Team Workspace

## 1. Recommended product naming

Use:

* **Global navigation:** `Team`
* **Page title:** `Team Workspace`
* **Institution user:** `Team Member`
* **Deal-specific participation:** `Deal Assignment`
* **Functional specialization:** `Workstream`
* **Temporary coverage:** `Delegation`
* **Access-bearing membership:** `Institution Membership`
* **Pending account:** `Invitation`
* **Resource-planning state:** `Capacity`
* **External participant:** `External Collaborator`

The global navigation label should remain the concise **Team**. The page title may expand to **Team Workspace** to clarify that this is an operational staffing and membership environment rather than a simple employee directory.

Team is one of the five principal institution-level destinations and is an MVP screen because institution membership and transaction assignments require a global workspace.  

---

# 2. Screen definition

The **Team Workspace** is the institution-level workspace where authorized users manage:

* Institution membership;
* banker and specialist profiles;
* institutional roles;
* workstream capabilities;
* planned availability;
* current transaction assignments;
* assignment responsibility;
* approval authority summaries;
* temporary delegation;
* invitations;
* offboarding;
* staffing gaps;
* restricted external collaborators.

It should answer:

1. **Who belongs to the institution?**
2. **Which members are active, invited, unavailable or leaving?**
3. **What is each person’s institutional role?**
4. **Which transaction workstreams can they perform?**
5. **Which deals are they currently assigned to?**
6. **What responsibility do they hold in each deal?**
7. **Who has available capacity for new work?**
8. **Which deals have staffing gaps or concentration risk?**
9. **Who can review or approve a particular type of work?**
10. **What must be transferred when someone becomes unavailable?**

Its central operating sequence is:

> **Institution membership → Capability and availability → Deal assignment → Responsibility and authority → Work execution → Reassignment or offboarding**

---

# 3. Primary intention

## Operational intention

Give the institution one reliable view of its people, transaction responsibilities and near-term staffing constraints.

## User intention

A team lead should be able to say:

> “I know who is available, who owns each transaction responsibility and where staffing or authority gaps may affect execution.”

## Product intention

The Team Workspace should support M&Ai’s Deal Workflow Orchestrator by ensuring that tasks, approvals and transaction work are routed to eligible people.

The product proposition includes assigning tasks, monitoring exceptions and routing material outputs for human approval. That orchestration depends on accurate membership, assignment and authority data. 

---

# 4. Strategic product role

The Team Workspace is not a primary analytical screen, but it is essential to transaction execution.

It supports:

* New Deal Setup;
* Deal Team & Access;
* Tasks & Approvals;
* workload routing;
* approval authority;
* separation of duties;
* absence coverage;
* external collaboration;
* onboarding and offboarding;
* institution security;
* transaction accountability.

Without a canonical team layer, M&Ai cannot reliably answer:

* Who owns the financial review?
* Who may approve a valuation treatment?
* Who should receive a closing escalation?
* Who can access a restricted legal workstream?
* Who replaces the Deal Lead during planned leave?
* Which specialist is eligible for a new tax review?

The screen should therefore feel like transaction staffing infrastructure—not an employee directory added as an administrative afterthought.

---

# 5. What the Team Workspace is not

The screen should not become:

* A human-resources information system;
* a payroll application;
* an employee-performance dashboard;
* a timesheet system;
* an employee-surveillance product;
* a productivity leaderboard;
* a generic org chart;
* a complete permissions editor;
* a task inbox;
* a project-management board;
* an internal social network;
* an approval-decision screen;
* a calendar replacement;
* a staffing recommendation black box;
* a list of everyone who has ever accessed a deal.

The central question is not:

> “Which employee completed the most tasks?”

It is:

> **“Does each transaction have the right accountable people, authority and availability to proceed?”**

---

# 6. Relationship to adjacent screens

| Screen                                           | Primary responsibility                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| **Team Workspace**                               | Manages institution members, capabilities, availability and cross-deal assignments |
| **Deal Team & Access**                           | Manages one deal’s participants, detailed permissions and access boundaries        |
| **Roles & Permissions**                          | Defines reusable institution roles and capability policies                         |
| **Tasks & Approvals**                            | Shows the actual work and decisions assigned to people                             |
| **Command Center**                               | Surfaces institution-level execution attention                                     |
| **Deals Portfolio**                              | Shows transactions and their accountable leaders                                   |
| **New Deal Setup**                               | Establishes initial deal-team assignments                                          |
| **Profile & Preferences**                        | Allows an individual to manage personal settings                                   |
| **Security & Data Governance**                   | Defines authentication, access-review and security policy                          |
| **Institution Audit & Compliance**               | Preserves access and membership events                                             |
| **Google Calendar or availability integrations** | Supplies optional availability signals                                             |

---

# 7. Team Workspace versus Deal Team & Access

This distinction must remain explicit.

## Team Workspace

Institution-level.

It answers:

* Who belongs to the institution?
* Which capabilities and workstreams are associated with them?
* Which deals are they assigned to?
* What is their broad availability?
* Which staffing gaps exist across the portfolio?

## Deal Team & Access

Deal-specific.

It answers:

* Who may access Project Horizon?
* Which workstream can each participant see?
* Who is the Deal Lead?
* Who can edit, review or approve?
* Which external participants have restricted access?
* When does access expire?

## Example

The Team Workspace may show:

> Ana Costa · Vice President
> 3 active deals · Financial Review specialist

The Project Horizon Deal Team screen may show:

> Ana Costa
> Financial workstream: Full access
> Diligence: Review
> Valuation treatment: Approve
> Negotiation: Summary only
> Closing bank details: No access

The global Team screen should not expose every sensitive deal permission by default.

---

# 8. Team Workspace versus Roles & Permissions

## Team Workspace

Applies roles to people and shows their operational consequences.

Examples:

* Ana Costa is a Vice President;
* Felipe Rocha is an Associate;
* Daniel Ribeiro belongs to the Tax specialist group;
* Marina Alves has Deal Lead authority on three transactions.

## Roles & Permissions

Defines what those roles mean.

Examples:

* Vice Presidents may review valuation treatments within configured thresholds;
* Partners may approve material closing waivers;
* Associates may edit but not approve valuation scenarios;
* external counsel may access only Legal workstreams.

## UX rule

The Team Workspace may summarize:

> Approval authority: Valuation Review

It should route policy editing to:

> Roles & Permissions

Do not embed a complete permission matrix inside each member profile.

---

# 9. Team Workspace versus Tasks & Approvals

## Team Workspace

Shows:

* Assignment counts;
* workload bands;
* due-date concentration;
* critical responsibilities;
* staffing coverage;
* availability.

## Tasks & Approvals

Shows:

* The exact work item;
* its evidence;
* due date;
* consequence;
* decision controls;
* audit history.

The Team Workspace may show:

> Felipe Rocha · 7 open work items · 2 due today

It should not allow the user to approve or complete those work items from the staffing view.

---

# 10. Team member versus Contact

Internal institution members and external contacts are distinct domains.

## Team member

A person with:

* Institution membership;
* authentication identity;
* product permissions;
* internal title;
* transaction assignments;
* approval authority;
* workload;
* availability.

## Contact

An external or relationship person associated with:

* An organization;
* a transaction;
* communication channels;
* relationship history.

An external lawyer may be:

* A Contact;
* an External Collaborator on one deal;
* but not an institution Team Member.

## UX rule

Do not promote an external contact into the institution Team directory merely because they received restricted deal access.

---

# 11. Internal members versus external collaborators

## Internal member

Belongs to the institution and may receive:

* Global workspace access;
* institution roles;
* deal assignments;
* tasks and approvals;
* reusable workstream capability.

## External collaborator

Receives scoped access to:

* One or more named deals;
* selected workstreams;
* specific tasks, documents or approvals;
* defined expiry.

Examples:

* External legal counsel;
* client participant;
* accounting advisor;
* tax specialist;
* industry expert.

External collaborators should normally appear in:

* Deal Team & Access;
* external portals;
* restricted Team views for administrators.

They should not appear indistinguishably beside employees in the default Team directory.

---

# 12. Primary users

## 12.1 Managing Director or Partner

Needs to:

* Review deal leadership;
* identify staffing gaps;
* understand senior-member capacity;
* assign Deal Leads;
* manage approval coverage;
* plan upcoming transactions.

## 12.2 Vice President

Needs to:

* Staff analysts and associates;
* review workstream assignments;
* coordinate temporary coverage;
* understand near-term deadlines;
* identify available specialists.

## 12.3 Deal Lead

Needs to:

* Build and maintain the deal team;
* assign workstream owners;
* identify unowned responsibilities;
* request additional capacity;
* transfer responsibilities.

## 12.4 Team administrator

Needs to:

* Invite members;
* maintain membership;
* assign institution roles;
* suspend or deactivate accounts;
* manage groups;
* resolve provisioning issues;
* coordinate offboarding.

## 12.5 Security administrator

Needs to:

* Review active accounts;
* detect stale or inappropriate access;
* monitor external collaborators;
* require access reviews;
* preserve separation of duties.

## 12.6 Individual member

Needs to:

* Review personal assignments;
* see recorded capability and availability;
* identify incorrect assignments;
* manage broad availability;
* understand delegated responsibilities.

---

# 13. Primary job to be done

> When the institution must staff and govern several transactions simultaneously, provide one reliable view of its members, capabilities, assignments and availability so each responsibility has an accountable eligible owner.

## Secondary jobs

The user should also be able to:

* Find a team member;
* invite a new member;
* inspect institutional role;
* inspect workstream capability;
* view active deals;
* identify overloaded or unavailable members;
* find unassigned deal responsibilities;
* assign a person to a deal;
* change a deal role;
* delegate temporary responsibility;
* transfer open work;
* deactivate a departing member;
* review external collaborators;
* find authority gaps;
* export an authorized staffing roster.

---

# 14. Core conceptual model

The Team Workspace should separate seven concepts.

## Layer 1 — Person

The human being.

## Layer 2 — Institution membership

The person’s access-bearing relationship with the institution.

## Layer 3 — Institutional role

Their organization-wide product and governance role.

## Layer 4 — Capability

Workstreams and transaction functions they are qualified or expected to perform.

## Layer 5 — Availability

Their broad capacity and temporary availability.

## Layer 6 — Deal assignment

Their responsibility inside a specific transaction.

## Layer 7 — Authority

Which reviews, approvals or external actions they may perform.

These concepts should not be collapsed into one generic “user role.”

---

# 15. Team-member lifecycle

Recommended membership states:

## Invited

Invitation sent but not accepted.

## Provisioned

Account created through SSO or directory provisioning but first access is incomplete.

## Active

Normal institution access.

## Access review required

Membership remains active, but role or access requires review.

## Temporarily suspended

Sign-in and actions are disabled while the record remains intact.

## Offboarding

Responsibilities and access are being transferred.

## Deactivated

Institution access has ended.

## Archived

Historical record retained outside normal active-member views.

## Invitation expired

The account was not activated within the permitted period.

---

# 16. Deal-assignment lifecycle

Recommended assignment states:

* Proposed;
* pending acceptance;
* active;
* temporary;
* delegated;
* ending;
* completed;
* removed;
* superseded;
* restricted.

## Example

```text
Proposed assignment
  ↓
Deal Lead confirms
  ↓
Member accepts, when policy requires
  ↓
Active
  ↓
Responsibility transferred
  ↓
Completed or removed
```

An assignment should preserve:

* Deal;
* role;
* workstream;
* responsibility;
* start;
* end;
* assignment authority;
* access consequence.

---

# 17. Recommended workspace structure

The Team Workspace should contain six principal views:

1. **People**
2. **Capacity**
3. **Deal Assignments**
4. **Groups**
5. **Invitations**
6. **Former Members**

Permission-controlled supporting view:

7. **External Collaborators**

## People

Canonical institution-member directory.

## Capacity

Near-term availability and workload distribution.

## Deal Assignments

Cross-deal staffing and responsibility matrix.

## Groups

Reusable working groups, committees and specialist pools.

## Invitations

Pending access activation and provisioning exceptions.

## Former Members

Deactivated and archived membership history.

## External Collaborators

Restricted view for temporary non-institution participants.

---

# 18. Default view: People

The default should use a dense, searchable table.

It should optimize for:

* Member discovery;
* institutional role;
* current transaction responsibility;
* availability;
* membership state;
* rapid staffing actions.

It should not default to:

* A photo wall;
* employee cards;
* a decorative org chart;
* performance charts;
* a social directory.

---

# 19. Page header

## Recommended title

> **Team Workspace**

Supporting description:

> Institution members, capabilities, availability and transaction assignments.

## Header summary

Example:

* **18 active members**
* **11 assigned to active deals**
* **2 staffing gaps**
* **1 invitation pending**

## Primary action

> **Invite member**

## Secondary actions

* Staff a deal;
* review capacity;
* manage groups.

---

# 20. Operational summary

Use no more than five compact summary controls.

| Summary              | Example | Meaning                                           |
| -------------------- | ------: | ------------------------------------------------- |
| Active members       |  **18** | Members with current institution access           |
| Active deal staff    |  **11** | Members assigned to active transactions           |
| Staffing gaps        |   **2** | Required responsibilities without eligible owners |
| Limited availability |   **3** | Members with near-term capacity constraints       |
| Pending invitations  |   **1** | Users not yet activated                           |

Each summary should filter or route to the relevant view.

Avoid:

* Productivity;
* utilization score;
* average task completion;
* ranking;
* billable hours;
* “team performance.”

---

# 21. Recommended People columns

1. **Team member**
2. **Title**
3. **Institution role**
4. **Capabilities**
5. **Active deals**
6. **Primary responsibilities**
7. **Availability**
8. **Open work**
9. **Membership state**
10. **Actions**

Optional columns:

* Location or time zone;
* manager;
* approval authority summary;
* planned leave;
* invitation date;
* last access review;
* external collaborator;
* authentication method;
* groups.

---

# 22. Team-member row anatomy

## Person

> **Ana Costa**

Supporting:

> Vice President · São Paulo · BRT

## Institution role

> Banker · Valuation Reviewer

## Capabilities

> Financial Review · Valuation · Negotiation

## Active deals

> **3 active**

* Project Horizon;
* Project Northstar;
* Project Aurora.

## Responsibility

> Financial Review VP

## Availability

> **Limited this week**

## Open work

> 5 items · 2 approvals

## Membership

> Active

---

# 23. Member identity

The member identity cell should contain:

* Full name;
* title;
* optional photo or initials;
* location or time zone;
* availability marker;
* external or restricted marker.

Photos should remain optional and secondary.

Initials are sufficient for an institutional workflow product.

---

# 24. Title, institution role and deal role

These are different concepts.

## Professional title

> Vice President

Represents organizational seniority.

## Institution role

> Banker Member

Defines broad product capabilities.

## Deal role

> Financial Review VP · Project Horizon

Defines responsibility in one transaction.

## Approval authority

> May review valuation treatments under configured policy

Defines governed action rights.

## UX rule

Do not show only:

> Role: VP

That does not adequately explain product permissions or transaction responsibility.

---

# 25. Institution-role model

Recommended institution roles:

* Partner or Managing Director;
* Vice President;
* Associate;
* Analyst;
* Specialist;
* Deal Administrator;
* Institution Administrator;
* Security Administrator;
* Compliance or Conflicts Reviewer;
* Auditor;
* Read-only Member.

Professional titles and system roles may differ.

Example:

> Professional title: Director
> Product role: Compliance Reviewer

---

# 26. Capability model

Capabilities describe transaction work the member can perform.

Recommended capabilities:

* Deal leadership;
* financial diligence;
* commercial diligence;
* legal diligence coordination;
* tax review;
* operational review;
* valuation;
* buyer or target screening;
* negotiation;
* closing coordination;
* document administration;
* client communication;
* conflict review;
* funds-flow review.

## Capability states

* Primary;
* experienced;
* supporting;
* trainee;
* not assigned;
* expired qualification, where applicable;
* restricted.

## UX rule

Capabilities should be institution-managed and reviewable.

They should not be inferred solely from task history.

---

# 27. Capability evidence

Optional capability support may include:

* Institution assignment;
* historical deal participation;
* completed training;
* professional qualification;
* approved specialist status.

The system should not infer:

> Expert in valuation

merely because a person opened several valuation screens.

---

# 28. Availability model

Recommended broad states:

* Available;
* balanced;
* limited;
* unavailable;
* out of office;
* departing;
* unknown.

Availability may be based on:

* Member-provided state;
* planned assignment allocation;
* approved leave dates;
* current critical deadlines;
* institution staffing plan.

It should not be secretly inferred from:

* Keyboard activity;
* message volume;
* hours online;
* response speed.

---

# 29. Availability explanation

Every non-neutral availability state should be explainable.

Example:

> **Limited through 31 July**

Reasons:

* Project Horizon diligence committee;
* Project Northstar valuation review;
* two approvals due this week.

Example:

> **Unavailable 5–9 August**

Source:

> Planned absence

Do not expose private leave reasons.

---

# 30. Planned capacity versus observed work

The screen should distinguish:

## Planned capacity

What the institution explicitly assigned.

Example:

> 60% Project Horizon
> 30% Project Northstar
> 10% available

## Current work pressure

What near-term workflow indicates.

Example:

> 2 critical items · 5 tasks due this week

A member may be:

* Fully allocated but operationally quiet;
* lightly allocated but facing a closing emergency.

Do not collapse both into one utilization percentage.

---

# 31. Capacity bands

Recommended banker-facing bands:

## Available

Can reasonably accept additional work.

## Balanced

Current assignments appear manageable.

## Limited

New material work should be reviewed before assignment.

## Unavailable

Should not receive new work.

## Unknown

The institution has insufficient planning data.

A numeric allocation may appear where explicitly maintained.

The band should remain explainable.

---

# 32. What capacity should not measure

Do not use:

* Screen time;
* login duration;
* mouse activity;
* number of messages;
* number of files viewed;
* average response time;
* raw task count without materiality;
* AI-generated performance estimate.

A closing blocker and an administrative classification task are not equivalent workload units.

---

# 33. Capacity view

The Capacity view should answer:

* Who can accept new work?
* Who has critical deadline concentration?
* Which workstreams are constrained?
* Which upcoming milestones create staffing pressure?
* Where is backup coverage missing?

Recommended groupings:

* By member;
* by workstream;
* by deal;
* by week.

---

# 34. Capacity-row anatomy

> **Felipe Rocha · Associate**

Planned allocation:

* Project Horizon: 50%;
* Project Aurora: 30%.

Near-term work:

* 7 open items;
* 2 due today;
* 1 blocked.

Availability:

> **Limited**

Critical responsibility:

> Project Horizon Diligence preparation

Backup:

> None assigned

---

# 35. Capacity horizon

Support:

* Current week;
* next two weeks;
* next 30 days;
* custom range.

The default should be:

> **Next two weeks**

This is long enough for staffing decisions without implying long-range forecasting precision.

---

# 36. Capacity data freshness

Display:

> Capacity updated 26 July

or:

> Based on current deal assignments and deadlines

Where data is incomplete:

> **Capacity uncertain**

Reasons:

* One active deal has no allocation plan;
* planned absence not confirmed;
* external project load unavailable.

---

# 37. Deal Assignments view

This view should present a matrix or structured table across active deals.

Recommended columns:

1. Deal;
2. phase;
3. Deal Lead;
4. financial owner;
5. legal owner;
6. tax owner;
7. valuation owner;
8. execution coordinator;
9. staffing gaps;
10. next milestone.

The visible workstreams should adapt to transaction type and institution playbook.

---

# 38. Deal staffing matrix

Example:

| Deal              | Lead         | Financial    | Legal            | Tax            | Valuation | Gap          |
| ----------------- | ------------ | ------------ | ---------------- | -------------- | --------- | ------------ |
| Project Horizon   | Marina Alves | Ana Costa    | External counsel | Daniel Ribeiro | Ana Costa | Backup Lead  |
| Project Aurora    | Roberto Lima | Felipe Rocha | Camila Nunes     | —              | Ana Costa | Tax owner    |
| Project Atlas     | Marina Alves | Felipe Rocha | Camila Nunes     | Daniel Ribeiro | —         | None         |
| Project Northstar | Ana Costa    | Felipe Rocha | External counsel | —              | Ana Costa | Legal backup |

## UX rule

The matrix should show accountability, not every person with read access.

---

# 39. Deal-assignment types

Recommended assignment types:

* Deal Lead;
* deputy lead;
* financial lead;
* financial analyst;
* legal coordinator;
* tax reviewer;
* commercial reviewer;
* valuation owner;
* buyer-universe owner;
* negotiation owner;
* closing coordinator;
* client-relationship owner;
* document administrator;
* approver;
* observer.

These are responsibilities, not permission templates.

---

# 40. Accountable owner versus contributor

Each workstream should distinguish:

## Accountable owner

Ultimately responsible for the output.

## Contributor

Performs supporting work.

## Reviewer

Assesses prepared work.

## Approver

Authorizes a material state change.

Example:

> Felipe Rocha — Contributor
> Ana Costa — Accountable owner and reviewer
> Marina Alves — Final approver

---

# 41. Staffing gaps

A staffing gap exists when a required responsibility has no eligible active owner.

Examples:

* No Deal Lead;
* no valuation approver;
* no tax reviewer;
* no backup for closing day;
* assigned owner deactivated;
* external counsel access expired;
* required separation-of-duties reviewer missing.

## Gap state

* Open;
* suggested coverage;
* assignment pending;
* resolved;
* accepted exception;
* no longer required.

---

# 42. Staffing-gap anatomy

> **Project Aurora · Tax reviewer missing**

Required by:

> Sell-side standard workflow

Needed before:

> Diligence committee · 6 August

Eligible members:

* Daniel Ribeiro — Limited;
* Camila Nunes — Available, supporting capability.

Actions:

* Assign;
* request external specialist;
* mark not required with rationale.

---

# 43. Assignment recommendations

M&Ai may suggest eligible members based on:

* Required capability;
* institutional role;
* authority;
* current deal conflicts;
* availability;
* location or time zone;
* existing relationship;
* separation of duties;
* planned absence.

## Recommendation anatomy

> **Suggested: Camila Nunes**

Reasons:

* Tax supporting capability;
* available next week;
* no conflict;
* not currently assigned to Project Aurora.

Limitation:

> Has not previously held accountable Tax Reviewer responsibility.

## UX rule

Do not use an opaque:

> 92% staffing match

---

# 44. Staff-a-deal flow

Recommended sequence:

1. Select deal;
2. review required workstreams;
3. identify gaps;
4. choose member;
5. select responsibility;
6. review capability and availability;
7. review access consequence;
8. define start and optional end;
9. confirm assignment.

## Consequence

The assignment may create:

* Deal Team entry;
* default access proposal;
* task-routing eligibility;
* approval-routing eligibility;
* notification;
* audit event.

Detailed access should remain separately reviewable.

---

# 45. Add assignment from member

From the member profile:

> **Assign to deal**

Required:

* Deal;
* transaction responsibility;
* workstream;
* accountable or supporting role;
* start date;
* expected duration;
* proposed access;
* assigning authority.

The flow should warn about:

* Availability;
* conflicts;
* separation of duties;
* incompatible active assignments;
* planned absence.

---

# 46. Assignment acceptance

Institution policy may allow:

## Automatic assignment

Used for normal internal staffing by authorized leaders.

## Member acknowledgement

The assignment becomes active, but the member acknowledges responsibility.

## Explicit acceptance

Required for:

* External specialists;
* temporary delegations;
* major accountable roles;
* assignments outside normal capability.

The assignment state should make the distinction visible.

---

# 47. Assignment change

Changing a role may affect:

* Access;
* open tasks;
* approval authority;
* notifications;
* workstream ownership;
* backup coverage.

Example:

> **Change Ana Costa from Financial Reviewer to Financial Lead?**

Consequences:

* Five open reviews remain assigned;
* two future approval requests route to Ana;
* Valuation edit access is proposed;
* prior Financial Lead history remains unchanged.

---

# 48. Assignment removal

Before removing a member from a deal, show:

* Open tasks;
* pending approvals;
* owned artifacts;
* critical responsibilities;
* temporary delegations;
* access consequence;
* replacement requirement.

## Example

> **Remove Felipe Rocha from Project Horizon?**

Open responsibilities:

* 3 diligence tasks;
* 1 draft information request;
* 2 document-review assignments.

Required:

> Transfer or close each responsibility.

---

# 49. Responsibility-transfer flow

Recommended sequence:

1. Select outgoing member;
2. review assignments;
3. select receiving member;
4. validate capability and authority;
5. transfer tasks;
6. transfer draft artifacts;
7. transfer accountable roles;
8. review access changes;
9. confirm effective time.

Historical ownership must remain preserved.

---

# 50. Backup coverage

Critical responsibilities may support a backup owner.

Examples:

* Deal Lead;
* closing coordinator;
* funds-flow reviewer;
* valuation approver;
* client-relationship owner.

## Backup state

* Assigned;
* not assigned;
* temporary;
* expired;
* unavailable.

## UX principle

Backup does not automatically receive full access or authority.

Access and activation rules remain explicit.

---

# 51. Concentration risk

The screen may surface staffing concentration such as:

> Marina Alves is the only Deal Lead on three transactions closing within 30 days.

or:

> Ana Costa is the sole eligible valuation approver for four active deals.

This is an execution dependency, not an employee-performance judgment.

## Suggested action

* Assign deputy;
* train additional approver;
* change milestone coverage;
* accept concentration with rationale.

---

# 52. Workstream coverage

The Capacity view should summarize coverage by capability.

Example:

| Workstream           | Active qualified members | Limited | Available |        Gap |
| -------------------- | -----------------------: | ------: | --------: | ---------: |
| Financial Review     |                        6 |       2 |         2 |          0 |
| Valuation Approval   |                        3 |       2 |         0 | 1 upcoming |
| Tax Review           |                        2 |       1 |         1 |          1 |
| Closing Coordination |                        4 |       2 |         1 |          0 |

## UX rule

Counts must respect visibility.

Do not reveal restricted specialist assignments to unauthorized users.

---

# 53. Approval-authority summary

The Team Workspace may show broad authority categories:

* Dossier Review;
* Diligence Finding Approval;
* Valuation Review;
* Shortlist Approval;
* Outreach Authorization;
* Negotiation Approval;
* Closing Readiness;
* Funds-Flow Review.

Example:

> **Ana Costa**

* Valuation Review;
* Diligence Approval;
* Negotiation Review.

Exact thresholds and policy conditions belong in:

> Roles & Permissions

---

# 54. Authority gap

An authority gap exists when:

* No active eligible approver exists;
* all approvers are conflicted;
* required quorum cannot be reached;
* the sole approver is unavailable;
* separation of duties blocks every candidate.

Example:

> **Project Horizon valuation approval gap**

Reason:

> Deal Lead is unavailable and the remaining reviewer prepared the scenario.

Action:

> Assign an eligible independent approver.

---

# 55. Separation of duties

The Team Workspace should expose staffing constraints such as:

* Preparer cannot be final approver;
* payment verifier cannot perform both checks;
* Deal Administrator cannot approve material transaction decisions;
* conflict reviewer must be outside the deal team;
* external counsel cannot authorize client commercial decisions.

The screen should identify:

> **Assignment conflict**

before staffing is confirmed.

---

# 56. Deal access summary

For each assignment, show a concise access state:

* Access proposed;
* active;
* read only;
* workstream restricted;
* expires soon;
* suspended;
* no access.

The full permission detail should open:

> Deal Team & Access

## Example

> Project Horizon · Financial Lead
> Access: Financial and Valuation workstreams

---

# 57. Restricted deal behavior

Unauthorized users should not see:

* Deal codename;
* client identity;
* target identity;
* value;
* role;
* staffing participants.

Possible display:

> **Restricted assignment**

or no existence signal, according to policy.

Capacity calculation should avoid leaking restricted assignments through unexplained counts.

Example:

> 2 accessible active deals
> Additional restricted allocation may affect availability.

---

# 58. Groups

Groups support reusable coordination.

Recommended group types:

* Financial Diligence;
* Legal Review;
* Tax Specialists;
* Valuation Committee;
* Closing Team;
* Conflicts Committee;
* Deal Administrators;
* Partners;
* Brazil Coverage;
* Industry Specialists.

Groups may be used for:

* Assignment eligibility;
* review queues;
* notifications;
* access proposals;
* staffing search.

---

# 59. Groups versus roles

## Role

Defines broad product authority.

Example:

> Vice President

## Group

Defines working membership.

Example:

> Valuation Committee

A person may have:

* One primary professional title;
* several product roles;
* several groups;
* several deal assignments.

Groups should not silently confer unrestricted permissions unless policy explicitly defines that behavior.

---

# 60. Group detail

A group should contain:

* Name;
* purpose;
* owner;
* members;
* membership rule;
* relevant capabilities;
* routing use;
* access consequence;
* review date.

## Membership types

* Manual;
* role-based;
* capability-based;
* directory-synchronized;
* temporary.

---

# 61. Group-owner responsibility

The group owner may:

* Add or remove members;
* review group purpose;
* confirm eligibility;
* respond to staffing requests;
* maintain backup coverage.

Group ownership should not automatically permit:

* Editing institution roles;
* granting unrestricted deal access;
* approving material transaction decisions.

---

# 62. Invitations view

The Invitations view should show:

* Invitee;
* email;
* proposed institution role;
* proposed groups;
* inviter;
* sent date;
* expiry;
* activation state;
* issues.

## Invitation states

* Draft;
* sent;
* delivered;
* accepted;
* activation required;
* expired;
* revoked;
* failed;
* directory-provisioned.

---

# 63. Invite-member flow

Recommended sequence:

1. Enter email or select directory user;
2. confirm identity;
3. choose institution role;
4. select groups and capabilities;
5. define initial deal assignments, optionally;
6. review access;
7. select authentication method;
8. send invitation.

## Minimum fields

* Name;
* email;
* institution role;
* invitation expiry;
* inviter.

---

# 64. Invite preview

Before sending, show:

> **Invite Camila Nunes**

Institution role:

> Specialist Member

Capabilities:

* Legal Review;
* Closing Coordination.

Groups:

* Legal Review;
* Closing Team.

Initial deal access:

> None

Invitation expires:

> 7 August 2026

Primary action:

> Send invitation

---

# 65. Invitation safeguards

The product should detect:

* Existing active member;
* existing external collaborator;
* email-domain mismatch;
* pending invitation;
* former member;
* restricted domain;
* invalid role combination;
* SSO-only institution.

Example:

> **Existing external collaborator found**

> Camila Nunes currently has access to Project Atlas through external counsel.

Actions:

* Convert to internal member;
* keep separate;
* cancel invitation.

Conversion should preserve historical external access.

---

# 66. Provisioning

Membership may be created through:

* Manual invitation;
* enterprise SSO;
* directory synchronization;
* approved API provisioning.

The Team Workspace should show user-relevant outcomes:

* Provisioned;
* activation incomplete;
* role mapping failed;
* suspended by directory;
* removed by directory.

Technical configuration belongs in:

> Security & Data Governance

or:

> Integrations

---

# 67. Member activation

After accepting, the member may need to:

* Authenticate;
* accept institution policy;
* configure MFA;
* confirm profile;
* review assigned deals;
* complete mandatory access acknowledgement.

State:

> **Activation incomplete**

The member should not receive sensitive deal access until required security steps are complete.

---

# 68. Temporary suspension

Appropriate reasons:

* Security investigation;
* extended leave;
* identity issue;
* account compromise;
* administrative hold.

The Team Workspace should store a restricted reason category.

Sensitive investigation detail should remain accessible only to authorized administrators.

## Effect

* Sign-in disabled;
* external actions blocked;
* tasks reassigned or paused;
* approval authority disabled;
* historical record preserved.

---

# 69. Offboarding workflow

Offboarding should be controlled because a departing member may own:

* Active deals;
* workstreams;
* tasks;
* approvals;
* artifacts;
* client relationships;
* groups;
* external integrations;
* signature or funds-flow responsibilities.

## Recommended sequence

1. Set final access date;
2. identify active responsibilities;
3. select replacement owners;
4. transfer open work;
5. transfer relationship ownership;
6. remove approval authority;
7. review deal access;
8. revoke sessions;
9. deactivate membership;
10. preserve history.

---

# 70. Offboarding checklist

Example:

> **Offboard Felipe Rocha**

Open:

* 3 active deals;
* 7 tasks;
* 1 draft report;
* 2 organization relationships;
* 1 group membership requiring replacement.

Access ends:

> 15 August 2026 · 18:00 BRT

Primary action:

> Review transfers

---

# 71. Offboarding states

* Planned;
* transfer in progress;
* ready to deactivate;
* deactivation scheduled;
* deactivated;
* blocked;
* cancelled.

## Blocking conditions

Examples:

* Sole Deal Lead;
* only eligible approver;
* untransferred payment-verification responsibility;
* incomplete external-communication ownership;
* unresolved privileged access.

---

# 72. Former Members view

Former members should remain available for:

* Audit;
* historical assignments;
* decision history;
* authorship;
* relationship ownership history.

Recommended columns:

* Member;
* former title;
* membership end;
* final state;
* prior active deals;
* record retention;
* actions.

Actions:

* Open historical profile;
* restore membership;
* export audit record.

---

# 73. Reactivation

A former member may return.

Reactivation should:

* Preserve original person identity;
* create a new membership period;
* require current role review;
* require new access decisions;
* not restore old deal access automatically;
* preserve former assignments historically.

---

# 74. Planned absence

Members should be able to record broad availability:

* Out of office;
* limited;
* unavailable;
* available remotely;
* custom period.

The system should not require or display:

* Medical reason;
* personal reason;
* detailed leave type;

unless an external HR system provides an appropriately restricted signal.

---

# 75. Absence impact

When a planned absence affects critical work, show:

> **Coverage required**

Ana Costa will be unavailable from 5–9 August.

Affected:

* Project Horizon valuation review;
* Project Northstar committee approval;
* Project Aurora negotiation review.

Actions:

* Assign temporary delegate;
* reschedule milestone;
* accept risk.

---

# 76. Delegation

Delegation transfers selected responsibilities for a defined period.

Recommended fields:

* Delegator;
* delegate;
* responsibility type;
* deals;
* effective period;
* authority scope;
* task-transfer behavior;
* approval behavior;
* reason category.

## UX principle

Delegation should not silently transfer all access or authority.

---

# 77. Delegation types

## Task coverage

New tasks route to the delegate.

## Review coverage

Review requests route to the delegate.

## Approval delegation

Only where institution policy permits.

## Relationship coverage

The delegate acts as temporary relationship contact.

## Deal-role coverage

The delegate temporarily performs an accountable role.

Each type should have separate authority implications.

---

# 78. Approval delegation safeguard

Before delegating approval authority, verify:

* Delegate eligibility;
* transaction conflict;
* separation of duties;
* monetary thresholds;
* client mandate;
* policy;
* effective period.

Example:

> **Approval delegation unavailable**

> Felipe Rocha prepared the current valuation scenario and cannot act as its independent approver.

---

# 79. External Collaborators view

Authorized administrators may view:

* External participant;
* organization;
* active deals;
* role;
* access scope;
* expiry;
* sponsor;
* last review;
* state.

## Example

> **Camila Nunes**

Organization:

> Lume Legal Advisors

Role:

> External counsel

Deals:

> Project Horizon · Legal workstream only

Sponsor:

> Marina Alves

Access expires:

> 30 September 2026

---

# 80. External-collaborator states

* Invited;
* active;
* access review required;
* expires soon;
* expired;
* suspended;
* revoked;
* historical.

External access should normally require:

* Internal sponsor;
* named deal;
* defined workstream;
* expiry;
* restricted authentication;
* explicit terms.

---

# 81. External access review

The Team Workspace may surface:

> **3 external access reviews due**

The full permission decision should open:

> Deal Team & Access

or:

> Security & Data Governance

Do not renew all external access through a blind bulk action.

---

# 82. Member preview panel

Selecting a Team member should open a right-side panel.

Recommended sections:

1. Profile;
2. institution role;
3. capabilities;
4. availability;
5. active deals;
6. open responsibilities;
7. authority summary;
8. upcoming absence;
9. history.

## Primary actions

* Open member profile;
* assign to deal;
* update availability;
* delegate responsibility.

Administrative actions remain in overflow:

* Change institution role;
* suspend;
* start offboarding.

---

# 83. Member profile

A dedicated member route may contain:

1. **Overview**
2. **Deal Assignments**
3. **Responsibilities**
4. **Capabilities**
5. **Access Summary**
6. **History**

This is not necessarily a separate MVP screen in the catalogue; it can begin as a full-page expansion of the Team Workspace.

---

# 84. Member Overview

Recommended content:

* Name;
* title;
* institution role;
* location and time zone;
* membership state;
* availability;
* primary capabilities;
* active deals;
* critical responsibilities;
* planned absence;
* groups;
* access-review state.

Avoid:

* Performance review;
* compensation;
* personal demographic information;
* activity tracking.

---

# 85. Responsibilities view

Show:

* Accountable deal roles;
* supporting roles;
* pending assignments;
* delegated responsibilities;
* backup coverage;
* open authority gaps.

This view should not reproduce every task.

It may summarize:

> 3 accountable roles · 2 approval categories · 1 backup assignment

---

# 86. Search

Search should include:

* Name;
* title;
* email;
* institution role;
* capability;
* group;
* deal codename, where authorized;
* workstream;
* location;
* membership state.

Placeholder:

> Search members, capabilities or deal assignments

Example:

> `valuation`

Results:

* Ana Costa — Valuation Reviewer;
* Marina Alves — Valuation Approver;
* Valuation Committee;
* two members with supporting capability.

---

# 87. Filters

## Primary filters

* Membership state;
* title;
* institution role;
* capability;
* availability;
* active-deal assignment.

## Advanced filters

* Group;
* deal;
* workstream;
* approval authority;
* location or time zone;
* planned absence;
* external collaborator;
* access review;
* pending invitation;
* no active assignment;
* staffing gap eligibility;
* offboarding.

---

# 88. Saved views

Recommended:

* Active members;
* available for staffing;
* limited availability;
* Deal Leads;
* valuation reviewers;
* closing coordinators;
* no active deals;
* planned absence;
* external access expiring;
* invitations pending;
* offboarding;
* authority gaps.

Saved views should preserve:

* Filters;
* sort;
* grouping;
* visible columns;
* time horizon.

---

# 89. Sorting

Recommended options:

* Name;
* title;
* availability;
* active-deal count;
* open critical work;
* invitation date;
* access-review date.

Avoid:

* Productivity;
* approval speed;
* task-completion count;
* login frequency;
* “value to institution.”

---

# 90. Bulk actions

Appropriate:

* Add to group;
* request capability review;
* request availability update;
* export selected roster;
* send invitation reminder;
* assign institution tag.

Controlled:

* Assign several members to one deal;
* update broad availability;
* start access review;
* extend external-collaborator expiry after individual review.

Inappropriate:

* Bulk grant deal access;
* bulk assign approval authority;
* bulk mark available;
* bulk deactivate active Deal Leads;
* bulk transfer responsibilities without review;
* bulk performance ranking.

---

# 91. History and audit

Material events should include:

* Invitation sent;
* membership activated;
* institution role changed;
* capability changed;
* group membership changed;
* deal assignment added or removed;
* delegation created;
* authority changed;
* suspension;
* offboarding;
* deactivation;
* reactivation;
* external access expiry.

The Team Workspace shows operational history.

The complete immutable record belongs in:

> Institution Audit & Compliance

---

# 92. Contextual Copilot

Suggested prompts:

* Who is available for a new financial-diligence assignment?
* Which active deals lack a Tax reviewer?
* Show every Deal Lead with planned absence next month.
* Who can approve valuation treatments?
* Which members are assigned to Project Horizon?
* Who is the backup closing coordinator?
* Which external collaborators have access expiring this week?
* Prepare a staffing brief for the next two weeks.
* Which responsibilities must be transferred before Felipe leaves?
* Explain why Ana is marked as limited availability.

## Response requirements

The Copilot should:

* Use authorized membership and assignment data;
* explain capacity signals;
* avoid employee-performance judgments;
* preserve restricted deal visibility;
* distinguish capability from authority;
* distinguish planned allocation from current work pressure;
* route assignment changes through controlled flows.

---

# 93. Recommended desktop layout

For a **1440 × 900** canvas:

| Region                     | Approximate width |
| -------------------------- | ----------------: |
| Expanded global sidebar    |        240–256 px |
| Filter and saved-view rail |        220–260 px |
| Member directory           |        620–760 px |
| Preview panel              |        360–440 px |
| Page padding               |          24–32 px |

The Team Workspace uses the global shell with expanded institution-level navigation, consistent with Command Center, Deals, Organizations and Tasks & Approvals. 

---

# 94. Recommended People layout

```text
┌────────┬──────────────────────────────────────────────────────────────┐
│ Global │ Team Workspace · 18 active · 2 staffing gaps               │
│ shell  ├──────────────────────────────────────────────────────────────┤
│        │ People  Capacity  Deal Assignments  Groups  Invitations     │
│        ├──────────────┬─────────────────────────┬─────────────────────┤
│        │ Saved views  │ Team directory          │ Selected member     │
│        │              │                         │                     │
│        │ Active       │ Ana Costa               │ Vice President      │
│        │ Available    │ VP · 3 active deals     │                     │
│        │ Deal Leads   │ Limited this week       │ Financial Review    │
│        │ Specialists  │                         │ Valuation           │
│        │ Limited      │ Felipe Rocha            │ Negotiation         │
│        │ Invitations  │ Associate · 2 deals     │                     │
│        │ Former       │ 7 open work items       │ Active deals        │
│        │              │                         │ Horizon · Northstar  │
│        │              │ Daniel Ribeiro          │                     │
│        │              │ Tax Specialist          │ [ Assign to deal ]  │
└────────┴──────────────┴─────────────────────────┴─────────────────────┘
```

---

# 95. Capacity layout

```text
┌────────────────────────────────────────────┬─────────────────────────┐
│ Capacity · Next two weeks                  │ Staffing attention      │
│                                            │                         │
│ Marina Alves         Limited               │ 2 staffing gaps         │
│ 4 active deals · 2 major milestones        │                         │
│                                            │ Project Aurora          │
│ Ana Costa            Limited               │ Tax Reviewer missing    │
│ 3 active deals · 2 approvals due           │                         │
│                                            │ Project Horizon         │
│ Felipe Rocha         Balanced              │ Deal Lead backup missing│
│ 2 active deals · 7 open items              │                         │
│                                            │ [ Review staffing ]     │
│ Daniel Ribeiro       Available             │                         │
│ 2 active deals · no critical deadline      │                         │
└────────────────────────────────────────────┴─────────────────────────┘
```

---

# 96. Deal Assignments layout

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Deal staffing                                                        │
├──────────────────┬──────────────┬────────────┬──────────┬────────────┤
│ Deal             │ Deal Lead    │ Financial  │ Tax      │ Gap        │
├──────────────────┼──────────────┼────────────┼──────────┼────────────┤
│ Project Horizon  │ Marina Alves │ Ana Costa  │ Daniel   │ Lead backup│
│ Due Diligence    │              │            │ Ribeiro  │            │
├──────────────────┼──────────────┼────────────┼──────────┼────────────┤
│ Project Aurora   │ Roberto Lima │ Felipe     │ —        │ Tax owner  │
│ Buyer Universe   │              │ Rocha      │          │            │
├──────────────────┼──────────────┼────────────┼──────────┼────────────┤
│ Project Atlas    │ Marina Alves │ Felipe     │ Daniel   │ None       │
│ Closing          │              │ Rocha      │ Ribeiro  │            │
└──────────────────┴──────────────┴────────────┴──────────┴────────────┘
```

---

# 97. UI design direction

## Overall character

Aim for:

> **An institutional staffing and accountability workspace designed around transaction execution rather than employee monitoring**

The screen should feel:

* Professional;
* operational;
* calm;
* responsibility-aware;
* capacity-conscious;
* permission-aware;
* institutionally credible.

It should not feel:

* Like HR software;
* like a productivity tracker;
* like a social directory;
* like an employee leaderboard;
* like a colorful resource-planning game.

---

# 98. Visual hierarchy

Prioritize:

1. Member identity;
2. current transaction responsibility;
3. capability;
4. availability;
5. critical workload;
6. membership state;
7. authority summary;
8. administrative metadata.

Do not prioritize:

* Profile photo;
* total completed work;
* login frequency;
* average response time;
* task speed;
* activity score.

---

# 99. Color application

Use the established M&Ai palette:

* Canvas Cream: `#F3F0EE`
* Lifted Cream: `#FCFBFA`
* Ink Black: `#141413`
* Signal Orange: `#CF4500`
* Light Signal Orange: `#F37338`
* Dust Taupe: `#D1CDC7`
* Slate Gray: `#696969`

## Semantic application

* Available: green;
* balanced: neutral;
* limited: amber;
* unavailable: red-orange;
* planned absence: blue-neutral;
* staffing gap: Signal Orange;
* invitation pending: blue;
* suspended: dark red;
* offboarding: purple or differentiated neutral;
* deactivated: gray;
* external collaborator: outlined neutral.

Do not use red to label someone as “overloaded” without an explicit operational consequence.

---

# 100. Typography

Use **Sofia Sans**.

| Element          |     Size |  Weight |
| ---------------- | -------: | ------: |
| Page title       | 26–30 px | 500–600 |
| Member name      | 14–16 px | 650–700 |
| Selected member  | 20–24 px | 600–700 |
| Capacity state   | 13–15 px | 600–700 |
| Section heading  | 15–17 px | 650–700 |
| Body             | 13–15 px | 450–500 |
| Metadata         | 12–13 px | 450–550 |
| Status           | 11–12 px | 650–700 |
| Assignment title | 13–15 px | 600–700 |

Use tabular numerals for:

* Deal counts;
* work-item counts;
* allocation percentages;
* dates;
* time periods;
* monetary authority thresholds.

Use pt-BR formatting:

* `31 jul. 2026`
* `17:00 BRT`
* `R$ 25 mi`

---

# 101. Geometry and density

Recommended:

* Member rows: 60–72 px;
* capacity rows: 64–80 px;
* main surfaces: 6–10 px radius;
* profile preview: 8–12 px or flush drawer;
* compact status pills;
* restrained borders;
* no more than two stacked secondary lines per directory row.

Avoid:

* Oversized employee cards;
* large profile photography;
* circular utilization gauges;
* heatmaps without accessible labels;
* heavy shadows;
* decorative organizational-tree graphics;
* gradient capacity meters.

---

# 102. UX design principles

## 102.1 Responsibility before activity

Show what the person owns, not how frequently they use the product.

## 102.2 Capability before recommendation

A staffing suggestion must first satisfy functional eligibility.

## 102.3 Authority before assignment

A person may be capable of reviewing work but not authorized to approve it.

## 102.4 Planned capacity and workflow pressure remain separate

Do not treat a task count as a resource plan.

## 102.5 Materiality matters

Seven routine tasks may require less attention than one closing blocker.

## 102.6 Deal assignment and deal access remain distinct

Responsibility may propose access, but access must remain reviewable.

## 102.7 Internal and external participants remain distinct

Do not mix institution members with temporary counterparties.

## 102.8 Privacy before convenience

Do not expose leave reasons or sensitive employee information.

## 102.9 Delegation is scoped and temporary

Do not silently transfer all authority.

## 102.10 Offboarding preserves accountability

Historical decisions and assignments remain attributed to the original member.

## 102.11 No productivity ranking

Team leads need coverage and responsibility—not competitive employee metrics.

## 102.12 Every staffing gap has a consequence

Explain what transaction or milestone is affected.

---

# 103. System states

## 103.1 No team members

> **Invite the institution team**

Primary action:

> Invite member

Supporting:

> Add the people who will create, review and approve transaction work.

## 103.2 No search results

> No members match this search.

Actions:

* Clear filters;
* search capability;
* review former members;
* invite member.

## 103.3 Loading

Use stable table skeletons.

## 103.4 Partial service failure

> **Capacity information unavailable**

Member identities and deal assignments remain accessible.

## 103.5 Invitation pending

Show expiry and resend controls.

## 103.6 Invitation expired

> **Invitation expired**

Actions:

* Send new invitation;
* revoke;
* archive invitation.

## 103.7 Activation incomplete

Show the missing security step without exposing sensitive detail.

## 103.8 Member unavailable

Display the effective period and affected responsibilities.

## 103.9 Assignment conflict

> **Cannot assign as approver**

Reason:

> The member prepared the current object.

## 103.10 Staffing gap

Show exact deal, workstream, deadline and eligible people.

## 103.11 Capacity unknown

Explain missing planning inputs.

## 103.12 Restricted assignment

Do not reveal inaccessible deal information.

## 103.13 Sole owner

> **Critical concentration**

The member is the only owner of a required responsibility.

## 103.14 Offboarding blocked

Show the untransferred responsibilities.

## 103.15 Account suspended

Read-only administrative record.

## 103.16 Deactivated member

Historical profile only.

## 103.17 External access expired

Remove operational access while preserving the record.

## 103.18 Concurrent update

Show assignment or role changes before submission.

## 103.19 Offline

Allow safe cached review.

Disable:

* Invitation;
* assignment;
* delegation;
* availability update;
* suspension;
* offboarding actions.

---

# 104. Responsive behavior

## Desktop — 1280 px and above

* Persistent saved-view rail;
* full member table;
* selected-member panel;
* capacity and staffing matrices;
* complete filters.

## Tablet — 768–1279 px

* Filter rail collapses;
* fewer directory columns;
* profile opens as drawer;
* staffing matrix scrolls horizontally;
* capacity reasons remain visible.

## Mobile — below 768 px

Recommended order:

1. Staffing attention;
2. available members;
3. my assignments;
4. active members;
5. invitations;
6. former members.

Member cards should show:

* Name;
* title;
* capability;
* active deals;
* availability;
* primary action.

Mobile should support:

* Reviewing capacity;
* assigning a member;
* acknowledging assignment;
* delegating temporary coverage;
* invitation management.

Complex staffing matrices and offboarding remain desktop-first.

---

# 105. Accessibility requirements

The Team Workspace should support:

* Semantic member tables;
* row headers using member names;
* accessible capacity labels;
* no color-only availability states;
* keyboard directory navigation;
* visible focus;
* accessible staffing matrix;
* accessible group membership lists;
* announced assignment changes;
* minimum 44 × 44 px controls;
* descriptive member actions;
* accessible time-zone and absence dates;
* correct distinction between role, capability and authority;
* accessible restricted-assignment descriptions;
* focus preservation after staffing actions;
* accessible delegation periods;
* screen-reader descriptions of staffing gaps.

Avoid generic actions:

> Assign

Prefer:

> Assign Daniel Ribeiro as Project Aurora Tax Reviewer

---

# 106. Figma component architecture

Figma mapping: planned in MAI-91 in the governed file
`otMJE31OKIxdXogV4RNbGQ`, using the approved Application Shell area as the
navigation and component context. The intended design area covers the `/team`
directory, capacity view, deal assignment summaries, group views, invitation
states, external-collaborator distinction, offboarding review, staffing gaps,
restricted states, and mobile directory behavior.

## `TeamWorkspaceHeader`

Properties:

* Active;
* staffing gap;
* invitation;
* limited capacity;
* empty;
* partial failure.

## `TeamWorkspaceTabs`

* People;
* capacity;
* assignments;
* groups;
* invitations;
* former;
* external.

## `TeamSummary`

Variants:

* Active members;
* active assignments;
* staffing gaps;
* limited;
* invitations.

## `TeamFilterRail`

States:

* Default;
* filtered;
* collapsed;
* mobile.

## `MemberDirectory`

States:

* Populated;
* grouped;
* filtered;
* empty;
* loading;
* partial error.

## `TeamMemberRow`

Properties:

* Active;
* available;
* limited;
* unavailable;
* invitation;
* suspended;
* offboarding;
* deactivated;
* external;
* restricted.

## `MemberIdentity`

Properties:

* Internal;
* external;
* initials;
* photo;
* restricted;
* former.

## `InstitutionRole`

Properties:

* Partner;
* VP;
* associate;
* analyst;
* specialist;
* administrator;
* auditor;
* read-only.

## `CapabilitySummary`

Properties:

* Primary;
* experienced;
* supporting;
* trainee;
* review due;
* restricted.

## `AvailabilityState`

Properties:

* Available;
* balanced;
* limited;
* unavailable;
* out of office;
* departing;
* unknown.

## `CapacityExplanation`

Properties:

* Allocation;
* deadlines;
* critical work;
* absence;
* incomplete data.

## `DealAssignmentSummary`

Properties:

* One active;
* multiple;
* accountable;
* supporting;
* temporary;
* restricted.

## `MemberPreview`

States:

* Overview;
* capacity;
* assignments;
* authority;
* offboarding;
* restricted.

## `StaffingMatrix`

Properties:

* Complete;
* gap;
* restricted;
* empty;
* loading;
* filtered.

## `StaffingGap`

Properties:

* Deal Lead;
* workstream owner;
* approver;
* backup;
* external specialist;
* resolved.

## `AssignmentFlow`

States:

* Select deal;
* responsibility;
* member;
* access review;
* confirm;
* conflict;
* success.

## `AssignmentRecommendation`

Properties:

* Eligible;
* limited;
* capability gap;
* authority gap;
* conflict;
* unavailable.

## `DelegationFlow`

States:

* Task;
* review;
* approval;
* relationship;
* deal role;
* invalid.

## `InvitationRow`

Properties:

* Draft;
* sent;
* accepted;
* expired;
* failed;
* provisioned.

## `InviteMemberFlow`

States:

* Identity;
* role;
* capabilities;
* assignments;
* security;
* review;
* sent.

## `OffboardingPanel`

Properties:

* Planned;
* transfer;
* blocked;
* ready;
* scheduled;
* complete.

## `ExternalCollaboratorRow`

Properties:

* Active;
* expiry soon;
* expired;
* suspended;
* restricted.

## `GroupDirectory`

Properties:

* Manual;
* role-based;
* capability-based;
* synchronized;
* temporary.

---

# 107. Production object model

## `Person`

```text
id
displayName
preferredName
primaryEmail
location
timezone
avatarReference
createdAt
updatedAt
```

## `InstitutionMembership`

```text
id
institutionId
personId
membershipType
professionalTitle
institutionRoleId
status
startAt
endAt
invitedBy
activatedAt
suspendedAt
deactivatedAt
version
createdAt
updatedAt
```

## `InstitutionRole`

```text
id
institutionId
name
description
roleType
permissionPolicyId
authorityPolicyIds
effectiveAt
supersededAt
createdAt
```

## `MemberCapability`

```text
id
membershipId
capabilityType
proficiencyState
evidenceReferenceIds
assignedBy
reviewedBy
reviewedAt
expiresAt
status
createdAt
updatedAt
```

## `MemberAvailability`

```text
id
membershipId
availabilityState
effectiveFrom
effectiveTo
sourceType
summary
visibility
createdBy
createdAt
updatedAt
```

## `CapacityPlan`

```text
id
membershipId
periodStart
periodEnd
status
plannedAllocation
unallocatedCapacity
sourceType
reviewedBy
reviewedAt
createdAt
updatedAt
```

## `CapacityAllocation`

```text
id
capacityPlanId
dealId
workstreamType
allocationPercentage
responsibilityType
effectiveFrom
effectiveTo
createdAt
```

## `DealAssignment`

```text
id
dealId
membershipId
assignmentType
workstreamType
accountabilityType
status
effectiveFrom
effectiveTo
assignedBy
acceptedAt
accessProposalId
backupAssignmentId
confidentialityLevel
createdAt
updatedAt
```

## `AssignmentResponsibility`

```text
id
dealAssignmentId
responsibilityType
accountable
reviewAuthority
approvalAuthority
externalActionAuthority
effectiveFrom
effectiveTo
createdAt
```

## `AssignmentTransfer`

```text
id
sourceAssignmentId
targetMembershipId
taskTransferPolicy
artifactTransferPolicy
authorityTransferPolicy
effectiveAt
initiatedBy
approvedBy
status
completedAt
createdAt
```

## `MemberDelegation`

```text
id
delegatorMembershipId
delegateMembershipId
delegationType
scopeType
scopeIds
authorityScope
effectiveFrom
effectiveTo
reasonCategory
status
createdBy
createdAt
```

## `TeamGroup`

```text
id
institutionId
name
description
groupType
ownerMembershipId
membershipRule
routingPurpose
status
createdAt
updatedAt
```

## `TeamGroupMembership`

```text
id
groupId
membershipId
membershipType
effectiveFrom
effectiveTo
addedBy
status
createdAt
```

## `MembershipInvitation`

```text
id
institutionId
email
personId
proposedRoleId
proposedCapabilityTypes
proposedGroupIds
invitedBy
status
sentAt
expiresAt
acceptedAt
revokedAt
createdAt
```

## `ExternalCollaboratorMembership`

```text
id
institutionId
personId
organizationId
internalSponsorId
status
effectiveFrom
expiresAt
authenticationPolicy
termsAcceptedAt
createdAt
updatedAt
```

## `ExternalDealAccess`

```text
id
externalCollaboratorMembershipId
dealId
workstreamIds
accessRole
sponsorId
effectiveFrom
expiresAt
status
createdAt
updatedAt
```

## `OffboardingCase`

```text
id
membershipId
plannedEndAt
status
responsibilitySnapshot
replacementAssignments
accessRevocationState
initiatedBy
approvedBy
completedAt
createdAt
updatedAt
```

## `StaffingRequirement`

```text
id
dealId
workstreamType
responsibilityType
requiredCapability
requiredAuthorityPolicyId
requiredFrom
requiredUntil
criticality
status
createdAt
updatedAt
```

## `StaffingGap`

```text
id
staffingRequirementId
gapType
consequence
suggestedMembershipIds
ownerId
dueAt
status
resolution
resolvedBy
resolvedAt
createdAt
```

## `TeamEvent`

```text
id
institutionId
membershipId
dealAssignmentId
eventType
actorType
actorId
summary
metadata
occurredAt
```

---

# 108. Suggested routes

Primary:

```text
/team
```

Capacity:

```text
/team?view=capacity
```

Deal assignments:

```text
/team?view=assignments
```

Groups:

```text
/team?view=groups
```

Invitations:

```text
/team?view=invitations
```

Former members:

```text
/team?view=former
```

External collaborators:

```text
/team?view=external
```

Selected member:

```text
/team/:membershipId
```

Member assignments:

```text
/team/:membershipId?view=assignments
```

Staff a deal:

```text
/team/staffing?deal=:dealId
```

Selected staffing gap:

```text
/team/staffing/gaps/:gapId
```

Offboarding:

```text
/team/:membershipId/offboarding
```

Invitation:

```text
/team/invitations/:invitationId
```

---

# 109. API direction

Recommended endpoints:

```text
GET    /api/team/members
POST   /api/team/invitations
GET    /api/team/members/:id
PATCH  /api/team/members/:id
POST   /api/team/members/:id/suspend
POST   /api/team/members/:id/reactivate

GET    /api/team/capacity
POST   /api/team/capacity-plans
PATCH  /api/team/capacity-plans/:id

GET    /api/deal-assignments
POST   /api/deal-assignments
PATCH  /api/deal-assignments/:id
POST   /api/deal-assignments/:id/transfer
POST   /api/deal-assignments/:id/end

GET    /api/team/groups
POST   /api/team/groups
PATCH  /api/team/groups/:id

POST   /api/team/delegations
PATCH  /api/team/delegations/:id

GET    /api/team/staffing-gaps
POST   /api/team/staffing-gaps/:id/resolve

POST   /api/team/members/:id/offboarding
PATCH  /api/team/offboarding/:id
```

Writes should support:

* Version checking;
* authority validation;
* conflict detection;
* separation of duties;
* access proposals;
* transaction audit;
* idempotency;
* restricted-field handling.

---

# 110. Repository direction

The current repository has useful team-related foundations:

* Team-oriented API families;
* user and membership concepts;
* deal-team data used during deal setup;
* role and permission direction;
* workflow assignment concepts;
* top-bar user identity;
* notification and task routing foundations.

However, the current page catalogue does not yet provide a complete canonical `/team` workspace.

## Keep

* User identity;
* institution context;
* deal-team assignment data;
* role-aware interface behavior;
* notification routing;
* task ownership;
* versioned write patterns;
* reusable table and drawer components.

## Add

* Institution membership lifecycle;
* Team directory;
* capability model;
* availability model;
* capacity plans;
* cross-deal assignments;
* staffing requirements;
* staffing gaps;
* delegation;
* groups;
* invitations;
* offboarding;
* external collaborators;
* authority summaries;
* concentration-risk alerts.

## Reframe

### Team metrics

Do not use generic productivity or utilization scores.

Use:

* Assignment coverage;
* available capacity;
* deadline concentration;
* authority gaps;
* critical responsibilities.

### Deal assignment

A person being listed on a deal should not automatically mean:

* Full access;
* approval authority;
* task ownership.

These require explicit related objects.

### POV switching

Do not use a “Banker / Institution / Client” perspective switcher to represent team access.

Internal members and external participants require distinct access models, as established in the application-shell architecture. 

### Role naming

Separate:

* Professional title;
* institution product role;
* capability;
* deal role;
* approval authority.

---

# 111. What not to include

Avoid:

* Employee rankings;
* productivity scores;
* hidden activity monitoring;
* screen-time metrics;
* message-volume metrics;
* compensation;
* performance reviews;
* private leave reasons;
* automatically inferred expertise;
* task count as the sole capacity measure;
* one universal utilization percentage;
* external collaborators mixed with internal members;
* automatic deal access from a generic assignment;
* unrestricted deal names in capacity summaries;
* blind bulk access grants;
* approval authority inferred only from title;
* unversioned role changes;
* offboarding without responsibility transfer;
* deactivation that removes historical authorship;
* automatic renewal of external access;
* direct permissions-policy editing in the People table;
* real employee information in pitch fixtures.

---

# 112. MOCKED — Pitch and demo specification

## 112.1 Purpose of the mocked screen

The mocked Team Workspace should demonstrate:

* Institution-level staffing;
* transaction responsibility;
* explainable capacity;
* staffing gaps;
* human approval coverage;
* controlled membership.

Its pitch narrative is:

> **M&Ai coordinates parallel deal workflows by linking each transaction responsibility to an eligible, accountable and available human owner.**

This screen is operationally useful but weak as a principal pitch hero.

Use it for:

* Product walkthroughs;
* workflow-orchestration explanation;
* institution-administration demos;
* investor diligence;
* proof that parallel deal workflows remain human-governed.

The deck’s workflow narrative emphasizes parallel deal execution with human approval gates; Team provides the staffing foundation for that model. 

---

# 113. Mocked shell state

Institution:

> **Atlas M&A Advisory**

User:

> **Ana Costa · Vice President**

Breadcrumb:

> Team

Global navigation:

* Home;
* Deals;
* Organizations;
* Tasks & Approvals;
* **Team**.

Top bar:

* Global search;
* Tasks: 3;
* Notifications: 2;
* Ask M&Ai;
* Ana Costa.

---

# 114. Mocked page header

Title:

> **Team Workspace**

Description:

> Members, availability and transaction assignments across Atlas M&A Advisory.

Summary:

* **18 active members**
* **11 assigned to active deals**
* **2 staffing gaps**
* **1 pending invitation**

Primary action:

> **Invite member**

Secondary:

> Staff a deal

---

# 115. Mocked People directory

Show six fictional internal members.

## Marina Alves

> **Managing Director**

Capabilities:

* Deal leadership;
* negotiation;
* closing.

Active deals:

> 4

Primary responsibilities:

> Deal Lead · Project Horizon and Project Atlas

Availability:

> **Limited**

---

## Ana Costa — selected

> **Vice President**

Capabilities:

* Financial Review;
* valuation;
* negotiation.

Active deals:

> 3

Open work:

> 5 items · 2 approvals

Availability:

> **Limited this week**

---

## Felipe Rocha

> **Associate**

Capabilities:

* Financial Diligence;
* valuation support;
* document review.

Active deals:

> 2

Open work:

> 7 items · 2 due today

Availability:

> **Balanced**

---

## Daniel Ribeiro

> **Tax Specialist**

Capabilities:

* Tax Review;
* closing conditions.

Active deals:

> 2

Open work:

> 3 items

Availability:

> **Available**

---

## Camila Nunes

> **Legal and Closing Specialist**

Capabilities:

* Legal Review;
* closing coordination.

Active deals:

> 1

Availability:

> **Available**

State:

> Identity and access review current

---

## Roberto Lima

> **Partner**

Capabilities:

* Deal leadership;
* client approval;
* negotiation.

Active deals:

> 2

Availability:

> **Balanced**

---

# 116. Mocked selected-member preview

## Ana Costa

Title:

> Vice President

Institution role:

> Banker · Valuation Reviewer

Location:

> São Paulo · BRT

Membership:

> Active

Availability:

> **Limited through 31 July**

Reasons:

* Project Horizon diligence committee;
* Project Northstar valuation review;
* two approvals due this week.

Capabilities:

* Financial Review — Primary;
* Valuation — Primary;
* Negotiation — Experienced;
* Diligence Coordination — Supporting.

---

# 117. Mocked active assignments

## Project Horizon

Responsibility:

> Financial Review VP

Phase:

> Due Diligence

Authority:

> Valuation treatment review

Next milestone:

> Diligence committee · 30 July

---

## Project Northstar

Responsibility:

> Valuation Owner

Phase:

> Valuation

Authority:

> Scenario review

Next milestone:

> Valuation committee · 2 August

---

## Project Aurora

Responsibility:

> Negotiation Reviewer

Phase:

> Buyer Universe

Next milestone:

> Shortlist review · 6 August

---

# 118. Mocked staffing gaps

## Project Horizon

Gap:

> **Deal Lead backup missing**

Consequence:

> Marina Alves is the sole closing-escalation owner.

Needed before:

> 14 October closing review

Suggested:

> Roberto Lima · Eligible · Balanced availability

---

## Project Aurora

Gap:

> **Tax Reviewer missing**

Needed before:

> Diligence setup · 6 August

Suggested:

> Daniel Ribeiro · Primary capability · Available

Alternative:

> Camila Nunes · Supporting capability

---

# 119. Mocked capacity summary

| Member         | State     | Active deals | Near-term pressure   |
| -------------- | --------- | -----------: | -------------------- |
| Marina Alves   | Limited   |            4 | 2 major milestones   |
| Ana Costa      | Limited   |            3 | 2 approvals due      |
| Felipe Rocha   | Balanced  |            2 | 7 open items         |
| Daniel Ribeiro | Available |            2 | No critical deadline |
| Camila Nunes   | Available |            1 | 1 legal review       |
| Roberto Lima   | Balanced  |            2 | 1 client committee   |

No employee score should appear.

---

# 120. Mocked authority gap

> **Valuation approval coverage**

Project Northstar:

* Ana Costa prepared the scenario;
* Marina Alves is unavailable on committee date;
* Roberto Lima has eligible authority.

Primary action:

> Assign Roberto as independent approver

This demonstrates that capability, availability and separation of duties are evaluated together.

---

# 121. Mocked invitation

> **Pending invitation**

Name:

> Beatriz Monteiro

Proposed role:

> Analyst

Capabilities:

* Financial Diligence;
* document review.

Invitation sent:

> 27 July 2026

Expires:

> 3 August 2026

State:

> Delivered · Not accepted

Action:

> Send reminder

---

# 122. Recommended static pitch composition

```text
┌──────────────────────────────────────────────────────────────────┐
│ Team Workspace · 18 active members · 2 staffing gaps            │
├───────────────────────────────┬──────────────────────────────────┤
│ Team capacity                 │ Selected member                  │
│                               │                                  │
│ Marina Alves       Limited    │ Ana Costa · Vice President      │
│ 4 active deals                │                                  │
│                               │ Financial Review · Valuation     │
│ Ana Costa          Limited    │ 3 active deals                   │
│ 3 deals · 2 approvals         │                                  │
│                               │ Limited through 31 July          │
│ Felipe Rocha       Balanced   │                                  │
│ 2 deals · 7 tasks             │ Project Horizon                 │
│                               │ Financial Review VP              │
│ Daniel Ribeiro     Available  │                                  │
│ 2 active deals                │ [ Review assignments ]          │
├───────────────────────────────┴──────────────────────────────────┤
│ Staffing gaps: Horizon Lead backup · Aurora Tax Reviewer         │
└──────────────────────────────────────────────────────────────────┘
```

This communicates:

* Parallel staffing;
* explainable availability;
* transaction assignments;
* human accountability;
* staffing gaps.

---

# 123. Pitch-specific simplification

## Keep visible

* Team Workspace;
* 18 active members;
* two staffing gaps;
* four members;
* availability states;
* active-deal counts;
* Ana Costa;
* Financial Review VP;
* Project Horizon;
* review assignments.

## Hide

* Invitations;
* offboarding;
* external collaborators;
* group management;
* detailed permissions;
* exact task list;
* audit history;
* administrative controls;
* email addresses;
* personal information.

## Readability requirement

At deck scale, these should remain readable:

* **Team Workspace**
* **2 staffing gaps**
* **Ana Costa**
* **Financial Review**
* **3 active deals**
* **Limited through 31 July**
* **Project Horizon**
* **Review assignments**

---

# 124. Recommended demo flows

## Flow A — Staff a new deal

```text
New Deal Setup
  ↓
Team & Access step
  ↓
Open Team Workspace
  ↓
Filter available Financial Review members
  ↓
Select Ana Costa
  ↓
Review capability and capacity
  ↓
Assign as Financial Review VP
  ↓
Return to New Deal Setup
```

## Flow B — Resolve staffing gap

```text
Deal Assignments
  ↓
Project Aurora · Tax Reviewer missing
  ↓
Review eligible members
  ↓
Daniel Ribeiro · Available
  ↓
Assign
  ↓
Access proposal created
  ↓
Gap resolved
```

## Flow C — Separation-of-duties conflict

```text
Project Northstar approval gap
  ↓
Select Ana Costa
  ↓
Conflict: Prepared scenario
  ↓
Select Roberto Lima
  ↓
Authority validated
  ↓
Assign independent approver
```

## Flow D — Planned absence coverage

```text
Ana Costa records planned absence
  ↓
Three affected responsibilities identified
  ↓
Create temporary delegation
  ↓
Assign review coverage
  ↓
Approval policy validated
  ↓
Coverage activated for period
```

## Flow E — Member offboarding

```text
Felipe Rocha offboarding
  ↓
Review active assignments
  ↓
Transfer tasks and artifacts
  ↓
Transfer relationship ownership
  ↓
Remove deal access
  ↓
Deactivate membership
  ↓
History preserved
```

## Flow F — External counsel review

```text
External Collaborators
  ↓
Camila Nunes access expires soon
  ↓
Open Project Horizon Deal Team & Access
  ↓
Review Legal workstream need
  ↓
Extend or revoke access
```

## Flow G — Invitation

```text
Invite member
  ↓
Select institution role
  ↓
Add capabilities and groups
  ↓
No initial deal access
  ↓
Send invitation
  ↓
Activation tracked
```

---

# 125. UX prototype tasks to validate

Test with Partners, VPs and administrators using tasks such as:

1. Find every member available for a new financial review.
2. Identify which members may approve valuation work.
3. Find every active Deal Lead.
4. Determine why Ana is marked as limited.
5. Identify which deals lack required staffing.
6. Assign a Tax Reviewer to Project Aurora.
7. Determine whether the assignment creates access.
8. Find a member’s current transaction responsibilities.
9. Distinguish capability from approval authority.
10. Assign an independent valuation approver.
11. Detect a separation-of-duties conflict.
12. Add a backup Deal Lead.
13. record a planned absence.
14. delegate selected responsibilities.
15. review all work affected by an absence.
16. invite a new Analyst.
17. identify a duplicate external collaborator.
18. review an external-access expiry.
19. start member offboarding.
20. transfer all open responsibilities.
21. deactivate the account.
22. find the former member’s historical decisions.
23. determine whether a restricted deal affects capacity.
24. return to the same staffing gap after opening Deal Team & Access.

## Measures

Record:

* Time to find an eligible member;
* whether title, role, capability and authority are confused;
* whether availability reasons are understood;
* whether task counts dominate staffing judgment;
* whether restricted-deal information leaks;
* whether staffing gaps are actionable;
* whether assignments and permissions are confused;
* whether separation-of-duties warnings are noticed;
* whether offboarding feels controlled;
* whether the screen resembles HR or employee-surveillance software.

---

# 126. Design validation criteria

The Team Workspace is ready for approval when:

1. Internal members and external collaborators remain distinct.
2. Team members and external Contacts remain distinct.
3. Professional title, institution role, capability, deal role and authority remain distinct.
4. The screen operates at institution level.
5. Detailed deal permissions remain in Deal Team & Access.
6. Roles & Permissions remains the policy-definition surface.
7. Tasks & Approvals remains the work-execution surface.
8. Every active assignment has an accountable owner.
9. Staffing gaps show their transaction consequence.
10. Capacity is explainable.
11. Planned allocation and workflow pressure remain separate.
12. Task count is not the only capacity signal.
13. No employee-productivity score exists.
14. No hidden activity monitoring exists.
15. Leave reasons remain private.
16. Staffing recommendations explain eligibility.
17. Capability does not automatically imply authority.
18. Title does not automatically imply authority.
19. Separation-of-duties rules are checked before assignment.
20. Deal assignment does not silently grant unrestricted access.
21. Restricted deals do not leak through staffing summaries.
22. Backup coverage is supported.
23. Temporary delegation is scoped and time-bound.
24. Approval delegation validates authority and conflicts.
25. Invitations support security activation.
26. Existing external collaborators are detected before duplicate invitation.
27. Offboarding requires responsibility transfer.
28. Deactivation preserves historical attribution.
29. Reactivation does not automatically restore old access.
30. External access has an internal sponsor and expiry.
31. Bulk actions cannot grant broad access or authority blindly.
32. Member and assignment changes are version-aware.
33. The screen remains useful without Copilot.
34. Mobile supports staffing review and temporary coverage.
35. Partial failures do not hide member identity or assignments.
36. The pitch mock remains fictional.
37. The static composition remains readable.
38. The page feels like transaction staffing infrastructure—not HR software.

---

# 127. Final design target

The correct design target is not:

> “A directory showing who works at the firm and how busy they are.”

It is:

> **An institution-level staffing and accountability workspace where every transaction responsibility can be linked to an eligible, authorized and appropriately available human owner.**

Its defining interaction is:

> **Find the required capability → inspect availability and authority → assign transaction responsibility → review access consequence → preserve accountability → transfer coverage when conditions change**

**Next iteration: Notification Center.**
