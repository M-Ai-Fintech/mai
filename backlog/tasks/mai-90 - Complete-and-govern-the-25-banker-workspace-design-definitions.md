---
id: MAI-90
title: Complete and govern the 25 banker-workspace design definitions
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-28 03:07'
updated_date: '2026-07-28 19:48'
labels:
  - design
  - product-definition
  - documentation
  - figma
  - mai-85-initiative
milestone: m-12
dependencies:
  - MAI-89
documentation:
  - design/
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
modified_files:
  - >-
    backlog/docs/governance/document-inventory/doc-12 -
    Documentation-Inventory-and-Classification.md
  - backlog/tasks/mai-89 - Define-and-approve-the-MAI-Figma-design-system.md
  - >-
    backlog/tasks/mai-90 -
    Complete-and-govern-the-25-banker-workspace-design-definitions.md
  - design/0_Implementaion_Roadmap.md
  - design/1_Application_Shell_Navigation.md
  - design/2_Command_Center.md
  - design/3_Deals_Portfolio.md
  - design/4_New_Deal_Setup.md
  - design/5_Deal_Overview.md
  - design/6_Target_Dossier.md
  - design/7_Documents_VDR.md
  - design/8_Diligence_Decision_Room.md
  - design/9_Valuation_Lab.md
  - design/10_Matching_Counterparty_Universe.md
  - design/11_Negotiation_Room.md
  - design/12_Closing_Control_Room.md
  - design/13_Agentic_Workspace.md
  - design/14_Tasks_Approvals.md
  - design/15_Organizations.md
  - design/16_Organization_Detail.md
  - design/17_Team_Workspace.md
  - design/18_Notification_Center.md
  - design/19_Global_Search.md
  - design/20_Deal_Activity_Audit.md
  - design/21_Deal_Team_Access.md
  - design/22_Deliverables_Exports.md
  - design/23_Deal_Settings_Archive.md
  - design/24_Settings_Screen_Family.md
  - design/25_External_Participant_Screen_Family.md
  - design/26_Cross_Screen_Interaction_Map.md
  - graphify-out/GRAPH_REPORT.md
  - graphify-out/graph.json
priority: high
ordinal: 300
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Delivery step 2 of the MAI-85 initiative.

Turn design/ into a complete, reviewed set of product definitions for all 25 banker-workspace screens and screen families.

Review and normalize the existing definitions, complete every placeholder, resolve overlaps and routing boundaries, classify the assets under documentation governance, and link each definition to its Figma design area. Diligence Decision Room is treated as completed design evidence to import, verify, and link rather than automatically recreate.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All 25 design definitions are non-empty and map uniquely to the approved screen and screen-family inventory.
- [x] #2 Each definition uses a consistent structure covering purpose, users, boundaries, jobs, information architecture, data, states, permissions, responsiveness, accessibility, and Figma mapping.
- [x] #3 Global, deal, administration, and external-participant information architecture and route boundaries are consistent across the set.
- [x] #4 Overlaps and contradictory responsibilities between screens are resolved and recorded.
- [x] #5 The completed Diligence Decision Room design status and evidence are recorded and linked.
- [x] #6 The documentation inventory, ownership metadata, classification, and canonical product-document links are updated through governed Backlog workflows.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory the 25 canonical screen definitions and supporting governance files without counting support docs as screens.
2. Run four read-only audit slices over non-overlapping definition files, then deduplicate findings into one minimal correction matrix.
3. Normalize only missing governance metadata, route ownership, scope boundaries, states, permissions, responsive/accessibility requirements, mock-data boundaries, and Figma mapping.
4. Verify Diligence Decision Room linkage to the approved Figma evidence nodes and preserve the finding-to-audit decision chain.
5. Verify governed documentation references and update task/document metadata only through Backlog CLI.
6. Run automated definition audit, git diff --check, graphify update ., and deno task verify; record exact evidence.
7. Commit focused MAI-89 closure and MAI-90 definition-governance changes, push branch design/MAI-90-govern-design-definitions, and open a human-review PR without starting MAI-91 design.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-07-28 — MAI-90 verification evidence: four read-only audit agents completed non-overlapping definition reviews; coordinator applied only required corrections. Temporary Deno definition audit passed: 25 canonical definitions, unique canonical names, non-empty definitions, MAI-91/92/93 ownership, frontmatter contract, explicit scope/users/states/permissions/responsive/accessibility/Figma mapping, no route conflicts, Diligence Figma evidence nodes, supporting docs not counted as screens, and no frontend/backend/test changes. git diff --check passed. graphify update . passed and updated generated graphify-out artifacts with known non-blocking extraction/viz warnings. deno task verify passed under escalation after installing GUI dependencies from lockfile: PASS Canonical documentation, PASS I18n Strings Check, PASS Deno tests, PASS GUI unit tests, PASS Next.js production build, PASS Storybook documentation, PASS Storybook build, PASS Storybook interaction tests. Figma read-only inspection verified file key otMJE31OKIxdXogV4RNbGQ, 11 governed pages, and existing Shell/Decision Room nodes including 41:16, 43:10, 52:21, 56:39, 57:87, 58:97, 58:139, 59:115, 59:144, 63:2, and 65:2. MAI-90 remains In Progress pending PR review and merge; MAI-91 screen design was not started.
<!-- SECTION:NOTES:END -->
