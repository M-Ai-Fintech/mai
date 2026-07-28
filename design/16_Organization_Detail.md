# Organization Detail

## 1. Recommended product naming

Use:

* **Page title:** Organization display name
* **Object type:** `Organization`
* **Formal company record:** `Legal Entity`
* **Institution relationship:** `Relationship`
* **Individual person:** `Contact`
* **Deal participation:** `Transaction Role`
* **Identity workflow:** `Identity Review`
* **Historical record:** `Organization History`

Example header:

> **Northbridge Automation**
> Northbridge Automation, Inc. · Operating company · United States

Do not title the page:

> Entity Details

The global Organizations workspace locates the canonical institutional record. Organization Detail explains the identity, relationship, contacts and transaction history of that record. The product architecture explicitly defines this as a separate MVP screen and distinguishes it from the deal-specific Target Dossier. 

---

# 2. Screen definition

**Organization Detail** is the institution-level workspace for understanding and maintaining one reusable company, fund, advisory firm, financial institution or other institutional counterparty.

It combines:

* Recognized organization identity;
* formal legal entities;
* registrations and identifiers;
* aliases and domains;
* corporate-group structure;
* institutional relationship;
* relationship ownership;
* associated contacts;
* active and historical transaction roles;
* organization-level documents and references;
* identity-review state;
* conflicts and access restrictions;
* record provenance;
* material change history.

It should answer:

1. **Which organization does this record represent?**
2. **Which exact legal entities belong to it?**
3. **What is the institution’s relationship with it?**
4. **Who owns that relationship?**
5. **Which contacts are current and relevant?**
6. **Which authorized transactions involve this organization?**
7. **What role does it play in each deal?**
8. **Are there identity, conflict or duplicate concerns?**
9. **Which information is current, stale or restricted?**
10. **Can this organization be safely associated with another transaction?**

Its central operating sequence is:

> **Confirm identity → Understand relationship → Review people and transaction history → Resolve restrictions → Reuse in the correct deal context**

---

# 3. Primary intention

## Operational intention

Provide a reliable institutional record that can be reused across transactions without copying deal-specific evidence, interpretations or diligence conclusions between deals.

## User intention

A banker should be able to say:

> “I know which organization this is, who we know there, how we have worked with it and which transactions currently involve it.”

## Product intention

Organization Detail should form part of M&Ai’s institutional memory while preserving transaction isolation.

The organization is reusable.

The transaction evidence is not.

The intended organization-to-deal flow is:

> Open organization → Review identity, contacts and prior relationships → Create or associate a deal → Assign transaction role → Create a deal-specific Target Dossier. 

---

# 4. Strategic product role

Organization Detail is transaction infrastructure rather than a principal product hero.

It is essential for:

* Correct deal setup;
* corporate identity resolution;
* relationship continuity;
* duplicate prevention;
* conflict detection;
* contact reuse;
* buyer and target universe construction;
* counterparty governance;
* institutional knowledge;
* permission-aware transaction history.

Without this screen, users are likely to reconstruct the same organization repeatedly inside separate deals.

That creates:

* Duplicate records;
* inconsistent legal names;
* conflicting identifiers;
* fragmented relationship ownership;
* missing historical context;
* unsafe cross-deal copying;
* unreliable matching;
* incomplete conflict checks.

The page should therefore feel like a canonical institutional record—not a lightweight profile card.

---

# 5. What Organization Detail is not

The screen should not become:

* A Target Dossier;
* a generic CRM account page;
* a public-company profile;
* a sales opportunity record;
* a market-data terminal;
* a company-research database;
* a complete KYC or AML platform;
* a legal-entity-management product;
* a contact list;
* a deal pipeline;
* a buyer-scoring page;
* a collection of public-news articles;
* a cross-deal diligence repository;
* a document dump;
* an unrestricted relationship timeline;
* an AI-generated company biography.

The central question is not:

> “What can the internet tell us about this company?”

It is:

> **“What is the institution’s authoritative understanding of this organization, and how may that record be used safely in transaction workflows?”**

---

# 6. Relationship to adjacent screens

| Screen                       | Primary responsibility                           |
| ---------------------------- | ------------------------------------------------ |
| **Organizations**            | Browse and locate canonical organization records |
| **Organization Detail**      | Inspect and maintain one organization            |
| **Contact Detail**           | Maintain one individual and employment history   |
| **New Deal Setup**           | Assign organizations to transaction roles        |
| **Target Dossier**           | Maintain deal-specific target facts and evidence |
| **Buyer or Target Universe** | Assess the organization for one transaction      |
| **Deal Overview**            | Summarize its participation in one deal          |
| **Documents & Evidence**     | Store transaction-specific documents             |
| **Tasks & Approvals**        | Route identity, association and conflict reviews |
| **Global Search**            | Find the organization from any relevant term     |
| **Activity & Audit**         | Preserve institution- and deal-level actions     |

---

# 7. Organization Detail versus Target Dossier

This boundary is fundamental.

## Organization Detail contains

* Display name;
* legal entities;
* registration identifiers;
* corporate group;
* organization type;
* general industry classification;
* institutional relationship;
* relationship owner;
* contacts;
* transaction-role history;
* organization-level restrictions;
* identity provenance.

## Target Dossier contains

* Deal-specific business understanding;
* approved revenue;
* adjusted EBITDA;
* ownership interpretation;
* products and markets;
* management assessment;
* operational facts;
* material customers;
* VDR evidence;
* diligence findings;
* transaction assumptions;
* valuation inputs;
* open questions.

## Example

Organization Detail may state:

> **Atlas Industrial**
> Operating company · Brazil
> Current client · Relationship owned by Ana Costa

Project Horizon’s Target Dossier may state:

> LTM revenue: R$ 310,4 mi
> Adjusted EBITDA: R$ 57,8 mi
> Top-three customer concentration: 41,2%

Those financial and diligence facts must not automatically become global organization attributes.

The architecture explicitly requires the Target Dossier to remain deal-specific because evidence, assumptions, permissions and interpretations may differ across transactions. 

---

# 8. Organization versus legal entity

The page should distinguish the business-level organization from its jurisdiction-specific legal entities.

## Organization

> **Northbridge Automation Group**

Represents:

* Recognized business group;
* institutional relationship;
* contacts;
* group structure;
* transaction history.

## Legal entities

* Northbridge Automation, Inc.;
* Northbridge Brasil Tecnologia Ltda.;
* Northbridge Europe GmbH;
* Northbridge Acquisition Vehicle I LLC.

Each legal entity may have:

* Legal name;
* entity type;
* jurisdiction;
* registration identifiers;
* operating status;
* effective dates;
* source;
* review state.

## UX principle

The page must not imply that one organization always has:

* One CNPJ;
* one tax identifier;
* one country;
* one transaction participant.

---

# 9. Organization versus Contact

Organization Detail may show people connected to the organization, but the individual record remains separate.

## Organization-level view

> **Sofia Mendes**
> Head of Corporate Development
> Primary transaction contact

## Contact Detail

Contains:

* Full employment history;
* contact methods;
* role history;
* organization changes;
* deal participation;
* communication restrictions;
* relationship ownership;
* source provenance.

## UX rule

Changing a contact’s employer must not erase their historical role in a prior transaction.

---

# 10. Organization versus transaction role

An organization’s role depends on the deal.

Example:

| Deal              | Role                    |
| ----------------- | ----------------------- |
| Project Horizon   | Buyer candidate         |
| Project Meridian  | Buyer                   |
| Project Northstar | Commercial counterparty |
| Project Cedar     | Historical target       |

Therefore, the page should never globally describe:

> Northbridge Automation · Buyer

Use:

> Operating company
> Active transaction role: Buyer candidate in Project Horizon

Buyer, seller and target must remain deal-specific roles rather than permanent global categories.

---

# 11. Organization versus institutional relationship

Transaction role and institutional relationship are independent.

Example:

> **Institutional relationship:** Established counterparty
> **Project Horizon role:** Buyer candidate

Another organization may be:

> **Institutional relationship:** Current client
> **Project Horizon role:** Target

The screen should never infer that:

* Every target is a client;
* every buyer is a counterparty;
* every advisor is an external service provider;
* every historical deal creates a current relationship.

---

# 12. Primary users

## 12.1 Analyst

Needs to:

* Confirm identity;
* review legal entities;
* add aliases;
* validate identifiers;
* associate contacts;
* inspect prior transaction roles;
* prepare identity reviews.

## 12.2 Associate

Needs to:

* Resolve conflicting identity data;
* verify organization structure;
* review deal associations;
* maintain contacts;
* coordinate relationship records;
* identify possible duplicates.

## 12.3 Vice President

Needs to:

* Understand the institutional relationship;
* identify relevant senior contacts;
* review active deal involvement;
* evaluate conflict state;
* add the organization to transactions;
* assign relationship ownership.

## 12.4 Managing Director or Partner

Needs:

* Relationship context;
* prior mandates;
* senior contacts;
* transaction exposure;
* sensitive restrictions;
* current relationship owner;
* meaningful history.

## 12.5 Deal administrator

Needs to:

* Maintain canonical identity;
* merge duplicates;
* archive obsolete records;
* correct classifications;
* import organization data;
* resolve invalid associations.

## 12.6 Compliance or conflicts reviewer

Needs to:

* Inspect formal identity;
* review restrictions;
* record review scope;
* approve or reject associations;
* preserve privileged details.

Administrative access must not automatically expose restricted transaction content.

---

# 13. Primary job to be done

> When a banker opens a company or institutional counterparty, provide the complete reusable identity and relationship context needed to reuse it safely in a transaction.

## Secondary jobs

The user should also be able to:

* Verify the organization;
* inspect exact legal entities;
* find identifiers;
* review corporate-group structure;
* find relevant contacts;
* identify the relationship owner;
* see active deals;
* see historical transaction roles;
* add the organization to an existing deal;
* create a new deal;
* request identity review;
* resolve a possible duplicate;
* inspect conflicts;
* add an organization-level document;
* review material identity changes;
* archive or restore the record.

---

# 14. Core conceptual model

The page should separate seven layers.

## Layer 1 — Recognized identity

The name bankers use.

## Layer 2 — Formal identity

Legal entities, identifiers and jurisdictions.

## Layer 3 — Corporate structure

Parents, subsidiaries, funds, vehicles and affiliates.

## Layer 4 — Institutional relationship

How the advisory institution relates to the organization.

## Layer 5 — People

Contacts, roles and relationship ownership.

## Layer 6 — Transaction participation

Authorized active and historical deal roles.

## Layer 7 — Governance

Identity review, conflicts, restrictions, provenance and audit.

---

# 15. Organization lifecycle

Recommended states:

## Draft

Basic record created but not reviewed.

## Active

Available for ordinary institutional and deal use.

## Needs review

Material identity or relationship information requires validation.

## Duplicate review

Another record may represent the same organization.

## Restricted

The record or selected fields have limited visibility.

## Inactive

The organization is no longer operating or relevant, but history remains.

## Merged

The record redirects to a canonical organization.

## Archived

Removed from normal use while preserving references.

---

# 16. Recommended page architecture

The Organization Detail screen should contain eight principal tabs:

1. **Overview**
2. **Identity & Structure**
3. **Relationships**
4. **Contacts**
5. **Deals**
6. **Documents & References**
7. **Risks & Restrictions**
8. **History**

For the MVP, **Risks & Restrictions** may be permission-controlled and hidden where the user lacks authority.

## Overview

Concise institutional summary.

## Identity & Structure

Formal company and corporate-group information.

## Relationships

Institutional relationship, ownership and meaningful history.

## Contacts

Associated people and employment context.

## Deals

Permission-aware transaction participation.

## Documents & References

Organization-level evidence and provenance.

## Risks & Restrictions

Identity concerns, conflicts and access restrictions.

## History

Material changes and record decisions.

---

# 17. Page header

## Recommended composition

> **Northbridge Automation**

Supporting line:

> Northbridge Automation, Inc. · Operating company · United States

Status strip:

* **Established counterparty**
* **Identity reviewed**
* **1 active deal**
* **No identified conflict**
* **Relationship owner: Marina Alves**

## Primary action

Adapt to context:

* **Create deal**
* **Add to deal**
* **Resolve identity review**
* **Review duplicate**
* **Open active deal**

## Secondary actions

* Add contact;
* edit organization;
* request review;
* more actions.

## Header rule

Do not display more than one primary and two visible secondary actions.

Archive, merge and restriction controls belong in the overflow menu.

---

# 18. Organization identity header

The header identity should include:

* Display name;
* formal legal name;
* primary organization type;
* headquarters or primary country;
* optional restrained logo or initials;
* restricted state;
* merged or archived state.

## Example

> **Northbridge Automation**
> Northbridge Automation, Inc.
> Industrial automation · United States

Logo treatment:

* Maximum 40–48 px;
* neutral background;
* initials fallback;
* never dominant.

---

# 19. Summary strip

Recommended summary controls:

| Summary                    | Example                  |
| -------------------------- | ------------------------ |
| Institutional relationship | Established counterparty |
| Active deals               | 1                        |
| Current contacts           | 4                        |
| Identity state             | Reviewed                 |
| Conflict state             | No identified conflict   |
| Last meaningful update     | 25 July 2026             |

The controls should route to their corresponding tabs.

Avoid an opaque overall:

> Organization health: 91%

---

# 20. Overview composition

The Overview should contain six modules:

1. **Organization summary**
2. **Institutional relationship**
3. **Active transaction participation**
4. **Key contacts**
5. **Corporate structure**
6. **Attention required**

Recommended supporting module:

7. **Recent meaningful history**

---

# 21. Organization summary

Recommended content:

* Display name;
* legal name;
* organization type;
* operating status;
* primary industry;
* headquarters;
* website;
* parent group;
* identity-review state.

## Example

> **Northbridge Automation**

> Industrial automation and monitoring-software company headquartered in the United States.

Formal identity:

> Northbridge Automation, Inc.

Parent:

> Northbridge Automation Group

Identity:

> Reviewed 22 July 2026

## UX rule

The description should be a reviewed institutional summary.

An AI-generated description should begin as:

> Suggested description · Review required

---

# 22. Attention required

The Overview should surface only material organization-level issues.

Examples:

* Identity review due;
* possible duplicate;
* missing relationship owner;
* potential conflict;
* inactive legal entity used in an active deal;
* stale contact;
* parent organization changed;
* conflicting tax identifiers;
* restricted active transaction.

## Example

> **1 item requires attention**

> Brazilian subsidiary registration status has not been reviewed since March 2025.

Primary action:

> Review legal entity

---

# 23. Identity & Structure tab

Recommended sections:

1. Organization identity;
2. names and aliases;
3. legal entities;
4. identifiers;
5. domains;
6. jurisdictions;
7. corporate-group structure;
8. industry classifications;
9. identity reviews;
10. field provenance.

This tab should support controlled editing.

---

# 24. Recognized organization identity

Recommended fields:

* Display name;
* short name;
* legal-name summary;
* primary organization type;
* operating status;
* primary industry;
* description;
* headquarters;
* website;
* primary domain;
* parent group.

Each field should show:

* Current value;
* review state;
* source;
* last updated;
* edit permission.

---

# 25. Display name

The display name should optimize banker recognition.

Example:

> **Northbridge Automation**

It may differ from the legal name:

> Northbridge Automation, Inc.

Changing the display name should not modify:

* Legal identity;
* identifiers;
* existing citations;
* historical transaction records.

---

# 26. Names and aliases

Alias types:

* Trade name;
* abbreviated name;
* previous legal name;
* local-language name;
* internal shorthand;
* imported name;
* former parent brand.

## Example

| Name                           | Type                | State          |
| ------------------------------ | ------------------- | -------------- |
| Northbridge Automation         | Display name        | Current        |
| Northbridge Automation, Inc.   | Legal name          | Current        |
| North Bridge Automation        | Common variant      | Reviewed alias |
| Northbridge Industrial Systems | Previous trade name | Historical     |

Aliases should improve search and duplicate detection.

They should not become separate canonical records.

---

# 27. Legal-entity registry

Recommended columns:

1. Legal entity;
2. entity type;
3. jurisdiction;
4. operating status;
5. principal identifier;
6. role in group;
7. review state;
8. active deal use.

## Example

| Legal entity                          | Jurisdiction  | Status   | Use              |
| ------------------------------------- | ------------- | -------- | ---------------- |
| Northbridge Automation, Inc.          | United States | Active   | Project Horizon  |
| Northbridge Brasil Tecnologia Ltda.   | Brazil        | Active   | No active deal   |
| Northbridge Europe GmbH               | Germany       | Active   | Historical       |
| Northbridge Acquisition Vehicle I LLC | United States | Inactive | Project Meridian |

---

# 28. Legal-entity detail

Selecting a legal entity should show:

* Legal name;
* entity type;
* jurisdiction;
* incorporation date;
* operating status;
* registration identifiers;
* registered address;
* parent;
* effective dates;
* source;
* identity review;
* deal associations.

## Primary actions

* Edit legal entity;
* review identity;
* use in deal;
* mark inactive;
* add identifier.

---

# 29. Legal identifiers

Recommended fields:

* Identifier type;
* masked or full value depending on permission;
* jurisdiction;
* issuing authority;
* verification state;
* source;
* reviewed date;
* effective status.

Examples:

* CNPJ;
* EIN;
* company-registration number;
* LEI;
* fund registration;
* regulatory identifier.

## UX rule

Use jurisdiction-appropriate terminology.

Do not label every identifier:

> Tax ID

---

# 30. Identifier display

For ordinary directory use:

> CNPJ: 12.345.678/0001-••

Authorized identity reviewers may reveal the complete value.

Exact search should still resolve the record.

Sensitive identifiers should not appear in:

* Unrestricted exports;
* Copilot answers;
* notifications;
* pitch fixtures.

---

# 31. Domains and digital identity

Display:

* Primary website;
* verified primary domain;
* subsidiary domains;
* historical domains;
* unverified domains;
* source.

Example:

| Domain                         | Type       | State    |
| ------------------------------ | ---------- | -------- |
| northbridge-automation.example | Primary    | Verified |
| northbridge.com.br.example     | Subsidiary | Verified |
| northbridge-industrial.example | Historical | Inactive |

A shared domain is a duplicate signal, not conclusive identity proof.

---

# 32. Corporate-group structure

The structure should support:

* Parent;
* subsidiary;
* portfolio company;
* fund;
* general partner;
* acquisition vehicle;
* affiliate;
* joint venture;
* branch;
* predecessor;
* successor.

## Recommended tree

```text
Northbridge Automation Group
├── Northbridge Automation, Inc.
├── Northbridge Brasil Tecnologia Ltda.
├── Northbridge Europe GmbH
└── Northbridge Acquisition Vehicle I LLC
```

Each node should show:

* Organization or legal entity;
* relationship;
* jurisdiction;
* status;
* permission state.

---

# 33. Group-relationship detail

Recommended fields:

* Parent object;
* child object;
* relationship type;
* ownership percentage, where known;
* effective date;
* end date;
* source;
* review state.

Example:

> Northbridge Automation Group
> owns 100% of Northbridge Brasil Tecnologia Ltda.
> Source: Corporate registration extract
> Reviewed 22 July 2026

---

# 34. Structure uncertainty

Where ownership is incomplete:

> **Ownership percentage not confirmed**

or:

> **Potential affiliate · Review required**

Do not infer formal control from:

* Shared branding;
* common directors;
* common domain;
* public descriptions alone.

---

# 35. Industry classification

Display:

* Primary industry;
* secondary industries;
* institution taxonomy;
* classification state;
* source;
* last review.

Example:

> Primary: Industrial automation
> Secondary: Monitoring software; predictive maintenance

State:

> Analyst reviewed

The page should not become a detailed company operating profile. That belongs in a transaction-specific Dossier when relevant.

---

# 36. Identity review

An identity review should record:

* Review type;
* scope;
* source references;
* reviewed fields;
* reviewer;
* date;
* expiry;
* decision;
* unresolved items.

## Example

> **Corporate identity review**

Scope:

* Legal name;
* registration;
* operating status;
* parent relationship;
* primary domain.

Completed:

> 22 July 2026

Reviewer:

> Felipe Rocha

Next review:

> July 2027

---

# 37. Identity-review terminology

Use:

* Identity reviewed;
* identity review required;
* identity information incomplete;
* registration conflict;
* review expired.

Avoid:

> KYB approved

unless the product implements a formally scoped and authorized KYB process.

A broad green “approved” state can imply legal or compliance assurance beyond the system’s actual function.

---

# 38. Relationships tab

The Relationships tab should explain the institution’s relationship with the organization.

Recommended sections:

1. Relationship summary;
2. relationship ownership;
3. relationship classifications;
4. current mandates;
5. prior mandates;
6. meaningful interactions;
7. restrictions;
8. relationship history.

---

# 39. Relationship summary

Example:

> **Established counterparty**

Relationship since:

> 2023

Primary owner:

> Marina Alves

Executive sponsor:

> Roberto Lima

Active mandate relationship:

> Buyer candidate in Project Horizon

Historical relationship:

> Buyer in Project Meridian

## UX rule

Do not describe the organization as:

> Highly engaged

based on message volume or email activity.

---

# 40. Relationship classifications

An organization may have multiple classifications over time.

Examples:

* Current client;
* historical client;
* prospective client;
* established counterparty;
* professional advisor;
* financing source;
* service provider;
* referral relationship;
* restricted relationship.

Each classification should have:

* State;
* effective dates;
* source;
* owner;
* visibility.

---

# 41. Relationship ownership

Recommended fields:

* Primary relationship owner;
* secondary owner;
* executive sponsor;
* originating banker;
* specialist owner;
* effective dates.

## Example

> **Primary relationship owner**

> Marina Alves · Managing Director

Since:

> 14 March 2023

Secondary:

> Ana Costa · Vice President

## Change action

> Transfer relationship ownership

The action should preserve prior ownership history.

---

# 42. Relationship-owner transfer

Required fields:

* New owner;
* effective date;
* reason;
* transition note;
* retained secondary owner;
* active-deal impact.

Example warning:

> The current owner also owns Northbridge’s outreach in Project Horizon. Deal assignment will not change automatically.

The user may update the deal assignment separately.

---

# 43. Meaningful relationship events

Appropriate events:

* Introductory meeting;
* mandate awarded;
* proposal received;
* transaction closed;
* client relationship opened;
* conflict identified;
* relationship owner changed;
* approved outreach;
* senior management meeting.

Inappropriate events:

* Email opened;
* user viewed profile;
* contact clicked link;
* generic message count;
* every calendar meeting.

---

# 44. Relationship history

Recommended timeline:

> **25 July 2026**
> Conflict review completed for Project Horizon.

> **18 July 2026**
> Added to Project Horizon as buyer candidate.

> **12 June 2026**
> Project Meridian closing review completed.

> **14 March 2023**
> Marina Alves assigned as primary relationship owner.

The history should display meaningful institutional changes only.

---

# 45. Mandates and transaction relationships

The Relationships tab may summarize:

* Active client mandates;
* active counterparty processes;
* completed mandates;
* lost or withdrawn processes;
* advisory or financing relationships.

Full transaction details belong in Deals.

This module should remain permission-aware.

---

# 46. Relationship notes

Relationship notes may contain sensitive institutional judgment.

Each note should have:

* Author;
* date;
* category;
* visibility;
* effective relevance;
* linked contact or deal.

Examples:

* Senior relationship;
* communication protocol;
* known advisor;
* client preference;
* outreach restriction;
* relationship transition.

## UX rule

Avoid storing unstructured confidential commentary without visibility controls.

---

# 47. Contacts tab

Recommended sections:

1. Current contacts;
2. senior relationships;
3. transaction contacts;
4. former contacts;
5. contact changes;
6. unconfirmed contacts.

## Default table columns

* Contact;
* title;
* department;
* relationship owner;
* active deal role;
* contact state;
* last meaningful interaction;
* visibility.

---

# 48. Contact-row anatomy

> **Sofia Mendes**

Supporting:

> Head of Corporate Development

Relationship:

> Primary transaction contact

Active deal:

> Project Horizon · Buyer team

Institution owner:

> Ana Costa

State:

> Current · Verified employment

Actions:

* Open contact;
* associate with deal;
* update role;
* mark departed.

---

# 49. Contact states

Recommended:

* Current;
* current but unverified;
* role changed;
* departed;
* historical;
* duplicate review;
* restricted;
* deceased, where relevant and appropriately handled;
* unknown.

## UX rule

Do not delete departed contacts.

Preserve their historical transaction involvement.

---

# 50. Primary contacts

The page may distinguish:

* Senior relationship contact;
* transaction contact;
* legal contact;
* finance contact;
* operational contact;
* administrative contact.

An organization may have several primary contacts for different purposes.

Avoid one universal:

> Primary contact

unless the purpose is explicit.

---

# 51. Add contact

Required minimum:

* Name;
* organization;
* title or role;
* source;
* visibility.

Optional:

* Email;
* phone;
* department;
* transaction association;
* relationship owner.

Before creation, search:

* Existing contacts;
* email;
* name;
* organization;
* prior employer.

---

# 52. Contact-employment history

When a contact changes organization:

1. End the prior employment association;
2. create the new association;
3. preserve transaction roles;
4. update current organization context;
5. notify relevant relationship owners where material.

Do not rewrite historical deal records to the new employer.

---

# 53. Sensitive contact data

Contact methods may be restricted by:

* Relationship ownership;
* user role;
* deal access;
* communication policy;
* legal or privacy rules.

The page should support:

* Masked details;
* view logging;
* access requests;
* export restrictions.

---

# 54. Deals tab

The Deals tab should provide permission-aware transaction history.

Recommended categories:

* Active;
* paused;
* completed;
* withdrawn;
* archived;
* restricted.

## Default columns

1. Deal;
2. transaction role;
3. side;
4. phase;
5. status;
6. deal lead;
7. relationship owner;
8. indicative value, where permitted;
9. last meaningful event;
10. actions.

---

# 55. Active-deal row

> **Project Horizon**

Role:

> Buyer candidate

Transaction:

> Sell-side

Phase:

> Buyer Universe

State:

> Proposed shortlist

Deal Lead:

> Marina Alves

Value:

> R$ 480 mi–R$ 520 mi

Action:

> Open candidate assessment

---

# 56. Historical-deal row

> **Project Meridian**

Role:

> Buyer

State:

> Closed · 2025

Relationship result:

> Transaction completed

Action:

> Open permitted deal history

If the user lacks deal access:

> **Restricted historical transaction**

No codename, value or role should appear unless policy allows it.

---

# 57. Deal-role history

The same organization may have several roles within a deal.

Example:

* Buyer candidate;
* approved bidder;
* buyer;
* parent guarantor.

The page should show the current principal role and allow the user to inspect role history.

## Example

```text
Buyer candidate
  ↓
Approved shortlist
  ↓
Active bidder
  ↓
Buyer
```

---

# 58. Deal association detail

Selecting an association should show:

* Deal;
* organization;
* exact legal entity;
* role;
* role state;
* effective dates;
* confidentiality;
* deal owner;
* relationship owner;
* associated contacts;
* source;
* created by;
* history.

---

# 59. Add to deal

Recommended flow:

1. Select deal;
2. select role;
3. select exact legal entity;
4. select associated contacts;
5. choose visibility;
6. assign owner;
7. review downstream object;
8. confirm.

## Downstream consequences

Examples:

### Buyer candidate

Creates:

> Candidate record in Buyer Universe

### Target

Creates:

> Deal-specific Target Dossier

### Advisor

Creates:

> Deal participant and relevant access setup

### Lender

Creates:

> Financing participant record

---

# 60. Create deal

The primary action may prepopulate New Deal Setup with the organization.

The user must still select:

* Transaction type;
* side;
* organization role;
* client relationship;
* deal team;
* confidentiality;
* source connection.

## Example

> **Create transaction with Northbridge Automation**

Choose role:

* Target;
* buyer;
* seller;
* investor;
* client;
* other participant.

No transaction should be created from one unreviewed click.

---

# 61. Deal-specific Dossier handoff

When an organization is a target, the Deals tab should show:

> **Open Target Dossier**

The page should not show Dossier facts directly in the global organization record.

A small summary may state:

> Target Dossier available in Project Horizon

But should not expose:

* Revenue;
* EBITDA;
* findings;
* valuation;
* management views;

outside the deal permission model.

---

# 62. Permission-aware deal history

The page must prevent side-channel leakage through:

* Deal counts;
* role filters;
* value totals;
* phase distribution;
* search;
* relationship events;
* Copilot;
* exports.

Possible behavior:

> **2 accessible transactions**
> Additional restricted history may exist.

For higher-security policies, do not reveal the existence of inaccessible transactions.

---

# 63. Documents & References tab

This tab should contain only organization-level materials.

Appropriate examples:

* Corporate registration extracts;
* identity-review evidence;
* engagement letters;
* relationship documentation;
* conflict-clearance records;
* corporate-structure references;
* approved organization summaries;
* public filings retained for identity;
* legal-entity documents.

It should not contain:

* A transaction VDR;
* deal financials;
* diligence evidence;
* buyer proposals;
* valuation models;
* closing documents.

Those remain inside the relevant deal.

---

# 64. Reference registry

Recommended columns:

1. Reference;
2. type;
3. organization or legal entity;
4. effective date;
5. expiry;
6. review state;
7. source;
8. visibility.

## Example

| Reference                      | Type                | State      |
| ------------------------------ | ------------------- | ---------- |
| Certificate of Incorporation   | Identity            | Current    |
| Brazilian registration extract | Identity            | Review due |
| Relationship memorandum        | Internal            | Restricted |
| Conflict clearance — Horizon   | Conflict            | Current    |
| Group structure chart          | Corporate structure | Reviewed   |

---

# 65. Reference detail

Selecting a reference should show:

* Title;
* category;
* affected fields;
* source;
* current version;
* effective date;
* expiry;
* reviewer;
* access;
* related organization objects;
* related deal associations.

## Primary action

> Open document

Secondary:

* Replace version;
* request review;
* link to field.

---

# 66. Field-to-source linkage

Identity fields should expose their supporting reference.

Example:

> **Legal name**

> Northbridge Brasil Tecnologia Ltda.

Source:

> Brazilian corporate-registration extract
> Issued 18 July 2026
> Page 1

This is the organization-level equivalent of source provenance without turning the page into Diligence.

---

# 67. Expiring references

Examples:

* Registration extract;
* power of attorney;
* identity confirmation;
* conflict review;
* regulatory registration.

State:

> **Review due in 30 days**

The system may create a task where policy requires refresh.

---

# 68. Risks & Restrictions tab

This tab should consolidate organization-level governance concerns.

Recommended sections:

1. Identity issues;
2. duplicate concerns;
3. conflict summary;
4. relationship restrictions;
5. communication restrictions;
6. transaction restrictions;
7. data-access restrictions;
8. review history.

This tab may be hidden or partially redacted according to permission.

---

# 69. Conflict summary

Recommended state vocabulary:

* Not reviewed;
* no identified conflict;
* potential conflict;
* review required;
* cleared;
* restricted;
* expired.

## Example

> **No identified conflict**

Scope:

> Atlas M&A Advisory · Project Horizon

Reviewed:

> 25 July 2026

Reviewer:

> Restricted conflicts team

## UX rule

Always include scope and date.

Do not use:

> Conflict free

---

# 70. Potential conflict

Example:

> **Potential mandate conflict**

> Atlas M&A Advisory currently advises an affiliate of Northbridge Automation in another restricted transaction.

Visible consequence:

> Project Horizon outreach requires conflict-team clearance.

Restricted users should not see:

* Other deal identity;
* client;
* mandate scope;
* privileged commentary.

---

# 71. Relationship restrictions

Examples:

* Contact only through named partner;
* no direct analyst outreach;
* client consent required;
* do not share target identity before NDA;
* do-not-contact;
* communication temporarily paused;
* legal counsel must be included.

Each restriction should contain:

* Scope;
* reason;
* authority;
* effective date;
* expiry;
* affected deals;
* visibility.

---

# 72. Do-not-contact state

This should be a prominent controlled restriction.

Example:

> **Do not contact**

Scope:

> Project Horizon

Reason:

> Client exclusion

Authority:

> Client principal

Action:

> Request exception

The restriction must propagate into:

* Buyer Universe;
* Agentic Workspace;
* outreach drafts;
* Tasks & Approvals.

---

# 73. Data-quality issues

Examples:

* Conflicting legal names;
* duplicate identifier;
* unknown parent;
* inactive legal entity used in deal;
* unverified domain;
* contact employment stale;
* identity review expired.

Each issue should have:

* Consequence;
* owner;
* recommended action;
* affected deal associations;
* state.

---

# 74. Duplicate state

When a possible duplicate exists, show:

> **Possible duplicate**

Potential match:

> North Bridge Automation Inc.

Signals:

* Matching domain;
* near-identical legal name;
* same jurisdiction.

Action:

> Review duplicate

Do not prevent all normal use automatically unless the identity ambiguity is material.

---

# 75. Merge from Organization Detail

Authorized users may initiate:

> **Merge organization**

Before proceeding, show:

* Candidate canonical record;
* legal entities;
* identifiers;
* contacts;
* deals;
* restrictions;
* conflicting fields;
* destination access level.

The merge should use a separate focused workflow.

---

# 76. Merge result

After merge:

> **This record was merged into Northbridge Automation**

The old route should redirect or show:

* Canonical organization;
* merge date;
* approved by;
* preserved aliases;
* audit record.

Historical citations may continue to reference the original record identifier while resolving to the canonical organization.

---

# 77. Restriction and visibility model

Field-level or section-level restrictions may apply to:

* Relationship notes;
* conflict details;
* contact information;
* transaction history;
* identity documents;
* beneficial ownership;
* regulatory records;
* legal advice.

The page should support:

* Fully visible;
* masked;
* summary only;
* existence only;
* hidden.

---

# 78. History tab

History should record material changes rather than every profile view.

Recommended event categories:

* Identity;
* legal entity;
* corporate structure;
* relationship;
* contact;
* transaction association;
* conflict;
* restriction;
* document;
* duplicate;
* merge;
* archive.

---

# 79. History timeline

Example:

> **25 July 2026 · Conflict**
> Project Horizon conflict review completed.

> **22 July 2026 · Identity**
> Northbridge Brasil registration reviewed.

> **18 July 2026 · Deal association**
> Added to Project Horizon as buyer candidate.

> **12 June 2026 · Transaction**
> Project Meridian completion recorded.

> **14 March 2023 · Relationship**
> Marina Alves assigned as relationship owner.

---

# 80. Before-and-after detail

Material changes should show:

* Previous value;
* new value;
* reason;
* source;
* editor;
* effective date;
* affected objects.

Example:

> **Parent organization changed**

Previous:

> No parent recorded

Current:

> Northbridge Automation Group

Affected:

* Two legal entities;
* one candidate assessment;
* organization search grouping.

---

# 81. Historical state

Authorized users should be able to inspect the organization at a prior date.

Example:

> **View record as of 31 December 2025**

Useful for:

* Audit;
* historical deal review;
* conflict reconstruction;
* ownership changes;
* relationship history.

The historical view must be clearly read-only.

---

# 82. Primary actions

Recommended hierarchy:

## Primary

Choose one according to the user’s current need:

* Create deal;
* add to deal;
* resolve identity review;
* open active deal.

## Secondary

* Add contact;
* edit organization.

## Overflow

* Request review;
* add reference;
* merge;
* archive;
* export;
* view audit.

---

# 83. Edit behavior

Routine editable fields:

* Display name;
* description;
* website;
* industry;
* relationship owner;
* aliases;
* tags.

Controlled fields:

* Legal name;
* registration identifier;
* operating status;
* parent organization;
* conflict state;
* restricted access;
* canonical merge state.

Controlled changes may require:

* Evidence;
* review;
* authority;
* version update.

---

# 84. Edit-in-place versus dedicated form

Appropriate inline editing:

* Display name;
* description;
* website;
* simple classification;
* relationship owner.

Use a dedicated modal or page for:

* Legal entity;
* identifier;
* corporate-group relationship;
* merge;
* restriction;
* identity review.

The screen should avoid becoming a permanently editable database form.

---

# 85. Concurrent editing

Version-aware updates should remain in place.

Example:

> **This organization changed while you were editing it**

Changed:

* Relationship owner;
* active deal association;
* legal-entity review state.

Actions:

* Compare changes;
* refresh;
* reapply safe edits.

Never silently overwrite a reviewed identity field.

---

# 86. Archiving

Before archive, verify:

* No active transaction role;
* no open organization tasks;
* no unresolved conflict review;
* no active relationship requiring transfer;
* no unresolved duplicate merge.

## Archive effect

* Remove from ordinary selection;
* preserve contacts;
* preserve deal history;
* preserve references;
* preserve audit;
* preserve old routes.

## UX rule

An organization involved in an active deal cannot be archived.

---

# 87. Inactive versus archived

## Inactive

The organization is no longer operating or relationship-relevant, but remains visible in normal historical contexts.

## Archived

The institutional record is removed from ordinary use.

Examples:

* Dissolved company: Inactive;
* erroneous duplicate after merge: Merged;
* obsolete test record: Archived.

Do not use Archive as a substitute for operating status.

---

# 88. Contextual Copilot

Suggested prompts:

* Summarize our relationship with Northbridge Automation.
* Which active deals involve this organization?
* Which legal entity is used in Project Horizon?
* Who are the principal transaction contacts?
* What changed in the organization record this year?
* Are any identity fields stale?
* Explain the potential duplicate.
* Which restrictions apply before outreach?
* Create a draft deal using this organization as buyer.
* Show the evidence supporting the parent-company relationship.

## Response requirements

The Copilot should:

* Distinguish organization from legal entity;
* distinguish institutional relationship from transaction role;
* respect restricted deal history;
* cite organization-level references;
* avoid importing Dossier facts into the global record;
* route to exact contacts, deals or identity fields.

---

# 89. Recommended desktop layout

For a **1440 × 900** canvas:

| Region                     | Approximate allocation |
| -------------------------- | ---------------------: |
| Expanded global sidebar    |             240–256 px |
| Page content maximum width |         1.400–1.600 px |
| Page horizontal padding    |               24–32 px |
| Main overview column       |                 62–68% |
| Supporting column          |                 32–38% |
| Copilot drawer             |             360–440 px |

Organization Detail should use the application’s **standard-width canvas**, which is also recommended for Deal Overview and Command Center rather than the full analytical layout used by Diligence or Valuation. 

---

# 90. Recommended Overview layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Northbridge Automation                           [ Add to deal ]    │
│ Northbridge Automation, Inc. · Operating company · United States   │
│ Established counterparty · Identity reviewed · Conflict clear      │
├─────────────────────────────────────────────────────────────────────┤
│ Overview Identity Relationships Contacts Deals References Risks ...│
├──────────────────────────────────────────┬──────────────────────────┤
│ Organization summary                     │ Attention required       │
│                                          │                          │
│ Industrial automation and monitoring     │ 1 identity review due    │
│ software                                 │ Brazilian subsidiary     │
│                                          │                          │
│ Parent: Northbridge Automation Group      │ [ Review ]               │
├──────────────────────────────────────────┼──────────────────────────┤
│ Institutional relationship               │ Key contacts             │
│                                          │                          │
│ Established counterparty                 │ Sofia Mendes             │
│ Owner: Marina Alves                      │ Head of Corp. Development│
│ Since 2023                               │                          │
│                                          │ James Hall               │
│ Last event: Meridian closing review      │ Chief Executive Officer  │
├──────────────────────────────────────────┴──────────────────────────┤
│ Active transaction participation                                    │
│ Project Horizon · Buyer candidate · Proposed shortlist              │
├──────────────────────────────────────────┬──────────────────────────┤
│ Corporate structure                      │ Recent history            │
└──────────────────────────────────────────┴──────────────────────────┘
```

---

# 91. Identity layout

```text
┌──────────────────────────────────────────┬──────────────────────────┐
│ Legal entities                           │ Selected legal entity    │
│                                          │                          │
│ Northbridge Automation, Inc.             │ Active                   │
│ United States · Active                   │ United States            │
│                                          │                          │
│ Northbridge Brasil Tecnologia Ltda.      │ EIN •••• 4827           │
│ Brazil · Review due                      │                          │
│                                          │ Parent                   │
│ Northbridge Europe GmbH                  │ Northbridge Group        │
│ Germany · Active                         │                          │
│                                          │ Identity reviewed        │
│ Acquisition Vehicle I LLC                │ 22 July 2026             │
│ United States · Inactive                 │                          │
│                                          │ [ Edit legal entity ]    │
└──────────────────────────────────────────┴──────────────────────────┘
```

---

# 92. Deals layout

```text
┌────────────────────────────────────────────────────────────────────┐
│ Transaction participation                                          │
├──────────────────────┬──────────────────┬────────────┬─────────────┤
│ Deal                 │ Role             │ Phase      │ Status      │
├──────────────────────┼──────────────────┼────────────┼─────────────┤
│ Project Horizon      │ Buyer candidate  │ Universe   │ Proposed    │
│ R$ 480–520 mi        │                  │            │ shortlist   │
├──────────────────────┼──────────────────┼────────────┼─────────────┤
│ Project Meridian     │ Buyer            │ Completed  │ Closed 2025 │
├──────────────────────┼──────────────────┼────────────┼─────────────┤
│ Restricted history  │ —                │ —          │ Restricted  │
└──────────────────────┴──────────────────┴────────────┴─────────────┘
```

---

# 93. UI design direction

## Overall character

Aim for:

> **A canonical institutional company record with transaction-aware relationship context**

The screen should feel:

* Authoritative;
* restrained;
* corporate;
* relationship-aware;
* information-dense;
* permission-conscious;
* historically reliable.

It should not feel:

* Like LinkedIn;
* like a sales CRM;
* like a public-company profile;
* like a social network;
* like a company-research marketplace;
* like a deal Dossier.

---

# 94. Visual hierarchy

Prioritize:

1. Organization identity;
2. formal legal distinction;
3. institutional relationship;
4. active transaction context;
5. principal contacts;
6. identity and conflict state;
7. corporate structure;
8. recent meaningful change.

Do not prioritize:

* Logo;
* employee count;
* public-news volume;
* relationship score;
* number of emails;
* generic company description.

---

# 95. Color application

Use the M&Ai palette:

* Canvas Cream: `#F3F0EE`
* Lifted Cream: `#FCFBFA`
* Ink Black: `#141413`
* Signal Orange: `#CF4500`
* Light Signal Orange: `#F37338`
* Dust Taupe: `#D1CDC7`
* Slate Gray: `#696969`

## Semantic application

* Identity reviewed: green;
* review required: Signal Orange;
* potential conflict: red-orange;
* no identified conflict: neutral with positive icon;
* possible duplicate: amber;
* restricted: dark neutral;
* inactive: gray;
* current client: blue-neutral;
* active transaction: restrained orange marker.

Avoid a bright success-green header for reviewed organizations.

---

# 96. Typography

Use **Sofia Sans**.

| Element           |     Size |  Weight |
| ----------------- | -------: | ------: |
| Organization name | 28–34 px | 550–650 |
| Legal name        | 14–16 px | 450–550 |
| Summary state     | 12–13 px | 600–700 |
| Tab label         | 13–14 px | 600–700 |
| Section title     | 15–18 px | 650–700 |
| Contact name      | 14–16 px | 600–700 |
| Body              | 13–15 px | 450–500 |
| Metadata          | 12–13 px | 450–550 |
| Identifier        | 13–14 px | 500–600 |

Use tabular figures for:

* Identifiers;
* dates;
* deal counts;
* ownership percentages;
* transaction values.

Use pt-BR number formatting where financial values appear:

* `R$ 480 mi–R$ 520 mi`
* `31 jul. 2026`

---

# 97. Geometry and density

Recommended:

* Overview modules: 6–10 px radius;
* tabs: restrained underline or surface state;
* contact rows: 52–64 px;
* deal rows: 56–68 px;
* legal-entity rows: 52–64 px;
* compact status badges;
* minimal shadow;
* section dividers.

Avoid:

* Large profile hero;
* logo-dominated header;
* one card per field;
* large circular relationship score;
* excessive white space;
* gradient backgrounds.

---

# 98. Responsive behavior

## Desktop — 1280 px and above

* Full header;
* horizontal tab navigation;
* two-column Overview;
* full legal-entity and deal tables;
* contextual side panels.

## Tablet — 768–1279 px

* Header actions collapse;
* Overview becomes stacked;
* tabs horizontally scroll;
* tables reduce optional columns;
* detail panels open as drawers.

## Mobile — below 768 px

Recommended order:

1. Organization identity;
2. relationship state;
3. attention required;
4. active deal;
5. principal contacts;
6. identity summary;
7. corporate group;
8. history.

Mobile should support:

* Search and navigation;
* contact access;
* deal handoff;
* basic edits;
* identity-review response.

Complex merge and corporate-structure editing remain desktop-first.

---

# 99. Accessibility requirements

The screen should support:

* Semantic page heading;
* accessible tab list;
* semantic legal-entity tables;
* semantic deal tables;
* accessible corporate-group tree;
* keyboard navigation;
* visible focus;
* no color-only states;
* descriptive restriction labels;
* correctly masked identifiers;
* screen-reader distinction between organization and legal entity;
* descriptive contact links;
* minimum 44 × 44 px actions;
* announced tab changes;
* accessible history timeline;
* clear archived and merged states.

Avoid actions labeled:

> Open

Prefer:

> Open Project Horizon buyer-candidate record

---

# 100. System states

## 100.1 Draft organization

> **Identity review required**

The record may be used in limited setup workflows according to policy.

## 100.2 Identity incomplete

Show exact missing fields.

Example:

* Legal name unknown;
* registration identifier missing;
* parent unconfirmed.

## 100.3 Identity conflict

> **Conflicting legal names**

Show sources and affected deal associations.

## 100.4 Review expired

> **Identity review due**

Historical review remains visible.

## 100.5 Possible duplicate

Show canonical-review action.

## 100.6 Merged organization

Redirect to canonical record.

## 100.7 Restricted organization

Show only permitted sections.

## 100.8 No active deals

> No active transactions currently involve this organization.

Historical transactions may remain available.

## 100.9 No contacts

> No current contacts are associated.

Primary action:

> Add contact

## 100.10 No relationship owner

> **Relationship owner not assigned**

This should create an optional governance task, not block ordinary viewing.

## 100.11 Partial service failure

Example:

> Deal history unavailable

Identity and contacts remain visible.

## 100.12 Concurrent update

Show field differences.

## 100.13 Archive blocked

Explain active references.

## 100.14 Archived organization

Read-only with Restore for authorized users.

## 100.15 Inactive organization

Display operating state without removing history.

## 100.16 Offline

Allow safely cached viewing.

Disable:

* Edit;
* merge;
* archive;
* add to deal;
* create contact;
* identity decision.

---

# 101. Figma component architecture

## `OrganizationDetailHeader`

Properties:

* Active;
* draft;
* review;
* duplicate;
* restricted;
* inactive;
* merged;
* archived.

## `OrganizationIdentityHeader`

Properties:

* Organization;
* corporate group;
* fund;
* advisor;
* bank;
* legal entity selected.

## `OrganizationSummaryStrip`

Variants:

* Relationship;
* deals;
* contacts;
* identity;
* conflict;
* attention.

## `OrganizationDetailTabs`

* Overview;
* identity;
* relationships;
* contacts;
* deals;
* references;
* risks;
* history.

## `OrganizationOverview`

States:

* Complete;
* attention;
* partial data;
* restricted;
* empty relationship.

## `OrganizationSummaryCard`

Properties:

* Operating company;
* fund;
* advisor;
* corporate group;
* restricted.

## `RelationshipSummary`

Properties:

* Client;
* counterparty;
* advisor;
* provider;
* unknown;
* restricted.

## `RelationshipOwner`

Properties:

* Assigned;
* multiple;
* unassigned;
* transferring;
* restricted.

## `LegalEntityRegistry`

States:

* Populated;
* one entity;
* empty;
* review required;
* restricted.

## `LegalEntityRow`

Properties:

* Active;
* inactive;
* review due;
* used in deal;
* conflict;
* selected.

## `LegalEntityDetail`

Properties:

* Current;
* incomplete;
* review;
* restricted;
* historical.

## `LegalIdentifier`

Properties:

* Verified;
* review required;
* conflicting;
* masked;
* expired.

## `OrganizationAliasList`

Properties:

* Current;
* historical;
* suggested;
* disputed.

## `CorporateGroupTree`

Properties:

* Expanded;
* collapsed;
* partial;
* restricted;
* conflicting.

## `OrganizationContactList`

States:

* Populated;
* empty;
* current;
* historical;
* restricted.

## `OrganizationContactRow`

Properties:

* Senior;
* transaction;
* legal;
* finance;
* departed;
* unverified.

## `OrganizationDealHistory`

States:

* Active;
* historical;
* restricted;
* empty;
* partial failure.

## `DealAssociationRow`

Properties:

* Target;
* seller;
* buyer;
* bidder;
* advisor;
* lender;
* historical;
* restricted.

## `OrganizationReferenceList`

Properties:

* Current;
* review due;
* expired;
* restricted;
* missing.

## `IdentityReviewPanel`

States:

* Not reviewed;
* in review;
* reviewed;
* expired;
* changes required;
* rejected.

## `ConflictSummaryPanel`

Properties:

* Not reviewed;
* clear;
* potential;
* review required;
* cleared;
* restricted.

## `OrganizationRestriction`

Properties:

* Do not contact;
* partner-only;
* client approval;
* deal-specific;
* expired.

## `OrganizationAttentionPanel`

Properties:

* Identity;
* duplicate;
* relationship;
* conflict;
* contact;
* active-deal issue.

## `OrganizationHistoryTimeline`

Properties:

* Identity;
* relationship;
* contact;
* deal;
* conflict;
* merge;
* archive.

---

# 102. Production object model

The Organization domain established for the Directory should support this screen through linked objects.

## `Organization`

```text
id
institutionId
displayName
primaryOrganizationType
description
operatingStatus
primaryCountryCode
headquartersCountryCode
primaryIndustryId
primaryWebsite
identityReviewState
dataQualityState
accessLevel
canonicalOrganizationId
archivedAt
createdBy
createdAt
updatedAt
version
```

## `OrganizationName`

```text
id
organizationId
name
nameType
languageCode
effectiveFrom
effectiveTo
sourceReferenceId
reviewState
createdAt
```

## `LegalEntity`

```text
id
organizationId
legalName
entityType
incorporationCountryCode
incorporationRegion
operatingStatus
primary
effectiveFrom
effectiveTo
createdAt
updatedAt
version
```

## `LegalEntityIdentifier`

```text
id
legalEntityId
identifierType
identifierValue
jurisdictionCode
issuingAuthority
verificationState
verifiedBy
verifiedAt
sourceReferenceId
accessLevel
createdAt
```

## `OrganizationGroupRelationship`

```text
id
parentOrganizationId
childOrganizationId
relationshipType
ownershipPercentage
effectiveFrom
effectiveTo
sourceReferenceId
reviewState
createdAt
```

## `InstitutionOrganizationRelationship`

```text
id
institutionId
organizationId
relationshipType
relationshipState
primaryOwnerId
secondaryOwnerIds
executiveSponsorId
effectiveFrom
effectiveTo
sourceReferenceId
accessLevel
createdAt
updatedAt
```

## `RelationshipEvent`

```text
id
organizationId
eventType
title
summary
contactIds
dealId
occurredAt
createdBy
accessLevel
sourceReferenceId
createdAt
```

## `DealOrganizationRole`

```text
id
dealId
organizationId
legalEntityId
roleType
roleState
relationshipOwnerId
confidentialityLevel
effectiveFrom
effectiveTo
sourceReferenceId
createdAt
updatedAt
```

## `OrganizationContactAssociation`

```text
id
organizationId
contactId
associationType
roleTitle
department
primary
effectiveFrom
effectiveTo
relationshipOwnerId
sourceReferenceId
accessLevel
createdAt
```

## `OrganizationReference`

```text
id
organizationId
legalEntityId
referenceType
documentId
documentVersionId
title
effectiveAt
expiresAt
reviewState
reviewedBy
accessLevel
createdAt
```

## `OrganizationIdentityReview`

```text
id
organizationId
legalEntityId
reviewType
scope
status
sourceReferenceIds
reviewedFields
reviewedBy
reviewedAt
expiresAt
comments
createdAt
```

## `OrganizationRestriction`

```text
id
organizationId
restrictionType
scopeType
scopeId
title
reason
authorityId
effectiveFrom
expiresAt
accessLevel
status
createdAt
updatedAt
```

## `OrganizationConflictRecord`

```text
id
organizationId
scopeType
scopeId
conflictType
state
summary
restrictedDetails
reviewedBy
reviewedAt
expiresAt
accessLevel
createdAt
```

## `OrganizationDataIssue`

```text
id
organizationId
legalEntityId
issueType
title
description
severity
affectedObjectIds
assignedTo
status
resolvedBy
resolvedAt
createdAt
```

## `OrganizationHistoryEvent`

```text
id
organizationId
eventType
actorType
actorId
beforeSnapshot
afterSnapshot
sourceReferenceId
summary
occurredAt
```

---

# 103. Suggested routes

Primary:

```text
/organizations/:organizationId
```

Identity:

```text
/organizations/:organizationId?view=identity
```

Selected legal entity:

```text
/organizations/:organizationId?view=identity&legalEntity=:legalEntityId
```

Relationships:

```text
/organizations/:organizationId?view=relationships
```

Contacts:

```text
/organizations/:organizationId?view=contacts
```

Deals:

```text
/organizations/:organizationId?view=deals
```

References:

```text
/organizations/:organizationId?view=references
```

Risks:

```text
/organizations/:organizationId?view=risks
```

History:

```text
/organizations/:organizationId?view=history
```

Add to deal:

```text
/organizations/:organizationId?panel=add-to-deal
```

Identity review:

```text
/organizations/:organizationId/reviews/:reviewId
```

Legacy route:

```text
/entities/:entityId
```

should redirect to the Organization Detail route.

---

# 104. Repository direction

The current repository already has an entity-detail route and useful record-management foundations.

## Keep

* Existing detail-route behavior;
* entity retrieval;
* edit-state handling;
* related-deal loading;
* version-aware updates;
* archive protection;
* stable identifiers;
* loading, empty and error patterns;
* reusable field and table components.

## Rename

* Entity Detail → Organization Detail;
* Entity → Organization;
* legal-name-first heading → display name with legal-name support;
* entity role → organization type and deal-specific roles.

## Rebuild the information model

The final page should no longer assume that one record contains:

* One legal name;
* one tax identifier;
* one contact email;
* one permanent buyer, seller or target role;
* one global Target Dossier.

## Move

The existing entity-level Target Dossier should move to:

```text
/deals/:dealId/dossier
```

Organization Detail should show only:

> Target Dossier available in Project Horizon

with a permission-aware link.

## Add

* Display name and aliases;
* multiple legal entities;
* multiple identifiers;
* corporate-group structure;
* institutional relationship;
* relationship ownership;
* separate contacts;
* deal-specific role history;
* organization references;
* identity-review records;
* conflict and restriction summary;
* duplicate and merge state;
* material history;
* field-level provenance.

## Access-model correction

Related deals cannot be treated as a simple unrestricted list.

The API must return:

* Authorized full association;
* redacted association;
* restricted-history indicator;
* or no existence signal;

according to policy.

---

# 105. What not to include

Avoid:

* Deal-specific financial facts in Organization Detail;
* one global Target Dossier;
* one permanent buyer, seller or target role;
* one universal tax identifier;
* one generic contact-email field;
* people stored directly as unversioned text;
* unrestricted transaction history;
* every email and meeting;
* relationship scores;
* sales-pipeline metrics;
* public-news feeds as a primary section;
* automatically generated company descriptions presented as reviewed;
* conflict-free guarantees;
* unrestricted sensitive notes;
* silent legal-name changes;
* silent parent-company changes;
* deletion of departed contacts;
* deletion of historical deal associations;
* mutable identity-review decisions;
* bulk clearing of restrictions;
* real companies in mocked fixtures.

---

# 106. MOCKED — Pitch and demo specification

## 106.1 Purpose of the mocked screen

The mocked Organization Detail screen should demonstrate:

* Canonical institutional identity;
* distinction between organization and legal entity;
* relationship ownership;
* reusable contacts;
* deal-specific participation;
* identity and conflict governance.

Its pitch narrative is:

> **M&Ai preserves institutional relationship intelligence while keeping financial evidence and transaction decisions isolated inside each deal.**

This screen is useful for:

* Product walkthroughs;
* new-deal setup demonstrations;
* Buyer Universe transitions;
* architecture explanation;
* diligence-data isolation explanation.

It is not a primary pitch hero.

---

# 107. Mocked shell state

Institution:

> **Atlas M&A Advisory**

User:

> **Ana Costa · Vice President**

Breadcrumb:

> Organizations / Northbridge Automation

Global navigation:

* Home;
* Deals;
* **Organizations**;
* Tasks & Approvals;
* Team.

Top bar:

* Search;
* Tasks: 3;
* Notifications: 2;
* Ask M&Ai;
* Ana Costa.

---

# 108. Mocked page header

> **Northbridge Automation**

Supporting:

> Northbridge Automation, Inc. · Operating company · United States

States:

* **Established counterparty**
* **Identity reviewed**
* **1 active deal**
* **No identified conflict**

Relationship owner:

> Marina Alves

Primary action:

> **Add to deal**

Secondary:

* Add contact;
* edit organization.

---

# 109. Mocked organization summary

Description:

> Industrial automation and monitoring-software company with an international operating footprint.

Primary industry:

> Industrial automation

Secondary:

* Monitoring software;
* predictive maintenance.

Headquarters:

> United States

Parent:

> Northbridge Automation Group

Website:

> northbridge-automation.example

Identity reviewed:

> 22 July 2026

---

# 110. Mocked institutional relationship

Classification:

> **Established counterparty**

Relationship since:

> March 2023

Primary owner:

> Marina Alves · Managing Director

Secondary owner:

> Ana Costa · Vice President

Last meaningful interaction:

> Project Meridian closing review · 12 June 2026

Restriction:

> Project Horizon outreach must follow the approved relationship-owner protocol.

---

# 111. Mocked legal entities

## Northbridge Automation, Inc.

* United States;
* operating company;
* active;
* primary legal entity;
* used in Project Horizon;
* identity reviewed.

## Northbridge Brasil Tecnologia Ltda.

* Brazil;
* subsidiary;
* active;
* CNPJ masked;
* identity review due.

## Northbridge Europe GmbH

* Germany;
* subsidiary;
* active;
* no active deal.

## Northbridge Acquisition Vehicle I LLC

* United States;
* acquisition vehicle;
* inactive;
* used in Project Meridian.

---

# 112. Mocked contacts

## Sofia Mendes

> Head of Corporate Development

State:

> Primary transaction contact

Active deal:

> Project Horizon

Institution owner:

> Ana Costa

## James Hall

> Chief Executive Officer

State:

> Senior relationship

Institution owner:

> Marina Alves

## Laura Kim

> General Counsel

State:

> Legal contact

Historical deal:

> Project Meridian

## Daniel Foster

> Former Chief Financial Officer

State:

> Departed · Historical contact

---

# 113. Mocked active transaction

> **Project Horizon**

Role:

> Buyer candidate

Transaction:

> Sell-side

Phase:

> Buyer Universe

Candidate state:

> Proposed shortlist

Relationship owner:

> Marina Alves

Deal value:

> R$ 480 mi–R$ 520 mi

Primary action:

> **Open candidate assessment**

---

# 114. Mocked historical transaction

> **Project Meridian**

Role:

> Buyer

State:

> Closed · 2025

Outcome:

> Transaction completed

Primary institutional owner:

> Marina Alves

Supporting action:

> Open permitted history

---

# 115. Mocked attention item

> **Identity review due**

Object:

> Northbridge Brasil Tecnologia Ltda.

Reason:

> Registration status was last reviewed in March 2025.

Potential consequence:

> Brazilian legal entity should be reviewed before use in a new transaction.

Primary action:

> Review identity

---

# 116. Mocked conflict state

> **No identified conflict**

Scope:

> Project Horizon

Reviewed:

> 25 July 2026

Reviewer:

> Restricted conflicts team

Supporting note:

> Review expires if the transaction role or client perimeter changes.

---

# 117. Recommended static pitch composition

```text
┌──────────────────────────────────────────────────────────────────┐
│ Northbridge Automation                         [ Add to deal ]   │
│ Operating company · United States · Identity reviewed            │
├─────────────────────────────────┬────────────────────────────────┤
│ Institutional relationship      │ Active transaction             │
│                                 │                                │
│ Established counterparty        │ Project Horizon                │
│ Owner: Marina Alves             │ Buyer candidate                │
│ Relationship since 2023         │ Proposed shortlist             │
│                                 │ R$ 480 mi–R$ 520 mi           │
├─────────────────────────────────┼────────────────────────────────┤
│ Principal contacts              │ Corporate structure            │
│                                 │                                │
│ Sofia Mendes                    │ Northbridge Automation Group   │
│ Head of Corporate Development   │ 3 active legal entities        │
│                                 │                                │
│ James Hall                      │ Identity review due             │
│ Chief Executive Officer         │ Brazilian subsidiary           │
└─────────────────────────────────┴────────────────────────────────┘
```

This communicates:

* Organization identity;
* relationship ownership;
* active deal role;
* contacts;
* legal structure;
* governance.

---

# 118. Pitch-specific simplification

## Keep visible

* Northbridge Automation;
* operating company;
* established counterparty;
* relationship owner;
* Project Horizon;
* buyer candidate;
* two contacts;
* three legal entities;
* identity review due;
* Add to deal.

## Hide

* Registration identifiers;
* complete deal history;
* conflict details;
* relationship notes;
* full corporate tree;
* document references;
* advanced actions;
* history timeline;
* all contact methods.

## Readability requirement

At deck scale, these should remain readable:

* **Northbridge Automation**
* **Established counterparty**
* **Owner: Marina Alves**
* **Project Horizon**
* **Buyer candidate**
* **Identity reviewed**
* **Add to deal**

---

# 119. Recommended demo flows

## Flow A — Organization to buyer candidate

```text
Organization Detail
  ↓
Review Northbridge identity
  ↓
Confirm primary legal entity
  ↓
Add to Project Horizon
  ↓
Role: Buyer candidate
  ↓
Candidate record created
  ↓
Open Buyer Universe
```

## Flow B — Organization to new deal

```text
Atlas Industrial Organization Detail
  ↓
Create deal
  ↓
Role: Target
  ↓
Select Atlas Industrial S.A.
  ↓
Complete New Deal Setup
  ↓
Deal-specific Target Dossier created
```

## Flow C — Contact context

```text
Organization Detail
  ↓
Contacts
  ↓
Sofia Mendes
  ↓
Open Contact Detail
  ↓
Review Project Horizon role
  ↓
Return to organization
```

## Flow D — Identity review

```text
Attention required
  ↓
Northbridge Brasil review due
  ↓
Open legal-entity evidence
  ↓
Confirm registration status
  ↓
Complete identity review
  ↓
Organization state refreshed
```

## Flow E — Conflict restriction

```text
Risks & Restrictions
  ↓
Outreach restriction
  ↓
Review scope
  ↓
Open Project Horizon candidate
  ↓
Confirm relationship-owner protocol
```

## Flow F — Historical relationship

```text
Relationships
  ↓
Project Meridian relationship event
  ↓
Open authorized deal history
  ↓
Review prior buyer role
  ↓
Return to Organization Detail
```

## Flow G — Duplicate resolution

```text
Possible duplicate alert
  ↓
Compare North Bridge Automation
  ↓
Review identifiers and domains
  ↓
Merge into canonical organization
  ↓
Old route redirects
```

---

# 120. UX prototype tasks to validate

Test with bankers using tasks such as:

1. Identify the organization’s legal name.
2. Find its primary legal entity.
3. Find the Brazilian subsidiary.
4. Determine which identifier belongs to which entity.
5. Find the relationship owner.
6. Identify the current institutional relationship.
7. Find the primary transaction contact.
8. Find a historical contact.
9. Determine which active deals involve the organization.
10. Explain its role in Project Horizon.
11. Distinguish the active organization role from organization type.
12. Open the Target Dossier without confusing it with Organization Detail.
13. Add the organization to another deal.
14. Select the correct legal entity.
15. Create a new deal using the organization as Target.
16. Determine whether outreach is restricted.
17. Find the current conflict-review scope.
18. Resolve an identity-review item.
19. Inspect the source supporting the parent relationship.
20. Identify a possible duplicate.
21. Start the merge workflow.
22. Attempt to archive an organization with an active deal.
23. Find a historical relationship owner.
24. View the record as it existed before a parent-company change.

## Measures

Record:

* Time to confirm identity;
* whether organization and legal entity are confused;
* whether relationship and transaction role are confused;
* whether users expect Dossier facts on the page;
* whether active deal context is discoverable;
* whether restricted history remains protected;
* whether legal-entity selection is understandable;
* whether principal contacts are easy to find;
* whether the page feels like a CRM;
* whether attention items lead to clear actions.

---

# 121. Design validation criteria

Organization Detail is ready for approval when:

1. The display name and legal name remain distinct.
2. Organization and legal entity remain distinct.
3. Organization and Contact remain distinct.
4. Organization type and transaction role remain distinct.
5. Institutional relationship and transaction role remain distinct.
6. Multiple legal entities are supported.
7. Identifiers are jurisdiction-aware.
8. Corporate-group relationships are versioned.
9. Uncertain ownership is labeled explicitly.
10. Target Dossier facts remain deal-specific.
11. Active and historical deal roles are permission-aware.
12. Restricted deals cannot leak through counts or events.
13. Relationship ownership is visible and historical.
14. Contact employment changes preserve history.
15. Organization-level references remain separate from VDR documents.
16. Identity review states do not overstate compliance.
17. Conflict state always includes scope and date.
18. Restrictions propagate into relevant workflows.
19. Possible duplicates route to controlled review.
20. Merges preserve aliases, contacts, deals and audit history.
21. Material identity changes require version-aware updates.
22. Active-deal organizations cannot be archived.
23. Inactive and archived remain distinct.
24. Merged records redirect to the canonical organization.
25. The Overview surfaces material attention without becoming a dashboard.
26. The screen remains usable without Copilot.
27. Mobile supports identity, relationship, contact and deal review.
28. Sensitive contact and conflict details remain protected.
29. The page does not become a generic CRM.
30. The page does not become a cross-deal Dossier.
31. The pitch mock remains fictional.
32. The static composition remains readable.
33. Every material state has a clear next action.

---

# 122. Final design target

The correct design target is not:

> “A company profile with contacts and past deals.”

It is:

> **A canonical institutional record that preserves corporate identity, relationship ownership, people, transaction participation and governance without contaminating deal-specific evidence or exposing restricted history.**

Its defining interaction is:

> **Confirm the organization → inspect the legal structure → understand the relationship → identify the relevant people → review authorized transaction history → reuse the record safely**

**Next iteration: Team Workspace.**
