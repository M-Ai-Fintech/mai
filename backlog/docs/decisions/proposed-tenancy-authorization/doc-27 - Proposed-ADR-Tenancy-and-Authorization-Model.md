---
id: doc-27
title: 'Proposed ADR: Tenancy and Authorization Model'
type: specification
created_date: '2026-07-30 06:03'
updated_date: '2026-07-30 09:32'
---
# Proposed ADR: Tenancy and Authorization Model

- **Authority ID:** doc-27
- **Owner:** Architecture
- **Authority:** Accepted ADR: Tenancy and Authorization Model
- **Status:** Accepted
- **Freshness:** Accepted as of 2026-07-30; original decision content retained
- **Language:** English
- **Update trigger:** A superseding owner-approved architecture decision, implementation evidence, or a material boundary change
- **Document ID:** doc-27
- **Decision owner:** MAI owner

## Context

MAI must isolate institution, workspace, deal, object and field data, including restricted identities, internal strategy and purpose-bound external participants. Frontend permission outcomes are not an enforcement boundary.

## Decision

Authenticate through an OIDC-compatible identity provider and bind the subject to an active MAI identity/session context. Authorize server-side with deny-by-default RBAC plus ABAC and relationship checks. Evaluate permission before protected repository loading, then assemble permission-safe DTOs with restricted fields omitted. External grants require object scope, purpose, sponsor and expiry. Revocation/offboarding invalidates sessions and jobs. Break-glass, if enabled, is internal-only, time-bound, dual-controlled and fully audited.

## Alternatives

- Frontend-only permissions: rejected.
- Pure RBAC: rejected because deal relationships, purpose, expiry and field restrictions are dynamic.
- Pure ABAC policy language for everything: rejected as opaque for stable job roles.
- Authorization after loading: rejected because existence and protected fields could leak.

## Rationale

The combined model is understandable for common roles and precise for relationship- and purpose-bound access.

## Consequences

Every command/query accepts a trusted ActorContext, resource scope and action. Repositories require a policy-approved scope token or construct protected-not-found queries. Background jobs reauthorize before reads and effects.

## Migration implications

Legacy team membership is not automatically a broad grant. Imported access requires mapping and review; external access is recreated with sponsor/expiry.

## Unresolved risks

IdP selection, enterprise federation, policy authoring UX, break-glass enablement and field classification governance remain deployment decisions.

## Validation plan

Matrix/property tests cover every actor, cross-tenant/workspace/deal denial, protected-not-found equivalence, restricted-field omission, expiry and revocation during jobs.
