---
id: doc-17
title: MAI-97 Figma Component Library Architecture and Conformance
type: specification
created_date: '2026-07-29 17:44'
updated_date: '2026-07-29 17:45'
tags:
  - frontend
  - components
  - storybook
  - figma
  - accessibility
---
# MAI-97 Figma Component Library Architecture and Conformance

- Authority ID: ARCH-FRONTEND-COMPONENTS-001
- Owner: Frontend Engineering
- Authority: Canonical code architecture and conformance contract for the MAI-97 component library
- Freshness: Current as of 2026-07-29
- Language: English
- Approved release: v0.3 MAI Design System — Approved for Downstream Design
- Figma file: `otMJE31OKIxdXogV4RNbGQ`
- Update trigger: Approved component inventory, public API, traceability, accessibility, responsive behavior, or verification boundary changes

## Boundary

Figma is the sole visual and interaction authority. Storybook MDX documents the local code implementation only. The library is local and unpublished. Code Connect, AppShell, Sidebar, TopBar, product routes, navigation architecture, and screens remain deferred to MAI-98 or later.

## Trace matrix

| Figma family | Node | Code | Storybook | Focused evidence |
| --- | --- | --- | --- | --- |
| Primitive/Surface | `19:20` | `Surface` | `foundation-surface` | semantic surface variants |
| Primitive/Divider | `20:18` | `Divider` | `foundation-divider` | native rule semantics |
| Action/Button | `21:98` | `Button` | `action-button` | loading, disabled, activation |
| Action/IconButton | `22:12` | `IconButton` | `action-iconbutton` | required accessible name |
| Form/FieldWrapper | `22:29` | `FieldWrapper` | `form-fieldwrapper` | label, ID, error relationships |
| Form/TextField | `23:30` | `TextField` | `form-textfield` | native input and read-only |
| Form/Select | `24:23` | `Select` | `form-select` | native select and read-only guard |
| Status/Indicator | `25:56` | `StatusIndicator` | `status-indicator` | text, icon, semantic color |
| Navigation/Item | `34:22` | `NavigationItem` | `navigation-item` | link/button union and restricted state |
| Navigation/Tab | `34:37` | `NavigationTab` | `navigation-tab` | roving focus, arrows, Home, End |
| Feedback/InlineNotice | `36:44` | `InlineNotice` | `feedback-inlinenotice` | urgency and dismissal |
| Financial/Value | `36:85` | `FinancialValue` | `financial-value` | unavailable versus zero, provisional text |
| Financial/Delta | `36:96` | `FinancialDelta` | `financial-delta` | direction separated from interpretation |
| Evidence/Reference | `36:112` | `EvidenceReference` | `evidence-reference` | permission-safe discriminated union |
| Evidence/ProvenanceLabel | `36:121` | `EvidenceProvenanceLabel` | `evidence-provenancelabel` | provenance without verification claim |
| Data/Table | `37:8` | `DataTable` | `data-table` | loading/empty structure and overflow |
| Data/TableHeader | `37:13` | `DataTableHeader` | `data-tableheader` | sort button and `aria-sort` |
| Data/TableRow | `37:26` | `DataTableRow` | `data-tablerow` | selected, unavailable, loading |
| Data/TableCell | `37:37` | `DataTableCell` | `data-tablecell` | content-kind composition |
| Overlay/Dialog | `37:53` | `Dialog` | `overlay-dialog` | focus entry, containment, Escape, return |
| Overlay/Drawer | `37:66` | `Drawer` | `overlay-drawer` | responsive modal focus and return |

## Public API rules

Public APIs are strongly typed, composable, screen-independent, and based on native HTML semantics. Runtime props represent product meaning such as loading, invalid, selected, restricted, unavailable, and semantic variants. Hover, focus-visible, and pressed are CSS/native states rather than artificial public state props. Controlled and uncontrolled selection are explicit where both are supported. Components forward refs where direct native control access is useful.

`gui/components/index.ts` is the public family boundary. `gui/components/internal/**` is non-public and contains only dependency-free class joining, stable ID, minimal decorative icons, focus helpers, and bounded composition stories.

## Token consumption

Every governed visual value uses MAI-96 public `--mai-*` semantic tokens. Component code may not use raw colors, shadows, transition durations, easing curves, public-value duplicates, or direct `--mai-core-*` variables. `verify:components` checks the exact family allowlist, triads, hard-coded values, public token boundary, and MAI-98 absence. Token values and the canonical Figma source snapshot are unchanged.

## Accessibility contracts

Native buttons, inputs, selects, tables, and dialogs provide the semantic base. All interactive targets are token-backed at 44 by 44 CSS pixels. Focus-visible styling, persistent labels, description/error relationships, disabled/read-only distinction, reduced motion, text plus icon plus color status communication, and long-content resilience are required. Passive statuses are not assertive live regions. Static markup and automated browser tests do not prove complete assistive-technology conformance; manual AT validation remains a product validation responsibility.

Navigation tabs implement roving `tabIndex`, Arrow Left/Right, Home, End, disabled-tab skipping, `aria-selected`, and panel relationships. Dialog and Drawer use controlled native modal dialogs, explicit initial focus, focus containment, Escape policy, invoking-control focus return, independent scrolling, and duplicate confirmation protection.

## Evidence privacy

`EvidenceReference` is a discriminated union. Current, incomplete, and superseded branches require permitted source metadata. Restricted and unavailable branches cannot accept or render source, location, version, freshness, or source-action metadata. Restriction is textual and non-actionable.

## Financial grammar

Financial components are presentational. Direction does not imply good or bad business interpretation. Unavailable is distinct from numeric zero. Provisional is textual. Tabular numerals support comparison. No valuation or accounting business logic belongs in the component library.

## Data table composition

`DataTable`, `DataTableHeader`, `DataTableRow`, and `DataTableCell` retain `table`, `thead`, `tbody`, `tr`, `th`, and `td` semantics. Loading and empty states preserve header structure. Sorting uses a native button and `aria-sort`. Narrow viewports scroll horizontally instead of hiding material values.

## Responsive overlays

Dialog retains an independently scrolling modal surface. Drawer is right-aligned on desktop and tablet and becomes full-screen on mobile while preserving its context header and stable footer actions. Motion uses semantic durations and is removed under reduced-motion preference.

## Storybook and test evidence

Each public family has one implementation, one `.stories.tsx`, one `.mdx`, one CSS module, and focused unit coverage. MDX records file key, stable node, approved release, local usage/props, and accessibility boundaries. Bounded compositions cover fields, notice/action, financial value/delta, evidence/provenance, semantic table composition, Dialog/Button, and Drawer/Button. Integrated evidence on 2026-07-29: 29 unit files and 57 tests passed; 23 Storybook files and 84 Chromium tests passed; Storybook static build passed.

## Visual review evidence and limitation

Responsive and constrained stories exist for long StatusIndicator, InlineNotice wrapping, EvidenceReference wrapping, NavigationTab overflow, DataTable horizontal overflow, Dialog, tablet Drawer, mobile Drawer, and long field content/errors. The required in-app browser-control surface was not exposed in the execution session, so screenshot-level clipping, overlap, and target inspection at 1440, 1024, and 390 pixels could not be honestly completed. This is an environment limitation and remains an explicit owner-review step; it is not recorded as a product pass or defect.

## Known limitations

- The Figma connector exposes visual variants and token bindings but not a complete keyboard, focus, screen-reader, or prototype interaction contract.
- Automated markup, axe-oriented Storybook checks, and browser interactions do not establish complete assistive-technology conformance.
- The local Figma library remains unpublished and Code Connect remains deferred.
- Screenshot-level visual inspection remains pending because the approved browser-control surface was unavailable.

## MAI-98 consumption guidance

MAI-98 may import only the public families from `gui/components/index.ts` and compose them into the approved Shell/navigation/routes. It must not change component visual authority, copy component internals into screens, reintroduce Stitch or retired GUI authority, or treat Storybook compositions as product screens.
