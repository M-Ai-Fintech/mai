---
id: doc-11
title: Documentation Governance and Ownership
type: guide
created_date: '2026-07-24 15:37'
updated_date: '2026-07-24 15:50'
tags:
  - documentation
  - governance
  - canonical
---
# Documentation Governance and Ownership

- Authority ID: DOC-GOV-001
- Owner: Repository maintainers
- Authority: Normative documentation governance policy
- Freshness: Current as of 2026-07-24
- Language: English
- Update trigger: Changes to documentation lifecycle, ownership, authority, or tooling

## Authority hierarchy

1. English ADRs in `backlog/docs/decisions/` decide durable architecture and policy.
2. Canonical area documents in `backlog/docs/` explain current behavior and operation.
3. Source code and executable configuration decide implementation details when documentation conflicts.
4. Colocated agent assets, Storybook MDX, tasks, milestones, and generated reports are non-canonical for cross-project policy.

No two canonical documents may claim authority for the same concept. After unique knowledge is preserved and migration is approved, a superseded legacy ADR or document may be removed. When retention is required and governed tooling supports it, replace the legacy record with an explicit non-authoritative redirect.

## Ownership and update workflow

| Event | Owner | Required action |
| --- | --- | --- |
| New durable decision | Change owner | Create/update an English ADR through Backlog tooling and link affected area documents |
| Behavior or contract change | Implementer | Update the owning canonical area document and inventory freshness |
| New documentation-like asset | Author | Add an inventory record before completion |
| Generated output refresh | Generator owner | Keep generated output outside authority claims; update provenance when needed |
| Stale or duplicate document | Maintainer | Preserve unique knowledge, then redirect or remove under approved task scope |

Every canonical document includes the stable fields: Authority ID, Owner, Authority, Freshness, Language, and Update trigger. The checker may treat these as required metadata.

## Tooling rule

Never directly edit Backlog documents, decisions, tasks, drafts, or milestones. Use Backlog document tools for governed documents. The current document API supports Markdown documents only; it has no non-Markdown artifact create/update surface.

## Review gate

A documentation task is review-ready only when canonical links resolve, ownership is explicit, the inventory includes changed documentation-like files, and no unresolved authority conflict remains.
