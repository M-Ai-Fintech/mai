# Settings Screen Family

## 1. Recommended product naming

Use:

* **Global utility:** `Settings`
* **Administration area:** `Administration`
* **Personal configuration:** `Profile & Preferences`
* **Institution configuration:** `Institution Settings`
* **Authorization policy:** `Roles & Permissions`
* **Connected systems:** `Integrations`
* **Security policy:** `Security & Data Governance`
* **Reusable operating standards:** `Templates & Playbooks`
* **Commercial administration:** `Commercial Settings`
* **Institution-wide governance history:** `Audit & Compliance`
* **Developer administration:** `API & Webhooks`

Do not expose technical destinations such as:

* Models;
* agents;
* RAG;
* memory;
* engines;
* tools.

Those concepts may appear inside restricted diagnostics, but they should not define banker-facing administration.

The product architecture establishes Settings as a structured administration family rather than one long page. It includes personal preferences, institution configuration, permissions, integrations, security, templates, commercial records, institution audit and developer controls. 

---

# 2. Family definition

The **Settings Screen Family** is the institution-level administration environment where authorized users configure how M&Ai operates across users and transactions.

It manages:

* Personal profile and workflow preferences;
* institution identity;
* regional and financial defaults;
* reusable roles;
* approval policies;
* system connections;
* data and model boundaries;
* security controls;
* workflow templates;
* diligence playbooks;
* commercial entitlements;
* cross-deal audit and compliance;
* API credentials and webhooks.

It should answer:

1. **Which settings apply only to me?**
2. **Which settings apply across the institution?**
3. **Which settings are inherited by new transactions?**
4. **Who may change each setting?**
5. **Which configuration is currently effective?**
6. **Which settings are locked by policy or contract?**
7. **What will be affected by a proposed change?**
8. **Does the change require approval?**
9. **When does the change become effective?**
10. **Can prior configuration be reconstructed?**

Its central operating sequence is:

> **Select administration domain → Inspect effective configuration → Propose change → Validate authority and impact → Approve when required → Apply version → Preserve history**

---

# 3. Primary intention

## Operational intention

Provide one coherent administration layer without mixing:

* Personal preferences;
* institution policy;
* deal configuration;
* security controls;
* commercial entitlements.

## User intention

An administrator should be able to say:

> “I understand which controls govern the institution, who may change them and how those settings propagate into active and future deals.”

## Product intention

Settings should make M&Ai configurable without exposing unstable technical internals.

The family should translate infrastructure and policy concepts into business-facing controls such as:

* Default transaction currency;
* approval authority;
* VDR connection;
* retention;
* deal isolation;
* model-processing policy;
* workflow template;
* deal-license period.

---

# 4. Strategic product role

The family is the institution’s administrative control plane.

```text
Institution configuration
  ↓
Membership and authorization
  ↓
Workflow and evidence policy
  ↓
New deal defaults
  ↓
Deal-specific configuration
  ↓
Transaction execution
  ↓
Institution audit and compliance
```

It supports the complete product without becoming the product’s main navigation model.

The administration shell should show institution context and settings-specific secondary navigation, without showing active deal navigation unless the user is configuring one particular transaction. 

---

# 5. What the Settings family is not

It should not become:

* One enormous settings form;
* an infrastructure console;
* a secrets manager;
* a prompt editor;
* a model playground;
* a deal-data editor;
* a hidden alternative to Deal Team & Access;
* an unrestricted impersonation tool;
* a system-observability dashboard;
* a billing-first account portal;
* an employee-surveillance environment;
* a collection of switches without explanations;
* an immediate destructive-action surface;
* a place where users can bypass approvals.

The central question is not:

> “Which feature flags can be changed?”

It is:

> **“Which governed configuration controls the institution, and how can it be changed safely?”**

---

# 6. Settings family catalogue

| Screen                         | Primary intention                                                                | Recommended phase |
| ------------------------------ | -------------------------------------------------------------------------------- | ----------------- |
| **Profile & Preferences**      | Personal profile, locale, time zone, display and workflow preferences            | MVP               |
| **Institution Settings**       | Institution identity, offices, financial defaults and workspace configuration    | POC               |
| **Roles & Permissions**        | Reusable roles, access capabilities and approval-authority policies              | POC               |
| **Integrations**               | VDR, storage, identity, calendar, email and other connections                    | POC               |
| **Security & Data Governance** | Authentication, isolation, retention, encryption, model and data-boundary policy | Enterprise        |
| **Templates & Playbooks**      | Reusable workflows, diligence lists, thresholds and deliverable templates        | POC               |
| **Commercial Settings**        | Deal licenses, usage entitlements, billing contacts and extension periods        | Later             |
| **Audit & Compliance**         | Cross-deal administrative, security and compliance history                       | Enterprise        |
| **API & Webhooks**             | Service accounts, credentials, webhook subscriptions and delivery history        | Later             |

These nine subareas match the canonical administration structure. 

---

# 7. Recommended navigation

```text
Settings

PERSONAL
Profile & Preferences

INSTITUTION
Institution Settings
Roles & Permissions
Integrations
Security & Data Governance
Templates & Playbooks

ADMINISTRATION
Commercial Settings
Audit & Compliance
API & Webhooks
```

Navigation items should be permission-aware.

A normal Analyst may see only:

* Profile & Preferences.

A Deal Administrator may additionally see:

* Selected Institution Settings;
* Templates & Playbooks;
* limited Integrations.

A Security Administrator may see:

* Roles & Permissions;
* Integrations;
* Security & Data Governance;
* Audit & Compliance;
* API & Webhooks.

Hidden destinations should not leak restricted configuration through counts or search.

---

# 8. Settings landing page

Route:

```text
/settings
```

The landing page should summarize the subareas the user can access.

Recommended modules:

* Personal profile;
* institution configuration state;
* active integrations;
* security attention;
* templates requiring review;
* commercial entitlement summary;
* recent administrative changes.

Example:

> **Administration**

> Atlas M&A Advisory
> 4 active integrations · 1 access-policy review · 2 template updates

The landing page should not reproduce all settings.

---

# 9. Common administration header

Recommended structure:

> **Settings**

Supporting:

> Configure your profile and Atlas M&A Advisory’s institutional workspace.

Institution marker:

> Atlas M&A Advisory · Production workspace

Environment should be explicit when relevant:

* Production;
* sandbox;
* development.

A sandbox should never resemble production without a visible label.

---

# 10. Personal versus institutional scope

Every page should display its scope.

## Personal

> Applies only to Ana Costa

## Institution

> Applies to Atlas M&A Advisory

## Deal default

> Applies to newly created deals unless overridden

## System enforced

> Required by institution security policy

Do not rely on the page route alone to communicate scope.

---

# 11. Configuration inheritance

Recommended inheritance model:

```text
Platform control
  ↓
Institution policy
  ↓
Institution default
  ↓
Template or playbook
  ↓
Deal configuration
  ↓
Personal display preference
```

A lower layer may override a higher layer only where policy permits.

Example:

> Institution default currency: BRL
> Project Aurora override: EUR
> Ana Costa display preference: show native transaction currency

A personal preference must never change the authoritative transaction currency.

---

# 12. Configuration states

Use consistent states across the family:

* Draft;
* proposed;
* approval required;
* scheduled;
* effective;
* inherited;
* customized;
* locked;
* exception;
* superseded;
* expired;
* suspended;
* failed;
* archived.

---

# 13. Material-setting workflow

Routine changes may save directly.

Examples:

* Personal display density;
* preferred time zone;
* billing-contact phone.

Material changes should use:

```text
Draft change
  ↓
Impact validation
  ↓
Human approval
  ↓
Scheduled or immediate activation
  ↓
New configuration version
  ↓
Audit event
```

Examples of material changes:

* Role authority;
* retention period;
* external model policy;
* SSO enforcement;
* encryption-key configuration;
* published workflow template;
* commercial entitlement;
* API scope.

---

# 14. Effective-setting inspector

Every inherited or complex setting should expose:

* Effective value;
* source;
* policy level;
* version;
* effective date;
* whether it may be overridden;
* related exceptions.

Example:

> **External document export**

Effective:

> Disabled

Derived from:

* Security Policy v4;
* Client Confidential workspace classification;
* no active exception.

---

# 15. Change comparison

Before applying material changes, show:

| Setting                      | Current   | Proposed                 |
| ---------------------------- | --------- | ------------------------ |
| Default transaction currency | BRL       | BRL                      |
| External access review       | Quarterly | At each phase transition |
| Valuation approval threshold | R$ 25 mi  | R$ 20 mi                 |
| SSO enforcement              | Optional  | Required                 |

Supporting:

> 14 active deals use the current policy. Existing deal behavior will not change until separately migrated unless explicitly selected.

---

# 16. Permission model

Settings permissions should distinguish:

* View;
* propose change;
* approve change;
* apply change;
* manage exceptions;
* export;
* inspect history;
* manage secrets.

No broad `Admin` role should silently perform every action.

Examples:

* Institution Administrator may edit identity and defaults;
* Security Administrator may manage SSO;
* Compliance Reviewer may inspect retention but not modify encryption;
* Commercial Administrator may manage licenses but not deal data;
* Developer Administrator may create service accounts but not grant themselves deal access.

---

# 17. Sensitive values

Sensitive settings include:

* API secrets;
* webhook signing secrets;
* encryption-key references;
* SSO certificates;
* connector tokens;
* recovery codes.

The interface should:

* Mask values;
* never reveal full stored secrets;
* show them once at creation where required;
* support rotation;
* log access;
* prohibit ordinary exports.

---

# 18. Administration audit

Every material administrative action should record:

* Actor;
* institution;
* setting;
* previous value;
* new value;
* authority;
* approval;
* effective time;
* affected scope;
* rationale;
* event ID.

The operational summary appears in each settings screen.

The full cross-deal record belongs in Audit & Compliance.

---

# 19. Shared page layout

For a **1440 × 900** canvas:

| Region                        | Approximate width |
| ----------------------------- | ----------------: |
| Expanded global sidebar       |        240–256 px |
| Settings secondary navigation |        220–260 px |
| Main configuration canvas     |        640–820 px |
| Context or policy panel       |        320–400 px |
| Page padding                  |          24–32 px |

Constrained pages such as Profile may use a 760–960 px content width.

Roles, integrations and audit may use the complete available width.

---

# 20. Shared visual direction

Aim for:

> **Institutional administration with explicit scope, provenance and consequences**

The family should feel:

* Restrained;
* exact;
* policy-aware;
* secure;
* predictable;
* readable.

Avoid:

* Consumer account-page styling;
* giant toggle walls;
* large marketing illustrations;
* one card per setting;
* decorative security shields;
* unexplained technical terminology.

---

# 21. Shared color application

Use:

* Canvas Cream: `#F3F0EE`
* Lifted Cream: `#FCFBFA`
* Ink Black: `#141413`
* Signal Orange: `#CF4500`
* Light Signal Orange: `#F37338`
* Dust Taupe: `#D1CDC7`
* Slate Gray: `#696969`

Semantic use:

* Effective: neutral-positive;
* proposed: Signal Orange;
* locked: dark neutral;
* warning: amber;
* failed: red;
* expired: red-orange;
* sandbox: blue-neutral;
* inherited: gray;
* exception: purple-neutral.

---

# 22. Shared accessibility requirements

Every screen should support:

* Semantic secondary navigation;
* correctly labeled forms;
* keyboard operation;
* visible focus;
* no color-only state;
* accessible comparison tables;
* clear locked-state explanations;
* minimum 44 × 44 px actions;
* announced save and validation results;
* descriptive confirmation actions;
* accessible secret handling;
* scope stated in headings;
* correct locale and time-zone display.

---

# Profile & Preferences

## 23. Screen definition

**Profile & Preferences** manages configuration that belongs to one user rather than the institution.

It includes:

* Name and professional identity;
* profile image or initials;
* language;
* locale;
* time zone;
* date and number formats;
* appearance;
* density;
* accessibility preferences;
* notification preferences;
* personal workflow defaults;
* keyboard shortcuts;
* active sessions and security handoff.

---

# 24. What Profile & Preferences is not

It should not contain:

* Institution roles;
* approval authority;
* deal access;
* performance metrics;
* compensation;
* transaction-risk tolerance;
* autonomous negotiation style;
* cross-deal transaction memory;
* institution security policy;
* unrestricted session administration.

---

# 25. Recommended Profile sections

1. **Profile**
2. **Regional Settings**
3. **Appearance & Accessibility**
4. **Workflow Preferences**
5. **Notifications**
6. **Sessions & Security**
7. **Personal Data**

---

# 26. Profile fields

Recommended:

* Full name;
* preferred name;
* title;
* office;
* time zone;
* profile image;
* contact email;
* secondary notification email, where allowed;
* professional phone, optionally.

Fields synchronized from identity systems should show:

> Managed by corporate directory

and remain read-only.

---

# 27. Regional settings

Recommended fields:

* Language;
* locale;
* time zone;
* date format;
* first day of week;
* number format;
* native-currency display preference.

For the fictional Atlas user:

* Language: Português (Brasil);
* locale: pt-BR;
* time zone: America/Sao_Paulo;
* date: `28 jul. 2026`;
* decimal: `41,2%`;
* money: `R$ 438 mi`.

Locale settings affect presentation, not transaction truth.

---

# 28. Appearance and accessibility

Recommended preferences:

* System, light or dark appearance;
* comfortable or compact density;
* reduced motion;
* increased contrast;
* persistent table headers;
* larger evidence preview;
* keyboard-navigation hints.

These preferences should not alter exported deliverables unless explicitly selected during export.

---

# 29. Workflow preferences

Appropriate personal defaults:

* Default deal-list view;
* default Task view;
* preferred search scope;
* open links in new tab;
* show current versions first;
* default Copilot drawer state;
* automatically follow assigned work;
* approval reminder lead time.

Inappropriate personal defaults:

* Always approve low-risk findings;
* accept M&Ai recommendations automatically;
* aggressive negotiation mode;
* personal valuation-risk tolerance that silently changes calculations.

---

# 30. Saved context

Do not use a banker-facing **Memory** panel that implies uncontrolled persistent AI memory.

Use:

> **Saved personal context**

Appropriate content:

* Preferred display unit;
* default reporting language;
* usual workstream filter;
* frequently used template.

Inappropriate content:

* Unapproved facts from prior deals;
* private transaction conclusions;
* cross-deal evidence;
* autonomous behavioral profiles.

Every saved item should show:

* Source;
* scope;
* created date;
* edit or remove action.

---

# 31. Notification preferences

Configuration should support:

* In-app;
* email;
* mobile push later;
* daily digest;
* direct mentions;
* assignment alerts;
* approval alerts;
* deal-specific overrides;
* quiet hours.

Mandatory security or policy notices cannot be disabled.

---

# 32. Sessions and personal security

Show:

* Current session;
* recent active sessions;
* browser or device;
* approximate location;
* last activity;
* revoke action.

Institution-managed controls such as SSO and MFA policy should link to Security & Data Governance.

A user may manage:

* Their registered MFA method;
* backup codes where supported;
* active sessions.

---

# 33. Personal-data controls

Possible actions:

* Export personal profile data;
* correct profile fields;
* review stored preferences;
* request account deactivation;
* request personal-data review.

These actions should not imply that transaction audit records can be erased automatically.

---

# 34. Profile system states

* Directory managed;
* editable;
* incomplete;
* security setup required;
* session review required;
* deactivated;
* partial service failure.

---

# 35. Profile route

```text
/settings/profile
```

User-menu shortcuts may route directly to:

```text
/settings/profile?section=notifications
/settings/profile?section=security
```

---

# Institution Settings

## 36. Screen definition

**Institution Settings** manages the identity and default operating configuration of the advisory institution.

It should contain:

* Institution name;
* legal name;
* registration details;
* logo and visual identity;
* offices;
* domains;
* default locale;
* default currencies;
* supported jurisdictions;
* business calendars;
* workspace naming;
* new-deal defaults;
* external-facing identity;
* institution contacts.

---

# 37. Recommended sections

1. **Institution Identity**
2. **Offices & Regions**
3. **Financial Defaults**
4. **Workspace Defaults**
5. **External Identity**
6. **Institution Contacts**
7. **Configuration History**

---

# 38. Institution identity

Recommended fields:

* Display name;
* legal name;
* institution type;
* registration identifier;
* primary country;
* headquarters;
* primary domain;
* logo;
* operating status.

Example:

> **Atlas M&A Advisory**

Legal name:

> Atlas Assessoria Financeira Ltda.

Primary country:

> Brazil

---

# 39. Offices and regions

Each office may have:

* Name;
* location;
* time zone;
* business calendar;
* default language;
* local currency;
* operating jurisdictions;
* office administrator.

Example:

> São Paulo
> America/Sao_Paulo · BRL · pt-BR

---

# 40. Financial defaults

Recommended:

* Default transaction currency;
* default reporting currency;
* supported currencies;
* display units;
* decimal precision;
* approved FX-source policy;
* fiscal-year convention.

Example:

> New deals default to BRL and `R$ mi`.

A deal may override this where permitted.

---

# 41. Jurisdiction defaults

Configure:

* Primary operating jurisdiction;
* supported transaction jurisdictions;
* available legal and tax playbooks;
* governing-law choices;
* business-day calendars.

The settings should not provide legal advice or imply that selecting a jurisdiction makes the deal compliant.

---

# 42. Workspace defaults

Recommended defaults for new deals:

* Confidentiality;
* workflow template;
* retention policy;
* external-access policy;
* source-sync behavior;
* access-review schedule;
* required Deal Lead;
* default naming pattern.

Example codename convention:

> `Project + neutral codename`

Avoid auto-generating names that reveal the target in restricted environments.

---

# 43. External institution identity

Controls used in:

* External invitations;
* client portals;
* secure links;
* deliverables;
* automated emails.

Fields:

* Approved display name;
* logo;
* support contact;
* legal notice;
* privacy notice;
* permitted email domains.

---

# 44. Institution contacts

Recommended categories:

* Primary administrator;
* security contact;
* privacy contact;
* billing contact;
* legal contact;
* support contact;
* executive sponsor.

These should reference actual Team or Contact objects rather than unmanaged text where possible.

---

# 45. Institution-setting materiality

Changes requiring approval may include:

* Legal name;
* registration;
* default retention;
* primary domain;
* default confidentiality;
* enabled jurisdictions;
* default external-access policy.

Routine branding changes may require less control.

---

# 46. Institution system states

* Complete;
* onboarding incomplete;
* policy review required;
* domain verification pending;
* configuration conflict;
* proposed change;
* locked;
* multi-office partial state.

---

# 47. Institution route

```text
/settings/institution
```

---

# Roles & Permissions

## 48. Screen definition

**Roles & Permissions** defines reusable institution-level authorization policy.

It manages:

* Institution roles;
* capabilities;
* default workspace permissions;
* approval authority;
* authority thresholds;
* separation of duties;
* role inheritance;
* assignment restrictions;
* policy versions;
* exceptions.

It defines policy.

Team Workspace and Deal Team & Access apply that policy to people and transactions.

---

# 49. What Roles & Permissions is not

It should not become:

* A Team directory;
* a deal-participant list;
* one giant raw permission matrix;
* an identity-provider group editor;
* a way to view restricted deal content;
* a title-to-permission shortcut;
* a self-service privilege escalation screen.

---

# 50. Recommended sections

1. **Roles**
2. **Capabilities**
3. **Approval Policies**
4. **Separation of Duties**
5. **Default Deal Access**
6. **Exceptions**
7. **Policy History**

---

# 51. Recommended institution roles

* Partner or Managing Director;
* Vice President;
* Associate;
* Analyst;
* Specialist;
* Deal Administrator;
* Institution Administrator;
* Security Administrator;
* Compliance Reviewer;
* Auditor;
* Read-only Member.

Professional titles and product roles should remain distinct.

---

# 52. Capability model

Recommended capability groups:

## Institution

* View workspace;
* create deal;
* manage organizations;
* manage team;
* manage settings.

## Transaction

* View deal;
* contribute;
* review;
* administer deal;
* export;
* communicate externally.

## Governance

* Approve findings;
* approve valuation;
* authorize outreach;
* approve negotiation;
* approve closing;
* grant restricted access.

## Administration

* Manage integration;
* manage role policy;
* manage security;
* inspect institution audit;
* manage API credentials.

---

# 53. Role detail

Each role should show:

* Name;
* purpose;
* inherited role;
* granted capabilities;
* denied capabilities;
* approval policies;
* default deal-access template;
* member count;
* last review;
* version.

Example:

> **Vice President**

Capabilities:

* Create and review transaction work;
* approve selected findings;
* review valuation;
* no institution-security administration.

---

# 54. Role inheritance

Example:

```text
Institution Member
  ↓
Banker
  ↓
Vice President
```

A child role may add capabilities but should not bypass explicit prohibitions.

The inspector should expose the final effective policy.

---

# 55. Approval policies

Policy should define:

* Approval category;
* eligible roles;
* threshold;
* workstream;
* transaction scope;
* independent-review requirement;
* quorum;
* expiry;
* override authority.

Example:

> **Valuation treatment approval**

Eligible:

> Vice President or above

Limit:

> Up to R$ 25 mi or 5,0% midpoint impact

Final scenario:

> Managing Director required

---

# 56. Separation of duties

Policy examples:

* Preparer cannot be final approver;
* access-request approver cannot approve their own grant;
* payment verifier cannot complete both verification steps;
* security administrator cannot approve their own emergency access;
* external counsel cannot approve client commercial decisions.

These should be executable rules, not only policy text.

---

# 57. Default deal access

Roles may provide starting access templates.

Example:

> Analyst

* Deal Overview: View;
* Documents: Contribute where assigned;
* Diligence: Contribute;
* Valuation: Contribute where assigned;
* Negotiation: None by default;
* Closing: None by default.

Deal assignment still remains necessary.

---

# 58. Policy simulation

Before publishing a role-policy change, allow simulation:

> What would Ana Costa be able to do?

> Which active deals would be affected?

> Which current approvers would become ineligible?

Simulation must use permission-safe summaries.

---

# 59. Role policy publishing

Lifecycle:

* Draft;
* validation;
* review;
* approved;
* scheduled;
* published;
* superseded;
* withdrawn.

Publishing should create a new immutable policy version.

---

# 60. Active-deal impact

A role-policy change should state:

* Future deals only;
* existing access preserved;
* active deals require review;
* immediate enforcement.

Security prohibitions may require immediate enforcement.

Other changes should avoid silently disrupting active transactions.

---

# 61. Exceptions

An exception must contain:

* Policy;
* subject;
* scope;
* reason;
* compensating control;
* approver;
* effective period;
* review date.

No indefinite exception should be created accidentally.

---

# 62. Role routes

```text
/settings/roles
/settings/roles/:roleId
/settings/roles/policies/:policyId
/settings/roles/exceptions/:exceptionId
```

---

# Integrations

## 63. Screen definition

**Integrations** manages the external systems connected to M&Ai.

Recommended integration families:

* VDR and document sources;
* cloud storage;
* identity and SSO;
* email;
* calendar;
* electronic signature;
* data providers;
* secure export destinations;
* internal data warehouses;
* workflow systems.

---

# 64. Integration versus deal source

## Integration

Institution-level provider connection.

Example:

> Papermark connection for Atlas M&A Advisory

## Deal source

Deal-specific use of that integration.

Example:

> Project Horizon VDR folder

Institution administrators manage the connection.

Deal users manage authorized source scope through Documents and Deal Settings.

---

# 65. Recommended Integrations views

1. **Connected**
2. **Available**
3. **Requires Attention**
4. **Connection Activity**
5. **Configuration History**

---

# 66. Integration card anatomy

> **Papermark**

Category:

> VDR and document source

State:

> Connected

Authorized by:

> Felipe Rocha

Scope:

> 4 active deal sources

Last successful operation:

> 28 jul. 2026 · 09:42 BRT

Action:

> Manage connection

---

# 67. Connection lifecycle

* Not connected;
* configuration draft;
* authorization required;
* connected;
* verification required;
* degraded;
* expired;
* suspended;
* disconnected;
* revoked;
* failed.

---

# 68. Connect flow

Recommended sequence:

1. Select provider;
2. review required permissions;
3. authenticate;
4. choose institution account;
5. restrict permitted scopes;
6. verify connection;
7. assign administrator;
8. configure alerts;
9. activate.

The product should not request broader provider access than necessary.

---

# 69. Connection scopes

Examples:

* Read selected VDR folders;
* detect document changes;
* upload approved deliverables;
* read calendar availability;
* send approved email;
* verify signature status.

The interface should explain each scope in business language.

---

# 70. Credential handling

Do not display:

* Access tokens;
* passwords;
* private keys;
* full client secrets.

Show:

* Credential type;
* owner;
* created date;
* expiry;
* last rotation;
* status.

Actions:

* Reauthorize;
* rotate;
* revoke.

---

# 71. Integration health

Useful states:

* Operational;
* delayed;
* authorization expiring;
* partial scope;
* rate limited;
* configuration error;
* unavailable.

Do not turn this into an infrastructure-monitoring dashboard.

Show only user-relevant consequences.

Example:

> Document changes after 09:42 BRT have not synchronized.

---

# 72. Integration test

A controlled test should verify:

* Authentication;
* scope;
* read or write capability;
* institution isolation;
* callback;
* event delivery.

A successful test does not prove that all deal sources are correctly configured.

---

# 73. Disconnect flow

Before disconnecting, show:

* Active deals;
* active sources;
* open jobs;
* external distributions;
* historical data;
* token revocation behavior.

Disconnecting should not silently delete retained transaction evidence.

---

# 74. Identity integrations

SSO connections may include:

* SAML;
* OIDC;
* directory synchronization.

Banker-facing state should show:

* Provider;
* domain;
* enforcement;
* group mapping;
* last synchronization;
* exceptions.

Detailed security policy remains under Security & Data Governance.

---

# 75. Email and calendar

Appropriate uses:

* Meeting availability;
* assignment reminders;
* secure notification delivery;
* approved external email actions;
* calendar milestones.

The integration should not grant M&Ai unrestricted mailbox access by default.

---

# 76. Integration routes

```text
/settings/integrations
/settings/integrations/:integrationId
/settings/integrations/:integrationId/activity
```

---

# Security & Data Governance

## 77. Screen definition

**Security & Data Governance** manages institution-level controls governing authentication, isolation, storage, processing, retention and model use.

It should contain:

* Authentication policy;
* MFA;
* SSO enforcement;
* session policy;
* deal and tenant isolation;
* data residency;
* encryption;
* key management;
* retention;
* legal hold policy;
* model-provider policy;
* generative-processing boundaries;
* training and data-use policy;
* restricted-zone processing;
* security alerts;
* access-review policy;
* data-subject workflows.

This is an enterprise screen, not a claim that all controls are already implemented.

---

# 78. Recommended views

1. **Security Posture**
2. **Authentication**
3. **Isolation & Access**
4. **Data Protection**
5. **AI & Model Usage**
6. **Retention & Privacy**
7. **Security Events**
8. **Policy History**

---

# 79. Security posture

Use explainable controls rather than a generic score.

Example:

> **Security posture review required**

Attention:

* One SSO certificate expires in 28 days;
* two administrator roles require review;
* one integration uses an older scope policy.

Do not display:

> Security score 92

without a rigorous, documented methodology.

---

# 80. Authentication policy

Recommended settings:

* SSO required or optional;
* supported identity providers;
* MFA required;
* session duration;
* idle timeout;
* trusted-device policy;
* administrator reauthentication;
* external-participant authentication;
* invitation expiry.

---

# 81. Session controls

Configure:

* Maximum session duration;
* idle timeout;
* concurrent sessions;
* revocation;
* high-risk-action reauthentication;
* IP or network restrictions, where supported.

Changing active session policy should show which sessions may be revoked.

---

# 82. Isolation policy

The institution should configure and inspect:

* Tenant isolation;
* deal-scoped retrieval;
* cross-deal search restrictions;
* data-access boundaries;
* external-participant isolation;
* sandbox separation.

Preferred product language:

* Deal-isolated processing;
* tenant-scoped retrieval;
* no unauthorized cross-deal context.

Avoid absolute marketing claims such as:

> Zero leak

---

# 83. Data residency

Show supported and effective storage or processing regions where the production architecture can enforce them.

Fields:

* Primary data region;
* backup region;
* permitted processing regions;
* external-provider region limitations;
* exception state.

Do not allow a cosmetic dropdown to imply real data-residency enforcement.

---

# 84. Encryption

Business-facing controls may show:

* Encryption in transit;
* encryption at rest;
* customer-managed key availability;
* active key reference;
* key rotation state;
* affected storage categories.

Never expose raw key material.

---

# 85. Model usage policy

Recommended controls:

* Approved model providers;
* permitted use cases;
* restricted data classes;
* external-provider processing;
* human-review requirements;
* prompt and output retention;
* use of transaction data for model training;
* cross-deal context prohibition;
* fallback behavior.

Example:

> Transaction content may be processed only within approved deal-scoped workflows.

---

# 86. Training and data use

The policy should explicitly distinguish:

* Runtime processing;
* quality evaluation;
* institution-specific tuning;
* product analytics;
* model training.

Suggested states:

* Not permitted;
* anonymized evaluation only;
* explicit opt-in required;
* institution-controlled dataset;
* approved internal sandbox only.

No ambiguous “Improve the model” toggle should exist.

---

# 87. Restricted-zone processing

Configure whether AI capabilities may:

* Index;
* extract;
* calculate;
* summarize;
* generate artifacts;
* transmit derived outputs.

Example:

> **Funds Flow zone**

* Indexing: Disabled;
* deterministic reconciliation: Permitted;
* generative summary: Disabled;
* external model processing: Prohibited.

---

# 88. Retention and privacy

Institution-level policy should define:

* Retention classes;
* default deal-retention period;
* personal-data retention;
* legal-hold process;
* disposition review;
* data export;
* correction;
* deletion request;
* anonymization.

The UI should present configured policy, not universal legal advice.

---

# 89. Security events

Surface meaningful events:

* Suspicious authentication;
* repeated authorization failure;
* administrator-role change;
* emergency access;
* integration-token compromise;
* data-export exception;
* key-rotation failure.

Complete operational monitoring remains outside the banker UI.

---

# 90. Security policy change

Material security changes should require:

* Reauthentication;
* impact assessment;
* secondary approval;
* effective date;
* rollback plan;
* audit event.

---

# 91. Security routes

```text
/settings/security
/settings/security/authentication
/settings/security/data
/settings/security/models
/settings/security/retention
/settings/security/events
```

---

# Templates & Playbooks

## 92. Screen definition

**Templates & Playbooks** manages reusable institution standards for transaction execution.

It includes:

* New-deal workflow templates;
* workstream templates;
* diligence checklists;
* information-request lists;
* materiality thresholds;
* approval workflows;
* counterparty criteria;
* negotiation-term structures;
* closing checklists;
* deliverable templates;
* redaction profiles.

---

# 93. Template versus playbook

## Template

Structured reusable configuration.

Example:

> Sell-side Mid-Market Workflow v3

## Playbook

Guidance, rules and operating procedure.

Example:

> Customer Concentration Review Playbook

A template can instantiate objects.

A playbook guides how users and M&Ai handle them.

---

# 94. Recommended views

1. **Workflow Templates**
2. **Diligence Playbooks**
3. **Valuation Standards**
4. **Counterparty Criteria**
5. **Negotiation Structures**
6. **Closing Templates**
7. **Deliverable Templates**
8. **Drafts & Reviews**
9. **History**

---

# 95. Template lifecycle

* Draft;
* validation;
* in review;
* approved;
* published;
* deprecated;
* superseded;
* withdrawn;
* archived.

Published template versions are immutable.

---

# 96. Workflow-template contents

Recommended:

* Transaction type;
* side;
* phases;
* workstreams;
* required roles;
* milestones;
* task templates;
* approval gates;
* thresholds;
* source requirements;
* default deliverables;
* archive prerequisites.

---

# 97. Diligence playbook

A diligence playbook may define:

* Domain areas;
* standard requests;
* expected evidence;
* finding types;
* severity guidance;
* escalation thresholds;
* required reviewers;
* output templates.

Example:

> **Brazilian Sell-side Financial Diligence v2**

---

# 98. Threshold governance

Template thresholds should show:

* Definition;
* unit;
* rationale;
* scope;
* owner;
* reviewer;
* effective date;
* applicable transaction profiles.

Example:

> Customer concentration threshold: 35,0%

This should be presented as an institution-defined review threshold, not universal market truth.

---

# 99. Deliverable templates

A deliverable template may define:

* Sections;
* required sources;
* calculations;
* formatting;
* audience profile;
* redaction;
* disclaimer;
* approval chain;
* output formats.

Template content should be previewable before publishing.

---

# 100. Template editor

The editor should support:

* Structured components;
* ordering;
* required and optional blocks;
* conditions;
* source binding;
* validation;
* preview;
* test fixture.

Avoid a raw JSON or prompt editor as the primary experience.

---

# 101. Validation

Before publishing, verify:

* Required roles exist;
* approval policies are valid;
* referenced workstreams exist;
* threshold units are valid;
* deliverable sources resolve;
* no circular dependency exists;
* external actions retain human authorization;
* restricted-data policy is compatible.

---

# 102. Test deal

A template may be tested against a fictional sandbox transaction.

Example:

> Apply Sell-side Mid-Market v4 to Project Sandbox Horizon

Show:

* Objects created;
* tasks created;
* roles required;
* validation issues;
* no production side effects.

---

# 103. Template publishing impact

Publishing a template affects new deals by default.

Active deals should receive:

> Update available

They should not be migrated automatically.

---

# 104. Template migration

The user should compare:

* Existing deal template;
* available new version;
* added workstreams;
* removed requirements;
* threshold changes;
* approval changes;
* affected objects.

Migration should create a deal-configuration version.

---

# 105. Playbook guidance and AI

M&Ai may use approved playbooks to:

* Suggest classifications;
* propose tasks;
* prepare findings;
* validate structured outputs;
* generate drafts.

It should not treat playbook guidance as an automatic decision.

---

# 106. Template routes

```text
/settings/templates
/settings/templates/:templateId
/settings/templates/:templateId/versions/:versionId
/settings/playbooks/:playbookId
```

---

# Commercial Settings

## 107. Screen definition

**Commercial Settings** manages contractual and entitlement information for M&Ai usage.

It may include:

* Deal licenses;
* license periods;
* included capacity;
* extensions;
* success-linked commercial records;
* billing contacts;
* invoices or payment status;
* commercial agreements;
* feature entitlements;
* archive periods.

It should not drive the primary product experience.

---

# 108. Recommended views

1. **Overview**
2. **Deal Licenses**
3. **Usage & Entitlements**
4. **Extensions**
5. **Billing Contacts**
6. **Commercial Records**
7. **History**

---

# 109. Transaction-native licensing

A deal license may contain:

* Deal;
* license start;
* included operating period;
* archive period;
* participant limit;
* document allowance;
* included connectors;
* enabled modules;
* extension terms;
* status.

Example fictional fixture:

> Project Horizon
> Active deal license
> R$ 50 mil fixed platform fee
> 12-month operating period

The interface should preserve the contract currency rather than converting it.

---

# 110. Entitlements

Entitlements may control:

* Number of active deals;
* document volume;
* external participants;
* connectors;
* retention period;
* advanced security;
* API access;
* custom templates.

Product permissions and commercial entitlements remain separate.

A user may be authorized to use a feature that the institution has not purchased.

---

# 111. Commercial warnings

Appropriate:

> Deal license expires in 30 days.

> Document allowance is approaching the contracted limit.

Inappropriate:

* Blocking a closing workflow immediately without an escalation path;
* exposing commercial pricing to ordinary deal participants;
* placing upsell prompts in analytical screens.

---

# 112. Extensions

An extension record should show:

* Deal;
* current end date;
* proposed extension;
* commercial basis;
* requested by;
* approved by;
* status.

Commercial approval does not change deal lifecycle automatically.

---

# 113. Billing contacts

Reference:

* Organization;
* contact;
* email;
* billing role;
* invoice currency;
* tax information;
* effective dates.

Sensitive financial information should be appropriately restricted.

---

# 114. Commercial routes

```text
/settings/commercial
/settings/commercial/licenses/:licenseId
/settings/commercial/extensions/:extensionId
```

---

# Institution Audit & Compliance

## 115. Screen definition

**Audit & Compliance** is the institution-level governance workspace for cross-deal administrative, access and security records.

It should consolidate:

* Institution-setting changes;
* role-policy changes;
* authentication events;
* sensitive access;
* integration administration;
* emergency access;
* cross-deal exports;
* retention events;
* legal holds;
* deletion requests;
* compliance packages;
* access reviews.

---

# 116. Boundary from Deal Activity & Audit

## Deal Activity & Audit

Explains one transaction.

## Institution Audit & Compliance

Explains institution-wide governance.

An institution auditor should not automatically see unrestricted deal evidence.

The page may show:

> A restricted deal export occurred

without exposing:

* Deal codename;
* values;
* documents;
* findings.

---

# 117. Recommended views

1. **Overview**
2. **Administrative Changes**
3. **Access & Authentication**
4. **Data & Exports**
5. **Retention & Privacy**
6. **Compliance Reviews**
7. **Packages**
8. **Integrity**

---

# 118. Institution audit event

Example:

> **Valuation Approver role policy updated**

Changed by:

> Luís Silva · Security Administrator

Previous:

> Vice President or above

Current:

> Vice President or above with independent-review requirement

Effective:

> 1 ago. 2026

Affected:

> 6 active deal policies require review

---

# 119. Authentication events

Appropriate events:

* SSO configuration changed;
* MFA reset;
* administrator login;
* repeated failed authentication;
* session revoked;
* identity-provider sync failure.

Do not present every normal login as material by default.

---

# 120. Cross-deal access review

The screen should support:

* Administrator-role review;
* external-participant review;
* dormant accounts;
* emergency access;
* unresolved exceptions;
* role-policy drift.

This is not a substitute for each deal’s detailed access review.

---

# 121. Compliance review

A review should state:

* Scope;
* policy;
* evidence;
* reviewer;
* outcome;
* exceptions;
* remediation;
* review period.

Example:

> **Q3 2026 External Access Review**

* 14 deals;
* 22 external participants;
* 3 access reductions;
* no unresolved critical exceptions.

---

# 122. Compliance packages

Possible packages:

* Access-control register;
* administrative-change register;
* data-retention manifest;
* external-access review;
* security-event report;
* model-usage policy;
* deletion-request record.

Every package should state its scope and redactions.

---

# 123. Integrity

Advanced controls may expose:

* Audit coverage;
* delayed sources;
* append-only state;
* imported legacy records;
* event verification;
* retention.

Do not claim immutable or cryptographically verifiable logs before that architecture is implemented.

---

# 124. Auditor access

Auditors should receive:

* Read-only access;
* explicit scope;
* time-bound authority;
* redacted deal context;
* controlled export;
* complete access logging.

Auditor role must not become universal deal access.

---

# 125. Audit routes

```text
/settings/audit
/settings/audit/events/:eventId
/settings/audit/reviews/:reviewId
/settings/audit/packages/:packageId
```

---

# API & Webhooks

## 126. Screen definition

**API & Webhooks** manages machine-to-machine integration with M&Ai.

It should contain:

* Service accounts;
* API credentials;
* scopes;
* environment;
* webhook endpoints;
* event subscriptions;
* signing secrets;
* delivery history;
* rate limits;
* usage;
* rotation;
* revocation.

This is an administrator and developer screen.

---

# 127. What API & Webhooks is not

It should not be:

* A raw database console;
* a place to run arbitrary SQL;
* an unrestricted GraphQL explorer;
* a route to bypass product permissions;
* a way to create permanent user tokens;
* a place to expose deal data without scopes;
* an engineering log viewer for ordinary bankers.

---

# 128. Recommended views

1. **Service Accounts**
2. **API Credentials**
3. **Webhooks**
4. **Delivery History**
5. **Usage**
6. **Documentation & Environments**
7. **History**

---

# 129. Service account

A service account should contain:

* Name;
* purpose;
* owner;
* environment;
* allowed scopes;
* permitted deal or institution context;
* created date;
* last use;
* expiry;
* state.

Example:

> **Atlas Data Warehouse Export**

Scope:

* Read approved institution metrics;
* no source documents;
* production environment.

---

# 130. Credential lifecycle

* Draft;
* active;
* expires soon;
* expired;
* rotating;
* suspended;
* revoked;
* compromised.

A credential secret should be displayed only once at creation.

---

# 131. API scopes

Use business-facing scopes.

Examples:

* `deals.read`
* `organizations.read`
* `tasks.read`
* `deliverables.read`
* `documents.metadata.read`
* `documents.content.read`
* `webhooks.manage`

High-risk scopes:

* `deals.write`
* `access.manage`
* `exports.create`
* `external_actions.execute`

High-risk scopes should require stronger approval.

---

# 132. Environment separation

Use explicit:

* Sandbox;
* staging;
* production.

Credentials and webhook endpoints should not automatically cross environments.

Example:

> Sandbox credential cannot access production deals.

---

# 133. Webhook configuration

A webhook should contain:

* Name;
* endpoint;
* environment;
* event types;
* scope;
* signing state;
* status;
* last delivery;
* owner.

Example events:

* Deal created;
* task assigned;
* approval completed;
* document synchronized;
* deliverable released;
* access revoked.

---

# 134. Webhook delivery security

Recommended controls:

* Signature verification;
* timestamp;
* replay protection;
* idempotency key;
* retry policy;
* endpoint verification;
* secret rotation.

Signing secrets should not be recoverable after creation.

---

# 135. Delivery history

Show:

* Event;
* destination;
* attempted time;
* status;
* response code;
* retry count;
* next retry;
* safe error summary.

Do not expose sensitive payload fields in unrestricted delivery logs.

---

# 136. Failed deliveries

Actions:

* Retry;
* inspect safe payload metadata;
* pause endpoint;
* rotate secret;
* disable subscription.

Manual retry must preserve the original event and idempotency identifier.

---

# 137. API usage

Useful metrics:

* Requests;
* success rate;
* rate-limit usage;
* data volume;
* top scopes;
* last use.

Avoid billing-style overemphasis unless relevant to the commercial contract.

---

# 138. Developer documentation

The screen may link to:

* Authentication;
* scope definitions;
* endpoint reference;
* event schemas;
* webhook verification;
* error handling;
* sandbox fixtures.

Technical documentation should remain versioned.

---

# 139. API routes

```text
/settings/developers
/settings/developers/service-accounts/:accountId
/settings/developers/webhooks/:webhookId
/settings/developers/deliveries/:deliveryId
```

---

# 140. Common system states

## No permission

> You do not have access to this administration area.

Do not show restricted settings summaries.

## Loading

Use stable setting-group skeletons.

## Unsaved changes

Show which sections contain changes.

## Validation failed

Identify exact fields and policy conflicts.

## Approval required

Current configuration remains active.

## Change scheduled

Show effective date.

## Policy locked

Explain source policy and authorized owner.

## Concurrent edit

Compare changes before retrying.

## Partial service failure

Keep unaffected areas available.

## Sandbox

Display a persistent environment marker.

## Offline

Allow safe cached review.

Disable all configuration writes and secret operations.

---

# 141. Common confirmation patterns

Routine preference:

> Save profile preferences

Material policy:

> Publish Approval Policy v4

Sensitive credential:

> Revoke production API credential

Destructive configuration:

> Disconnect Google Workspace integration

Confirmations should state:

* Scope;
* consequence;
* reversibility;
* affected users or deals;
* effective time.

---

# 142. Shared Figma component architecture

## `SettingsShell`

Variants:

* Personal;
* institution;
* security;
* developer;
* restricted.

## `SettingsSecondaryNavigation`

* Personal;
* institution;
* administration groups.

## `SettingsScopeHeader`

Properties:

* Personal;
* institution;
* inherited;
* sandbox;
* production.

## `SettingsSection`

States:

* Default;
* changed;
* locked;
* warning;
* error;
* approval required.

## `SettingsField`

Properties:

* Editable;
* read only;
* inherited;
* customized;
* sensitive;
* scheduled.

## `EffectiveSettingInspector`

Properties:

* Direct;
* inherited;
* exception;
* conflict;
* expired.

## `ConfigurationChange`

States:

* Draft;
* submitted;
* approved;
* rejected;
* scheduled;
* applied.

## `PolicyComparison`

Properties:

* Current;
* proposed;
* active-deal impact;
* future-only.

## `SecretField`

Properties:

* Create;
* hidden;
* shown once;
* rotate;
* revoked.

## `IntegrationCard`

Properties:

* Connected;
* degraded;
* expired;
* disconnected;
* pending.

## `RolePolicyMatrix`

Properties:

* Effective;
* editing;
* conflict;
* simulated.

## `TemplateRegistry`

Properties:

* Published;
* draft;
* update available;
* deprecated.

## `AuditEventList`

Properties:

* Administrative;
* access;
* security;
* retention;
* API.

---

# 143. Production object model

## `UserPreference`

```text
id
membershipId
locale
timezone
dateFormat
numberFormat
appearance
density
accessibilityPreferences
workflowPreferences
notificationPreferences
version
updatedAt
```

## `InstitutionConfiguration`

```text
id
institutionId
version
state
identityConfiguration
regionalDefaults
financialDefaults
workspaceDefaults
externalIdentity
effectiveFrom
supersededAt
createdBy
approvedBy
```

## `RolePolicy`

```text
id
institutionId
roleId
version
capabilities
explicitDenials
approvalPolicies
defaultDealAccess
separationOfDutyRules
state
effectiveFrom
supersededAt
```

## `IntegrationConnection`

```text
id
institutionId
providerType
providerReference
environment
authorizedScopes
credentialReference
ownerMembershipId
status
expiresAt
lastVerifiedAt
createdAt
updatedAt
```

## `SecurityPolicy`

```text
id
institutionId
version
authenticationPolicy
isolationPolicy
dataProtectionPolicy
modelUsagePolicy
retentionPolicy
privacyPolicy
state
effectiveFrom
approvedBy
```

## `InstitutionTemplate`

```text
id
institutionId
templateType
name
version
definition
validationState
publicationState
effectiveFrom
supersededAt
ownerId
```

## `CommercialEntitlement`

```text
id
institutionId
entitlementType
scopeType
scopeId
currency
commercialValue
effectiveFrom
expiresAt
status
contractReference
```

## `InstitutionAuditEvent`

```text
id
institutionId
eventType
actorType
actorId
objectType
objectId
beforeSnapshot
afterSnapshot
authoritySnapshot
occurredAt
integrityState
accessLevel
```

## `ServiceAccount`

```text
id
institutionId
name
purpose
environment
ownerMembershipId
scopes
status
expiresAt
lastUsedAt
createdAt
```

## `WebhookSubscription`

```text
id
institutionId
name
environment
endpointReference
eventTypes
scopePolicy
signingSecretReference
status
createdAt
updatedAt
```

---

# 144. Recommended route hierarchy

```text
/settings

/settings/profile
/settings/institution
/settings/roles
/settings/integrations
/settings/security
/settings/templates
/settings/commercial
/settings/audit
/settings/developers
```

Do not use:

```text
/settings/memory
/settings/models
/settings/agents
/settings/rag
/settings/engines
```

---

# 145. API direction

Recommended families:

```text
GET    /api/settings/profile
PATCH  /api/settings/profile

GET    /api/settings/institution
POST   /api/settings/institution/changes
POST   /api/settings/institution/changes/:id/decisions

GET    /api/settings/roles
POST   /api/settings/roles
POST   /api/settings/role-policies/:id/publish

GET    /api/settings/integrations
POST   /api/settings/integrations
POST   /api/settings/integrations/:id/verify
POST   /api/settings/integrations/:id/disconnect

GET    /api/settings/security
POST   /api/settings/security/changes

GET    /api/settings/templates
POST   /api/settings/templates
POST   /api/settings/templates/:id/publish

GET    /api/settings/commercial

GET    /api/settings/audit-events
POST   /api/settings/audit-packages

GET    /api/settings/service-accounts
POST   /api/settings/service-accounts
POST   /api/settings/service-accounts/:id/rotate
POST   /api/settings/service-accounts/:id/revoke

GET    /api/settings/webhooks
POST   /api/settings/webhooks
POST   /api/settings/webhooks/:id/test
```

All writes should support:

* Authority checks;
* optimistic concurrency;
* idempotency;
* sensitive-value handling;
* approval policy;
* audit creation.

---

# 146. Repository direction

The current repository contains a limited `/settings` prototype.

Current implementation includes:

* A single settings route;
* language selection between English and pt-BR;
* risk-tolerance and negotiation-style selectors;
* a static “memory” panel;
* a mock preferences API returning risk tolerance and style;
* a save button without a complete persisted administration workflow.

Relevant files include:

```text
gui/app/settings/page.tsx
gui/app/settings/settings-sections.tsx
gui/app/api/settings/preferences/route.ts
```

## Keep

* Existing `/settings` entry point;
* locale provider;
* English and pt-BR support;
* reusable form components;
* typed translation keys;
* basic preferences endpoint boundary;
* existing settings tests.

## Replace

### One-page layout

Replace the two-card page with the complete settings shell and subroutes.

### Risk tolerance

Do not use a personal “risk tolerance” setting to change transaction analysis or approval behavior.

A banker’s personal preference must not alter:

* Finding severity;
* valuation;
* materiality;
* approval threshold;
* negotiation recommendation.

These belong in governed templates, policies and deal configuration.

### Negotiation style

Do not let a personal selector silently control negotiation outputs.

A user may choose a display or drafting preference, but transaction strategy must remain:

* Deal scoped;
* evidence backed;
* reviewable;
* approved.

### Memory panel

Remove or reframe as **Saved Personal Context**.

Static entries such as domain knowledge or company culture should not be presented as trusted persistent memory.

## Add

* Settings secondary navigation;
* scope labels;
* profile persistence;
* institution configuration;
* role policy;
* integration registry;
* security policy;
* templates;
* commercial entitlement;
* institution audit;
* developer administration;
* versioned and approved changes.

---

# 147. Current implementation boundaries

The repository does not yet demonstrate production implementations for:

* SSO;
* granular RBAC;
* immutable institution audit;
* customer-managed encryption;
* VPC boundaries;
* retention workflows;
* model-use governance;
* commercial entitlement enforcement;
* service-account security;
* webhook signing.

Backlog items describe these as future enterprise or POC work.

The interface should therefore distinguish:

* Designed;
* configured fixture;
* connected;
* verified;
* unavailable.

Do not present backlog intent as completed security.

---

# 148. MOCKED — Family overview

## Purpose

The mocked Settings family should demonstrate coherent institution governance.

It should not be a primary pitch screen.

Its narrative is:

> **M&Ai separates personal preferences, institution policy, transaction configuration and security controls so consequential deal behavior cannot be changed through hidden or informal settings.**

Settings is operationally necessary but weak for the principal deck narrative. The canonical product guidance explicitly places Settings, Team and Notifications below the core transaction screens in pitch relevance. 

---

# 149. Mocked shell state

Institution:

> **Atlas M&A Advisory**

User:

> **Ana Costa · Vice President**

Environment:

> **Production**

Breadcrumb:

> Settings / Institution Settings

Navigation:

```text
PERSONAL
Profile & Preferences

INSTITUTION
Institution Settings
Roles & Permissions
Integrations
Security & Data Governance
Templates & Playbooks

ADMINISTRATION
Commercial Settings
Audit & Compliance
API & Webhooks
```

---

# 150. Mocked administration summary

## Institution

> Atlas M&A Advisory

Configuration:

> Version 6 · Current

Defaults:

* BRL;
* Brazil;
* America/Sao_Paulo;
* Sell-side Mid-Market v3.

## Roles

> 7 active roles

Attention:

> One approval policy review due

## Integrations

> 4 active

* Papermark;
* Google Workspace;
* corporate identity;
* secure export storage.

## Security

> Policy v4

Attention:

> SSO certificate review due in 28 days

## Templates

> 6 published · 2 drafts

## Commercial

> 6 active deal licenses

## Audit

> Current through 10:42 BRT

## API

> 2 active service accounts · 3 webhooks

---

# 151. Mocked Profile & Preferences

User:

> Ana Costa · Vice President

Preferences:

* Language: Português (Brasil);
* time zone: America/Sao_Paulo;
* date: `28 jul. 2026`;
* display: Compact;
* appearance: System;
* daily digest: 08:00 BRT;
* default task view: Assigned to me.

Saved personal context:

* Use native transaction currency;
* show current versions first;
* open evidence in right panel.

---

# 152. Mocked Institution Settings

Identity:

> Atlas M&A Advisory

Default currency:

> BRL

Supported:

* BRL;
* USD;
* EUR.

Primary jurisdiction:

> Brazil

Default confidentiality:

> Internal Restricted

Default workflow:

> Sell-side Mid-Market v3

Default retention:

> Seven years after archive

---

# 153. Mocked role policy

Selected role:

> **Vice President**

Capabilities:

* Create and review deal work;
* approve financial findings;
* approve valuation treatments up to **R$ 25 mi or 5,0%**;
* authorize internal deliverables;
* no institution-security administration.

Separation of duties:

> Cannot approve an object they prepared.

---

# 154. Mocked integrations

## Papermark

> Connected · 4 active deals

## Google Workspace

> Connected · Calendar and notification email only

## Corporate Identity

> Connected · Directory synchronization current

## Secure Export Storage

> Connected · Internal-approved deliverables only

Attention:

> One authorization expires in 21 days.

---

# 155. Mocked Security policy

Authentication:

* SSO required for internal members;
* MFA required;
* external users use restricted authentication.

Isolation:

* Tenant-scoped workspace;
* deal-scoped retrieval;
* no unauthorized cross-deal context.

Model usage:

* Approved processing workflows only;
* no autonomous approval;
* restricted-zone rules enforced;
* transaction data not permitted for general model training.

Retention:

> Seven years after archive

These are fixture policies, not claims about the current repository implementation.

---

# 156. Mocked templates

Published:

* Sell-side Mid-Market v3;
* Buy-side Mid-Market v2;
* Financial Diligence Brazil v2;
* Diligence Committee Brief v4;
* Buyer Shortlist v2;
* Closing Readiness v1.

Draft:

* Sell-side Mid-Market v4;
* Client Risk Summary v2.

Attention:

> Template v4 would add phase-transition access reviews.

---

# 157. Mocked commercial settings

Active deal licenses:

> 6

Project Horizon:

* Fixed platform fee: R$ 50 mil;
* operating period: 12 months;
* one VDR connector;
* 15 internal participants;
* 5 external participants;
* seven-year archive entitlement.

State:

> Active through 30 jun. 2027

---

# 158. Mocked audit attention

> **Approval policy changed**

Role:

> Vice President

Change:

> Independent-review requirement added

Affected:

> Six active deals require policy review

Changed by:

> Luís Silva · Security Administrator

Effective:

> 1 ago. 2026

---

# 159. Recommended static composition

```text
┌──────────────────────────────────────────────────────────────────┐
│ Settings · Atlas M&A Advisory · Production                     │
├───────────────────┬────────────────────────────┬─────────────────┤
│ Administration    │ Institution Settings       │ Configuration   │
│                   │                            │                 │
│ Profile           │ Atlas M&A Advisory         │ Version 6       │
│ Institution       │                            │                 │
│ Roles             │ Default currency           │ 7 roles         │
│ Integrations      │ BRL                        │ 4 integrations  │
│ Security          │                            │                 │
│ Templates         │ Jurisdiction               │ 6 templates     │
│ Commercial        │ Brazil                     │                 │
│ Audit             │                            │ 1 policy review │
│ API               │ Workflow                   │                 │
│                   │ Sell-side Mid-Market v3    │ [ Review ]      │
└───────────────────┴────────────────────────────┴─────────────────┘
```

---

# 160. Recommended demo flows

## Flow A — Personal preference

```text
Profile & Preferences
  ↓
Change language to pt-BR
  ↓
Preview number and date formatting
  ↓
Save personal preference
```

## Flow B — Publish role policy

```text
Roles & Permissions
  ↓
Edit Vice President policy
  ↓
Add independent-review requirement
  ↓
Simulate active-deal impact
  ↓
Approve policy
  ↓
Publish version
```

## Flow C — Connect a VDR provider

```text
Integrations
  ↓
Select Papermark
  ↓
Review requested scopes
  ↓
Authenticate
  ↓
Verify institution isolation
  ↓
Activate connection
```

## Flow D — Restrict model use

```text
Security & Data Governance
  ↓
Open AI & Model Usage
  ↓
Disable generative processing for Funds Flow
  ↓
Review affected workflows
  ↓
Approve policy version
```

## Flow E — Publish playbook

```text
Templates & Playbooks
  ↓
Open Sell-side Mid-Market v4
  ↓
Run sandbox validation
  ↓
Review changes
  ↓
Publish for new deals
```

## Flow F — Rotate credential

```text
API & Webhooks
  ↓
Select production service account
  ↓
Create replacement credential
  ↓
Copy secret once
  ↓
Confirm application migration
  ↓
Revoke previous credential
```

---

# 161. UX prototype tasks to validate

Test whether users can:

1. Distinguish personal and institution settings.
2. find the effective institution currency.
3. determine whether a setting is inherited.
4. identify who may change it.
5. change a personal display preference.
6. find notification preferences.
7. locate active sessions.
8. inspect an institution role.
9. distinguish title from product role.
10. find an approval threshold.
11. identify a separation-of-duties rule.
12. simulate a role-policy change.
13. find active integrations.
14. determine which deals use an integration.
15. disconnect a connection without deleting evidence.
16. find the active model-use policy.
17. determine whether restricted data may be summarized.
18. identify the default retention policy.
19. open a workflow template.
20. distinguish draft and published versions.
21. test a template against a sandbox deal.
22. identify an expiring deal license.
23. find an administrative audit event.
24. create and revoke an API credential.
25. inspect a failed webhook delivery.

---

# 162. Design validation criteria

The Settings Screen Family is ready when:

1. Settings uses structured sub-navigation.
2. Personal and institutional scope are explicit.
3. Deal settings remain separate from institution settings.
4. Current and proposed configurations remain distinct.
5. Inherited values identify their source.
6. Locked policy cannot be overridden casually.
7. Material changes create new versions.
8. Material changes expose downstream impact.
9. Routine personal preferences do not alter transaction truth.
10. Personal risk tolerance does not modify valuation or findings.
11. Personal negotiation style does not control deal strategy.
12. Banker-facing cross-deal “memory” is removed or tightly scoped.
13. Institution identity and defaults are versioned.
14. Professional titles remain distinct from product roles.
15. Role capabilities and approval authority remain separate.
16. Separation-of-duties rules are enforceable.
17. Role changes can be simulated before publishing.
18. Integrations use least-privilege scopes.
19. Secrets are never redisplayed after creation.
20. Disconnecting an integration does not silently delete evidence.
21. Security controls reflect actual implementation state.
22. Tenant and deal isolation are described without absolute guarantees.
23. Model-use policy distinguishes processing from training.
24. Restricted-zone processing is configurable.
25. Retention policy states scope and source.
26. Templates have immutable published versions.
27. Active deals do not migrate to new templates automatically.
28. Template validation identifies policy conflicts.
29. Commercial entitlement remains separate from authorization.
30. Commercial information is restricted appropriately.
31. Institution audit does not provide unrestricted cross-deal access.
32. Auditor access is read only and scoped.
33. API credentials use explicit business scopes.
34. Sandbox and production remain isolated.
35. Webhook deliveries support signature and replay protection.
36. Every material administrative action creates an audit event.
37. Concurrent configuration changes are protected.
38. Partial failures do not make unrelated settings unavailable.
39. Sensitive changes require reauthentication where appropriate.
40. Mobile supports personal preferences and urgent administrative review.
41. The repository’s current mock preferences page is not presented as complete administration.
42. Backlog security intentions are not represented as implemented controls.
43. The mocked fixture remains fictional.
44. Every settings state has a clear owner and next action.

---

# 163. Final design target

The correct design target is not:

> “A collection of account and product options.”

It is:

> **A governed administration environment where personal preferences, institution policy, authorization, integrations, security, templates and commercial entitlements remain clearly scoped, versioned and auditable.**

Its defining interaction is:

> **Choose the correct configuration scope → inspect the effective policy → propose a controlled change → validate authority and downstream impact → publish a new version → preserve the administrative record**

**Next iteration: External-Participant Screen Family.**
