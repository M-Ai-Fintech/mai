# Organizations

## 1. Recommended product naming

Use:

* **Global navigation:** `Organizations`
* **Page title:** `Organizations`
* **Primary object:** `Organization`
* **Jurisdictional object:** `Legal Entity`
* **Individual person:** `Contact`
* **Deal-specific participation:** `Transaction Role`
* **Institution-specific relationship:** `Relationship`
* **Identity process:** `Identity Review`

Replace the current prototype term **Entities** with **Organizations**.

“Entity” is technically defensible but too abstract for bankers. It can refer to:

* A legal entity;
* a database record;
* a fund;
* an individual;
* a transaction vehicle;
* an accounting perimeter.

“Organization” is clearer as the institution-level record for companies, funds, advisory firms, lenders, law firms and other institutional counterparties.

The application architecture already identifies Organizations as a global MVP workspace, distinct from the deal-specific Target Dossier and the separate Organization Detail screen. 

---

# 2. Screen definition

**Organizations** is the institution-level directory where M&Ai maintains reusable records for companies and institutional counterparties that may participate in multiple transactions.

It should contain:

* Corporate identity;
* legal names and aliases;
* jurisdictional registrations;
* organization type;
* industry;
* corporate-group relationships;
* institution relationship;
* relationship owner;
* associated contacts;
* current and prior deal participation;
* transaction-role history;
* identity-review state;
* potential conflicts and restrictions;
* record provenance;
* duplicate and merge state;
* access controls.

It should answer:

1. **Which organization am I looking for?**
2. **Is this the authoritative institutional record?**
3. **What is its legal and commercial identity?**
4. **How is the institution related to it?**
5. **Which active or historical deals involve it?**
6. **What role does it play in each transaction?**
7. **Who owns the relationship?**
8. **Are there conflicts, restrictions or duplicate records?**
9. **Is its identity information sufficiently reviewed?**
10. **Can I create or associate a transaction using this organization?**

Its central operating sequence is:

> **Identify organization → Verify record → Review relationship → Inspect deal history → Associate with transaction**

---

# 3. Primary intention

## Operational intention

Provide one reliable institution-level record for each organization, rather than recreating company identity and relationship information independently inside every deal.

## User intention

A banker should be able to say:

> “I found the correct company, understand our institutional relationship with it and can see how it participates across our authorized transactions.”

## Product intention

The Organizations workspace should create a stable institutional layer beneath the deal workflow.

An organization is reusable.

A Target Dossier is deal-specific.

The architecture explicitly defines the organization-to-deal flow as:

> Organization identity and relationship → transaction association → deal-specific role → deal-specific Target Dossier. 

---

# 4. Strategic product role

Organizations is not a primary differentiation screen, but it is necessary infrastructure for:

* Reliable deal setup;
* counterparty reuse;
* relationship context;
* conflict detection;
* identity resolution;
* deal-history continuity;
* matching;
* outreach control;
* permissions;
* institutional intelligence.

Without a canonical organization layer, the product will accumulate fragmented records such as:

* `Northbridge Automation`;
* `Northbridge Automation Inc.`;
* `Northbridge`;
* `Northbridge US`;
* `Northbridge Holdings`;
* `North Bridge Automation`.

Those records may refer to:

* The same company;
* different subsidiaries;
* a parent group;
* a transaction vehicle.

The Organizations workspace should prevent that ambiguity from propagating into transactions, contacts, approvals and audit records.

---

# 5. What the screen is not

Organizations should not become:

* A generic CRM;
* A sales pipeline;
* A lead-generation database;
* A marketing automation tool;
* A contact list;
* A complete corporate-intelligence terminal;
* A replacement for the Target Dossier;
* A counterparty ranking screen;
* A public-company market-data terminal;
* A legal-entity-management system;
* A complete conflict-check application;
* A complete KYC or AML product;
* A static client list;
* A list of buyer, seller and target records as permanent categories.

The central question is not:

> “How many companies are in the database?”

It is:

> **“Is this the correct organization record, and how does it relate to our institution and transactions?”**

---

# 6. Relationship to adjacent screens

| Screen                       | Primary responsibility                                                        |
| ---------------------------- | ----------------------------------------------------------------------------- |
| **Organizations**            | Browse, find, create and manage reusable organization records                 |
| **Organization Detail**      | Inspect one organization’s identity, relationships, contacts and deal history |
| **Contact Detail**           | Maintain information about one individual                                     |
| **New Deal Setup**           | Associate organizations with a new transaction                                |
| **Target Dossier**           | Maintain deal-specific facts, evidence and interpretations for a target       |
| **Buyer or Target Universe** | Evaluate organizations as candidates for a specific transaction               |
| **Deal Team & Access**       | Control access to one transaction                                             |
| **Global Search**            | Find organizations alongside deals, documents and decisions                   |
| **Team Workspace**           | Maintain the institution’s internal users                                     |
| **Tasks & Approvals**        | Route identity, conflict and transaction-association reviews                  |

---

# 7. Organizations versus Target Dossier

This distinction must remain explicit throughout the product.

## Organization record

Institution-level and reusable.

Examples:

* Legal name;
* corporate group;
* registration identifiers;
* website;
* industry;
* known contacts;
* relationship owner;
* prior deal participation.

## Target Dossier

Deal-specific and evidence-driven.

Examples:

* Approved revenue;
* adjusted EBITDA;
* ownership interpretation;
* diligence facts;
* management assessment;
* valuation assumptions;
* transaction-specific risks;
* current VDR evidence.

## Example

**Atlas Industrial S.A.** may have one organization record.

It may participate in:

* Project Horizon as Target;
* Project Meridian as Seller;
* an archived transaction as a potential buyer.

Each deal may contain different:

* Evidence;
* permissions;
* assumptions;
* findings;
* interpretations.

Therefore:

> **The Organization record must never become a cross-deal Target Dossier.**

---

# 8. Organization versus deal participant

An organization’s transaction role is contextual.

The same organization may be:

* A buyer in one transaction;
* a seller in another;
* a target in a third;
* a lender or advisor elsewhere.

Transaction roles should therefore be stored on the **deal association**, not as the organization’s permanent identity.

## Incorrect global model

> Northbridge Automation = Buyer

## Correct model

> Northbridge Automation = Operating company
> Project Horizon role = Buyer candidate
> Project Meridian role = Buyer
> Project Atlas role = Commercial counterparty

This is an important correction to the current prototype model, which treats buyer, seller and target as global entity roles.

---

# 9. Organization versus legal entity

A business organization and a legal entity are not always equivalent.

## Organization

Represents the business or corporate relationship.

Example:

> Northbridge Automation Group

## Legal entities

Represent jurisdiction-specific entities.

Examples:

* Northbridge Automation, Inc.;
* Northbridge Brasil Tecnologia Ltda.;
* Northbridge Europe GmbH;
* Northbridge Acquisition Vehicle I LLC.

## Recommended architecture

```text
Organization
  ├── Parent group identity
  ├── One or more legal entities
  ├── Brands and aliases
  ├── Contacts
  └── Deal associations
```

For a simple MVP, one primary legal entity may remain embedded in the Organization record.

The domain should still avoid assuming that one organization always has exactly one tax identifier.

---

# 10. Organization versus Contact

Organizations represent companies and institutions.

Contacts represent individuals.

## Organization examples

* Atlas Industrial S.A.;
* Serra Capital Partners;
* Lume Legal Advisors;
* Banco Horizonte;
* Northbridge Automation.

## Contact examples

* Helena Duarte;
* Ricardo Nunes;
* James Hall;
* Marina Alves.

A contact may be associated with:

* One current organization;
* prior organizations;
* a transaction role;
* relationship ownership;
* communication restrictions.

Individuals should never be stored as organization records merely because they participate in a transaction.

---

# 11. Organizations versus CRM

The workspace may display institutional relationship context, but it should not evolve into a full sales CRM.

## Appropriate relationship context

* Relationship owner;
* client status;
* prior advisory mandates;
* active transaction participation;
* last meaningful interaction;
* known senior contact;
* conflict restriction.

## Inappropriate CRM scope

* Sales pipeline stage;
* lead score;
* marketing campaigns;
* email-open tracking;
* cold-outreach sequences;
* opportunity revenue forecasting;
* generic engagement scoring.

M&Ai’s relationship model should support transaction execution, not general sales operations.

---

# 12. Primary users

## 12.1 Analyst

Needs to:

* Find the correct organization;
* create a new record;
* validate identifiers;
* associate it with a deal;
* identify duplicates;
* maintain aliases and classifications.

## 12.2 Associate

Needs to:

* Review organization identity;
* confirm relationship ownership;
* connect prior transaction history;
* resolve data-quality issues;
* prepare a deal association.

## 12.3 Vice President

Needs to:

* Understand institutional relationship;
* identify active transaction roles;
* review conflicts;
* assign relationship owners;
* approve sensitive associations.

## 12.4 Managing Director or Partner

Needs:

* Relationship context;
* prior mandates;
* senior contacts;
* current transaction exposure;
* conflict or confidentiality restrictions.

## 12.5 Deal administrator

Needs to:

* Maintain canonical records;
* resolve duplicates;
* archive obsolete organizations;
* import organizations;
* manage data quality.

Administrative access should not automatically reveal restricted deal information.

## 12.6 Compliance or conflict reviewer

Needs to:

* Review legal identity;
* inspect relationship categories;
* review restricted conflict records;
* approve or block associations.

---

# 13. Primary job to be done

> When a banker needs to find or add a company, provide the authoritative institutional organization record and show how it may safely be reused in a transaction.

## Secondary jobs

The user should also be able to:

* Search by legal name or alias;
* search by tax or registration identifier;
* filter by organization type;
* find current clients;
* find active counterparties;
* identify organizations involved in active deals;
* find relationship owners;
* inspect conflict state;
* create a new record;
* associate an existing organization with a deal;
* identify possible duplicates;
* request identity review;
* archive an inactive record;
* export an authorized directory.

---

# 14. Core conceptual layers

The Organizations workspace should distinguish six layers.

## Layer 1 — Identity

What organization is this?

## Layer 2 — Legal structure

Which legal entities, registrations and corporate-group relationships apply?

## Layer 3 — Institutional relationship

How is the user’s institution related to it?

## Layer 4 — Transaction participation

Which deals involve it, and in which roles?

## Layer 5 — Governance

What conflicts, restrictions, verification states and permissions apply?

## Layer 6 — Provenance

Where did the record come from, and when was it last reviewed?

---

# 15. Organization taxonomy

Recommended primary organization types:

* Operating company;
* holding company;
* corporate group;
* private-equity firm;
* investment fund;
* family office;
* investment bank;
* commercial bank;
* lender;
* law firm;
* accounting or diligence firm;
* consulting firm;
* insurance provider;
* government or regulator;
* escrow or trust provider;
* special-purpose vehicle;
* nonprofit;
* other institution.

An organization should normally have one primary type.

It may also have descriptive tags.

Examples:

* Strategic acquirer;
* founder-owned;
* sponsor-backed;
* listed company;
* portfolio company;
* professional-services firm.

---

# 16. Institutional relationship model

An organization may have one or more institution-level relationship classifications.

Recommended:

* Current client;
* former client;
* prospective client;
* transaction counterparty;
* recurring counterparty;
* referral partner;
* professional advisor;
* financing source;
* service provider;
* regulator;
* no established relationship;
* restricted relationship.

## UX rule

Relationship classification should not be confused with transaction role.

Example:

> Northbridge Automation
> Institutional relationship: Established counterparty
> Project Horizon role: Buyer candidate

---

# 17. Transaction-role model

Recommended deal-specific roles:

* Target;
* seller;
* buyer;
* bidder;
* investor;
* lender;
* financing source;
* management shareholder;
* minority shareholder;
* advisor;
* legal counsel;
* accounting advisor;
* diligence provider;
* insurer;
* escrow agent;
* regulator;
* material customer;
* material supplier;
* other participant.

A deal association should preserve:

* Role;
* role version;
* effective date;
* confidentiality;
* owner;
* status;
* source.

---

# 18. Organization lifecycle

Recommended organization-record states:

## Draft

Record exists but has not been reviewed.

## Active

Available for normal use.

## Needs review

Identity, relationship or classification requires confirmation.

## Duplicate review

The record may duplicate another organization.

## Restricted

Existence or details have controlled visibility.

## Inactive

Organization is no longer operational or relevant, but its history remains available.

## Archived

Removed from normal selection while preserving historical references.

## Merged

The record was consolidated into another canonical organization.

---

# 19. Recommended workspace structure

The Organizations screen should contain five principal views:

1. **Directory**
2. **Relationships**
3. **Identity Review**
4. **Duplicates**
5. **Archived**

## Directory

Canonical organization registry.

## Relationships

Saved views centered on clients, counterparties, advisors and relationship ownership.

## Identity Review

Organizations with incomplete, conflicting or stale identity data.

## Duplicates

Potential duplicate records requiring resolution.

## Archived

Inactive, merged or archived records.

For the MVP, Relationships and Identity Review may initially exist as saved views rather than separate permanent tabs.

---

# 20. Default view: Directory

The Directory should use a dense, accessible table.

It should optimize for:

* Search;
* identity confirmation;
* relationship context;
* active-deal context;
* rapid navigation;
* safe reuse.

It should not default to:

* Organization cards;
* logos;
* a geographical map;
* a relationship graph;
* a CRM board.

---

# 21. Page header

## Recommended title

> **Organizations**

Supporting description:

> Find and manage companies, funds, advisors and counterparties used across your institution’s transactions.

## Header summary

Example:

* **148 accessible organizations**
* **23 active in transactions**
* **4 identity reviews**
* **2 possible duplicates**

## Primary action

> **Add organization**

## Secondary actions

* Import organizations;
* review duplicates;
* export directory.

---

# 22. Operational summary

Use no more than four compact summary controls.

| Summary             | Example | Meaning                                          |
| ------------------- | ------: | ------------------------------------------------ |
| Active in deals     |  **23** | Participating in at least one active transaction |
| Current clients     |  **14** | Marked as current institutional relationships    |
| Needs review        |   **4** | Identity or relationship issues                  |
| Possible duplicates |   **2** | Records requiring merge review                   |

Each should filter the Directory.

Avoid making total organization count the principal visual emphasis.

---

# 23. Recommended default columns

1. **Organization**
2. **Type**
3. **Relationship**
4. **Active transaction roles**
5. **Active deals**
6. **Relationship owner**
7. **Identity state**
8. **Conflict or restriction**
9. **Last meaningful update**
10. **Actions**

Optional columns:

* Country;
* sector;
* legal name;
* tax or registration identifier;
* parent organization;
* primary domain;
* historical deals;
* source;
* record owner;
* created date;
* last identity review;
* archived state.

---

# 24. Organization-row anatomy

## Identity

Primary:

> **Northbridge Automation**

Secondary:

> Northbridge Automation, Inc. · United States

## Type

> Operating company

## Relationship

> Established counterparty

## Transaction roles

> Buyer candidate · 1 active deal

## Active deals

> Project Horizon

## Relationship owner

> Marina Alves

## Identity state

> Reviewed

## Conflict

> Clear

## Updated

> Relationship updated 25 July

---

# 25. Organization identity cell

The identity cell should contain:

* Recognized business name;
* legal name, when different;
* jurisdiction;
* optional restrained initials or logo;
* restricted marker, when applicable.

Example:

> **Serra Capital Partners**
> Serra Capital Gestão de Recursos Ltda. · Brazil

Do not make company logos the primary recognition system.

Logos may be:

* Missing;
* outdated;
* inconsistent;
* legally unrelated to the exact entity.

---

# 26. Active-role summary

The row should summarize deal-specific roles without implying permanent categorization.

Example:

> **2 active roles**

* Buyer candidate · Project Horizon;
* lender · Project Aurora.

Selecting the summary should open the relevant deal associations.

---

# 27. Active-deal count

The list may show:

> **2 active · 3 historical**

The count must be permission-aware.

A user without access to a restricted deal may see:

> Additional restricted transaction history exists

or no count, according to policy.

The screen must not leak deal codenames or transaction roles through aggregate counts.

---

# 28. Quick preview panel

Selecting a row should open a right-side preview.

Recommended sections:

1. Identity;
2. relationship;
3. active deals;
4. transaction-role history;
5. primary contacts;
6. conflict state;
7. identity quality;
8. recent meaningful changes.

## Primary actions

* Open organization;
* create deal;
* add to existing deal;
* add contact;
* request identity review.

The preview should not duplicate the full Organization Detail screen.

---

# 29. Search

Search should include:

* Business name;
* legal name;
* trade name;
* alias;
* tax identifier;
* registration identifier;
* website domain;
* parent group;
* sector;
* contact name;
* active deal codename, where authorized.

Placeholder:

> Search organizations, legal names or identifiers

## Search result matching

The result should explain the match.

Example:

> **Northbridge Automation**

Matched alias:

> Northbridge Industrial Systems

Example:

> **Atlas Industrial S.A.**

Matched CNPJ:

> 12.345.678/0001-••

---

# 30. Exact identifier search

Tax and registration identifier search should:

* Normalize punctuation;
* preserve leading zeros;
* support country-specific formats;
* distinguish exact and partial matches;
* restrict sensitive display;
* prevent accidental duplicate creation.

Before creating a new organization, the system should search:

* Legal name;
* normalized identifier;
* domain;
* aliases;
* parent group.

---

# 31. Filters

## Primary filters

* Organization type;
* institutional relationship;
* country;
* active transaction involvement;
* relationship owner;
* identity state.

## Advanced filters

* Sector;
* transaction role;
* active deal;
* conflict state;
* restricted state;
* corporate group;
* source;
* last reviewed date;
* registration type;
* domain;
* created by;
* archived;
* duplicate status;
* current client;
* historical client.

---

# 32. Saved views

Recommended:

* Active clients;
* active counterparties;
* potential buyers;
* active targets;
* professional advisors;
* organizations in current deals;
* no relationship owner;
* identity review required;
* possible duplicates;
* restricted organizations;
* inactive organizations;
* recently added.

Saved views should preserve:

* Filters;
* sort;
* grouping;
* visible columns;
* density.

---

# 33. Sorting

Recommended sort options:

* Organization name;
* last meaningful update;
* active-deal count;
* relationship owner;
* identity-review date;
* date created.

Avoid ranking organizations by:

* Relationship score;
* AI relevance;
* number of communications;
* opaque institutional value.

---

# 34. Grouping

Useful optional groupings:

* Organization type;
* institutional relationship;
* relationship owner;
* country;
* identity state;
* active transaction role.

Grouping should not replace filtering.

Default remains an alphabetical or recently used Directory.

---

# 35. Identity fields

Recommended organization identity fields:

* Display name;
* legal name;
* trade name;
* aliases;
* primary organization type;
* operating status;
* incorporation country;
* headquarters country;
* website;
* domains;
* primary sector;
* secondary sectors;
* description;
* parent organization;
* primary legal entity;
* identity-review state.

---

# 36. Legal identifiers

A legal-entity record may contain:

* CNPJ;
* company-registration number;
* tax identifier;
* LEI;
* fund registration;
* regulatory registration;
* jurisdiction;
* issuing authority;
* effective date;
* expiry, where relevant;
* source;
* verification state.

## UX rule

Do not assume every country uses one universal tax identifier.

The identifier label should adapt to jurisdiction.

Examples:

* CNPJ;
* EIN;
* company number;
* commercial-register number.

---

# 37. Display name and legal name

The display name should optimize banker recognition.

The legal name should preserve formal identity.

Example:

> Display name: **Atlas Industrial**
> Legal name: **Atlas Industrial Sistemas e Serviços S.A.**

The display name may be edited without changing the legal identity.

---

# 38. Aliases

Aliases may include:

* Prior names;
* abbreviated names;
* trading names;
* local-language names;
* common banker references;
* former parent names;
* database-import names.

Each alias should have:

* Alias;
* type;
* source;
* effective dates;
* state.

Aliases improve search but should not become independent organization records.

---

# 39. Domains and websites

Store:

* Primary website;
* verified domains;
* historical domains;
* related subsidiary domains;
* contact-email domains.

Domain matching can support:

* Duplicate detection;
* contact association;
* organization search;
* identity review.

It should not be used as sole proof that two organizations are identical.

---

# 40. Industry classification

Recommended fields:

* Primary industry;
* secondary industries;
* institution-specific taxonomy;
* optional external taxonomy mappings;
* classification state;
* source;
* last reviewed date.

## Classification states

* Confirmed;
* suggested;
* needs review;
* disputed;
* stale.

The system may suggest an industry based on public or provided information, but the institution record should remain reviewable.

---

# 41. Jurisdiction model

Distinguish:

* Incorporation jurisdiction;
* headquarters country;
* operating geographies;
* tax residence;
* regulatory jurisdictions.

The Directory should normally display:

> Headquarters or primary jurisdiction

The full details belong in Organization Detail.

---

# 42. Corporate-group relationships

Recommended relationship types:

* Parent;
* subsidiary;
* portfolio company;
* affiliate;
* joint venture;
* branch;
* managed fund;
* general partner;
* limited partner;
* acquisition vehicle;
* predecessor;
* successor.

Each relationship should contain:

* Related organization;
* relationship type;
* ownership percentage, when known;
* effective dates;
* source;
* state.

---

# 43. Corporate-group visibility

The Directory should support:

> Show group structure

or:

> Group by parent

Example:

```text
Northbridge Automation Group
  ├── Northbridge Automation, Inc.
  ├── Northbridge Brasil Tecnologia Ltda.
  └── Northbridge Europe GmbH
```

Do not force all legal entities into separate top-level rows by default.

The user should be able to search and select the exact legal entity when assigning a transaction participant.

---

# 44. Institutional relationship

Recommended row-level display:

> **Current client**

or:

> **Established counterparty**

Supporting details in preview:

* Relationship owner;
* relationship since;
* recent mandate;
* known restrictions;
* relationship source.

## Relationship state

* Current;
* historical;
* prospective;
* inactive;
* disputed;
* restricted;
* unknown.

---

# 45. Relationship ownership

A relationship may have:

* Primary relationship owner;
* secondary owner;
* specialist contact;
* originating banker;
* executive sponsor.

The Directory should display one principal owner.

## Unassigned state

> **No relationship owner**

Action:

> Assign owner

This is an institutional-governance issue, not necessarily a transaction blocker.

---

# 46. Meaningful interaction

The screen may show the latest meaningful interaction, such as:

* Client meeting;
* transaction discussion;
* mandate;
* conflict review;
* approved outreach;
* submitted proposal;
* completed transaction.

It should not show:

* Every email;
* email-open activity;
* message frequency;
* surveillance-style engagement metrics.

Example:

> Relationship updated after Project Meridian closing · 12 June 2026

---

# 47. Deal associations

An organization’s association with a deal should include:

* Deal;
* transaction role;
* state;
* side;
* relationship owner;
* access level;
* effective dates;
* source;
* confidentiality.

## Association state

* Proposed;
* active;
* inactive;
* removed;
* historical;
* restricted.

---

# 48. Add to existing deal

The action should open a controlled dialog.

Required:

1. Select deal;
2. choose transaction role;
3. choose exact legal entity, where relevant;
4. set confidentiality;
5. assign relationship or deal owner;
6. review consequences;
7. confirm.

## Example

> **Add Northbridge Automation to Project Horizon**

Role:

> Buyer candidate

Legal participant:

> Northbridge Automation, Inc.

Visibility:

> Deal team only

Consequence:

> A candidate record will be created in Buyer Universe.

---

# 49. Create deal from organization

The Directory may offer:

> **Create deal**

The organization should be carried into New Deal Setup.

The user must still select its transaction role.

Examples:

* Use as Target;
* use as Buyer;
* use as Seller;
* use as Client organization;
* use as Other participant.

No deal should be created from an organization row without the standard setup and permission workflow.

---

# 50. Target Dossier creation

When an organization is assigned as a target:

1. Create a deal association;
2. designate the target legal entity or perimeter;
3. create a deal-specific Target Dossier;
4. keep the Organization record reusable;
5. keep transaction evidence isolated.

The Target Dossier should not be stored directly on the global organization record.

The current repository’s entity-level `TargetDossier` should therefore be migrated to a deal-scoped domain.

---

# 51. Contact associations

The Directory may show:

> **4 active contacts**

or a primary-contact preview.

The complete contact list belongs in Organization Detail.

Each contact association should preserve:

* Role;
* organization;
* effective date;
* source;
* primary status;
* confidentiality;
* associated deals.

A person changing employers should not overwrite historical transaction context.

---

# 52. Conflict and restriction summary

The row-level conflict state should remain concise.

Recommended:

* No identified conflict;
* review required;
* potential conflict;
* restricted;
* cleared;
* unknown.

The preview may show:

> **Potential relationship conflict**

Complete sensitive details should require appropriate permission.

## UX rule

Do not use a green “Conflict free” claim.

Use:

> No identified conflict as of 27 July 2026

This preserves review date and scope.

---

# 53. Conflict scope

Potential conflict records may be:

* Institution-wide;
* deal-specific;
* workstream-specific;
* person-specific;
* temporary;
* permanently restricted.

Examples:

* Current client relationship;
* competing mandate;
* legal conflict;
* confidentiality restriction;
* former-client restriction;
* client exclusion;
* relationship-owner restriction.

Organizations should surface the state.

A dedicated conflict workflow may remain separate.

---

# 54. Identity review

The screen should use a cautious identity-review model.

Recommended states:

* Not reviewed;
* in review;
* reviewed;
* changes required;
* insufficient information;
* rejected;
* expired;
* restricted.

## Important wording

Use:

> **Identity reviewed**

rather than:

> **KYB approved**

unless M&Ai is actually performing a defined, legally reviewed KYB process.

The current repository’s `kybStatus` may remain an internal field during transition, but the banker-facing language should avoid overstating regulatory compliance.

---

# 55. Identity-review scope

An identity review may verify:

* Legal name;
* registration identifier;
* jurisdiction;
* active status;
* corporate group;
* principal domain;
* transaction participant;
* beneficial ownership, where configured;
* sanctions or compliance screening, when provided through an appropriate workflow.

Each review should state:

* Scope;
* reviewer;
* sources;
* review date;
* expiry or refresh policy.

---

# 56. Data-quality state

A separate data-quality indicator may identify:

* Missing legal name;
* missing registration identifier;
* conflicting country;
* duplicate domain;
* unconfirmed parent;
* stale relationship owner;
* invalid contact domain;
* incomplete source provenance.

Recommended states:

* Complete;
* usable;
* incomplete;
* conflict;
* stale;
* duplicate review;
* restricted.

Avoid an opaque:

> Organization quality: 72%

---

# 57. Duplicate detection

Possible duplicate signals:

* Same normalized tax identifier;
* same legal name;
* same website domain;
* highly similar business name;
* same registered address;
* same parent and jurisdiction;
* imported aliases;
* overlapping contacts.

## Duplicate states

* Possible duplicate;
* likely duplicate;
* related but distinct;
* confirmed duplicate;
* resolved;
* ignored with reason.

---

# 58. Duplicate review

A duplicate-review workspace should compare:

| Field        | Record A                     | Record B                   |
| ------------ | ---------------------------- | -------------------------- |
| Display name | Northbridge Automation       | North Bridge Automation    |
| Legal name   | Northbridge Automation, Inc. | Northbridge Automation Inc |
| Domain       | northbridge-auto.example     | northbridge-auto.example   |
| Country      | United States                | United States              |
| Active deals | 2                            | 1                          |
| Contacts     | 5                            | 2                          |

Actions:

* Merge;
* mark related but distinct;
* keep separate;
* request identity review.

---

# 59. Merge behavior

Merging is consequential.

A merge should:

* Select a canonical record;
* preserve all aliases;
* preserve legal entities;
* preserve contacts;
* preserve deal associations;
* preserve references;
* preserve audit history;
* redirect old identifiers;
* identify conflicting fields;
* require appropriate authority.

It should never:

* Delete historical references;
* silently combine conflicting legal entities;
* expose restricted deal associations;
* overwrite reviewed values without a decision.

---

# 60. Merge conflict resolution

Before merge, show:

* Conflicting legal names;
* tax identifiers;
* jurisdictions;
* parent relationships;
* relationship owners;
* access restrictions;
* active deal roles.

The user must resolve or explicitly preserve each material conflict.

Example:

> **Cannot merge automatically**

> The records have different CNPJs and may represent separate legal entities within the same corporate group.

Recommended action:

> Link under one parent organization

---

# 61. Source provenance

Each material identity field should support provenance.

Source types:

* User entered;
* imported directory;
* client provided;
* transaction document;
* public registry;
* prior deal record;
* contact domain;
* integrated system;
* M&Ai suggestion.

## Field-level provenance

Example:

> Legal name
> Atlas Industrial Sistemas e Serviços S.A.
> Source: Corporate registration extract
> Reviewed 22 July 2026

---

# 62. Data freshness

Different fields have different freshness requirements.

Examples:

* Legal registration;
* operating status;
* website;
* ownership;
* relationship owner;
* current contacts;
* sanctions or compliance state;
* active client relationship.

Recommended states:

* Current;
* review due;
* stale;
* unknown;
* not applicable.

The Directory should surface only material freshness issues.

---

# 63. Change detection

Meaningful organization changes may include:

* Legal-name change;
* merger or acquisition;
* parent-company change;
* dissolution;
* new domain;
* jurisdictional change;
* relationship-owner change;
* restricted status;
* active-client state change.

## Workflow

```text
Organization change detected
  ↓
Identity review created
  ↓
Affected deal associations identified
  ↓
Users review consequence
  ↓
Canonical record updated
```

A global identity change should not silently rewrite historical transaction records.

---

# 64. Create-organization flow

The **Add organization** action should use a short wizard or progressive form.

## Step 1 — Search existing records

Search by:

* Name;
* identifier;
* domain;
* alias.

## Step 2 — Basic identity

* Display name;
* legal name;
* organization type;
* jurisdiction;
* primary identifier.

## Step 3 — Relationship

* Institutional relationship;
* relationship owner;
* restrictions.

## Step 4 — Structure

* Parent organization;
* primary legal entity;
* aliases.

## Step 5 — Review

* Potential duplicates;
* data-quality warnings;
* visibility;
* create.

---

# 65. Minimal creation

The product should allow a lightweight record when a user does not yet know every field.

Minimum:

* Display name;
* organization type or unknown;
* country or unknown;
* creator;
* source.

State:

> **Draft · Identity review required**

The system should not require invented tax identifiers or legal names merely to proceed.

---

# 66. Creation from a deal

When created during New Deal Setup or Buyer Universe, the record should inherit:

* Deal context;
* proposed transaction role;
* source;
* creating user;
* confidentiality.

The organization still needs:

* Duplicate checking;
* identity state;
* institutional relationship review.

---

# 67. Editing

Routine edits may include:

* Display name;
* alias;
* website;
* industry;
* relationship owner;
* description.

Controlled edits should include:

* Legal name;
* tax identifier;
* parent organization;
* merged state;
* conflict state;
* restricted visibility;
* identity-review decision.

Material edits should create version history.

---

# 68. Concurrent editing

The current repository already uses entity-version checks.

The final product should retain version-aware updates.

Example:

> **This organization changed while you were editing it**

Changes:

* Relationship owner updated;
* legal name reviewed;
* new active deal associated.

Actions:

* Compare;
* reload;
* reapply non-conflicting edits.

---

# 69. Bulk actions

Appropriate:

* Assign relationship owner;
* apply institution tags;
* request identity review;
* export selected records;
* update non-sensitive classification;
* add to saved group.

Controlled:

* Change relationship status;
* change access;
* archive records;
* associate with a deal.

Inappropriate:

* Bulk merge;
* bulk archive active organizations;
* bulk mark identity reviewed;
* bulk clear conflict;
* bulk create deals.

---

# 70. Archiving

An organization may be archived when:

* It is no longer used;
* it was created in error;
* it has been replaced;
* it is an obsolete import.

Before archive, show:

* Active deals;
* open tasks;
* active relationships;
* contacts;
* restrictions;
* downstream references.

## Rule

An organization with active deal participation should not be archived.

The current repository already enforces this constraint, and the final UX should explain it before the user reaches an error.

---

# 71. Archive confirmation

Example:

> **Archive Aurora Growth Fund?**

This will:

* Remove it from normal selection;
* preserve historical deals and contacts;
* preserve audit history;
* preserve existing references.

It will not:

* Delete transaction records;
* delete contacts;
* remove historical evidence.

---

# 72. Restore

Authorized users should be able to restore an archived organization.

A restored record should retain:

* Original ID;
* aliases;
* history;
* relationships;
* prior deal associations.

If a replacement canonical record exists, the user should review a possible merge instead.

---

# 73. Restricted organizations

An organization may be restricted because:

* It is involved in a confidential mandate;
* relationship information is sensitive;
* conflict details are privileged;
* senior-bank relationship is restricted;
* legal or compliance policy requires it.

## Restricted list behavior

Depending on policy, unauthorized users may see:

* Nothing;
* a generic restricted record;
* basic identity without relationship detail;
* only deal-specific permitted context.

The screen must not leak sensitive identity through:

* Search suggestions;
* counts;
* filters;
* exports;
* aliases;
* contact domains.

---

# 74. Permissions

Recommended permission dimensions:

* View identity;
* view relationship;
* view contacts;
* view active deal associations;
* view historical deal associations;
* view conflict state;
* view conflict details;
* edit identity;
* edit relationship;
* merge;
* archive;
* export.

Permissions should support:

* Institution roles;
* relationship ownership;
* restricted groups;
* deal-specific access;
* compliance reviewers.

---

# 75. External-user boundary

Clients, counterparties and external advisors should not receive access to the institution-wide Organizations screen by default.

Their experience should remain limited to:

* Their own organization;
* assigned deal context;
* permitted contacts;
* specific requests or approvals.

They should never see:

* Other clients;
* other counterparties;
* institutional relationship ownership;
* prior mandates;
* confidential conflict states.

---

# 76. Contextual Copilot

Suggested prompts:

* Find Northbridge Automation.
* Are these two records duplicates?
* Which organizations are active in Project Horizon?
* Show every current client without a relationship owner.
* Which active deals involve Serra Capital Partners?
* Find potential buyer organizations in Brazil.
* Which organizations need identity review?
* Summarize our relationship with Meridian Industrial Group.
* Create a draft organization record from this document.
* Which organizations have unresolved conflicts?

## Response requirements

The Copilot should:

* Respect institution and deal permissions;
* distinguish organization identity from transaction role;
* identify deal-specific context;
* cite the organization record and associated sources;
* avoid revealing restricted relationships;
* route the user to Organization Detail or the relevant deal.

---

# 77. Recommended desktop layout

For a **1440 × 900** canvas:

| Region                     | Approximate width |
| -------------------------- | ----------------: |
| Compact global sidebar     |          72–80 px |
| Filter and saved-view rail |        220–260 px |
| Organization directory     |        700–820 px |
| Preview panel              |        360–440 px |
| Page padding               |          24–32 px |

## Recommended composition

```text
┌────────┬──────────────────────────────────────────────────────────────┐
│ Global │ Organizations · 23 active in deals · 4 reviews             │
│ shell  ├──────────────────────────────────────────────────────────────┤
│        │ Directory  Relationships  Identity Review  Duplicates       │
│        ├──────────────┬─────────────────────────┬─────────────────────┤
│        │ Saved views  │ Organization directory │ Selected preview    │
│        │              │                         │                     │
│        │ Active deals │ Northbridge Automation  │ Operating company   │
│        │ Clients      │ Established counterparty│ United States       │
│        │ Counterparties│ Buyer candidate · 1 deal│                     │
│        │ Advisors     │                         │ Relationship        │
│        │ Needs review │ Atlas Industrial        │ Marina Alves        │
│        │ Duplicates   │ Current client · Target │                     │
│        │              │                         │ Active deal         │
│        │              │ Serra Capital Partners  │ Project Horizon     │
│        │              │ Financial sponsor       │                     │
│        │              │                         │ [ Open organization]│
└────────┴──────────────┴─────────────────────────┴─────────────────────┘
```

---

# 78. Table density

Recommended:

* Row height: 60–72 px;
* sticky header;
* eight to ten visible rows at 900 px height;
* horizontal scrolling only when optional columns are enabled;
* column customization;
* clear row action menu;
* explicit **Open organization** link.

The entire row may be selectable, but a semantic link should remain available.

---

# 79. UI design direction

## Overall character

Aim for:

> **An institutional relationship directory with corporate-identity rigor and transaction awareness**

The screen should feel:

* Trustworthy;
* organized;
* restrained;
* reusable;
* relationship-aware;
* permission-conscious;
* information-dense.

It should not feel:

* Like a sales CRM;
* like LinkedIn;
* like a logo gallery;
* like a generic address book;
* like a company-data marketplace.

---

# 80. Visual hierarchy

Prioritize:

1. Recognizable organization identity;
2. legal identity distinction;
3. institutional relationship;
4. active transaction context;
5. relationship owner;
6. identity state;
7. conflict or restriction state;
8. metadata.

Do not prioritize:

* Logo size;
* employee count;
* number of contacts;
* arbitrary relationship score;
* last email date.

---

# 81. Color application

Use the established M&Ai palette:

* Canvas Cream: `#F3F0EE`;
* Lifted Cream: `#FCFBFA`;
* Ink Black: `#141413`;
* Signal Orange: `#CF4500`;
* Light Signal Orange: `#F37338`;
* Dust Taupe: `#D1CDC7`;
* Slate Gray: `#696969`.

## Semantic use

* Identity reviewed: green;
* review required: Signal Orange;
* possible duplicate: amber;
* potential conflict: red-orange;
* restricted: dark neutral;
* inactive: gray;
* current client: blue-neutral;
* active deal association: Ink Black or restrained orange marker.

Avoid assigning a unique color to every organization type.

---

# 82. Typography

Use **Sofia Sans**.

| Element               |     Size |  Weight |
| --------------------- | -------: | ------: |
| Page title            | 26–30 px | 500–600 |
| Organization name     | 14–16 px | 650–700 |
| Selected organization | 20–24 px | 600–700 |
| Legal name            | 12–14 px | 450–550 |
| Section heading       | 15–17 px | 650–700 |
| Body                  | 13–15 px | 450–500 |
| Metadata              | 12–13 px | 450–550 |
| Status                | 11–12 px | 650–700 |

Use tabular numerals for:

* Registration identifiers;
* deal counts;
* dates;
* ownership percentages.

---

# 83. Geometry and density

Recommended:

* Table surface: 6–10 px radius;
* preview panel: 8–12 px radius or flush drawer;
* compact tags;
* restrained borders;
* 40–48 px filters;
* 44 px minimum controls.

Avoid:

* Oversized logo cards;
* circular relationship scores;
* heavy shadows;
* gradient cards;
* large empty hero areas.

---

# 84. UX design principles

## 84.1 Identity before relationship

The user must first know which organization the record represents.

## 84.2 Deal role remains contextual

Buyer, seller and target are not permanent organization types.

## 84.3 Organization and legal entity remain distinct

Do not force corporate groups into one tax-ID field.

## 84.4 Organization and Contact remain distinct

People should not become company records.

## 84.5 Reuse before recreation

Search and resolve an existing organization before creating another.

## 84.6 Preserve historical context

Current identity changes must not rewrite prior transaction facts.

## 84.7 Duplicates are resolved, not deleted

Preserve references and aliases.

## 84.8 Relationship context remains permission-aware

Prior mandates and conflicts may be highly sensitive.

## 84.9 Identity review is scoped

Do not claim universal KYB or compliance approval.

## 84.10 Data quality is explicit

Show missing or conflicting fields, not an opaque quality score.

## 84.11 Organization records do not contain cross-deal diligence

Deal evidence belongs in Target Dossiers.

## 84.12 Archive preserves history

Archiving removes the record from normal selection but does not erase it.

---

# 85. System states

## 85.1 No organizations

> **Build the organization directory**

Primary action:

> Add organization

Secondary:

> Import organizations

## 85.2 No search results

> **No organizations match this search**

Actions:

* Clear filters;
* search aliases;
* add organization.

Before creation, show potential similar matches.

## 85.3 Loading

Use table skeletons.

## 85.4 Partial data failure

> **Relationship information unavailable**

Identity records remain accessible.

## 85.5 Identity review required

Show exact missing or conflicting fields.

## 85.6 Possible duplicate

Keep both records visible until review completes.

## 85.7 Organization merged

> **This record was merged into Northbridge Automation**

Action:

> Open canonical organization

## 85.8 Restricted organization

Show only permitted identity and action.

## 85.9 Active-deal archive blocked

> **Organization cannot be archived**

> It participates in two active transactions.

Actions:

* Review active deals;
* cancel.

## 85.10 Stale organization

> **Identity review due**

Supporting:

> Corporate ownership was last reviewed 18 months ago.

## 85.11 Concurrent edit

Show changed fields before reload.

## 85.12 Import conflict

Preserve the import row and request resolution.

## 85.13 Archived

Read-only by default, with Restore action for authorized users.

## 85.14 Offline

Allow review of safely cached records where policy permits.

Disable:

* Create;
* edit;
* merge;
* archive;
* associate with deal.

---

# 86. Responsive behavior

## Desktop — 1280 px and above

* Persistent saved-view rail;
* full table;
* preview panel;
* complete filters.

## Tablet — 768–1279 px

* Filter rail collapses;
* fewer default columns;
* preview opens as drawer;
* legal name appears inside identity cell.

## Mobile — below 768 px

Use compact organization cards showing:

* Display name;
* legal name;
* type;
* relationship;
* active-deal role;
* identity state;
* relationship owner.

Recommended order:

1. Search;
2. active-deal organizations;
3. needs review;
4. saved views;
5. directory.

Duplicate merge and corporate-group maintenance remain desktop-first.

---

# 87. Accessibility requirements

The screen should support:

* Semantic organization table;
* row headers using organization name;
* keyboard table navigation;
* visible focus;
* no color-only identity states;
* descriptive conflict labels;
* accessible identifier masking;
* screen-reader distinction between display and legal name;
* accessible corporate-group tree;
* announced search filtering;
* minimum 44 × 44 px controls;
* descriptive archive and merge actions;
* accessible duplicate comparison;
* correct reading of acronyms such as CNPJ and LEI;
* explicit restricted-state descriptions.

Avoid buttons labeled:

> View

Prefer:

> Open Northbridge Automation

---

# 88. Figma component architecture

## `OrganizationsHeader`

Properties:

* Populated;
* identity review;
* duplicates;
* archived;
* empty;
* restricted.

## `OrganizationViewTabs`

* Directory;
* relationships;
* identity review;
* duplicates;
* archived.

## `OrganizationSummary`

Variants:

* Active deals;
* clients;
* review;
* duplicates;
* selected.

## `OrganizationFilterRail`

States:

* Default;
* filtered;
* collapsed;
* mobile.

## `OrganizationDirectory`

States:

* Populated;
* grouped;
* filtered;
* loading;
* empty;
* partial error.

## `OrganizationRow`

Properties:

* Active;
* client;
* counterparty;
* review;
* duplicate;
* restricted;
* inactive;
* archived;
* selected.

## `OrganizationIdentity`

Properties:

* Display name;
* legal name;
* alias match;
* legal-entity match;
* restricted.

## `InstitutionRelationship`

Properties:

* Current client;
* historical client;
* counterparty;
* advisor;
* service provider;
* unknown;
* restricted.

## `TransactionRoleSummary`

Properties:

* One active;
* multiple;
* historical;
* restricted;
* none.

## `IdentityReviewState`

Properties:

* Not reviewed;
* in review;
* reviewed;
* changes required;
* rejected;
* expired.

## `ConflictSummary`

Properties:

* No identified conflict;
* review;
* potential;
* cleared;
* restricted.

## `OrganizationPreview`

States:

* Summary;
* relationships;
* active deals;
* identity;
* restricted.

## `CreateOrganizationFlow`

States:

* Search;
* identity;
* relationship;
* structure;
* review;
* duplicate warning;
* success.

## `DuplicateComparison`

Properties:

* Likely duplicate;
* related;
* conflict;
* merge ready;
* restricted.

## `MergeOrganizationFlow`

States:

* Select canonical;
* resolve fields;
* review references;
* approve;
* complete.

## `CorporateGroupTree`

Properties:

* Parent;
* subsidiary;
* portfolio company;
* legal entity;
* collapsed;
* restricted.

## `ArchiveOrganization`

States:

* Available;
* active deal blocked;
* restricted;
* archived;
* restore.

---

# 89. Production object model

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

## `OrganizationDomain`

```text
id
organizationId
domain
domainType
verificationState
effectiveFrom
effectiveTo
sourceReferenceId
createdAt
```

## `OrganizationRelationship`

```text
id
institutionId
organizationId
relationshipType
relationshipState
primaryOwnerId
secondaryOwnerIds
effectiveFrom
effectiveTo
sourceReferenceId
accessLevel
createdAt
updatedAt
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
roleTitle
department
primary
effectiveFrom
effectiveTo
sourceReferenceId
accessLevel
createdAt
```

## `OrganizationIdentityReview`

```text
id
organizationId
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

## `OrganizationConflictSummary`

```text
id
organizationId
scopeType
scopeId
state
restricted
reviewedBy
reviewedAt
expiresAt
createdAt
```

## `OrganizationDuplicateCandidate`

```text
id
organizationId
possibleDuplicateOrganizationId
matchSignals
state
reviewedBy
reviewedAt
resolution
createdAt
```

## `OrganizationMerge`

```text
id
sourceOrganizationIds
canonicalOrganizationId
fieldResolution
referenceMigrationState
approvedBy
approvedAt
completedAt
createdAt
```

## `OrganizationSourceReference`

```text
id
organizationId
sourceType
sourceObjectId
sourceVersionId
label
effectiveAt
accessLevel
createdAt
```

The organization model should remain institution-scoped. Deal-specific evidence and analytical facts should not be stored directly on these objects.

---

# 90. Suggested routes

Primary:

```text
/organizations
```

Selected preview:

```text
/organizations?organization=:organizationId
```

Organization Detail:

```text
/organizations/:organizationId
```

Relationships:

```text
/organizations?view=relationships
```

Identity review:

```text
/organizations?view=identity-review
```

Duplicates:

```text
/organizations?view=duplicates
```

Archived:

```text
/organizations?view=archived
```

Create:

```text
/organizations/new
```

Duplicate review:

```text
/organizations/duplicates/:duplicateCandidateId
```

Merge:

```text
/organizations/merge?records=:id1,:id2
```

Contacts should remain:

```text
/contacts/:contactId
```

The legacy routes:

```text
/entities
/entities/:entityId
```

should redirect to Organizations while preserving identifiers where possible.

---

# 91. API direction

Recommended endpoints:

```text
GET    /api/organizations
POST   /api/organizations
GET    /api/organizations/:id
PATCH  /api/organizations/:id
POST   /api/organizations/:id/archive
POST   /api/organizations/:id/restore

GET    /api/organizations/:id/legal-entities
POST   /api/organizations/:id/legal-entities

GET    /api/organizations/:id/relationships
POST   /api/organizations/:id/relationships

GET    /api/organizations/:id/deal-roles
POST   /api/deals/:dealId/organization-roles

GET    /api/organizations/:id/contacts
POST   /api/organizations/:id/contacts

GET    /api/organization-duplicates
POST   /api/organization-duplicates/:id/resolve
POST   /api/organization-merges
```

Writes should support:

* Version checks;
* duplicate detection;
* authority checks;
* restricted fields;
* audit events;
* reference preservation.

---

# 92. Repository direction

The current repository provides useful initial foundations:

* `/entities` and `/entities/:id` routes;
* paginated listing;
* search by legal name and tax ID;
* role, sector, country and KYB filters;
* create and edit forms;
* version conflict handling;
* archive controls;
* prevention of archive while active deals exist;
* primary-advisor association;
* related-deal loading.

These should be retained selectively.

## Keep

* Contract-backed CRUD;
* pagination;
* loading, empty and error states;
* version-aware updates;
* unique normalized identifier checks;
* archive guard for active deals;
* reusable table and form components;
* related-deal direction.

## Rename

* `Entity` → `Organization`;
* `EntitiesWorkspace` → `OrganizationsWorkspace`;
* `/entities` → `/organizations`;
* “Portfolio & Clients” → `Organizations`;
* “Add entity” → `Add organization`.

## Replace

### Global entity roles

Current:

* Buyer;
* seller;
* target;
* institution.

Replace with:

* Organization type;
* institutional relationship;
* deal-specific transaction roles.

### Single tax ID

Current:

> One `taxId` per entity.

Replace with:

* One or more legal entities;
* jurisdiction-aware identifiers;
* primary identifier for simplified MVP display.

### Contact email

Current:

> One `contactEmail` field.

Replace with:

* Separate Contact records;
* organization domains;
* primary contact association.

### KYB status

Current:

> Pending, in review, approved, rejected.

Reframe banker-facing language as:

> Identity Review

unless a real compliance workflow defines the scope and authority of KYB approval.

### Entity-level Target Dossier

Move to:

> Deal-specific Target Dossier

An organization participating in several transactions cannot safely share one dossier across all deals.

## Add

* Display name and aliases;
* organization and legal-entity separation;
* institutional relationship;
* relationship owner;
* deal-role associations;
* active and historical deal summary;
* contacts;
* corporate-group relationships;
* identity-review records;
* conflict summary;
* duplicate detection;
* merge workflow;
* field-level provenance;
* restricted organization state;
* import workflow.

---

# 93. What not to include

Avoid:

* Buyer, seller and target as permanent global categories;
* one organization record per deal;
* Target Dossier stored globally;
* individuals stored as organizations;
* one generic contact-email field;
* one universal tax-ID assumption;
* logos as the primary identity mechanism;
* an opaque relationship score;
* sales-pipeline stages;
* email-open tracking;
* unrestricted prior-deal visibility;
* conflict-free guarantees;
* KYB-approved claims without defined process;
* duplicate deletion;
* silent merges;
* archive while active deals exist;
* bulk identity approval;
* bulk conflict clearance;
* company facts copied from one deal into another;
* real customer or counterparty names in pitch fixtures.

---

# 94. MOCKED — Pitch and demo specification

## 94.1 Purpose of the mocked screen

The mocked Organizations screen should demonstrate:

* Reusable institutional records;
* deal-specific role history;
* relationship ownership;
* identity governance;
* transaction linkage.

Its pitch narrative is:

> **M&Ai maintains one reusable institutional identity for every company while keeping evidence, roles and decisions isolated by transaction.**

This screen is operationally important but weak as a primary static pitch image.

Use it for:

* Product walkthroughs;
* architecture explanation;
* live demo setup;
* an appendix;
* demonstrating institutional memory.

Do not replace the Diligence Decision Room with this screen in the main product slide.

---

# 95. Mocked shell state

Institution:

> **Atlas M&A Advisory**

User:

> **Ana Costa · Vice President**

Breadcrumb:

> Organizations

Global navigation:

* Home;
* Deals;
* **Organizations**;
* Tasks & Approvals;
* Team.

Top bar:

* Global search;
* Tasks: 3;
* Notifications: 2;
* Ask M&Ai;
* Ana Costa.

---

# 96. Mocked page header

Title:

> **Organizations**

Description:

> Companies, funds, advisors and counterparties used across Atlas M&A Advisory transactions.

Summary:

* **148 organizations**
* **23 active in deals**
* **4 identity reviews**
* **2 possible duplicates**

Primary action:

> **Add organization**

Secondary:

> Review duplicates

---

# 97. Mocked organization directory

Show seven fictional organizations.

## Northbridge Automation — selected

> **Northbridge Automation**
> Operating company · United States
> Established counterparty
> Buyer candidate · Project Horizon
> Relationship owner: Marina Alves
> Identity reviewed · Conflict clear

## Atlas Industrial

> **Atlas Industrial**
> Operating company · Brazil
> Current client relationship
> Target · Project Horizon
> Relationship owner: Ana Costa
> Identity reviewed

## Serra Capital Partners

> **Serra Capital Partners**
> Private-equity firm · Brazil
> Established counterparty
> Buyer candidate · Project Horizon
> Relationship owner: Daniel Ribeiro
> Capacity review active

## Meridian Industrial Group

> **Meridian Industrial Group**
> Corporate group · Germany
> Historical counterparty
> Buyer · Project Meridian
> Relationship owner: Marina Alves
> Identity review due

## Boreal Logistics

> **Boreal Logistics**
> Operating company · Brazil
> Current client
> Target · Project Atlas
> Potential conflict review

## Lume Legal Advisors

> **Lume Legal Advisors**
> Law firm · Brazil
> Professional advisor
> Counsel · 3 active deals
> Relationship owner: Ana Costa

## North Bridge Automation Inc.

> **North Bridge Automation Inc.**
> Operating company · United States
> No established relationship
> **Possible duplicate**

---

# 98. Mocked selected preview

## Identity

> **Northbridge Automation**

Legal name:

> Northbridge Automation, Inc.

Type:

> Operating company

Headquarters:

> United States

Industry:

> Industrial automation and monitoring software

Identity:

> Reviewed 22 July 2026

## Institutional relationship

> **Established counterparty**

Primary relationship owner:

> Marina Alves

Relationship since:

> 2023

Last meaningful interaction:

> Project Meridian closing review · 12 June 2026

## Active transaction role

> **Project Horizon**
> Buyer candidate · Proposed shortlist

## Historical transaction

> **Project Meridian**
> Buyer · Closed 2025

## Conflict state

> No identified conflict as of 25 July 2026

## Actions

* **Open organization**
* Add to deal
* Create deal
* Add contact

---

# 99. Mocked saved views

Show:

* Active in deals — 23
* Current clients — 14
* Counterparties — 31
* Professional advisors — 12
* Identity review — 4
* Possible duplicates — 2
* No relationship owner — 6

Selected:

> Active in deals

---

# 100. Mocked filters

Visible filters:

* Type: All;
* relationship: All;
* country: All;
* active deal: Yes;
* relationship owner: All.

Search:

> Search organizations, legal names or identifiers

For the static pitch mock, hide advanced filters.

---

# 101. Recommended static pitch composition

```text
┌──────────────────────────────────────────────────────────────────┐
│ Organizations · 23 active in deals · 4 identity reviews         │
├───────────────────────────────┬──────────────────────────────────┤
│ Organization directory        │ Northbridge Automation           │
│                               │                                  │
│ Northbridge Automation        │ Operating company · United States│
│ Buyer candidate · Horizon     │                                  │
│                               │ Established counterparty         │
│ Atlas Industrial              │ Owner: Marina Alves              │
│ Target · Horizon              │                                  │
│                               │ Active transaction               │
│ Serra Capital Partners        │ Project Horizon                  │
│ Buyer candidate · Horizon     │ Buyer candidate                  │
│                               │                                  │
│ Meridian Industrial Group     │ Identity reviewed                │
│ Historical buyer              │ Conflict clear                   │
│                               │                                  │
│ North Bridge Automation       │ [ Open organization ]            │
│ Possible duplicate            │                                  │
└───────────────────────────────┴──────────────────────────────────┘
```

This communicates:

* Reusable organization identity;
* active deal context;
* relationship ownership;
* duplicate governance;
* separation between organization and transaction role.

---

# 102. Pitch-specific simplification

## Keep visible

* Organizations;
* 23 active in deals;
* four organizations;
* Northbridge Automation;
* established counterparty;
* Project Horizon;
* buyer candidate;
* relationship owner;
* identity reviewed;
* possible duplicate.

## Hide

* Registration identifiers;
* complete filters;
* contact details;
* corporate-group tree;
* conflict details;
* archive controls;
* import actions;
* full history;
* all row columns.

## Readability requirement

At deck scale, these should remain readable:

* **Organizations**
* **23 active in deals**
* **Northbridge Automation**
* **Established counterparty**
* **Project Horizon**
* **Buyer candidate**
* **Identity reviewed**
* **Possible duplicate**

---

# 103. Recommended demo flows

## Flow A — Find and open organization

```text
Organizations
  ↓
Search “Northbridge”
  ↓
Alias and legal-name matches appear
  ↓
Select canonical organization
  ↓
Open Organization Detail
```

## Flow B — Organization to new deal

```text
Open Atlas Industrial
  ↓
Create deal
  ↓
Select Sell-side
  ↓
Assign Atlas Industrial as Target
  ↓
Select exact legal entity
  ↓
New Deal Setup continues
  ↓
Deal-specific Target Dossier created
```

## Flow C — Add counterparty to existing deal

```text
Northbridge Automation
  ↓
Add to existing deal
  ↓
Project Horizon
  ↓
Role: Buyer candidate
  ↓
Visibility: Restricted deal team
  ↓
Candidate created in Buyer Universe
```

## Flow D — Duplicate review

```text
Possible duplicates
  ↓
Northbridge Automation
  ↓
North Bridge Automation Inc.
  ↓
Compare identifiers and domain
  ↓
Confirm duplicate
  ↓
Select canonical record
  ↓
Merge references
```

## Flow E — Related legal entities

```text
Open Northbridge Automation Group
  ↓
Review subsidiaries
  ↓
Select Northbridge Brasil Tecnologia Ltda.
  ↓
Associate exact entity with transaction
```

## Flow F — Archive protection

```text
Archive Boreal Logistics
  ↓
Two active deals detected
  ↓
Archive blocked
  ↓
Review deal associations
```

## Flow G — Identity review

```text
Identity Review
  ↓
Meridian Industrial Group
  ↓
Parent relationship changed
  ↓
Review source
  ↓
Update organization structure
  ↓
Affected deal associations notified
```

---

# 104. UX prototype tasks to validate

Test with bankers using tasks such as:

1. Find an organization by common name.
2. Find it by legal name.
3. Find it by CNPJ or other identifier.
4. Determine whether two records are duplicates.
5. Identify the canonical record.
6. Find its relationship owner.
7. Determine which active deals involve it.
8. Determine its role in each deal.
9. Distinguish organization type from transaction role.
10. Create a new draft organization.
11. Add an alias.
12. Associate it with an existing deal.
13. Select the correct legal entity.
14. Create a new deal using the organization.
15. Find every current client without an owner.
16. Find every organization needing identity review.
17. inspect conflict state.
18. determine whether the user may see conflict details.
19. merge duplicate records.
20. attempt to archive an organization in an active deal.
21. restore an archived organization.
22. open the associated Target Dossier without confusing it with Organization Detail.

## Measures

Record:

* Time to find the correct record;
* whether display and legal names are understood;
* whether organization and legal entity are confused;
* whether organization type and transaction role are confused;
* whether users create duplicates;
* whether relationship owner is discoverable;
* whether restricted deal history leaks;
* whether the preview contains enough context;
* whether users expect CRM functionality;
* whether the Target Dossier distinction is understood.

---

# 105. Design validation criteria

The Organizations screen is ready for approval when:

1. “Organizations” replaces “Entities” throughout the banker UI.
2. Organization and Contact remain separate.
3. Organization and Legal Entity remain distinguishable.
4. Organization type and transaction role remain separate.
5. Buyer, seller and target are deal-specific roles.
6. One organization can participate in multiple deals.
7. Each deal association preserves its own role and confidentiality.
8. Target Dossiers remain deal-specific.
9. Search supports names, aliases and identifiers.
10. Exact identifier search prevents avoidable duplicates.
11. Minimal draft creation does not require invented information.
12. Duplicate records can be compared.
13. Merges preserve all historical references.
14. Different legal entities are not merged solely because they share a brand.
15. Relationship ownership is visible.
16. Prior transaction history is permission-aware.
17. Conflict state is dated and scoped.
18. Identity review does not overstate regulatory compliance.
19. Field provenance is available.
20. Material identity changes create reviewable versions.
21. Active-deal organizations cannot be archived.
22. Archived organizations preserve history.
23. Restricted organizations do not leak through search or counts.
24. External participants cannot browse the institution directory.
25. Bulk actions cannot clear conflicts or approve identity.
26. The screen remains useful without Copilot.
27. Mobile supports search, preview and association.
28. Corporate-group relationships are accessible.
29. Concurrent edits use version checks.
30. The pitch mock remains fictional.
31. The static screen remains readable.
32. The screen feels like transaction infrastructure rather than a sales CRM.

---

# 106. Final design target

The correct design target is not:

> “A database of buyers, sellers and targets.”

It is:

> **A canonical institutional organization directory where identity, relationships and transaction participation can be reused safely without mixing legal entities, contacts or deal-specific evidence.**

Its defining interaction is:

> **Find the correct organization → verify its identity → understand the institutional relationship → review transaction history → associate it with the correct deal and role**

**Next iteration: Organization Detail.**
