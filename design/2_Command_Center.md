# Command Center

## 1. Screen definition

The **Command Center** is M&Ai’s institution-level home screen.

It gives each banker a prioritized view of the work, decisions and transaction changes that require attention across their active deals.

It is not intended to summarize every piece of information in the platform. Its purpose is to answer:

1. **What requires my attention now?**
2. **Which deal is most exposed or time-sensitive?**
3. **What materially changed since I last reviewed the portfolio?**
4. **Which decision, task or milestone should I open next?**
5. **Where is the underlying evidence or transaction context?**

The Command Center sits above the individual deal workspaces. It consolidates signals from Diligence, Valuation, Matching, Negotiation, Closing, Documents and workflow approvals without attempting to replace those screens.

M&Ai’s information architecture defines the Command Center as the institution-level surface that brings attention to work across assigned transactions, while the Deals Portfolio remains the complete browsing and management surface. 

---

# 2. Intention of the screen

## Primary intention

The Command Center should help a banker begin work without manually checking every active transaction.

The page should turn a fragmented portfolio into a prioritized operating sequence:

> **Material change → Required action → Exact deal context**

Instead of asking the user to inspect each deal independently, M&Ai should identify:

* Which decisions are awaiting approval;
* Which tasks are overdue;
* Which findings became material;
* Which documents changed an existing conclusion;
* Which transaction milestones are approaching;
* Which deal is blocked;
* Which other team member is waiting on the user.

## User outcome

After reviewing the screen, the user should be able to say:

> “I understand what changed across my deals, what is most material, and where I need to act first.”

## Product outcome

The Command Center should demonstrate that M&Ai is not only a collection of deal tools. It is an **orchestration layer across transactions**.

The product’s recurring operating model is:

> **Information → Analysis → Impact → Human decision → Audit record**

The Command Center begins that chain by surfacing the information, impacts and decisions that deserve the user’s attention. 

---

# 3. What the Command Center is not

The screen should not become:

* A generic executive dashboard;
* A transaction CRM pipeline;
* A collection of decorative KPI cards;
* A sales funnel;
* A financial-performance dashboard for the advisory firm;
* A complete task-management application;
* A notification feed;
* A customizable widget canvas;
* A permanent AI chat screen;
* An institution-wide audit log;
* A replacement for the Deals Portfolio;
* A collection of charts showing activity without required action.

A screen filled with:

* Active deals;
* Total deal value;
* Documents processed;
* Agent runs;
* Average confidence;
* Messages sent;

may appear sophisticated, but it would not help the banker decide what to do next.

The correct question is not:

> “What can M&Ai measure?”

It is:

> **“What requires professional attention?”**

---

# 4. Relationship to adjacent screens

The Command Center must have a clear boundary relative to other institution-level screens.

| Screen                  | Primary question                                              |
| ----------------------- | ------------------------------------------------------------- |
| **Command Center**      | What requires my attention now?                               |
| **Deals Portfolio**     | Which deals exist, and how do I browse or manage them?        |
| **Tasks & Approvals**   | What is the complete queue of work assigned to me or my team? |
| **Notifications**       | What events have occurred?                                    |
| **Portfolio Analytics** | How is the institution performing over time?                  |
| **Team Workspace**      | Who is assigned, available or overloaded?                     |

## Command Center versus Deals Portfolio

The Command Center shows a selected, prioritized subset of deals.

The Deals Portfolio shows:

* Every accessible deal;
* Complete filters;
* Saved views;
* Archived deals;
* Sorting;
* Bulk management;
* Portfolio-level administration.

## Command Center versus Tasks & Approvals

The Command Center shows the highest-priority items.

Tasks & Approvals shows the complete work queue, including:

* Lower-priority tasks;
* Completed items;
* Delegated work;
* Saved filters;
* Batch actions;
* Approval history.

## Command Center versus Notifications

The Command Center should not show every event.

A completed document synchronization may generate a notification. It should appear in the Command Center only when it creates a meaningful consequence, such as:

> New evidence invalidated an approved valuation assumption.

---

# 5. Primary users

## 5.1 Associate

The associate primarily needs:

* Assigned analyses;
* Missing evidence;
* Review requests;
* Upcoming deliverables;
* Deal-specific blockers;
* Work awaiting their response.

## 5.2 Vice President

The vice president primarily needs:

* Material approvals;
* Escalated findings;
* Valuation changes;
* Upcoming client milestones;
* Workstream status;
* Team dependencies.

## 5.3 Managing Director or Partner

The partner primarily needs:

* Material commercial or transaction risks;
* Decisions requiring senior authority;
* Deals that are blocked or deteriorating;
* Negotiation and closing milestones;
* Concise portfolio exceptions.

## 5.4 Operations or institution administrator

The administrator may need:

* Deals with missing owners;
* Access or data-source failures;
* Overdue process items;
* VDR synchronization issues;
* Workflow-template exceptions.

The same screen should adapt through role and permission context, but it should not allow users to casually impersonate another role.

---

# 6. Primary job to be done

> When I begin work or return to the platform, show me the most consequential work across my deals so I can enter the correct transaction context and act without reconstructing priorities manually.

## Secondary jobs

The user should also be able to:

* Resume a recently reviewed deal;
* See what changed since their last session;
* Check upcoming milestones;
* Review the condition of active deals;
* Delegate or reassign an item;
* Ask M&Ai for a portfolio-level brief;
* Open the complete Tasks & Approvals queue;
* Start a new deal;
* Search for a transaction, finding or document.

---

# 7. Prioritization model

The Command Center should not simply sort by recency.

A new low-impact notification should not appear above an older valuation approval that blocks a client decision.

## Recommended prioritization dimensions

Each item should be ranked using explicit workflow attributes:

1. **Materiality**
2. **Deadline**
3. **Transaction dependency**
4. **Approval authority**
5. **Risk severity**
6. **User assignment**
7. **Change since previous review**
8. **Deal stage**
9. **External commitment**
10. **Age of unresolved item**

### Example

A high-severity diligence finding that changes enterprise value by R$ 42 mi and requires a vice-president approval today should rank above:

* A document-classification warning;
* A mention in a comment;
* A completed engine run;
* A milestone due in two weeks.

## Explainability

The user should be able to understand why an item is prioritized.

Example:

> **Priority reason**
> High materiality · Due today · Blocks valuation approval

Do not display a mysterious numerical priority score such as:

> Priority: 87

unless the underlying factors are also visible.

---

# 8. Screen architecture

The recommended Command Center consists of seven principal components:

1. Page header and scope;
2. Attention summary;
3. Priority work queue;
4. M&Ai portfolio brief;
5. Active deal pulse;
6. Upcoming milestones;
7. Material changes and exceptions.

---

# 9. Page header and scope

## Purpose

The page header establishes:

* Whose work is being shown;
* Which institution is active;
* What time horizon is being considered;
* Whether the view is personal or team-wide.

## Recommended title

> **Command Center**

Supporting description:

> Review priority decisions, material changes and upcoming milestones across your deals.

## Scope controls

Recommended options:

* **My work**
* **Team work**, when authorized

Optional time filter:

* Today;
* Next 7 days;
* Next 30 days.

### Default

The default should be:

> **My work · Next 7 days**

The page should not default to the complete institution unless the user is a partner or has an explicit oversight role.

## Primary action

> **New deal**

Secondary action:

> View all deals

## UX direction

Do not use a casual greeting as the main heading.

Acceptable supporting text:

> Monday, 27 July

Avoid making the product feel like a consumer productivity application through copy such as:

> Good morning, Ana! Here’s what’s happening.

The page should remain institutional and operational.

---

# 10. Attention summary

## Purpose

The attention summary gives the user a concise view of required work before they inspect individual items.

## Recommended metrics

Use no more than four:

1. **Decisions required**
2. **Overdue**
3. **Deal blockers**
4. **Material changes**

Example:

| Summary            | Value | Supporting context     |
| ------------------ | ----: | ---------------------- |
| Decisions required | **3** | 2 due today            |
| Overdue            | **1** | Tax evidence review    |
| Deal blockers      | **2** | Across 2 deals         |
| Material changes   | **4** | Since your last review |

## Interaction

Selecting a summary item should filter the Priority Work Queue.

Example:

> Select **Deal blockers** → queue displays only blocking items.

## What not to show here

Avoid:

* Total documents;
* Total organizations;
* Total agent executions;
* Total comments;
* Total users;
* Percentage complete across all deals;
* Total transaction value without currency context.

These numbers do not necessarily imply action.

---

# 11. Priority Work Queue

## 11.1 Purpose

The Priority Work Queue is the Command Center’s primary component.

It should occupy the largest area of the screen.

Its role is to answer:

> **What should I act on next?**

## 11.2 Item types

The queue may include:

* Approval request;
* Review task;
* Material finding;
* Missing evidence;
* Deal blocker;
* Negotiation decision;
* Closing condition;
* Document-change review;
* Buyer or target shortlist approval;
* Valuation assumption confirmation;
* Deliverable approval.

## 11.3 Required item anatomy

Each priority item should show:

* Action type;
* Deal codename;
* Concise issue title;
* Material consequence;
* Due date;
* Priority reason;
* Assigned user;
* Current state;
* Direct action.

Example:

> **Approval required**
> **Project Horizon**
> Approve customer-concentration adjustment
> Risk-adjusted valuation midpoint decreases by **R$ 42 mi**
> Due today · High materiality · Blocks scenario v4
>
> **Review decision**

## 11.4 Visual hierarchy

The user should first see:

1. What must be done;
2. Which deal it belongs to;
3. Why it matters;
4. When it is due.

Metadata such as agent name, created timestamp or engine version should remain secondary.

## 11.5 Recommended states

* New;
* Due today;
* Overdue;
* Waiting on user;
* Waiting on another participant;
* Blocked;
* Under review;
* Escalated;
* Completed;
* Superseded.

## 11.6 Queue controls

Recommended:

* Filter by item type;
* Filter by deal;
* Filter by due date;
* Sort by recommended priority;
* Group by deal;
* View all tasks.

Avoid exposing complex project-management controls in the initial Command Center.

## 11.7 Item actions

Primary action:

> Open review

Contextual secondary actions may include:

* Assign;
* Delegate;
* Snooze;
* Add comment;
* Mark not material;
* Open deal.

Material approvals should not be completed directly from the Command Center without opening the evidence and impact context.

The screen may provide an **Open approval** action, but not a one-click **Approve** action for high-consequence decisions.

---

# 12. M&Ai Portfolio Brief

## 12.1 Purpose

The Portfolio Brief provides a concise, evidence-linked explanation of meaningful changes across the user’s deals.

It should answer:

> **What changed that I may not yet know?**

## 12.2 Recommended content

Show three to five brief items.

Each item should contain:

* Deal;
* Material change;
* Business consequence;
* Source or affected workflow;
* Link to exact context.

Example:

> **Project Horizon**
> Customer concentration increased to 41,2% of LTM revenue. The revised downside scenario reduces the enterprise-value midpoint by R$ 42 mi.
>
> Source: 3 reconciled documents · Open finding

## 12.3 Brief generation rules

The brief should prioritize:

* New high-severity findings;
* Existing conclusions changed by new evidence;
* Material valuation changes;
* Deal blockers;
* Negotiation changes;
* Closing-condition risk;
* Upcoming external commitments.

It should not summarize routine activity such as:

* User logged in;
* Document previewed;
* Comment edited;
* Agent run completed successfully.

## 12.4 Provenance

Each brief item should provide a visible path to its source.

Examples:

* 3 supporting sources;
* Valuation scenario v4;
* Latest buyer proposal;
* Closing checklist item 18;
* Review decision from Ana Costa.

The brief should not present unsupported portfolio narration.

## 12.5 Interaction

Recommended actions:

* Open source context;
* Ask M&Ai;
* Mark reviewed;
* Create task.

## 12.6 Naming

Use:

> **M&Ai Brief**

or:

> **Material changes**

Avoid:

* AI Insights;
* Smart Recommendations;
* Magic Summary;
* Autonomous Briefing.

---

# 13. Active Deal Pulse

## 13.1 Purpose

The Active Deal Pulse gives the user a compact view of the transactions most relevant to them.

It should answer:

* Which deals are active?
* Where are they in the lifecycle?
* Which have elevated attention?
* What is the next milestone?
* Who owns the next action?

## 13.2 Display format

Prefer a structured list or compact horizontal cards.

Avoid a Kanban board on the Command Center. A pipeline board would make the screen resemble a generic deal CRM and would compete with the dedicated Deals Portfolio.

## 13.3 Deal card anatomy

Each deal should display:

* Codename;
* Target organization;
* Transaction side;
* Current phase;
* Attention state;
* Next milestone;
* Pending work count;
* Deal lead;
* Indicative value range, where authorized and meaningful.

Example:

> **Project Horizon**
> Atlas Industrial · Sell-side
> **Due Diligence**
> High attention · 2 decisions required
> Next milestone: Diligence committee · 30 July
> R$ 480 mi–R$ 520 mi

## 13.4 Attention states

Recommended:

* On track;
* Attention required;
* At risk;
* Blocked;
* Paused;
* Closing ready.

Do not generate an opaque “deal health score” unless it is explainable.

Instead of:

> Health: 72

Use:

> **At risk**
> 2 overdue conditions · 1 unresolved high-severity finding

## 13.5 Sorting

Default order:

1. Deals with blocking decisions;
2. Deals with due-today milestones;
3. Deals with material changes;
4. Recently accessed deals;
5. Other active deals.

## 13.6 Currency handling

Do not add transaction values across different currencies without an explicit conversion basis.

If multiple currencies are present:

* Show each deal in its native currency;
* Separate aggregate values by currency;
* Or omit the aggregate value.

---

# 14. Upcoming Milestones

## 14.1 Purpose

This component gives the banker a near-term chronological view of external and internal transaction commitments.

## 14.2 Milestone types

* Management presentation;
* Diligence committee;
* Information-request deadline;
* Initial bid deadline;
* Binding-offer deadline;
* Buyer shortlist approval;
* Valuation review;
* Term-sheet review;
* Signing;
* Closing;
* Regulatory submission;
* Funds-flow approval.

## 14.3 Recommended display

A chronological list is preferable to a full calendar in the Command Center.

Example:

> **Today**
> Project Horizon · Approve scenario v4
> 15:00 · Internal

> **Tomorrow**
> Project Aurora · Buyer shortlist review
> 10:30 · Client meeting

> **30 July**
> Project Atlas · Closing-condition update
> External deadline

## 14.4 Milestone distinctions

Visually distinguish:

* Internal review;
* Client commitment;
* Counterparty deadline;
* Legal deadline;
* System-generated reminder.

## 14.5 Interaction

Selecting a milestone should open:

* The exact deal workspace;
* The supporting task;
* Related documents;
* Meeting or deadline details.

---

# 15. Material Changes and Exceptions

## 15.1 Purpose

This component captures material changes that may not yet have generated a direct task.

Examples:

* A previously approved assumption became stale;
* A source document was replaced;
* A buyer withdrew;
* A negotiation term changed;
* A closing condition was reopened;
* A material document failed processing;
* A user’s deal access changed;
* A VDR sync delay threatens a deadline.

## 15.2 Distinction from notifications

A notification says:

> 17 documents synchronized.

A material change says:

> Two synchronized documents conflict with the approved net-debt calculation.

Only the second belongs prominently in the Command Center.

## 15.3 Required anatomy

* Deal;
* Change;
* Consequence;
* Detection time;
* Review state;
* Open context action.

Example:

> **Project Northstar · Valuation**
> Updated debt schedule changes net debt by **R$ 6,8 mi**.
> Approved valuation scenario v3 may require review.
> Detected 18 minutes ago.

---

# 16. Quick actions

Quick actions should be limited and operationally meaningful.

Recommended:

* New deal;
* Upload documents;
* Connect data source;
* Create task;
* Search institution;
* Ask M&Ai for portfolio brief.

Do not display a large grid of shortcuts.

The Command Center should primarily route the user toward existing work rather than encourage arbitrary feature exploration.

---

# 17. Recommended desktop layout

For a **1440 × 900** canvas with the expanded global sidebar:

| Region            | Approximate allocation |
| ----------------- | ---------------------: |
| Global sidebar    |             240–256 px |
| Main canvas       |        Remaining width |
| Page header       |               72–96 px |
| Attention summary |              96–120 px |
| Main left column  |                 62–68% |
| Main right column |                 32–38% |

## Recommended arrangement

```text
┌───────────────┬─────────────────────────────────────────────────┐
│ Global shell  │ Command Center                  [ New deal ]    │
│               │ My work · Next 7 days                           │
│               ├──────────┬──────────┬──────────┬───────────────┤
│               │ Decisions│ Overdue  │ Blockers │ Material      │
│               │ 3        │ 1        │ 2        │ changes 4     │
│               ├───────────────────────────────┬─────────────────┤
│               │ Priority Work Queue           │ M&Ai Brief      │
│               │                               │                 │
│               │ Approval required             │ Horizon         │
│               │ Project Horizon               │ Atlas           │
│               │ −R$ 42 mi impact              │ Aurora          │
│               │                               │                 │
│               │ Review required               ├─────────────────┤
│               │ Project Atlas                 │ Upcoming        │
│               │ Missing tax evidence          │ milestones      │
│               ├───────────────────────────────┴─────────────────┤
│               │ Active Deal Pulse                               │
│               │ Horizon · Aurora · Atlas · Northstar            │
└───────────────┴─────────────────────────────────────────────────┘
```

## Recommended scroll behavior

The first viewport should show:

* Page identity;
* Attention summary;
* At least three priority items;
* At least two M&Ai Brief items;
* Beginning of the Active Deal Pulse.

The user should not need to scroll before seeing what requires action.

---

# 18. Alternative layout for senior users

Partners or managing directors may benefit from a slightly different default:

```text
┌───────────────────────────────────────────────────────────────┐
│ Attention summary                                             │
├─────────────────────────────────┬─────────────────────────────┤
│ Material portfolio exceptions   │ Decisions requiring me      │
├─────────────────────────────────┴─────────────────────────────┤
│ Active Deal Pulse                                             │
├─────────────────────────────────┬─────────────────────────────┤
│ Upcoming external milestones    │ M&Ai Brief                  │
└─────────────────────────────────┴─────────────────────────────┘
```

The underlying components should remain the same. Only their default priority and order change by role.

Avoid creating entirely different applications for analysts and partners.

---

# 19. UI design direction

## 19.1 Overall visual character

Aim for:

> **A transaction morning brief combined with a controlled action queue**

The screen should feel:

* Calm;
* Selective;
* Material;
* Precise;
* Professional;
* Current;
* Actionable.

It should not feel:

* Busy;
* Gamified;
* Celebratory;
* Like a sales CRM;
* Like a generic productivity dashboard;
* Like an AI-generated news feed.

---

## 19.2 Visual hierarchy

The strongest visual hierarchy should be:

1. Required actions;
2. Material consequences;
3. Deal context;
4. Deadlines;
5. Supporting metadata.

The largest typography should not be used for vanity numbers.

A **3** representing decisions required may be visually strong because it is actionable.

A **127** representing documents synchronized should not dominate the page.

---

## 19.3 Color application

Use the established M&Ai foundation:

* Canvas Cream: `#F3F0EE`;
* Lifted Cream: `#FCFBFA`;
* Ink Black: `#141413`;
* Signal Orange: `#CF4500`;
* Light Signal Orange: `#F37338`;
* Dust Taupe: `#D1CDC7`;
* Slate Gray: `#696969`.

### Recommended application

* Main canvas: Canvas Cream;
* Cards and panels: Lifted Cream or white;
* Primary action: Ink Black;
* Selected queue item: restrained orange edge or marker;
* High materiality: red-orange semantic state;
* Overdue: red;
* Blocked: deep red or dark neutral with label;
* Approved or on track: green;
* Informational state: gray or blue.

Signal Orange should communicate attention, not decorate every card.

---

## 19.4 Cards and surfaces

Use:

* 6–12 px radius;
* Thin neutral borders;
* Minimal shadow;
* Internal spacing of 16–24 px;
* Clear section headings;
* Dividers within dense lists.

Avoid:

* Large floating cards with heavy shadows;
* Separate cards for every line of information;
* Excessive pill-shaped containers;
* Gradient backgrounds;
* Decorative charts.

A priority queue should feel like one structured work surface, not six disconnected cards.

---

## 19.5 Typography

Use **Sofia Sans** as the canonical product font.

Recommended hierarchy:

| Element             |     Size |  Weight |
| ------------------- | -------: | ------: |
| Page title          | 26–30 px | 500–600 |
| Summary number      | 26–34 px | 500–600 |
| Section title       | 15–17 px | 650–700 |
| Priority-item title | 15–17 px | 600–700 |
| Deal codename       | 13–15 px | 650–700 |
| Material impact     | 14–16 px |     600 |
| Body                | 14–15 px | 450–500 |
| Metadata            | 12–13 px | 450–550 |
| Status              | 11–12 px | 650–700 |

Use tabular figures for:

* Currency values;
* Dates;
* Counts;
* Percentage changes.

---

# 20. UX design principles

## 20.1 Action before information

Every major element should either:

* Lead to a decision;
* Explain a material change;
* Expose a blocker;
* Establish an upcoming commitment.

Do not fill the screen merely because data is available.

---

## 20.2 Materiality before recency

The newest item is not necessarily the most important.

Default ordering should prioritize consequence, dependency and deadline.

---

## 20.3 Open exact context

Selecting an item should take the user to the precise working state.

Example:

```text
Command Center
  ↓
Approve customer-concentration adjustment
  ↓
Project Horizon
  ↓
Diligence Decision Room
  ↓
Customer-concentration finding already selected
```

Do not route the user only to the deal overview and force them to rediscover the issue.

---

## 20.4 Preserve return context

When the user returns from a deal, preserve:

* Command Center scope;
* Filters;
* Scroll position;
* Previously selected summary;
* Reviewed-state changes.

---

## 20.5 Do not allow blind approvals

The Command Center may indicate that approval is needed, but material approval should occur inside the relevant review context.

The user must be able to inspect:

* Evidence;
* Calculation;
* Consequence;
* Version;
* Approval effect.

---

## 20.6 Explain prioritization

Items should include concise priority reasons.

Examples:

* Blocks client deliverable;
* Due today;
* R$ 42 mi valuation impact;
* New contradictory evidence;
* Requires VP authority;
* Closing condition overdue.

---

## 20.7 Separate work from events

Maintain clear categories:

| Category           | Example                         |
| ------------------ | ------------------------------- |
| Required decision  | Approve valuation adjustment    |
| Assigned task      | Review tax evidence             |
| Material change    | New document alters net debt    |
| Upcoming milestone | Binding offers due Friday       |
| Notification       | User mentioned you in a comment |

Do not merge all categories into a single chronological feed.

---

## 20.8 Respect deal confidentiality

The Command Center may aggregate information across deals, but it must honor:

* Deal-level permissions;
* Restricted workstreams;
* External-participant limitations;
* Confidential-value visibility;
* Institution boundaries.

A user who cannot access valuation details may see:

> Valuation review required

but not:

> Revised value decreases by R$ 42 mi.

---

## 20.9 Make freshness visible

Time-sensitive information should indicate freshness where relevant.

Examples:

* Updated 4 min ago;
* Based on synchronization at 09:42;
* Changed since your last review;
* Valuation scenario v4;
* Due today at 15:00.

Avoid showing an unexplained “live” badge.

---

# 21. Scope and personalization

## 21.1 Personal scope

Default for most users:

> **My work**

Includes:

* Items assigned to the user;
* Decisions requiring their authority;
* Deals where they are a team member;
* Material changes relevant to their workstream;
* Upcoming milestones they own.

## 21.2 Team scope

Available to authorized managers:

> **Team work**

Includes:

* Unassigned items;
* Overdue team work;
* Workload concentration;
* Escalated blockers;
* Items waiting on direct reports.

## 21.3 Institution scope

Available only where operationally necessary.

The Command Center should not become an unrestricted institution-monitoring screen by default.

## 21.4 Personalization controls

Allow limited preferences such as:

* Default scope;
* Time horizon;
* Hidden low-priority item types;
* Preferred deal ordering;
* Email or notification digest settings.

Do not introduce free-form dashboard customization in the MVP.

---

# 22. System states

## 22.1 First-use state

When the user has no deals:

> **Create your first transaction workspace**
> Set up the deal, assign the team and connect the initial document source.

Primary action:

> New deal

Secondary action:

> Explore sample deal

A sample deal must be clearly marked as fictional.

---

## 22.2 No required work

When the user has active deals but no immediate tasks:

> **No decisions require your attention**
> Your active deals and upcoming milestones remain available below.

Do not use celebratory gamification such as:

> Inbox zero! You’re all caught up!

---

## 22.3 Empty portfolio brief

> No material changes since your last review.

Show the last reviewed time.

---

## 22.4 Loading

Use stable skeletons for:

* Summary strip;
* Priority queue;
* Deal pulse;
* Brief;
* Milestones.

Do not block the complete page because one source is slow.

---

## 22.5 Partial data

Example:

> **Some deal information is unavailable**
> Project Atlas document source has not synchronized since yesterday at 18:32.

The rest of the Command Center should remain usable.

---

## 22.6 Permission-limited state

> Some deal details are hidden based on your access.

Do not reveal restricted information through counts or brief summaries.

---

## 22.7 Error state

Each component should fail independently.

Example:

> **Milestones unavailable**
> We could not load upcoming deadlines.
> Retry

The Priority Work Queue should remain visible if the milestone service fails.

---

## 22.8 Offline state

Display:

> **Connection interrupted**
> Information may be outdated. Actions requiring synchronization are unavailable.

---

# 23. Responsive behavior

## Desktop — 1280 px and above

* Expanded sidebar;
* Four-item attention summary;
* Two-column main area;
* Priority queue left;
* Brief and milestones right;
* Active deals full-width beneath.

## Tablet — 768–1279 px

* Compact sidebar;
* Two-by-two summary grid;
* Priority queue full-width;
* Brief and milestones arranged beneath;
* Deal pulse becomes horizontal cards or structured list.

## Mobile — below 768 px

Recommended order:

1. Page title and scope;
2. Decisions required;
3. Overdue;
4. Priority queue;
5. Material changes;
6. Upcoming milestones;
7. Active deals.

Mobile should focus on review and routing.

Dense portfolio comparison belongs on desktop.

---

# 24. Accessibility requirements

The Command Center should support:

* Semantic page sections;
* Heading hierarchy;
* Keyboard-accessible filters;
* Clear focus state;
* Descriptive link labels;
* No color-only severity communication;
* Screen-reader announcement when filters change;
* Accessible due-date descriptions;
* Tabular figures where useful;
* Minimum 44 × 44 px touch targets;
* Reduced-motion preference;
* Correct singular and plural labels;
* Currency values read with their currency;
* Clear indication when information is restricted.

Avoid repeated links labeled only:

> View

Prefer:

> Review Project Horizon valuation adjustment

---

# 25. Component architecture for Figma

## `CommandCenterHeader`

Properties:

* Personal / team scope;
* Today / 7 days / 30 days;
* New-deal permission;
* Loading;
* Mobile.

## `AttentionSummary`

Variants:

* Decisions;
* Overdue;
* Blockers;
* Material changes;
* Selected;
* Zero;
* Restricted.

## `PriorityQueue`

States:

* Populated;
* Filtered;
* Empty;
* Loading;
* Error;
* Partial data.

## `PriorityItem`

Properties:

* Approval;
* Task;
* Blocker;
* Finding;
* Milestone;
* Severity;
* Due state;
* Material impact;
* Assignee;
* Restricted;
* Expanded / collapsed.

## `PortfolioBrief`

States:

* Populated;
* No changes;
* Loading;
* Error;
* Restricted.

## `BriefItem`

Properties:

* Diligence;
* Valuation;
* Matching;
* Negotiation;
* Closing;
* Documents;
* Reviewed / unread;
* Source count.

## `DealPulseList`

Properties:

* Personal deals;
* Team deals;
* At risk;
* Blocked;
* On track;
* Paused;
* Closing ready.

## `DealPulseItem`

Properties:

* Sell-side;
* Buy-side;
* Merger;
* Phase;
* Attention state;
* Value visible / restricted;
* Milestone;
* Pending-item count.

## `MilestoneList`

Properties:

* Internal;
* Client;
* Counterparty;
* Legal;
* Today;
* Overdue;
* Empty.

## `MaterialChangeItem`

Properties:

* New evidence;
* Revised calculation;
* Workflow change;
* Document conflict;
* Counterparty event;
* Access change;
* Reviewed / unread.

---

# 26. Production object model

The Command Center should consume normalized workflow objects rather than manually constructed dashboard data.

## `AttentionItem`

Recommended fields:

```text
id
type
dealId
dealCodename
title
summary
materiality
severity
dueAt
assignedTo
approvalAuthority
blocking
priorityReasons
sourceContext
destinationRoute
createdAt
updatedAt
reviewedAt
status
```

## `MaterialChange`

```text
id
dealId
domain
changeType
before
after
impactSummary
sourceReferences
affectedDecisionIds
detectedAt
reviewState
```

## `DealPulse`

```text
dealId
codename
organizationName
transactionSide
currentPhase
attentionState
attentionReasons
nextMilestone
pendingDecisionCount
overdueCount
dealLead
indicativeValueRange
currency
lastMeaningfulChangeAt
```

## `Milestone`

```text
id
dealId
title
milestoneType
dueAt
owner
external
status
blockingDependencies
destinationRoute
```

The user interface should not calculate materiality from raw activity counts.

---

# 27. Current repository direction

The existing dashboard concept should be repositioned as the Command Center rather than treated as a generic portfolio board.

## Keep

* Existing application shell;
* Responsive layout foundation;
* Shared card and table primitives;
* Deal routes;
* Role-aware data access;
* Current fixture infrastructure;
* Reusable status components.

## Replace or reconsider

* Generic pipeline-board emphasis;
* Custom-dashboard concept;
* Technical engine-status metrics;
* Broad KPI cards without required action;
* Permanent AI chat presence;
* Role-view toggles;
* Activity counts presented as value.

## Add

* Attention summary;
* Priority Work Queue;
* Material-change model;
* Exact-context routing;
* M&Ai Brief;
* Active Deal Pulse;
* Milestone list;
* Permission-aware monetary impact;
* Personal and authorized-team scopes;
* Reviewed and unread states;
* Independent loading and error states.

The product architecture already defines Home as the Command Center and reserves the Deals Portfolio for complete transaction browsing.  The shell specification also requires Tasks & Approvals to remain more prominent than generic notifications, which should carry into this screen’s hierarchy. 

---

# 28. What not to include

Avoid the following in the Command Center:

* A Kanban pipeline as the dominant component;
* Total agent runs;
* AI-token usage;
* ONNX or model-health status;
* Average AI confidence;
* Documents processed as the largest KPI;
* A global client-view switch;
* Free-form dashboard customization;
* Large pie charts;
* Deal-stage funnel charts;
* Revenue or ARR metrics for M&Ai;
* Large generic chat window;
* Complete notification stream;
* Audit logs;
* Every active deal;
* One-click material approvals;
* Unsupported deal-health scores;
* Aggregated transaction values across currencies;
* Real customer names in the pitch mock;
* Real VDR logos for simulated integrations;
* Unverified time-saving or accuracy claims.

M&Ai’s differentiation is the connection between evidence, deterministic calculation and human approval—not the volume of automated activity. 

---

# 29. MOCKED — Pitch and demo specification

## 29.1 Purpose of the mocked Command Center

The mocked Command Center should demonstrate that M&Ai coordinates multiple transactions and directs bankers toward material decisions.

Its pitch narrative is:

> **M&Ai continuously reviews deal activity, identifies what changed, and routes the banker to the exact decision context.**

The Command Center is a strong supporting screen for:

* Product-demo opening;
* Platform-overview slide;
* Workflow-orchestration explanation;
* Appendix or product-depth slide.

It should not replace the Diligence Decision Room as the primary hero screen.

---

## 29.2 Mocked institution and user

Institution:

> **Atlas M&A Advisory**

User:

> **Ana Costa**
> Vice President

Scope:

> **My work · Next 7 days**

---

## 29.3 Mocked page header

Title:

> **Command Center**

Description:

> Priority decisions, material changes and upcoming milestones across your deals.

Primary action:

> **New deal**

Secondary action:

> View all deals

---

## 29.4 Mocked attention summary

Use:

| Summary            | Value | Context             |
| ------------------ | ----: | ------------------- |
| Decisions required | **3** | 2 due today         |
| Overdue            | **1** | Tax evidence review |
| Deal blockers      | **2** | Across 2 deals      |
| Material changes   | **4** | Since last review   |

The selected summary may be:

> **Decisions required**

This filters the visible queue.

---

## 29.5 Mocked Priority Work Queue

Show three or four items.

### Item 1 — selected

> **Approval required**
> **Project Horizon**
> Approve customer-concentration adjustment
> Risk-adjusted valuation midpoint decreases by **R$ 42 mi**
> Due today · High materiality · Blocks scenario v4
>
> **Open review**

### Item 2

> **Review required**
> **Project Atlas**
> Confirm missing tax evidence
> R$ 11,4 mi exposure remains unsupported
> Overdue · Blocks diligence report

### Item 3

> **Decision required**
> **Project Aurora**
> Approve buyer shortlist
> 8 strategic buyers · 3 newly exceed fit threshold
> Due today · Client review tomorrow

### Item 4

> **Assumption review**
> **Project Northstar**
> Confirm EBITDA normalization
> Proposed adjustment: **R$ 6,8 mi**
> Due Thursday · Valuation scenario pending

For pitch simplification, show only the first three.

---

## 29.6 Mocked M&Ai Brief

Title:

> **M&Ai Brief**

### Brief item 1

> **Project Horizon**
> Customer concentration increased to 41,2% of LTM revenue. The revised downside scenario decreases enterprise-value midpoint by R$ 42 mi.
>
> 3 sources · Open finding

### Brief item 2

> **Project Atlas**
> Two closing conditions remain exposed because supporting tax documents are incomplete.
>
> 4 missing documents · Open checklist

### Brief item 3

> **Project Aurora**
> Three additional buyers now meet the approved strategic-fit threshold after the latest scoring run.
>
> Buyer universe · Review shortlist

Do not use a long prose paragraph. Each item should be independently scannable.

---

## 29.7 Mocked Active Deal Pulse

Show four deals.

### Project Horizon

> Atlas Industrial · Sell-side
> **Due Diligence**
> Attention required · 2 decisions
> Diligence committee · 30 July
> R$ 480 mi–R$ 520 mi

### Project Aurora

> Nova Health · Sell-side
> **Buyer Universe**
> On track · 8 of 12 contacted
> Shortlist review · Tomorrow
> R$ 210 mi–R$ 245 mi

### Project Atlas

> Boreal Logistics · Buy-side
> **Closing**
> Blocked · 2 conditions overdue
> Closing review · Friday
> R$ 315 mi

### Project Northstar

> Vértice Software · Buy-side
> **Valuation**
> Attention required · Scenario v3 pending
> Valuation committee · Thursday
> R$ 160 mi–R$ 185 mi

At pitch scale, show only the first three or use a compact horizontal list.

---

## 29.8 Mocked milestones

> **Today · 15:00**
> Project Horizon · Approve scenario v4

> **Tomorrow · 10:30**
> Project Aurora · Buyer shortlist review

> **30 July**
> Project Horizon · Diligence committee

> **31 July**
> Project Atlas · Closing-condition review

Use a small distinction between internal and external commitments.

---

## 29.9 Mocked shell state

The global shell should display:

* Expanded sidebar;
* Home active;
* Tasks & Approvals badge: **3**;
* Notifications: **2**;
* Global search;
* Ask M&Ai;
* Ana Costa avatar.

Breadcrumb:

> **Home / Command Center**

Search placeholder:

> Search deals, organizations or decisions

---

# 30. Pitch-specific simplification

The pitch screenshot should retain:

* Command Center title;
* Four attention summaries;
* Three priority items;
* Two or three brief items;
* Three active deals;
* Minimal milestone list.

Hide:

* Advanced filters;
* Team scope;
* Queue sorting;
* Assignee controls;
* Quick-action grid;
* Complete deal list;
* Lower-priority items;
* Empty states;
* Expanded item metadata;
* Portfolio analytics.

## Readability requirement

At slide scale, the following should remain legible:

* **Decisions required: 3**
* **Project Horizon**
* **−R$ 42 mi**
* **Open review**
* **M&Ai Brief**
* **Due Diligence**
* **Closing**

If those elements cannot be read, reduce the number of visible components rather than reducing type size.

---

# 31. Recommended demo flow

## Flow A — Start from portfolio priority

```text
Command Center
  ↓
Review “Approve customer-concentration adjustment”
  ↓
Project Horizon
  ↓
Diligence Decision Room
  ↓
Evidence inspector
  ↓
Valuation impact
  ↓
Approve or request analyst review
```

This is the strongest product-demo opening because it moves from institution-level orchestration into the differentiated decision surface.

## Flow B — Review material change

```text
M&Ai Brief
  ↓
Project Atlas missing tax evidence
  ↓
Closing Control Room
  ↓
Two blocked conditions
  ↓
Open information request
```

## Flow C — Move from deal pulse

```text
Active Deal Pulse
  ↓
Project Aurora
  ↓
Buyer Universe
  ↓
Review scored buyers
  ↓
Approve shortlist
```

## Flow D — Ask M&Ai

```text
Command Center
  ↓
Ask M&Ai
  ↓
“What changed across my deals since Friday?”
  ↓
Evidence-linked portfolio response
  ↓
Open Project Horizon finding
```

---

# 32. UX prototype tasks to validate

Test the screen with bankers using tasks such as:

1. Identify the most urgent decision.
2. Explain why Project Horizon is prioritized.
3. Find which deal is currently blocked.
4. Open the evidence behind the largest valuation change.
5. Identify tomorrow’s client-facing commitment.
6. Determine which item is overdue.
7. Find all work assigned to another team member.
8. Distinguish a notification from a required approval.
9. Return to the Command Center after reviewing a finding.
10. Explain what changed since the previous session.

## Measures

Record:

* Time to identify the first priority;
* Whether the user understands why it is prioritized;
* Whether the correct deal context opens;
* Whether the user confuses notifications with tasks;
* Whether users trust the M&Ai Brief;
* Whether monetary impacts are noticed;
* Whether the screen feels overloaded;
* Whether users can distinguish Command Center from Deals Portfolio.

---

# 33. Design validation criteria

The Command Center is ready for approval when:

1. The highest-priority item is identifiable within five seconds.
2. The user can explain why that item is prioritized.
3. Required work is distinct from general events.
4. Selecting an item opens the exact transaction context.
5. Monetary impact is visible only to authorized users.
6. The screen remains useful without opening the Copilot.
7. The M&Ai Brief links every material statement to a source context.
8. No technical engine terminology dominates the screen.
9. The Deals Portfolio remains necessary for full browsing.
10. The Tasks & Approvals screen remains necessary for complete queue management.
11. The Command Center does not resemble a generic CRM pipeline.
12. The first viewport exposes decisions, blockers and material changes.
13. The screen supports personal and authorized-team scopes.
14. Cross-deal information respects permissions.
15. Partial system failures do not block the complete page.
16. Currency values remain in the transaction’s native currency.
17. Material approvals cannot be completed blindly.
18. The pitch mock remains readable at slide scale.
19. Mocked fixtures do not imply real customers or integrations.
20. Every primary item has an explicit destination and next action.

---

# 34. Final design target

The correct design target is not:

> “A dashboard showing everything happening across the portfolio.”

It is:

> **A prioritized operating surface that tells each banker what changed, why it matters and which exact transaction decision should be handled next.**

The best Command Center should make M&Ai feel less like software the banker must inspect and more like an execution system that continuously organizes their attention.

Its defining interaction is:

> **See the exception → understand the consequence → enter the exact deal context → make the decision**

**Next iteration: Deals Portfolio.**
