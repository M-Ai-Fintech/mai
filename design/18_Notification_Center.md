# Notification Center

## 1. Recommended product naming

Use:

* **Top-bar control:** `Notifications`
* **Page title:** `Notification Center`
* **Individual record:** `Notification`
* **Grouped record:** `Notification Bundle`
* **User-directed event:** `Mention`
* **Preference area:** `Notification Preferences`
* **Historical source:** `Activity & Audit`

Notifications should remain a **utility**, not a primary sidebar destination. They report events; **Tasks & Approvals** contains work that requires action and should retain stronger prominence. 

---

# 2. Screen definition

The **Notification Center** is the institution-level inbox for relevant events that occurred across the user’s authorized transactions and workspace.

It records events such as:

* A user mentioning the recipient;
* a document synchronization completing;
* new evidence becoming available;
* an analysis completing;
* a task being assigned;
* an approval being decided;
* a deal changing phase;
* a deliverable being generated;
* access being granted or expiring;
* an integration requiring attention.

It should answer:

1. **What happened since I last checked?**
2. **Which transaction did it affect?**
3. **Who or what caused the event?**
4. **Is there anything I need to do?**
5. **Where can I inspect the exact context?**
6. **Have related events already been grouped?**
7. **Which notifications have I already reviewed?**

Its central interaction is:

> **Event occurs → Relevant user is notified → User opens exact context → Notification is read → Any required work remains in Tasks & Approvals**

---

# 3. Primary intention

## Operational intention

Keep users aware of relevant changes without requiring them to monitor every deal workspace continuously.

## User intention

A banker should be able to say:

> “I understand what changed across my deals and can open the exact document, finding, decision or workflow involved.”

## Product intention

The Notification Center should support awareness without competing with the product’s decision workflow.

The distinction should remain:

| Concept              | Meaning                                                      |
| -------------------- | ------------------------------------------------------------ |
| **Notification**     | Something relevant happened                                  |
| **Task or approval** | The user must perform or decide something                    |
| **System alert**     | Product reliability or security requires immediate attention |
| **Activity record**  | Immutable history of what occurred                           |

These concepts should not be combined into one inbox. 

---

# 4. Strategic product role

The Notification Center is operationally necessary but not a differentiated product surface.

Its value comes from:

* Reducing missed events;
* preserving continuity across parallel transactions;
* linking directly to exact transaction context;
* preventing required work from being buried in email;
* keeping users informed when asynchronous workflows complete;
* providing a controlled bridge between events and action.

The screen should remain simple, predictable and quiet.

It should not attempt to demonstrate M&Ai’s complete analytical capability.

---

# 5. What the Notification Center is not

It should not become:

* A task queue;
* an approval inbox;
* an audit log;
* a chat application;
* an activity feed containing every event;
* a system-observability console;
* a replacement for email;
* a CRM communication history;
* a list of every tool invocation;
* a permanent red badge demanding attention;
* a place for material decisions;
* a social-media feed;
* an unread-count optimization mechanism.

The central question is not:

> “How many notifications can the product generate?”

It is:

> **“Which events are relevant enough to interrupt or inform this user?”**

---

# 6. Relationship to adjacent screens

| Screen                         | Primary responsibility                                  |
| ------------------------------ | ------------------------------------------------------- |
| **Notification Center**        | Records relevant events and awareness updates           |
| **Tasks & Approvals**          | Contains required work and material decisions           |
| **Command Center**             | Prioritizes portfolio attention and transaction changes |
| **Deal Activity & Audit**      | Preserves complete transaction event history            |
| **Documents & VDR**            | Shows document and synchronization detail               |
| **Agentic Workspace**          | Shows complete mission and execution status             |
| **Team Workspace**             | Manages membership and assignment                       |
| **Security & Data Governance** | Manages active security and integration issues          |
| **Profile & Preferences**      | Controls personal notification delivery                 |

The product catalogue defines Notification Center as the screen for system events, mentions, completed analyses and workflow changes. 

---

# 7. Notification versus task

A notification may announce:

> **Valuation treatment assigned to you**

The actual approval belongs in:

> **Tasks & Approvals**

Opening the notification should route directly to that work item.

Marking the notification read must not:

* Complete the task;
* approve the decision;
* change the work-item state;
* dismiss the requirement.

---

# 8. Notification versus audit event

An audit event records what happened whether or not a user needed to know.

A notification is a personalized delivery decision.

Example:

## Audit events

* Spreadsheet synchronized;
* classification job started;
* extraction completed;
* four facts updated;
* dependency analysis completed;
* user opened the result.

## Notification

> **Four approved facts require review after the latest document synchronization.**

Not every audit event should create a notification.

---

# 9. Notification versus system alert

## Notification

> Document-source synchronization completed.

## System alert

> Document-source authorization expired and new evidence cannot be synchronized.

An active system alert may appear:

* In the shell;
* on the affected screen;
* in Integrations;
* in Security administration.

The Notification Center may preserve a record of the alert, but dismissing the notification must not resolve the underlying issue.

---

# 10. Primary users

## Analyst

Needs to know when:

* Documents arrive;
* classifications complete;
* comments or mentions are added;
* requested evidence is submitted;
* reviewed work is returned.

## Associate

Needs to know when:

* A workstream changes;
* evidence affects active findings;
* assigned reviews progress;
* analysts complete preparation;
* external responses arrive.

## Vice President

Needs:

* Material changes;
* completed analyses;
* decisions made by others;
* escalations;
* client responses;
* major workflow transitions.

## Partner or Managing Director

Needs:

* High-materiality decisions;
* transaction-stage changes;
* client approvals;
* closing readiness;
* major exceptions.

## Administrator

Needs:

* Membership events;
* source failures;
* external-access expiry;
* provisioning or integration issues.

---

# 11. Primary job to be done

> When relevant activity occurs across several transactions, inform the appropriate user once, in context, without converting the product into a noisy event stream.

## Secondary jobs

The user should also be able to:

* Review unread events;
* find mentions;
* filter by deal;
* inspect completed analyses;
* open the exact affected object;
* mark notifications read;
* archive irrelevant notifications;
* mute a category or deal;
* review delivery preferences;
* find earlier notifications;
* distinguish information from required action.

---

# 12. Notification sources

Notifications may originate from:

* Human activity;
* document sources;
* M&Ai agents;
* deterministic engines;
* workflow orchestration;
* approvals;
* deal lifecycle;
* external participants;
* access and security systems;
* integrations.

Every notification should preserve:

* Source type;
* triggering actor or system;
* affected object;
* deal or institution context;
* timestamp;
* destination;
* grouping key;
* permission state.

---

# 13. Recommended notification categories

Use a concise taxonomy.

## Mentions & Collaboration

* User mentioned;
* reply received;
* comment resolved;
* review feedback added.

## Documents & Evidence

* Documents synchronized;
* new version detected;
* external submission received;
* processing exception resolved;
* evidence affected approved work.

## Analysis & M&Ai

* Mission completed;
* calculation completed;
* artifact prepared;
* analysis completed with limitations;
* result invalidated.

## Workflow & Decisions

* Task assigned;
* approval decided;
* changes requested;
* milestone completed;
* deal phase changed.

## Access & System

* Access granted;
* access expiring;
* invitation accepted;
* connector requires attention;
* security event relevant to the user.

---

# 14. Notification lifecycle

Recommended lifecycle:

```text
Created
  ↓
Delivered
  ↓
Seen
  ↓
Read
  ↓
Archived
```

Alternative states:

* Delivery delayed;
* bundled;
* redacted;
* suppressed by preference;
* expired;
* withdrawn;
* unavailable after permission change.

---

# 15. Seen versus read

## Seen

The notification was displayed in a preview or list.

## Read

The user deliberately opened it or marked it read.

A top-bar preview should normally mark a notification as **seen**, not automatically read.

This allows the unread state to remain useful without forcing users to open every notification individually.

---

# 16. Read does not mean resolved

A read notification may still reference:

* An open task;
* an unresolved blocker;
* a pending approval;
* an active source failure;
* an unreviewed change.

The notification state should not imply the underlying object state.

Example:

> Notification: Read
> Approval: Awaiting decision

---

# 17. Recommended workspace structure

Use four principal views:

1. **All**
2. **Mentions**
3. **Deal Updates**
4. **System**

Supporting filters handle:

* Documents;
* analysis;
* approvals;
* access;
* completed work.

A fifth view is unnecessary unless usage demonstrates sufficient volume.

---

# 18. Default view: All

The default should show notifications grouped by time:

* Today;
* yesterday;
* earlier this week;
* older.

Within each group, prioritize:

1. Direct mentions;
2. important transaction changes;
3. assigned-work notifications;
4. completed asynchronous work;
5. informational updates.

Unread items appear first only within the relevant time group.

Do not sort every unread event above newer material information indefinitely.

---

# 19. Page header

## Recommended title

> **Notification Center**

Supporting description:

> Mentions, transaction updates and completed workflows across your authorized workspace.

## Header summary

Example:

* **6 unread**
* **2 mentions**
* **3 deal updates**
* **1 system notice**

## Primary action

> **Mark all as read**

## Secondary action

> Notification preferences

“Mark all as read” should not affect any task or approval.

---

# 20. Top-bar preview

The bell opens a compact preview containing approximately five recent notifications.

Recommended structure:

```text
Notifications                         2 unread

Daniel Ribeiro mentioned you
Project Horizon · Customer concentration
18 min ago

Document synchronization completed
Project Horizon · 5 documents updated
42 min ago

Valuation scenario v4 approved
Project Horizon · Approved by Marina Alves
2 h ago

[ Open Notification Center ]
```

The preview should not contain complete filters or preference controls.

---

# 21. Notification-row anatomy

Each notification should contain:

1. Event title;
2. affected deal or institution;
3. concise consequence;
4. actor or source;
5. timestamp;
6. unread state;
7. exact destination;
8. optional related task state.

## Example

> **Customer-revenue workbook changed**

> Project Horizon · Documents

> Three approved facts and one valuation assumption may require review.

> Document source · 09:42

Action:

> Review document changes

---

# 22. Notification-title rules

Titles should describe the event clearly.

Good:

* Daniel Ribeiro mentioned you in a finding;
* five documents were synchronized;
* valuation scenario v4 was approved;
* Northbridge Round 4 was added;
* seller payment instructions changed;
* Project Horizon moved to Negotiation.

Poor:

* New update;
* activity occurred;
* M&Ai has news;
* workflow complete;
* item changed;
* attention required.

---

# 23. Context labels

Every notification should identify its context.

Institution-level:

> Atlas M&A Advisory · Team

Deal-level:

> Project Horizon · Diligence

Organization-level:

> Northbridge Automation · Relationship

System-level:

> Document integration

The context line should never expose technical identifiers.

---

# 24. Exact-context navigation

Notifications should link to the precise object involved.

Examples:

```text
Document changed
  → Project Horizon
  → Documents
  → Customer_Revenue_2025.xlsx
  → Version comparison
```

```text
Approval completed
  → Project Horizon
  → Valuation
  → Scenario v4
  → Approval history
```

```text
Mention
  → Project Horizon
  → Diligence
  → Customer-concentration finding
  → Selected comment
```

Do not route to a generic deal landing page when a specific object exists.

---

# 25. Action-bearing notifications

A notification may contain a contextual action such as:

* Open finding;
* inspect document;
* view decision;
* open task;
* review artifact;
* manage access.

The action should route to the authoritative surface.

Material decisions should never occur directly inside a notification card.

---

# 26. Assignment notifications

When work is assigned:

> **Valuation treatment assigned to you**

Supporting:

> Project Horizon · Due today at 17:00 BRT

Status:

> Approval required

Action:

> Open in Tasks & Approvals

The unread badge may disappear after review.

The approval remains open until a decision is recorded.

---

# 27. Decision notifications

When a decision completes:

> **Customer-concentration treatment approved**

Supporting:

> Approved by Ana Costa · Scenario v4

Consequence:

> Final scenario review is now unblocked.

Action:

> View decision

The notification should not repeat the entire approval package.

---

# 28. Mention notifications

A mention should show:

* Person who mentioned the user;
* location;
* short excerpt;
* deal or object;
* comment state;
* time.

Example:

> **Daniel Ribeiro mentioned you**

> “Can you confirm whether the recurring-revenue definition includes maintenance contracts?”

> Project Horizon · Target Dossier

Action:

> Open comment

---

# 29. Document notifications

Useful document events include:

* Material synchronization completed;
* new version of a used document;
* external request submission received;
* processing failure affecting work;
* permission changed;
* source removed while used downstream.

Avoid notifying users for:

* Every individual file indexed;
* every page extracted;
* every classification event;
* background retries with no consequence.

---

# 30. Analysis notifications

Useful events include:

* Agentic mission completed;
* valuation calculation completed;
* artifact prepared;
* analysis completed with limitations;
* result became stale;
* workflow paused for user input.

Example:

> **Customer-concentration mission completed**

Result:

> Finding and valuation package prepared for review.

Action:

> Open mission result

---

# 31. Deal-lifecycle notifications

Relevant events include:

* Deal created;
* phase changed;
* status changed;
* deal paused;
* negotiation initiated;
* term sheet signed;
* closing authorized;
* legal completion recorded;
* deal archived.

These should normally be delivered only to:

* Assigned deal participants;
* relationship owners;
* watchers;
* required governance roles.

---

# 32. Access notifications

Relevant events include:

* Deal access granted;
* access changed;
* external access expiring;
* invitation accepted;
* membership suspended;
* restricted workstream access removed.

Example:

> **Your Project Horizon access changed**

Previous:

> Financial and Valuation

Current:

> Financial only

Action:

> Review access

Sensitive permission detail should be limited to authorized users.

---

# 33. Notification priority

Use three restrained levels:

## Standard

Informational event.

## Important

Material transaction or workflow change.

## Urgent awareness

Immediate awareness is appropriate, but the underlying action exists elsewhere.

Example:

> Closing authorization was invalidated after payment instructions changed.

## UX rule

Urgency must be based on consequence, not on the event source.

An M&Ai-generated event is not inherently more important than a human event.

---

# 34. Notification batching

Related events should be bundled.

Example:

Instead of five notifications:

* Document A synchronized;
* Document B synchronized;
* Document C synchronized;
* Document D synchronized;
* Document E synchronized.

Use:

> **Five documents were synchronized**

Supporting:

> Three are new and two changed. One approved fact may require review.

Action:

> Review synchronization

---

# 35. Bundle expansion

A notification bundle should show:

* Bundle title;
* number of events;
* time range;
* principal consequence;
* affected objects;
* expansion control.

Expanded detail may list individual events.

The bundle remains one unread unit unless the user explicitly opens individual items.

---

# 36. Duplicate suppression

The system should suppress duplicate notifications caused by:

* Retries;
* integration reconnects;
* repeated agent events;
* duplicated webhook deliveries;
* repeated assignment writes;
* identical comments.

A stable event or idempotency key should prevent duplicate delivery.

---

# 37. Meaningful-change threshold

Notifications should be generated from meaningful workflow events, not every state transition.

Example:

Do not notify:

> Extraction moved from queued to processing.

Notify:

> Two documents could not be processed and evidence review is incomplete.

The product should optimize for signal quality rather than event completeness.

---

# 38. Following and subscriptions

Users may follow:

* A deal;
* finding;
* document;
* valuation scenario;
* negotiation;
* closing event;
* organization relationship.

Following determines notification eligibility.

It does not grant access.

## Subscription levels

* Material changes only;
* mentions and assignments;
* all meaningful updates;
* muted.

---

# 39. Default subscription rules

A user should automatically follow:

* Deals they are assigned to;
* objects they own;
* work they submitted;
* approvals they requested;
* comments where they were mentioned;
* missions they initiated.

They should not automatically follow:

* Every document in an accessible deal;
* every organization they can view;
* every activity by their team;
* every M&Ai execution.

---

# 40. Notification preferences

Preferences should support:

* In-app delivery;
* email delivery;
* mobile push, later;
* category selection;
* deal-specific overrides;
* digest frequency;
* quiet hours;
* mention priority;
* external-access expiry reminders.

Preferences should not allow users to suppress:

* Mandatory security notices;
* critical access events;
* legally required notices;
* policy-defined closing alerts.

---

# 41. Delivery channels

Recommended channels:

## In-app

Canonical and always available.

## Email

Used for:

* Direct mentions;
* important assignments;
* daily digest;
* urgent awareness;
* external approval activity.

## Mobile push

Later, for:

* Direct mention;
* material approval assignment;
* closing-day exception;
* security event.

## UX rule

The Notification Center remains the canonical in-product record even when an email or push message is also delivered.

---

# 42. Digests

Useful digest options:

* Daily morning summary;
* end-of-day summary;
* weekly relationship or portfolio summary.

A digest should contain:

* Unread important events;
* assigned work summary;
* completed workflows;
* upcoming expiries.

It should link back to exact product context.

Tasks themselves remain in Tasks & Approvals.

---

# 43. Quiet hours

Users may define:

* Start and end;
* local time zone;
* weekdays;
* weekend behavior.

Quiet hours delay:

* Email;
* push;
* non-critical reminders.

They should not prevent in-app notification creation.

Critical security or closing events may follow institution policy.

---

# 44. Marking notifications read

Supported actions:

* Mark one as read;
* mark one as unread;
* mark all visible as read;
* mark all as read;
* open and mark read.

“Mark all as read” should require no destructive confirmation because it changes awareness state only.

---

# 45. Archiving

Archiving removes a notification from the default inbox.

It does not:

* Delete the source event;
* complete linked work;
* remove the audit record;
* change the affected object;
* prevent future notifications.

Archived notifications should remain searchable for a retention period.

---

# 46. Muting

Users may mute:

* A notification category;
* a specific deal;
* a followed object;
* a thread.

Before muting a deal, show:

> Required assignments, direct mentions and mandatory alerts will still be delivered.

Do not allow a user to mute notifications that policy marks mandatory.

---

# 47. Search

Search should include:

* Notification title;
* deal;
* organization;
* actor;
* object;
* notification category;
* short content excerpt.

Placeholder:

> Search notifications

Example:

> `customer concentration`

Results may include:

* Document changed;
* finding updated;
* valuation approved;
* user mention.

---

# 48. Filters

Recommended filters:

* Unread;
* category;
* deal;
* actor or source;
* date;
* importance;
* mentions;
* related work state;
* archived.

Useful saved filters:

* Unread;
* mentions;
* Project Horizon;
* approvals completed;
* document updates;
* access notices.

A full saved-view system is unnecessary initially.

---

# 49. Permissions

A notification should never reveal more than the recipient can currently access.

Permissions must apply to:

* Title;
* deal identity;
* organization identity;
* excerpt;
* actor;
* financial values;
* source count;
* destination.

If access is revoked after delivery, the notification should become redacted.

Example:

> **Transaction update unavailable**

> You no longer have access to the underlying workspace.

---

# 50. Side-channel protection

Restricted information must not leak through:

* Notification counts;
* browser titles;
* email subjects;
* push previews;
* actor names;
* excerpts;
* deal codenames;
* object types;
* bundled-event counts.

For a restricted event, use a safe message such as:

> An update occurred in a restricted workspace.

Where policy requires stronger isolation, do not notify the unauthorized user at all.

---

# 51. Email privacy

Email notifications should avoid including:

* Confidential financial values;
* sensitive findings;
* bank details;
* counterparty strategy;
* restricted document excerpts;
* unannounced deal identities.

Prefer:

> A material valuation review requires your attention.

over:

> Project Horizon valuation decreased by R$ 42 mi because Atlas Industrial lost a customer.

The exact context belongs behind authenticated access.

---

# 52. Recommended desktop layout

For a **1440 × 900** canvas:

| Region                  | Approximate width |
| ----------------------- | ----------------: |
| Expanded global sidebar |        240–256 px |
| Filter rail             |        200–240 px |
| Notification list       |        520–640 px |
| Selected detail         |        360–440 px |
| Page padding            |          24–32 px |

Recommended composition:

```text
┌────────┬──────────────────────────────────────────────────────────────┐
│ Global │ Notification Center · 6 unread · 2 mentions                │
│ shell  ├──────────────────────────────────────────────────────────────┤
│        │ All   Mentions   Deal Updates   System                      │
│        ├──────────────┬─────────────────────────┬─────────────────────┤
│        │ Filters      │ Notifications           │ Selected event      │
│        │              │                         │                     │
│        │ Unread  6    │ Daniel mentioned you   │ Customer revenue    │
│        │ Mentions 2   │ Horizon · 18 min        │ workbook changed    │
│        │ Important 3  │                         │                     │
│        │              │ 5 documents synced     │ 3 facts affected    │
│        │ Deals        │ Horizon · 42 min        │ 1 assumption        │
│        │ Horizon      │                         │                     │
│        │ Aurora       │ Valuation v4 approved  │ [ Review changes ]  │
│        │ Atlas        │ Horizon · 2 h           │                     │
└────────┴──────────────┴─────────────────────────┴─────────────────────┘
```

---

# 53. Selected-notification detail

The detail panel should show:

* Complete event summary;
* deal and workspace;
* actor or source;
* timestamp;
* consequence;
* related objects;
* linked task, when applicable;
* destination;
* notification-delivery history, optionally.

It should not reproduce the complete authoritative screen.

---

# 54. Mobile behavior

Mobile should prioritize:

1. Unread;
2. mentions;
3. important deal updates;
4. system notices;
5. earlier events.

Notification cards should show:

* Title;
* context;
* consequence;
* time;
* unread state;
* primary link.

The selected event opens full screen.

Swipe actions may support:

* Mark read;
* archive.

Do not use swipe to approve, complete or resolve work.

---

# 55. Accessibility requirements

The Notification Center should support:

* Semantic notification list;
* correct unread announcement;
* keyboard navigation;
* visible focus;
* no color-only unread or priority state;
* descriptive destination links;
* accessible timestamps;
* minimum 44 × 44 px controls;
* announced notification arrival without excessive interruption;
* accessible bundle expansion;
* focus preservation after marking read;
* reduced motion;
* clear distinction between notification and required task.

Use:

> Open customer-revenue changes in Project Horizon

not:

> Open

---

# 56. System states

## No notifications

> **No recent notifications**

Supporting:

> Mentions and meaningful transaction updates will appear here.

Do not use celebratory language.

## No unread notifications

> **You have reviewed all notifications**

Older events remain available below.

## Loading

Use stable row skeletons.

## Partial failure

> **Some notification details are unavailable**

The remaining inbox stays usable.

## Destination removed

> The referenced object was removed or superseded.

Show its replacement where available.

## Access revoked

Redact the content and disable navigation.

## Offline

Allow cached notification review.

Disable:

* Marking read synchronization;
* archiving;
* preference changes;
* opening uncached destination content.

## Delivery delayed

> Email delivery is delayed. In-app notifications remain current.

## Integration failure

Link to the active system alert rather than presenting the notification as resolution.

---

# 57. Figma component architecture

## `NotificationControl`

Properties:

* No unread;
* unread;
* important;
* system alert linked;
* loading.

## `NotificationPreview`

States:

* Populated;
* empty;
* loading;
* partial error.

## `NotificationCenterHeader`

Properties:

* Unread;
* mentions;
* system;
* all read.

## `NotificationTabs`

* All;
* mentions;
* deal updates;
* system.

## `NotificationFilterRail`

States:

* Default;
* filtered;
* collapsed;
* mobile.

## `NotificationList`

States:

* Populated;
* grouped;
* filtered;
* empty;
* loading;
* partial error.

## `NotificationRow`

Properties:

* Unread;
* read;
* mention;
* important;
* urgent awareness;
* bundled;
* redacted;
* archived.

## `NotificationCategory`

* Collaboration;
* documents;
* analysis;
* workflow;
* access;
* system.

## `NotificationBundle`

Properties:

* Collapsed;
* expanded;
* unread;
* mixed state.

## `NotificationDetail`

Properties:

* Human event;
* document event;
* M&Ai event;
* workflow event;
* access event;
* system event;
* redacted.

## `NotificationDestination`

Properties:

* Available;
* superseded;
* deleted;
* restricted;
* task-linked.

## `NotificationPreferences`

Properties:

* In-app;
* email;
* digest;
* quiet hours;
* mandatory;
* deal override.

---

# 58. Production object model

## `Notification`

```text
id
institutionId
recipientMembershipId
category
notificationType
title
summary
importance
actorType
actorId
sourceEventId
contextType
contextId
dealId
organizationId
destinationType
destinationId
destinationVersion
relatedWorkItemId
groupingKey
state
createdAt
deliveredAt
seenAt
readAt
archivedAt
expiresAt
```

## `NotificationBundle`

```text
id
recipientMembershipId
groupingKey
category
title
summary
notificationIds
eventCount
importance
firstEventAt
lastEventAt
state
createdAt
```

## `NotificationDelivery`

```text
id
notificationId
channel
deliveryState
destination
attemptCount
sentAt
deliveredAt
failedAt
failureReason
createdAt
```

## `NotificationPreference`

```text
id
membershipId
category
notificationType
inAppEnabled
emailEnabled
pushEnabled
digestMode
importanceThreshold
quietHoursPolicyId
updatedAt
```

## `NotificationSubscription`

```text
id
membershipId
scopeType
scopeId
subscriptionLevel
sourceType
effectiveFrom
effectiveTo
createdAt
```

## `NotificationEvent`

```text
id
eventType
actorType
actorId
institutionId
dealId
objectType
objectId
objectVersion
summary
materiality
occurredAt
idempotencyKey
```

The notification record should reference the underlying event rather than duplicating its complete audit payload.

---

# 59. Suggested routes

Primary:

```text
/notifications
```

Mentions:

```text
/notifications?view=mentions
```

Deal updates:

```text
/notifications?view=deal-updates
```

System:

```text
/notifications?view=system
```

Selected notification:

```text
/notifications/:notificationId
```

Filtered by deal:

```text
/notifications?deal=:dealId
```

Preferences:

```text
/settings/profile?section=notifications
```

The bell should open a preview rather than navigating immediately.

---

# 60. API direction

Recommended endpoints:

```text
GET    /api/notifications
GET    /api/notifications/unread-count
GET    /api/notifications/:id
POST   /api/notifications/:id/seen
POST   /api/notifications/:id/read
POST   /api/notifications/:id/unread
POST   /api/notifications/:id/archive
POST   /api/notifications/read-all

GET    /api/notification-preferences
PATCH  /api/notification-preferences
POST   /api/notification-subscriptions
PATCH  /api/notification-subscriptions/:id
DELETE /api/notification-subscriptions/:id
```

Notification creation should be event-driven and idempotent.

The client should not create material workflow notifications independently.

---

# 61. Repository direction

The current repository already contains a basic notification domain with:

* Notification type;
* title;
* body;
* optional deal reference;
* creation date;
* read state.

That is sufficient for the first top-bar preview but not for a durable Notification Center.

## Keep

* Existing notification retrieval;
* unread state;
* deal references;
* top-bar badge;
* current user scoping;
* loading and empty states.

## Add

* Structured categories;
* actor and source;
* exact object destination;
* bundles;
* seen versus read;
* importance;
* archive state;
* delivery channels;
* user preferences;
* subscriptions;
* redaction after access changes;
* idempotent event processing;
* relationship to tasks and approvals.

## Reframe current types

Current broad types such as:

* Deal;
* engine;
* document;
* system;

should become user-facing categories and event subtypes.

Avoid the banker-facing term:

> Engine notification

Use:

> Valuation completed

or:

> Risk analysis completed

## Critical boundary

A notification may reference a `WorkItem`, but must never become the canonical task or approval record.

---

# 62. What not to include

Avoid:

* Notifications in primary sidebar navigation;
* notifications and tasks merged together;
* every backend event;
* raw agent or engine names;
* raw integration errors;
* unread counts designed to remain permanently high;
* blind decisions inside notifications;
* marking read completing work;
* deleting source activity when archived;
* multiple notifications for retries;
* full sensitive financial content in email;
* restricted deal names in push previews;
* automatic subscriptions to every accessible object;
* social-media-style engagement;
* employee activity surveillance;
* real client information in fixtures.

---

# 63. MOCKED — Product and demo specification

## Purpose

The mocked Notification Center should demonstrate disciplined awareness routing rather than product differentiation.

Its narrative is:

> **M&Ai keeps transaction teams informed about meaningful changes while routing required actions into a separate governed workflow.**

This screen is suitable for:

* Shell demonstration;
* operational walkthrough;
* asynchronous workflow demo;
* showing the distinction between events and actions.

It should not be used as a principal pitch image. Notifications, Team and Settings are operationally necessary but weak for the deck. 

---

# 64. Mocked shell state

Institution:

> **Atlas M&A Advisory**

User:

> **Ana Costa · Vice President**

Breadcrumb:

> Notifications

Top bar:

* Search;
* Tasks: **3**;
* Notifications: **6**;
* Ask M&Ai;
* Ana Costa.

Global sidebar:

* Home;
* Deals;
* Organizations;
* Tasks & Approvals;
* Team.

Notifications remain a top-bar utility.

---

# 65. Mocked notifications

## Unread mention

> **Daniel Ribeiro mentioned you**

> “Can you confirm whether maintenance contracts are included in recurring revenue?”

> Project Horizon · Target Dossier
> 18 min ago

Action:

> Open comment

---

## Document update

> **Five documents were synchronized**

> Three new documents and two updated versions. One approved customer-concentration fact may require review.

> Project Horizon · Documents
> 42 min ago

Action:

> Review changes

---

## Approval completed

> **Valuation treatment approved**

> Scenario v4 treatment approved by Marina Alves. Final scenario review is now unblocked.

> Project Horizon · Valuation
> 2 h ago

Action:

> View decision

---

## External response

> **Tax information request updated**

> Target management submitted two of three requested supporting documents.

> Project Horizon · Documents
> 3 h ago

Action:

> Review submission

---

## Deal update

> **Project Aurora moved to Buyer Universe**

> Initial buyer criteria were approved.

> Project Aurora · 4 h ago

Action:

> Open Buyer Universe

---

## System notice

> **External counsel access expires in seven days**

> Camila Nunes · Project Atlas · Legal workstream

Action:

> Review access

---

# 66. Mocked selected notification

Title:

> **Five documents were synchronized**

Context:

> Project Horizon · Documents

Source:

> Secure document source

Completed:

> 28 July 2026 · 09:42 BRT

Changes:

* 3 new documents;
* 2 updated versions;
* 1 approved Dossier fact affected;
* 1 valuation assumption marked for review.

Related work:

> One review task was assigned to Felipe Rocha.

Primary action:

> **Review document changes**

Secondary:

> Open task

---

# 67. Recommended static composition

```text
┌──────────────────────────────────────────────────────────────────┐
│ Notification Center · 6 unread · 2 mentions                     │
├───────────────────────────────┬──────────────────────────────────┤
│ Recent notifications          │ Selected update                  │
│                               │                                  │
│ Daniel mentioned you          │ 5 documents synchronized         │
│ Horizon · 18 min              │ Project Horizon                  │
│                               │                                  │
│ 5 documents synchronized      │ 3 new · 2 changed                │
│ Horizon · 42 min              │                                  │
│                               │ 1 approved fact affected         │
│ Valuation treatment approved  │ 1 assumption needs review       │
│ Horizon · 2 h                 │                                  │
│                               │ Related task                     │
│ Tax request updated           │ Assigned to Felipe Rocha         │
│ Horizon · 3 h                 │                                  │
│                               │ [ Review document changes ]      │
└───────────────────────────────┴──────────────────────────────────┘
```

This composition demonstrates context and exact routing, but it should remain outside the primary pitch narrative.

---

# 68. Recommended demo flows

## Flow A — Mention

```text
Notification bell
  ↓
Daniel mentioned you
  ↓
Open notification
  ↓
Exact Dossier comment selected
  ↓
Reply
```

## Flow B — Event to task

```text
Document synchronization notification
  ↓
Open changed document
  ↓
Affected facts shown
  ↓
Open linked review task
  ↓
Tasks & Approvals
```

## Flow C — Completed analysis

```text
Mission completed notification
  ↓
Open Agentic Workspace result
  ↓
Review citations
  ↓
Open proposed Valuation scenario
```

## Flow D — Decision awareness

```text
Approval completed notification
  ↓
Open decision history
  ↓
Review downstream state change
```

## Flow E — Access expiry

```text
External access expiry notification
  ↓
Open Deal Team & Access
  ↓
Review continuing need
  ↓
Extend or revoke
```

---

# 69. UX prototype tasks to validate

Test whether users can:

1. Find unread notifications.
2. distinguish a notification from a task.
3. find every direct mention.
4. open the exact referenced comment.
5. understand why a document notification matters.
6. open the linked review task.
7. find a completed analysis.
8. inspect an approval completed by another user.
9. mark all notifications read without changing work state.
10. archive an informational notification.
11. mute routine updates for one deal.
12. find an older notification.
13. identify a redacted notification after access loss.
14. change email-digest preferences.
15. distinguish an active system alert from its notification record.

---

# 70. Design validation criteria

The Notification Center is ready when:

1. Notifications remain separate from Tasks & Approvals.
2. Notifications remain separate from audit history.
3. Active system alerts remain separately resolvable.
4. Marking read never completes work.
5. Archiving never removes the source event.
6. Every notification identifies its context.
7. Every actionable notification links to exact context.
8. Material decisions do not occur inside notifications.
9. Related events can be bundled.
10. Retries do not create duplicates.
11. Low-level system events are suppressed.
12. Direct mentions remain easy to find.
13. Notification priority is explainable.
14. Permission changes redact prior content where required.
15. Restricted information does not leak through email or push.
16. User preferences support category and channel control.
17. Mandatory security events cannot be muted.
18. The top-bar preview remains compact.
19. The full screen remains usable with high event volume.
20. Mobile supports review, read state and navigation.
21. Accessibility does not rely on color for unread state.
22. The screen feels quiet and operational rather than social.
23. The pitch fixture remains fictional.
24. Every notification has a clear destination or explanation.

---

# 71. Final design target

The correct design target is not:

> “A feed of everything that happened in M&Ai.”

It is:

> **A quiet, permission-aware event inbox that tells each user what changed, why it matters and where to inspect it—without confusing awareness with required action.**

Its defining interaction is:

> **Receive the relevant event → understand its context → open the exact affected object → continue the transaction workflow**

**Next iteration: Global Search.**
