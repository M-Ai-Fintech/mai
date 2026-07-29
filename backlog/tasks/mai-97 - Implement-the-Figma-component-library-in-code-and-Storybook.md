---
id: MAI-97
title: Implement the Figma component library in code and Storybook
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-28 03:08'
updated_date: '2026-07-29 17:54'
labels:
  - frontend
  - component-library
  - storybook
  - figma
  - mai-85-initiative
milestone: m-12
dependencies:
  - MAI-96
references:
  - 'https://github.com/luisfelipeluis49/mai/pull/17'
documentation:
  - design/
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
  - >-
    backlog/docs/architecture/frontend-components/doc-17 -
    MAI-97-Figma-Component-Library-Architecture-and-Conformance.md
modified_files:
  - >-
    backlog/docs/architecture/frontend-components/doc-17 -
    MAI-97-Figma-Component-Library-Architecture-and-Conformance.md
  - >-
    backlog/docs/governance/document-inventory/doc-12 -
    Documentation-Inventory-and-Classification.md
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - >-
    backlog/tasks/mai-97 -
    Implement-the-Figma-component-library-in-code-and-Storybook.md
  - graphify-out/GRAPH_REPORT.md
  - graphify-out/graph.json
  - gui/components/Button/Button.mdx
  - gui/components/Button/Button.module.css
  - gui/components/Button/Button.stories.tsx
  - gui/components/Button/Button.test.ts
  - gui/components/Button/Button.tsx
  - gui/components/DataTable/DataTable.mdx
  - gui/components/DataTable/DataTable.module.css
  - gui/components/DataTable/DataTable.stories.tsx
  - gui/components/DataTable/DataTable.test.ts
  - gui/components/DataTable/DataTable.tsx
  - gui/components/DataTableCell/DataTableCell.mdx
  - gui/components/DataTableCell/DataTableCell.module.css
  - gui/components/DataTableCell/DataTableCell.stories.tsx
  - gui/components/DataTableCell/DataTableCell.test.ts
  - gui/components/DataTableCell/DataTableCell.tsx
  - gui/components/DataTableHeader/DataTableHeader.mdx
  - gui/components/DataTableHeader/DataTableHeader.module.css
  - gui/components/DataTableHeader/DataTableHeader.stories.tsx
  - gui/components/DataTableHeader/DataTableHeader.test.ts
  - gui/components/DataTableHeader/DataTableHeader.tsx
  - gui/components/DataTableRow/DataTableRow.mdx
  - gui/components/DataTableRow/DataTableRow.module.css
  - gui/components/DataTableRow/DataTableRow.stories.tsx
  - gui/components/DataTableRow/DataTableRow.test.ts
  - gui/components/DataTableRow/DataTableRow.tsx
  - gui/components/Dialog/Dialog.mdx
  - gui/components/Dialog/Dialog.module.css
  - gui/components/Dialog/Dialog.stories.tsx
  - gui/components/Dialog/Dialog.test.ts
  - gui/components/Dialog/Dialog.tsx
  - gui/components/Divider/Divider.mdx
  - gui/components/Divider/Divider.module.css
  - gui/components/Divider/Divider.stories.tsx
  - gui/components/Divider/Divider.test.ts
  - gui/components/Divider/Divider.tsx
  - gui/components/Drawer/Drawer.mdx
  - gui/components/Drawer/Drawer.module.css
  - gui/components/Drawer/Drawer.stories.tsx
  - gui/components/Drawer/Drawer.test.ts
  - gui/components/Drawer/Drawer.tsx
  - gui/components/EvidenceProvenanceLabel/EvidenceProvenanceLabel.mdx
  - gui/components/EvidenceProvenanceLabel/EvidenceProvenanceLabel.module.css
  - gui/components/EvidenceProvenanceLabel/EvidenceProvenanceLabel.stories.tsx
  - gui/components/EvidenceProvenanceLabel/EvidenceProvenanceLabel.test.ts
  - gui/components/EvidenceProvenanceLabel/EvidenceProvenanceLabel.tsx
  - gui/components/EvidenceReference/EvidenceReference.mdx
  - gui/components/EvidenceReference/EvidenceReference.module.css
  - gui/components/EvidenceReference/EvidenceReference.stories.tsx
  - gui/components/EvidenceReference/EvidenceReference.test.ts
  - gui/components/EvidenceReference/EvidenceReference.tsx
  - gui/components/FieldWrapper/FieldWrapper.mdx
  - gui/components/FieldWrapper/FieldWrapper.module.css
  - gui/components/FieldWrapper/FieldWrapper.stories.tsx
  - gui/components/FieldWrapper/FieldWrapper.test.ts
  - gui/components/FieldWrapper/FieldWrapper.tsx
  - gui/components/FinancialDelta/FinancialDelta.mdx
  - gui/components/FinancialDelta/FinancialDelta.module.css
  - gui/components/FinancialDelta/FinancialDelta.stories.tsx
  - gui/components/FinancialDelta/FinancialDelta.test.ts
  - gui/components/FinancialDelta/FinancialDelta.tsx
  - gui/components/FinancialValue/FinancialValue.mdx
  - gui/components/FinancialValue/FinancialValue.module.css
  - gui/components/FinancialValue/FinancialValue.stories.tsx
  - gui/components/FinancialValue/FinancialValue.test.ts
  - gui/components/FinancialValue/FinancialValue.tsx
  - gui/components/FoundationStatus/FoundationStatus.mdx
  - gui/components/IconButton/IconButton.mdx
  - gui/components/IconButton/IconButton.module.css
  - gui/components/IconButton/IconButton.stories.tsx
  - gui/components/IconButton/IconButton.test.ts
  - gui/components/IconButton/IconButton.tsx
  - gui/components/InlineNotice/InlineNotice.mdx
  - gui/components/InlineNotice/InlineNotice.module.css
  - gui/components/InlineNotice/InlineNotice.stories.tsx
  - gui/components/InlineNotice/InlineNotice.test.ts
  - gui/components/InlineNotice/InlineNotice.tsx
  - gui/components/NavigationItem/NavigationItem.mdx
  - gui/components/NavigationItem/NavigationItem.module.css
  - gui/components/NavigationItem/NavigationItem.stories.tsx
  - gui/components/NavigationItem/NavigationItem.test.ts
  - gui/components/NavigationItem/NavigationItem.tsx
  - gui/components/NavigationTab/NavigationTab.mdx
  - gui/components/NavigationTab/NavigationTab.module.css
  - gui/components/NavigationTab/NavigationTab.stories.tsx
  - gui/components/NavigationTab/NavigationTab.test.ts
  - gui/components/NavigationTab/NavigationTab.tsx
  - gui/components/Select/Select.mdx
  - gui/components/Select/Select.module.css
  - gui/components/Select/Select.stories.tsx
  - gui/components/Select/Select.test.ts
  - gui/components/Select/Select.tsx
  - gui/components/StatusIndicator/StatusIndicator.mdx
  - gui/components/StatusIndicator/StatusIndicator.module.css
  - gui/components/StatusIndicator/StatusIndicator.stories.tsx
  - gui/components/StatusIndicator/StatusIndicator.test.ts
  - gui/components/StatusIndicator/StatusIndicator.tsx
  - gui/components/Surface/Surface.mdx
  - gui/components/Surface/Surface.module.css
  - gui/components/Surface/Surface.stories.tsx
  - gui/components/Surface/Surface.test.ts
  - gui/components/Surface/Surface.tsx
  - gui/components/TextField/TextField.mdx
  - gui/components/TextField/TextField.module.css
  - gui/components/TextField/TextField.stories.tsx
  - gui/components/TextField/TextField.test.ts
  - gui/components/TextField/TextField.tsx
  - gui/components/component-boundary.test.ts
  - gui/components/index.ts
  - gui/components/internal/ComponentCompositions.stories.tsx
  - gui/components/internal/classNames.ts
  - gui/components/internal/focus.ts
  - gui/components/internal/icons.tsx
  - gui/components/internal/ids.ts
  - gui/components/internal/internal.test.ts
  - gui/package.json
  - gui/scripts/validate-storybook-docs.mjs
  - gui/scripts/verify-components.mjs
  - gui/scripts/verify-design-tokens.mjs
  - gui/scripts/verify-frontend-foundation.mjs
  - gui/vitest.config.ts
  - gui/vitest.unit.config.ts
  - scripts/verify.ts
  - scripts/verify_test.ts
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Delivery step 9 of the MAI-85 initiative.

Implement the approved Figma component library in frontend code and document it in Storybook. Reuse legacy code only when it is demonstrably conformant with the Figma specification, accessibility requirements, and the clean frontend architecture.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Approved components, variants, sizes, interaction states, validation states, and responsive behavior are implemented.
- [x] #2 Component APIs are strongly typed, composable, and avoid screen-specific coupling.
- [x] #3 Keyboard, focus, labeling, contrast, reduced-motion, and assistive-technology behavior meet the approved accessibility rules.
- [x] #4 Storybook contains documentation, representative stories, edge states, and interaction coverage for the component library.
- [x] #5 Components and stories link or trace to the relevant Figma definitions.
- [ ] #6 Focused automated tests and visual review evidence cover the reusable component set.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
- Baseline verification
- Live read-only Figma component audit
- Shared component architecture
- Bounded component implementation waves
- Storybook and accessibility coverage
- Visual review
- Repository verification
- Draft PR and owner review
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented and committed all 21 approved Figma component families with strongly typed native APIs, semantic-token-only CSS, complete Storybook triads, focused unit tests, Chromium interactions, bounded compositions, exact Figma traceability, and the MAI-98 exclusion verifier. Baseline: clean install passed outside sandbox after the initial esbuild EPERM was classified as environmental; all requested baseline gates passed. Final: clean install passed; tokens:check, verify:tokens (21 contrast pairs), verify:components (21 exact families), verify:foundation (182 paths), lint, 57 unit tests, Next build, 22 MDX validation, Storybook build, 84 Chromium story tests, and deno task verify all passed. npm reported 15 existing dependency advisories (3 moderate, 12 high); no upgrades were made because dependency upgrades are out of scope. Graphify update completed; graph HTML was skipped because 15,465 nodes exceeded its 5,000-node visualization limit, while graph.json and GRAPH_REPORT.md regenerated. Visual-review limitation: responsive/constrained stories exist, but the approved in-app browser-control surface was unavailable, so screenshot-level clipping/overlap inspection at 1440/1024/390 remains unclaimed and acceptance criterion #6 stays unchecked pending owner review.

Draft PR #17 opened for one owner review: https://github.com/luisfelipeluis49/mai/pull/17. Branch head before PR-reference record: 8ffccd4. PR is Draft; no self-approval or merge performed. Remaining owner action: run the bounded 1440/1024/390 rendered inspection, record criterion #6 evidence, approve the component library, then authorize final MAI-97 closure.
<!-- SECTION:NOTES:END -->
