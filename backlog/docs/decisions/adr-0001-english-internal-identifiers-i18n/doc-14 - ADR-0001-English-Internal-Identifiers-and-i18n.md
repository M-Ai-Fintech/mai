---
id: doc-14
title: 'ADR-0001: English Internal Identifiers and i18n'
type: specification
created_date: '2026-07-24 15:38'
updated_date: '2026-07-24 15:51'
tags:
  - decision
  - adr
  - i18n
  - canonical
---
# ADR-0001: English Internal Identifiers and i18n

- Authority ID: ADR-0001
- Owner: Repository maintainers
- Authority: Canonical identifier/i18n and decision lifecycle policy
- Status: Accepted
- Freshness: Current as of 2026-07-24
- Language: English
- Decision scope: Internal identifiers, canonical documentation language, and decision-record lifecycle
- Update trigger: Changes to identifier language, presentation i18n policy, ADR authority, or governed decision lifecycle

## Decision

Internal identifiers and canonical project documentation use English. User-facing presentation strings may be localized through the project i18n policy and implementation.

English ADRs under `backlog/docs/decisions/` are the authoritative durable decision records. Backlog Decisions remain unused until the CLI/tooling supports a governed create, view, and edit lifecycle without direct Markdown edits.

## Consequences

- Translate or redirect legacy Portuguese canonical material as it is consolidated.
- Do not translate runtime-local source knowledge merely to satisfy canonical documentation policy.
- Do not retain competing ADR authorities in `docs/adr/`. After approved migration, a legacy ADR or document may be removed; when retention is required and governed tooling supports it, replace it with an explicit non-authoritative redirect.
- Reassess Backlog Decisions only when lifecycle support exists and a migration plan preserves decision history and links.

## Supersedes

This ADR preserves and supersedes the decision intent of the removed legacy record `docs/adr/0001-english-internal-identifiers-with-i18n.md`.
