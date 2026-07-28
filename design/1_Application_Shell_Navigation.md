---
canonical_name: "Application Shell & Navigation"
definition_id: "BD-01"
definition_status: "Governed for MAI-90"
screen_family: "global-foundation"
owning_task: "MAI-91"
canonical_routes:
  - "/home"
  - "/deals"
  - "/deals/new"
  - "/organizations"
  - "/organizations/:organizationId"
  - "/contacts/:contactId"
  - "/tasks"
  - "/team"
  - "/notifications"
  - "/search"
  - "/settings/profile"
  - "/settings/institution"
  - "/settings/roles"
  - "/settings/integrations"
  - "/settings/security"
  - "/settings/templates"
  - "/settings/commercial"
  - "/settings/audit"
  - "/settings/developers"
figma_file_key: "otMJE31OKIxdXogV4RNbGQ"
figma_status: "Existing approved evidence"
figma_area: "MAI Banker Workspace — Design System & Product UI / 06 Application Shell"
figma_nodes:
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=41-16"
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=43-10"
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=44-20"
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=44-41"
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=44-62"
  - "https://www.figma.com/design/otMJE31OKIxdXogV4RNbGQ?node-id=44-85"
related_definitions:
  - "design/26_Cross_Screen_Interaction_Map.md"
  - "design/27_Shared_State_Model.md"
  - "design/0_Implementaion_Roadmap.md"
last_reviewed_task: "MAI-90"
implementation_capability_boundary: "Product definition only; no frontend, backend, Storybook, token export, or runtime behavior implemented by this file."
mock_demo_data_boundary: "Use fictional/demo transaction data only; do not encode real client, counterparty, credential, or confidential deal data."
---
# Application Shell & Navigation

## 1. Definition

The **Application Shell & Navigation** is the persistent structural system that surrounds every M&Ai workspace.

It establishes:

* Where the user is;
* Which institution they are operating within;
* Which deal is currently active;
* Which transaction phase they are reviewing;
* What work requires their attention;
* Which actions and information they are authorized to access;
* How they can move between global and deal-specific contexts.

The shell is not merely a sidebar and top bar. It is the product’s **orientation, trust and access-control layer**.

M&Ai should remain organized around the **deal**, while preserving institution-level access to deals, organizations, tasks and team administration. The navigation should expose the banker’s transaction workflow rather than technical concepts such as agents, models, RAG pipelines or computational engines. 

---

# 2. Intention of the shell

## Primary intention

The shell should allow a banker to understand their current operating context without consciously interpreting the interface.

At any moment, the user should be able to answer:

1. **Which institution am I operating within?**
2. **Am I working across the portfolio or inside one deal?**
3. **Which deal and transaction phase are currently active?**
4. **What requires my attention?**
5. **How do I move to the next relevant workspace?**

The shell should reduce orientation effort so that the user can focus on the actual transaction decision.

## Product intention

The shell should reinforce M&Ai’s positioning as an **auditable deal-execution workspace**, not a collection of disconnected AI features.

The product connects:

* Document-linked diligence;
* Deterministic valuation;
* Workflow orchestration;
* Human review;
* Audit history.

The shell must make those capabilities feel like one transaction system. The deck describes M&Ai as moving from VDR documents to an auditable workspace through diligence intelligence, traceable valuation and approval routing. 

## User outcome

A banker should feel:

> “I always know which transaction I am working on, what stage it is in, and where the next decision belongs.”

---

# 3. What the shell is not

The shell should not become:

* A large dashboard permanently surrounding every page;
* A system-health console;
* An agent selector;
* A technical observability interface;
* A customizable collection of navigation widgets;
* A place for charts or performance metrics;
* A transaction-phase wizard;
* A substitute for page-level actions;
* A role-impersonation switcher;
* A container for every possible route.

The shell should remain stable, compact and predictable.

---

# 4. Core navigation model

The product requires two levels of navigation:

1. **Global navigation**
2. **Deal navigation**

These levels should remain visually and conceptually distinct.

```text
Institution context
  ↓
Global workspace
  ├── Home
  ├── Deals
  ├── Organizations
  ├── Tasks & Approvals
  └── Team
        ↓
      Open deal
        ↓
Deal workspace
  ├── Overview
  ├── Target Dossier
  ├── Documents
  ├── Diligence
  ├── Valuation
  ├── Matching
  ├── Negotiation
  ├── Closing
  └── Activity and administration
```

The persistent global navigation should contain only the product’s principal institution-level objects. Deal phases should appear only after a deal has been opened. 

---

# 5. Shell modes

The same design system should support four controlled shell variants.

## 5.1 Global workspace mode

Used for:

* Command Center;
* Deals Portfolio;
* Organizations;
* Tasks & Approvals;
* Team;
* Institution administration.

The shell displays:

* Expanded global navigation;
* Institution context;
* Global search;
* Global task and notification counts;
* No deal-level navigation.

Example route:

```text
/deals
```

---

## 5.2 Deal workspace mode

Used inside a specific transaction.

The shell displays:

* Global navigation, usually in compact form;
* Active deal context;
* Deal switcher;
* Transaction stage;
* Deal-level navigation;
* Deal-scoped search;
* Contextual Copilot access;
* Deal-specific task and notification indicators.

Example route:

```text
/deals/project-horizon/diligence
```

This should be the product’s most common operational mode.

---

## 5.3 Administration mode

Used for:

* Institution settings;
* Roles and permissions;
* Integrations;
* Security;
* Templates;
* Audit and compliance.

The shell displays:

* Institution context;
* Settings-specific secondary navigation;
* No active deal context unless the user opened deal settings.

Example route:

```text
/settings/roles
```

---

## 5.4 External-participant mode

Used for:

* Client portal;
* Information-request portal;
* External approvals;
* Secure document submission.

This should use a visibly reduced shell with:

* Restricted navigation;
* Clear deal identity;
* Participant role;
* Access limitations;
* Session and security controls.

External users should not see internal global navigation, internal findings or unrestricted Copilot access.

---

# 6. Application shell anatomy

## 6.1 Global sidebar

The global sidebar is the primary persistent navigation component.

### Main responsibilities

* Establish M&Ai brand identity;
* Display institution context;
* Provide global navigation;
* Surface pending work counts;
* Support collapse and expansion;
* Provide access to settings and account controls.

### Recommended primary destinations

1. **Home**
2. **Deals**
3. **Organizations**
4. **Tasks & Approvals**
5. **Team**

### Utility destinations

These should appear separately near the bottom or in the top bar:

* Help;
* Settings;
* User profile;
* Institution switcher;
* Sign out.

### Primary creation action

An expanded sidebar may include:

> **New deal**

This should be visually separated from navigation items.

In collapsed mode, it becomes a clearly labeled icon with a tooltip.

### Information architecture

```text
M&Ai
Atlas M&A Advisory

[ New deal ]

WORKSPACE
Home
Deals
Organizations
Tasks & Approvals       3
Team

UTILITY
Help
Settings

Ana Costa
Vice President
```

### Active state

The active destination should use:

* Ink Black background;
* Canvas Cream text;
* Visible icon and label;
* `aria-current="page"` programmatically.

Do not rely only on Signal Orange to indicate active navigation.

### Navigation badges

Badges should be used only when the number changes user behavior.

Appropriate:

> Tasks & Approvals · **3**

Inappropriate:

> Deals · **24**

The number of deals is not inherently an action requirement.

---

## 6.2 Institution identity

The user should always know which institution owns the current workspace.

Recommended display:

> **Atlas M&A Advisory**
> Advisory workspace

The institution control should support:

* Current institution name;
* Institution logo or initials;
* Switch institution, when applicable;
* Institution settings, when authorized;
* Clear distinction between production and sandbox environments.

### Multi-institution behavior

Multi-institution switching should occur through a controlled menu.

It should not be presented as an always-visible segmented control because:

* Most users belong to only one institution;
* Switching institutions changes permissions and visible deals;
* The action has greater consequence than changing a view filter.

---

## 6.3 Top bar

The top bar provides contextual utilities, not primary navigation.

### Recommended anatomy

#### Left

* Mobile menu control;
* Breadcrumbs;
* Optional page-context indicator.

#### Center

* Global or deal-scoped command search.

#### Right

* Tasks and approvals;
* Notifications;
* Help;
* Contextual Copilot;
* User menu.

Example:

```text
Deals / Project Horizon / Diligence

[ Search deal, evidence or decision… ]   Tasks 3   Notifications 2   Ask M&Ai   AC
```

### Recommended height

* Desktop: **64 px**
* Tablet: **64 px**
* Mobile: **56–64 px**

The top bar should remain sticky.

### Visual treatment

Use:

* Lifted Cream or white background;
* Thin Dust Taupe bottom border;
* Minimal or no shadow;
* High information contrast;
* No decorative orbital graphics.

---

## 6.4 Breadcrumbs

Breadcrumbs establish hierarchy and provide a predictable return path.

### Global example

```text
Home / Organizations / Atlas Industrial
```

### Deal example

```text
Deals / Project Horizon / Diligence
```

### Administration example

```text
Settings / Roles & Permissions
```

### Rules

* Maximum visible depth: approximately four levels;
* Intermediate items should be clickable;
* Current page should not be clickable;
* Long deal or organization names should truncate;
* Full names should appear on hover and to assistive technology;
* Mobile may collapse intermediate levels.

Avoid exposing technical route names such as:

```text
Deals / 72ab3d / Engines / ONNX
```

---

## 6.5 Command search

Search should be one of the shell’s principal productivity tools.

### Global search scope

From institution-level screens, it should search:

* Deals;
* Organizations;
* Contacts;
* Documents the user can access;
* Findings;
* Tasks;
* Decisions;
* Deliverables.

### Deal search scope

Inside a deal, it should prioritize:

* Deal documents;
* Findings;
* Dossier facts;
* Valuation assumptions;
* Negotiation terms;
* Closing conditions;
* Audit records.

### Recommended interaction

Desktop shortcut:

> `⌘ K` or `Ctrl K`

The search field opens a command palette.

### Search result grouping

```text
PROJECT HORIZON

Findings
Customer concentration increased to 41,2%

Documents
Receita_por_Cliente_2025.xlsx

Decisions
Risk-adjusted valuation approved

Actions
Open Diligence Decision Room
Create information request
Ask M&Ai about this deal
```

### UX rule

Search should return **objects and actions**, not only text matches.

---

## 6.6 Tasks & Approvals control

Tasks and approvals represent required work.

This is more important than generic notifications and should therefore receive stronger prominence.

### Top-bar representation

> **Tasks 3**

Selecting it should open a compact preview:

* Material approvals;
* Overdue assigned tasks;
* Review requests;
* Blockers.

Example:

> **Approve valuation adjustment**
> Project Horizon · Due today

> **Review missing tax evidence**
> Project Atlas · Overdue

> **Confirm buyer shortlist**
> Project Aurora · Due tomorrow

The preview should link to the exact working context rather than to a generic activity stream.

---

## 6.7 Notification control

Notifications describe events that may or may not require action.

Examples:

* VDR synchronization completed;
* User mentioned in a finding;
* New document uploaded;
* Model run completed;
* Deal phase changed;
* Approval completed by another user.

Notifications should not compete visually with Tasks & Approvals.

### Distinction

| System concept       | Meaning                                            |
| -------------------- | -------------------------------------------------- |
| **Task or approval** | The user must do something                         |
| **Notification**     | Something happened                                 |
| **System alert**     | Product reliability or security requires attention |

These should not be merged into one undifferentiated inbox.

---

## 6.8 User menu

The user menu should display:

* Name;
* Job title or workspace role;
* Institution;
* Profile and preferences;
* Language and regional format;
* Keyboard shortcuts;
* Help;
* Sign out.

Example:

> **Ana Costa**
> Vice President
> Atlas M&A Advisory

Do not expose complex permission matrices inside this menu.

---

# 7. Deal context header

The deal context header appears only inside a deal workspace.

It is the bridge between global navigation and transaction-specific navigation.

## Required information

* Deal codename;
* Target organization;
* Transaction side;
* Current stage;
* Deal status;
* Currency;
* Confidentiality or access status;
* Optional last-sync state.

Example:

> **Project Horizon**
> Atlas Industrial · Sell-side
> Due Diligence · Active

Supporting information:

> R$ 480 mi–R$ 520 mi indicative valuation
> Restricted workspace · Last VDR sync 4 min ago

### Deal switcher

Selecting the deal codename should allow the user to:

* Search accessible deals;
* Open recently accessed deals;
* Return to the Deals Portfolio;
* Open a new deal, when permitted.

The user should not need to return to the portfolio every time they change deals.

### Stage representation

The current stage should be a status label, not a large progress bar.

Example:

> **Due Diligence**

Avoid implying that M&A follows a perfectly linear completion percentage.

---

# 8. Deal-level navigation

The deal navigation should sit below the deal context header.

## Recommended destinations

1. **Overview**
2. **Dossier**
3. **Documents**
4. **Diligence**
5. **Valuation**
6. **Buyer Universe** or **Target Universe**
7. **Negotiation**
8. **Closing**
9. **More**

### Dynamic matching label

For sell-side transactions:

> **Buyer Universe**

For buy-side transactions:

> **Target Universe**

For mergers or other transaction types:

> **Counterparties**

The route may remain `/matching`, but the banker-facing label should adapt to the transaction.

### More menu

The **More** menu should contain lower-frequency or administrative screens:

* Activity & Audit;
* Deal Team & Access;
* Deliverables & Exports;
* Agentic Workspace;
* Deal Settings.

This prevents the horizontal navigation from becoming overloaded.

### Contextual availability

Navigation items should not disappear unpredictably.

When a workspace is unavailable because of stage, permission or configuration, use a disabled or restricted state with an explanation.

Example:

> **Closing**
> Available after negotiation terms are approved.

For long-running deals, users may need to revisit earlier workspaces, so completed phases should remain accessible.

---

# 9. Page header

The page header belongs inside the content canvas and should not be confused with the top bar or deal context header.

## Purpose

It explains:

* What the current page is for;
* What state it is in;
* What primary actions are available.

Example:

> **Diligence Decision Room**
> Review material findings, verify source evidence and approve transaction impacts.

Actions:

* Export review;
* Sync documents;
* Configure thresholds.

### Rules

A page header should normally contain:

* Eyebrow or optional section label;
* Page title;
* One-line description;
* State or count summary;
* One primary action;
* Up to two secondary actions.

Avoid placing eight equally prominent buttons in the page header.

---

# 10. Contextual Copilot

The Contextual Copilot should be accessible from every deal workspace without becoming the navigation system itself.

## Recommended entry point

Top-bar control:

> **Ask M&Ai**

Or a persistent compact button near the right edge of the workspace.

### Behavior

Selecting it opens a right-side drawer containing:

* Current deal context;
* Current page context;
* Suggested questions;
* Citation-linked answers;
* Generated actions;
* Approval requests;
* “Open full workspace” action.

### Context inheritance

When opened from Diligence:

> “Explain this finding.”

When opened from Valuation:

> “Compare scenario v3 and v4.”

When opened from Negotiation:

> “Show which terms changed in the latest proposal.”

### UX rule

The Copilot should understand the current page, selected object and active deal without forcing the user to restate them.

### Full Agentic Workspace

The full Agentic Workspace remains available for:

* Long investigations;
* Multi-step agent workflows;
* Complete conversation history;
* Tool and engine inspection;
* Generated artifacts.

It should not occupy a permanent primary-navigation item.

---

# 11. Page canvas

The canvas is the controlled content area where each product screen is rendered.

## Recommended behavior

* Full-height workspace;
* Independent page scrolling;
* Sticky shell;
* Consistent horizontal padding;
* Support for full-width analytical surfaces;
* Support for constrained forms and administrative pages.

### Canvas width modes

#### Full analytical

Used for:

* Diligence;
* Valuation;
* Documents;
* Negotiation;
* Closing.

Recommended:

> Full available width with 24–32 px margins.

#### Standard

Used for:

* Command Center;
* Deal Overview;
* Organization Detail.

Recommended maximum width:

> Approximately 1.400–1.600 px.

#### Constrained

Used for:

* Settings forms;
* Profile;
* Deal configuration.

Recommended maximum width:

> Approximately 760–960 px.

Do not force every page into the same centered column.

---

# 12. Recommended desktop layout

For a **1440 × 900** design canvas:

| Region                  |        Expanded |         Compact |
| ----------------------- | --------------: | --------------: |
| Global sidebar          |      240–256 px |        72–80 px |
| Top bar                 |      64 px high |      64 px high |
| Deal context and tabs   | 112–136 px high | 112–136 px high |
| Page horizontal padding |        24–32 px |        24–32 px |
| Copilot drawer          |      360–440 px |      360–440 px |

## Global workspace composition

```text
┌───────────────┬─────────────────────────────────────────────────┐
│ M&Ai          │ Breadcrumbs       Search       Tasks  Bell  User│
│ Institution   ├─────────────────────────────────────────────────┤
│               │                                                 │
│ New deal      │ Page header                                     │
│               │                                                 │
│ Home          │ Page content                                    │
│ Deals         │                                                 │
│ Organizations │                                                 │
│ Tasks         │                                                 │
│ Team          │                                                 │
│               │                                                 │
│ Help          │                                                 │
│ Settings      │                                                 │
│ User          │                                                 │
└───────────────┴─────────────────────────────────────────────────┘
```

## Deal workspace composition

```text
┌───────┬─────────────────────────────────────────────────────────┐
│ M&Ai  │ Deals / Project Horizon / Diligence   Search  Tasks User│
│       ├─────────────────────────────────────────────────────────┤
│ Home  │ Project Horizon · Sell-side · Due Diligence             │
│ Deals │ R$ 480 mi–R$ 520 mi · Restricted workspace             │
│ Org.  ├─────────────────────────────────────────────────────────┤
│ Tasks │ Overview Dossier Documents Diligence Valuation ...      │
│ Team  ├─────────────────────────────────────────────────────────┤
│       │                                                         │
│       │ Page header                                             │
│       │                                                         │
│       │ Screen content                                          │
│       │                                                         │
└───────┴─────────────────────────────────────────────────────────┘
```

The compact sidebar is appropriate for dense deal workspaces, but the user should retain control over whether it is expanded.

---

# 13. UI design direction

## 13.1 Overall visual character

Aim for:

> **Institutional transaction software with editorial restraint**

The shell should feel:

* Stable;
* Quiet;
* Precise;
* Controlled;
* Confidential;
* Professional.

It should not feel:

* Futuristic;
* Promotional;
* Decorative;
* Gamified;
* Consumer-oriented;
* Like a generic AI chat product.

---

## 13.2 Color application

Use the established M&Ai visual foundation:

* Canvas Cream: `#F3F0EE`;
* Lifted Cream: `#FCFBFA`;
* Ink Black: `#141413`;
* Signal Orange: `#CF4500`;
* Light Signal Orange: `#F37338`;
* Dust Taupe: `#D1CDC7`;
* Slate Gray: `#696969`.

### Shell application

* Sidebar: Lifted Cream;
* Main canvas: Canvas Cream;
* Top bar: White or Lifted Cream;
* Active navigation: Ink Black;
* Primary creation action: Ink Black;
* Selected attention state: restrained Signal Orange;
* Borders: Dust Taupe;
* Secondary labels: Slate Gray.

Signal Orange should not dominate the shell. It should identify attention and brand accents rather than become the background of every active element.

---

## 13.3 Typography

Use **Sofia Sans** as the canonical product font.

Fallback:

* Plus Jakarta Sans;
* Inter;
* Arial;
* sans-serif.

### Recommended shell hierarchy

| Element          |     Size |  Weight |
| ---------------- | -------: | ------: |
| Institution name | 13–14 px | 600–700 |
| Navigation item  |    14 px | 550–650 |
| Breadcrumb       | 12–13 px | 450–600 |
| Deal codename    | 20–24 px | 500–600 |
| Deal metadata    | 12–14 px | 450–600 |
| Deal tab         | 13–14 px |     600 |
| Utility label    | 12–13 px |     600 |

Do not use a separate font for labels and navigation. Weight, size and spacing are sufficient to establish hierarchy.

---

## 13.4 Radius and geometry

The marketing identity uses large curves and pill shapes, but the product shell should be more restrained.

Recommended:

* Sidebar items: 8–12 px radius;
* Search field: 10–16 px radius;
* Buttons: 12–20 px radius;
* Status badges: pill;
* Menus: 10–12 px radius;
* Drawers: no radius against viewport edge;
* Main analytical panels: 6–12 px radius.

Avoid turning every navigation item into a full stadium shape. A controlled active rectangle is more space-efficient and easier to scan.

---

## 13.5 Icons

Use simple line icons with consistent stroke weight.

Each global navigation destination should have a stable icon.

Recommended concepts:

| Destination       | Icon concept                    |
| ----------------- | ------------------------------- |
| Home              | Home or command grid            |
| Deals             | Briefcase or transaction arrows |
| Organizations     | Building                        |
| Tasks & Approvals | Check-circle                    |
| Team              | Users                           |
| Search            | Magnifying glass                |
| Notifications     | Bell                            |
| Settings          | Gear                            |
| Copilot           | Spark or M&Ai mark              |

Do not use unrelated generic icons such as an information icon for Home or an arrow icon for Deals.

---

# 14. UX design principles

## 14.1 Preserve context

Moving between pages inside a deal should preserve:

* Active deal;
* Selected object where possible;
* Search scope;
* Filters;
* Copilot context;
* Unsaved-state warnings.

The user should never wonder whether they accidentally changed transactions.

---

## 14.2 Make scope explicit

Every search, task and AI interaction should clearly indicate whether it is:

* Institution-wide;
* Deal-specific;
* Document-specific;
* Finding-specific.

Example:

> Searching **Project Horizon**

This prevents cross-deal confusion.

---

## 14.3 Prioritize required work

Tasks and approvals should be more prominent than general system activity.

The shell should direct the user toward decisions—not toward unread counts.

---

## 14.4 Avoid technical navigation

Do not expose the following as primary banker-facing destinations:

* Engines;
* Models;
* RAG;
* Memory;
* Agent tools;
* ONNX;
* MILP;
* API state.

Users should access:

* Diligence;
* Valuation;
* Negotiation;
* Documents;
* Closing.

Technical provenance can appear inside the relevant analytical result.

---

## 14.5 Keep client access separate

“Banker,” “Institution” and “Client” should not be presented as interchangeable view modes.

They represent different access models.

A banker should not accidentally switch into a client perspective through a simple segmented control. Client participation should occur through restricted roles or a separate portal.

---

## 14.6 Avoid infrastructure status in the banker top bar

A label such as:

> ONNX online

does not help a banker execute a deal.

Infrastructure health belongs in:

* Administrative monitoring;
* System status;
* Error handling;
* Engine-specific diagnostic detail.

The banker-facing shell should communicate user-relevant outcomes:

> Analysis unavailable
> VDR sync delayed
> Valuation calculation failed

---

## 14.7 Respect permissions

The shell should adapt to permissions without hiding the product’s structure unnecessarily.

Examples:

* A user may see “Valuation” but receive a read-only state;
* An external participant should not see “Negotiation” at all;
* An analyst may see approval status but not approve;
* An administrator may access Deal Team & Access;
* An auditor may receive read-only access to Activity & Audit.

Permission states should explain restrictions.

Example:

> You can review this valuation, but only a Vice President or Partner can approve it.

---

# 15. Navigation behavior

## 15.1 Expanded sidebar

Used by default on:

* Command Center;
* Deals;
* Organizations;
* Tasks;
* Team;
* Settings.

It displays icons and labels.

## 15.2 Compact sidebar

Useful on analytical deal screens.

It displays:

* M&Ai mark;
* Navigation icons;
* Tooltips;
* Active state;
* Badge indicators.

The user should be able to pin the preferred state.

## 15.3 Mobile navigation

Use an overlay drawer.

Requirements:

* Close button;
* Click-outside behavior;
* Escape-key support;
* Focus trapping;
* Current institution;
* Current deal, when applicable;
* Global and deal navigation;
* No hover-dependent interactions.

## 15.4 Browser navigation

Back and forward browser controls should behave predictably.

Filters and selected tabs that materially affect context should be reflected in the URL where appropriate.

Example:

```text
/deals/project-horizon/diligence?severity=high&status=pending
```

Do not put temporary UI state such as an open tooltip in the URL.

---

# 16. System states

## 16.1 Loading

The shell should render immediately while page content loads.

Use:

* Stable navigation skeleton;
* Page-title skeleton;
* Content skeleton.

Do not display a full-screen spinner for every route transition.

---

## 16.2 Unauthorized route

When the user opens a route they cannot access:

> **Access restricted**
> You do not have permission to review negotiation terms for Project Horizon.

Actions:

* Return to Deal Overview;
* Request access, when supported;
* Contact deal administrator.

---

## 16.3 Deal unavailable

Possible causes:

* Deal archived;
* Access revoked;
* Deal deleted;
* Institution changed;
* Invalid link.

The error should distinguish these cases.

---

## 16.4 Offline or degraded connection

The shell should indicate:

> **Connection interrupted**
> Changes may not be saved.

Actions requiring persistence should become disabled or explicitly queued.

---

## 16.5 Unsaved changes

Navigating away from a form or approval draft should trigger:

> You have unsaved changes.

Actions:

* Save and continue;
* Discard changes;
* Stay on page.

---

## 16.6 Archived deal

The deal context header should display:

> **Archived · Read only**

The shell should remain navigable, but destructive and editing actions should be disabled.

---

## 16.7 Restricted or confidential workspace

A subtle access indicator may display:

> **Restricted workspace**

Selecting it should explain:

* User role;
* Access level;
* External-sharing restrictions;
* Data boundary;
* Deal administrator.

Avoid vague security marketing inside the operational shell.

---

# 17. Responsive behavior

## Desktop — 1280 px and above

* Expanded or compact sidebar;
* Full top bar;
* Deal context header;
* Horizontal deal navigation;
* Persistent Copilot control.

## Tablet — approximately 768–1279 px

* Compact sidebar by default;
* Search becomes an icon or shorter field;
* Lower-frequency deal tabs move into More;
* Deal metadata condenses;
* Copilot opens as an overlay drawer.

## Mobile — below approximately 768 px

* Sidebar becomes overlay drawer;
* Deal header becomes two rows;
* Breadcrumbs collapse;
* Search becomes command icon;
* Deal navigation becomes a horizontally scrollable tab strip or a section selector;
* Tasks and notifications remain individually accessible;
* User avatar becomes the account-menu entry point.

The product is desktop-first, but navigation and approval tasks must remain operable on mobile.

---

# 18. Accessibility requirements

The shell should support:

* Skip-to-content link;
* Semantic `nav`, `header`, `main` and `aside` elements;
* Visible keyboard focus;
* Full keyboard navigation;
* Escape-key dismissal for drawers and menus;
* Focus return after modal closure;
* Tooltips for compact navigation;
* Text equivalents for icon-only actions;
* Minimum 44 × 44 px touch targets;
* Sufficient color contrast;
* `aria-current` for active routes;
* Screen-reader announcements for institution or deal changes;
* Reduced-motion preference;
* No color-only status communication.

### Keyboard sequence

A keyboard user should be able to:

1. Skip directly to page content;
2. Open command search;
3. Move through navigation;
4. Open Tasks & Approvals;
5. Open the user menu;
6. Access the current deal navigation;
7. Return focus to the initiating control.

---

# 19. Component architecture for Figma

The shell should be designed as reusable components rather than as copied frames.

## Required components

### `AppShell`

Variants:

* Global;
* Deal;
* Administration;
* External.

### `GlobalSidebar`

Properties:

* Expanded / compact;
* Desktop / mobile;
* Active destination;
* Task badge;
* Institution selector;
* User role;
* Permission variant.

### `TopBar`

Properties:

* Global / deal;
* Search expanded / collapsed;
* Task count;
* Notification count;
* Copilot available / unavailable;
* Mobile variant.

### `Breadcrumbs`

Properties:

* Two to four levels;
* Truncated;
* Mobile collapsed;
* Disabled parent.

### `DealContextHeader`

Properties:

* Active;
* Paused;
* Archived;
* Restricted;
* Sync warning;
* Read-only.

### `DealNavigation`

Properties:

* Sell-side;
* Buy-side;
* Merger;
* Active stage;
* Restricted tab;
* Overflow / More.

### `CommandPalette`

States:

* Initial;
* Searching;
* Results;
* Empty;
* Loading;
* Error;
* Permission-restricted result.

### `TasksPreview`

States:

* Pending;
* Empty;
* Loading;
* Error;
* Mixed-deal;
* Deal-filtered.

### `NotificationPreview`

States:

* Unread;
* All read;
* Loading;
* Error.

### `CopilotDrawer`

States:

* Closed;
* Initial suggestions;
* Active response;
* Citations;
* Tool execution;
* Approval request;
* Error.

---

# 20. Current repository changes

The current repository already establishes useful foundations:

* Shared application shell;
* Collapsible sidebar;
* Mobile navigation;
* Sticky top bar;
* Breadcrumb state;
* Reusable navigation components.

Those structural foundations should be retained.

The final design should change the current prototype navigation model.

## Keep

* Shared `AppShell`;
* Responsive sidebar;
* Collapsed and expanded states;
* Breadcrumb support;
* Shared page canvas;
* Reusable top bar;
* Accessible active-route behavior.

## Replace

Current global destinations such as:

* Dashboard;
* Entities;
* Agentic Workspace;
* Custom Dashboard;
* Settings.

With:

* Home;
* Deals;
* Organizations;
* Tasks & Approvals;
* Team.

## Remove from the banker-facing top bar

* Institution / Banker / Client point-of-view selector;
* Country selector;
* “ONNX online” infrastructure badge.

## Add

* Global command search;
* Tasks & Approvals;
* Notifications;
* Contextual Copilot;
* User and institution menu;
* Deal context header;
* Deal-level navigation;
* Permission and archived states.

## Terminology corrections

| Current prototype                   | Final product                                   |
| ----------------------------------- | ----------------------------------------------- |
| Dashboard                           | Home / Command Center                           |
| Entities                            | Organizations                                   |
| Agentic Workspace in global sidebar | Contextual Copilot with optional full workspace |
| Engines                             | Valuation or relevant analysis                  |
| POV selector                        | Role and permission context                     |
| ONNX online                         | No banker-facing equivalent                     |
| Custom Dashboard                    | Remove from primary navigation                  |

---

# 21. What not to include

Avoid the following in the final shell:

* Technical engine-health badges;
* A permanent AI chat panel;
* Country selection in the main top bar;
* Client-view switching;
* A global “Agentic Workspace” primary destination;
* Custom-dashboard navigation;
* Pipeline KPIs in the top bar;
* Excessive unread badges;
* Large promotional brand graphics;
* A footer on operational screens;
* More than five principal global destinations;
* All deal routes simultaneously visible in the global sidebar;
* Real customer names or integration logos in the pitch mock;
* Claims of active integrations that remain simulated.

---

# 22. MOCKED — Pitch and demo shell specification

## 22.1 Purpose of the mocked shell

The shell should not be presented as a standalone hero product screen.

Its purpose in the pitch is to make every product screenshot feel like part of a credible, coherent transaction platform.

It should communicate:

* A real deal context;
* A professional banker user;
* A controlled transaction phase;
* Pending human work;
* Consistent navigation;
* Deal-scoped AI access.

The Diligence Decision Room remains the primary hero screen. The shell should frame it rather than compete with it.

---

## 22.2 Mocked institution

Use a fictional institution:

> **Atlas M&A Advisory**

Supporting label:

> Advisory workspace

Do not use an actual advisory firm or customer logo.

---

## 22.3 Mocked user

> **Ana Costa**
> Vice President

Avatar:

> **AC**

The user should have sufficient authority to approve material findings, making the Diligence and Valuation screens coherent.

---

## 22.4 Mocked global sidebar

For the pitch screenshot, use the **compact sidebar** to preserve screen width.

Visible controls:

* M&Ai mark;
* Home;
* Deals;
* Organizations;
* Tasks & Approvals;
* Team;
* Help;
* Settings;
* User avatar.

Badge:

> Tasks & Approvals: **3**

The active global parent should be:

> **Deals**

Tooltips should exist in the interactive prototype, but they do not need to appear in the static screenshot.

---

## 22.5 Mocked top bar

### Breadcrumb

> **Deals / Project Horizon / Diligence**

### Search field

> **Search this deal…**

Expanded placeholder for the prototype:

> Search documents, findings, assumptions or decisions

### Right-side controls

* Tasks: **3**
* Notifications: **2**
* **Ask M&Ai**
* Ana Costa avatar

Do not show:

* POV selector;
* Country selector;
* ONNX status;
* Technical model status.

---

## 22.6 Mocked deal context

### Primary identity

> **Project Horizon**

### Organization and side

> Atlas Industrial · Sell-side

### Current phase

> **Due Diligence**

### Supporting indicators

* **Active**
* **Restricted workspace**
* **R$ 480 mi–R$ 520 mi**
* **127 documents**
* **Last synchronized 4 min ago**

Do not name a VDR provider unless the integration is intentionally described as simulated.

A safer label is:

> Document source synchronized 4 min ago

---

## 22.7 Mocked deal navigation

Display:

* Overview
* Dossier
* Documents
* **Diligence**
* Valuation
* Buyer Universe
* Negotiation
* Closing
* More

Active state:

> **Diligence**

The active tab should use:

* Ink Black text;
* Strong underline or bottom border;
* Optional small Signal Orange marker.

Do not use a large pill for every deal tab.

---

## 22.8 Mocked Tasks & Approvals preview

The closed state should show only:

> **3**

The interactive demo may open a preview containing:

> **Approve customer-concentration adjustment**
> Project Horizon · Due today

> **Review EBITDA normalization**
> Project Horizon · Due tomorrow

> **Confirm buyer shortlist**
> Project Aurora · Due Friday

This shows that work is routed across deals.

---

## 22.9 Mocked notifications preview

The interactive demo may include:

> Document synchronization completed
> Project Horizon · 4 min ago

> Daniel Ribeiro mentioned you in a finding
> Project Horizon · 18 min ago

No material approval should exist only as a notification. It must also appear in Tasks & Approvals.

---

## 22.10 Mocked Copilot entry

Button:

> **Ask M&Ai**

Opening it from the Diligence screen should display contextual suggestions:

* Explain this finding;
* Show supporting evidence;
* Compare valuation scenarios;
* Draft a seller information request.

The first visible state should not be an empty chat window.

---

# 23. Pitch-specific simplification

When the shell frames the Diligence Decision Room:

## Keep visible

* Compact M&Ai navigation;
* Deal breadcrumb;
* Search;
* Tasks count;
* Ask M&Ai;
* Project Horizon;
* Due Diligence status;
* Deal navigation;
* Active Diligence tab.

## Hide or minimize

* Institution-switching details;
* Full user menu;
* Help;
* Administration options;
* Complete notification panel;
* More menu contents;
* Long deal metadata;
* Sidebar labels when space is constrained.

## Readability requirement

At deck scale, the viewer should still recognize:

* **Project Horizon**
* **Diligence**
* **Tasks 3**
* **Ask M&Ai**
* **Valuation**
* **Negotiation**
* **Closing**

If these labels are unreadable, the shell is too dense or occupies too little of the slide.

---

# 24. UX prototype flows to validate

## Flow A — Global to deal

```text
Command Center
  ↓
Select Project Horizon
  ↓
Deal Overview
  ↓
Open Diligence
  ↓
Review selected finding
```

## Flow B — Task to exact context

```text
Open Tasks & Approvals
  ↓
Select “Approve customer-concentration adjustment”
  ↓
Project Horizon opens
  ↓
Diligence Decision Room
  ↓
Correct finding preselected
```

## Flow C — Deal switching

```text
Select Project Horizon in header
  ↓
Search Project Aurora
  ↓
Confirm switch
  ↓
Open Project Aurora in equivalent workspace or Overview
```

The application should not silently retain a finding or document from the previous deal.

## Flow D — Contextual Copilot

```text
Open Ask M&Ai from Diligence
  ↓
Current deal and finding inherited
  ↓
Ask for supporting evidence
  ↓
Open cited document
  ↓
Close Copilot
  ↓
Return to unchanged review state
```

## Flow E — Permission restriction

```text
Analyst opens Valuation
  ↓
Can inspect scenario
  ↓
Approve action marked restricted
  ↓
Explanation shows required authority
  ↓
Request approval from Vice President
```

---

# 25. Design validation criteria

The shell design is ready for approval when:

1. A user can distinguish global and deal navigation immediately.
2. The active institution, deal and transaction phase are always clear.
3. Tasks and approvals are visually distinct from notifications.
4. Search scope is explicit.
5. The product can be navigated without technical terminology.
6. Client access is not presented as a casual view toggle.
7. The shell supports permission-restricted and archived states.
8. The global sidebar contains no more than five principal destinations.
9. Deal-level navigation supports buy-side and sell-side terminology.
10. The Copilot is contextual but does not dominate navigation.
11. The design functions in expanded, compact and mobile states.
12. Every icon-only control has an accessible name.
13. The shell leaves sufficient width for analytical workspaces.
14. The pitch mock does not imply real integrations or customers.
15. The same shell can coherently frame every subsequent product screen.

---

# 26. Final design target

The correct design target is not:

> “A visually distinctive sidebar.”

It is:

> **A stable transaction context that lets bankers move from portfolio oversight to deal-specific decisions without losing scope, authority or auditability.**

The shell should become nearly invisible during normal use. Its quality is demonstrated when the user never has to stop and ask:

* Where am I?
* Which deal is this?
* What requires my attention?
* Can I perform this action?
* How do I return to the relevant workflow?

That foundation should remain fixed while every subsequent M&Ai screen is designed.

**Next iteration: Command Center.**
