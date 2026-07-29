---
id: doc-10
title: Documentation Index and Information Architecture
type: readme
created_date: '2026-07-24 15:37'
updated_date: '2026-07-29 16:15'
tags:
  - documentation
  - governance
  - canonical
---
# Documentation Index and Information Architecture

- Authority ID: DOC-IA-001
- Owner: Repository maintainers
- Authority: Canonical navigation for project documentation
- Freshness: Current as of 2026-07-24
- Language: English
- Update trigger: Any change to a canonical documentation path, ownership rule, or documentation class

## Canonical root

`backlog/docs/` is the canonical, governed documentation root. This index is the authoritative entry point. Documents must be written in English; translation of end-user material follows ADR-0001.

## Information architecture

| Area | Canonical location | Authority |
| --- | --- | --- |
| Navigation and taxonomy | `index/doc-10 - Documentation-Index-and-Information-Architecture.md` | DOC-IA-001 |
| Governance and inventory | `governance/` | DOC-GOV-001 and DOC-INV-001 |
| Decisions and ADRs | `decisions/` | ADR documents |
| System and integration architecture | `architecture/` | Architecture documents |
| Frontend foundation architecture | `architecture/frontend-foundation/doc-15 - MAI-95-Frontend-Foundation-Inventory.md` | ARCH-FRONTEND-001 |
| Frontend semantic-token architecture | `architecture/frontend-tokens/doc-16 - MAI-96-Figma-to-Code-Semantic-Token-Architecture.md` | ARCH-FRONTEND-TOKENS-001 |
| Domain model | `domain/` | Domain-model documents |
| Setup and operations | `operations/` | Operations documents |
| Product behavior | `product/` | Product documents |
| Generated reports | source-specific output directories | Non-authoritative |
| Agent knowledge | colocated `src/agent/agents/**` assets | Referenced, runtime-local knowledge |

## Reading order

1. This index.
2. [Documentation Governance and Ownership](../governance/documentation-governance/doc-11%20-%20Documentation-Governance-and-Ownership.md).
3. [Documentation Inventory](../governance/document-inventory/doc-12%20-%20Documentation-Inventory-and-Classification.md).
4. [ADR-0001: English Internal Identifiers and i18n](../decisions/adr-0001-english-internal-identifiers-i18n/doc-14%20-%20ADR-0001-English-Internal-Identifiers-and-i18n.md).
5. The area document needed for the task.

## Non-canonical material

Repository readmes and agent instruction files are navigation or execution aids, not competing authority. Storybook MDX describes component usage. Graphify output is generated analysis. Backlog tasks and milestones are work records, not design authority. The inventory defines each disposition.

## Maintenance rule

Create or update canonical documents through Backlog document tooling only. Before adding a document, search and view the closest existing governed document. Update this index and the inventory in the same task whenever a canonical path or documentation class changes.
