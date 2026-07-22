---
id: MAI-84
title: Consolidate all project documentation into one governed source of truth
status: To Do
assignee: []
created_date: '2026-07-22 05:24'
updated_date: '2026-07-22 05:55'
labels:
  - documentation
  - architecture
  - governance
milestone: m-14
dependencies: []
priority: high
ordinal: 76000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Inventory and consolidate documentation currently spread across context/, docs/, backlog/docs/, README files, ADRs, and agent knowledge assets. Establish backlog/docs as the governed documentation root, distinguish normative documentation from generated reports and model knowledge, and define how Backlog decisions relate to ADRs and domain context.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every documentation-like file is inventoried with owner, purpose, authority, freshness, language, and target disposition
- [ ] #2 A documented information architecture defines canonical locations for architecture, domain model, setup, operations, product behavior, decisions/ADRs, generated reports, and agent knowledge assets
- [ ] #3 Authoritative content from context/, docs/, and other duplicate locations is migrated or referenced from backlog/docs without losing unique knowledge
- [ ] #4 Duplicate, stale, and conflicting documents are marked for approved removal rather than silently retained as competing sources
- [ ] #5 AGENTS.md and relevant README navigation point to the canonical documentation entry point
- [ ] #6 Canonical documentation is written in English; translated end-user material is routed through the i18n policy
- [ ] #7 The canonical decision policy is documented: English ADRs under backlog/docs/decisions/ are authoritative, and Backlog Decisions remain unused until the CLI supports governed create, view, and edit workflows
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 A link and duplication checker passes for the canonical documentation tree
- [ ] #2 No unresolved pair of files claims authority over the same concept
- [ ] #3 Documentation ownership and update rules are part of the task completion workflow
<!-- DOD:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-22 05:55
---
Decision verdict — 2026-07-22: Do not adopt Backlog Decisions with the current CLI. It supports creation but not a governed view/edit lifecycle, while direct Markdown editing is prohibited by project rules. English ADRs consolidated under backlog/docs/decisions/ remain the canonical decision records. Reassess Backlog Decisions only when the CLI supports the full lifecycle without direct file edits.
---
<!-- COMMENTS:END -->
