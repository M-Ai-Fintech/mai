---
id: MAI-95
title: Retire Stitch and legacy GUI visuals and establish a clean frontend foundation
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-28 03:08'
updated_date: '2026-07-29 13:41'
labels:
  - frontend
  - foundation
  - stitch-retirement
  - gui-rebuild
  - mai-85-initiative
milestone: m-12
dependencies:
  - MAI-94
documentation:
  - design/
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
  - >-
    backlog/docs/architecture/frontend-foundation/doc-15 -
    MAI-95-Frontend-Foundation-Inventory.md
modified_files:
  - >-
    backlog/docs/architecture/frontend-foundation/doc-15 -
    MAI-95-Frontend-Foundation-Inventory.md
  - >-
    backlog/docs/governance/document-inventory/doc-12 -
    Documentation-Inventory-and-Classification.md
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
  - >-
    backlog/tasks/mai-95 -
    Retire-Stitch-and-legacy-GUI-visuals-and-establish-a-clean-frontend-foundation.md
  - graphify-out/GRAPH_REPORT.md
  - graphify-out/graph.json
  - gui/.storybook/main.ts
  - gui/.storybook/preview.tsx
  - gui/AGENTS.md
  - gui/CLAUDE.md
  - gui/DESIGN.md
  - gui/DESIGN_GUIDELINES.md
  - gui/README.md
  - gui/STITCH_DESIGN.md
  - >-
    gui/__snapshots__/components-atomic-avatar--default-avatar/components-atomic-avatar--default-avatar.png
  - >-
    gui/__snapshots__/components-atomic-avatar--with-image/components-atomic-avatar--with-image.png
  - >-
    gui/__snapshots__/components-atomic-avatar--with-initials-fallback/components-atomic-avatar--with-initials-fallback.png
  - >-
    gui/__snapshots__/components-atomic-badge--dark-badge/components-atomic-badge--dark-badge.png
  - >-
    gui/__snapshots__/components-atomic-badge--default-badge/components-atomic-badge--default-badge.png
  - >-
    gui/__snapshots__/components-atomic-badge--default/components-atomic-badge--default.png
  - >-
    gui/__snapshots__/components-atomic-badge--outline-badge/components-atomic-badge--outline-badge.png
  - >-
    gui/__snapshots__/components-atomic-badge--signal-orange/components-atomic-badge--signal-orange.png
  - >-
    gui/__snapshots__/components-atomic-badge--with-icon-badge/components-atomic-badge--with-icon-badge.png
  - >-
    gui/__snapshots__/components-atomic-badge--without-props/components-atomic-badge--without-props.png
  - >-
    gui/__snapshots__/components-atomic-button--button-with-icon-and-text/components-atomic-button--button-with-icon-and-text.png
  - >-
    gui/__snapshots__/components-atomic-button--consent-signal-orange/components-atomic-button--consent-signal-orange.png
  - >-
    gui/__snapshots__/components-atomic-button--icon-button/components-atomic-button--icon-button.png
  - >-
    gui/__snapshots__/components-atomic-button--primary-ink-pill/components-atomic-button--primary-ink-pill.png
  - >-
    gui/__snapshots__/components-atomic-button--primary/components-atomic-button--primary.png
  - >-
    gui/__snapshots__/components-atomic-button--satellite-cta/components-atomic-button--satellite-cta.png
  - >-
    gui/__snapshots__/components-atomic-button--secondary-outlined/components-atomic-button--secondary-outlined.png
  - >-
    gui/__snapshots__/components-atomic-button--without-props/components-atomic-button--without-props.png
  - >-
    gui/__snapshots__/components-atomic-divider--dashed/components-atomic-divider--dashed.png
  - >-
    gui/__snapshots__/components-atomic-divider--default-divider/components-atomic-divider--default-divider.png
  - >-
    gui/__snapshots__/components-atomic-divider--solid/components-atomic-divider--solid.png
  - >-
    gui/__snapshots__/components-atomic-spinner--cream-large/components-atomic-spinner--cream-large.png
  - >-
    gui/__snapshots__/components-atomic-spinner--full-coverage-spinner-2/components-atomic-spinner--full-coverage-spinner-2.png
  - >-
    gui/__snapshots__/components-atomic-spinner--full-coverage-spinner/components-atomic-spinner--full-coverage-spinner.png
  - >-
    gui/__snapshots__/components-atomic-spinner--ink-black/components-atomic-spinner--ink-black.png
  - >-
    gui/__snapshots__/components-atomic-spinner--signal-orange/components-atomic-spinner--signal-orange.png
  - >-
    gui/__snapshots__/components-atomic-spinner--small-orange/components-atomic-spinner--small-orange.png
  - >-
    gui/__snapshots__/components-atomics-icon--all-icons-grid/components-atomics-icon--all-icons-grid.png
  - >-
    gui/__snapshots__/components-atomics-icon--custom-size-and-unknown/components-atomics-icon--custom-size-and-unknown.png
  - >-
    gui/__snapshots__/components-atomics-icon--default/components-atomics-icon--default.png
  - >-
    gui/__snapshots__/components-atomics-icon--full-coverage-icon/components-atomics-icon--full-coverage-icon.png
  - >-
    gui/__snapshots__/components-atomics-icon--sizes/components-atomics-icon--sizes.png
  - >-
    gui/__snapshots__/components-composites-accordion--bordered-accordion/components-composites-accordion--bordered-accordion.png
  - >-
    gui/__snapshots__/components-composites-accordion--default-props-accordion/components-composites-accordion--default-props-accordion.png
  - >-
    gui/__snapshots__/components-composites-accordion--multi-expand-accordion/components-composites-accordion--multi-expand-accordion.png
  - >-
    gui/__snapshots__/components-composites-accordion--plain-accordion/components-composites-accordion--plain-accordion.png
  - >-
    gui/__snapshots__/components-composites-card--dark-card/components-composites-card--dark-card.png
  - >-
    gui/__snapshots__/components-composites-card--default-card/components-composites-card--default-card.png
  - >-
    gui/__snapshots__/components-composites-card--default-high-contrast/components-composites-card--default-high-contrast.png
  - >-
    gui/__snapshots__/components-composites-card--portrait-card/components-composites-card--portrait-card.png
  - >-
    gui/__snapshots__/components-composites-card--raised-card/components-composites-card--raised-card.png
  - >-
    gui/__snapshots__/components-composites-card--signal-orange-card/components-composites-card--signal-orange-card.png
  - >-
    gui/__snapshots__/components-composites-card--without-props/components-composites-card--without-props.png
  - >-
    gui/__snapshots__/components-composites-footer--complete-footer/components-composites-footer--complete-footer.png
  - >-
    gui/__snapshots__/components-composites-footer--default-footer/components-composites-footer--default-footer.png
  - >-
    gui/__snapshots__/components-composites-modal--closed-modal/components-composites-modal--closed-modal.png
  - >-
    gui/__snapshots__/components-composites-modal--default/components-composites-modal--default.png
  - >-
    gui/__snapshots__/components-composites-navigation--complete-navigation-suite/components-composites-navigation--complete-navigation-suite.png
  - >-
    gui/__snapshots__/components-composites-navigation--full-coverage-sidebar-2/components-composites-navigation--full-coverage-sidebar-2.png
  - >-
    gui/__snapshots__/components-composites-navigation--full-coverage-sidebar/components-composites-navigation--full-coverage-sidebar.png
  - >-
    gui/__snapshots__/components-composites-navigation--full-coverage-top-bar/components-composites-navigation--full-coverage-top-bar.png
  - >-
    gui/__snapshots__/components-composites-table--default/components-composites-table--default.png
  - >-
    gui/__snapshots__/components-composites-table--financial-table-interactive/components-composites-table--financial-table-interactive.png
  - >-
    gui/__snapshots__/components-composites-table--full-coverage-table-2/components-composites-table--full-coverage-table-2.png
  - >-
    gui/__snapshots__/components-composites-table--full-coverage-table/components-composites-table--full-coverage-table.png
  - >-
    gui/__snapshots__/components-composites-tabs--interactive-tabs/components-composites-tabs--interactive-tabs.png
  - >-
    gui/__snapshots__/components-feedback-emptystate--default/components-feedback-emptystate--default.png
  - >-
    gui/__snapshots__/components-feedback-errorboundary--custom-fallback/components-feedback-errorboundary--custom-fallback.png
  - >-
    gui/__snapshots__/components-feedback-errorboundary--fallback-preview/components-feedback-errorboundary--fallback-preview.png
  - >-
    gui/__snapshots__/components-feedback-skeleton--card-placeholder/components-feedback-skeleton--card-placeholder.png
  - >-
    gui/__snapshots__/components-feedback-skeleton--full-props-coverage/components-feedback-skeleton--full-props-coverage.png
  - >-
    gui/__snapshots__/components-feedback-toast--error-notification/components-feedback-toast--error-notification.png
  - >-
    gui/__snapshots__/components-feedback-toast--info-notification/components-feedback-toast--info-notification.png
  - >-
    gui/__snapshots__/components-feedback-toast--success-notification/components-feedback-toast--success-notification.png
  - >-
    gui/__snapshots__/components-feedback-toast--warning-notification/components-feedback-toast--warning-notification.png
  - >-
    gui/__snapshots__/components-forms-checkbox--default/components-forms-checkbox--default.png
  - >-
    gui/__snapshots__/components-forms-countryselector--dark-footer-pill/components-forms-countryselector--dark-footer-pill.png
  - >-
    gui/__snapshots__/components-forms-countryselector--invalid-country/components-forms-countryselector--invalid-country.png
  - >-
    gui/__snapshots__/components-forms-countryselector--light-surface-pill/components-forms-countryselector--light-surface-pill.png
  - >-
    gui/__snapshots__/components-forms-dropdown--disabled-dropdown/components-forms-dropdown--disabled-dropdown.png
  - >-
    gui/__snapshots__/components-forms-dropdown--empty-and-error-dropdown/components-forms-dropdown--empty-and-error-dropdown.png
  - >-
    gui/__snapshots__/components-forms-dropdown--invalid-value-multi/components-forms-dropdown--invalid-value-multi.png
  - >-
    gui/__snapshots__/components-forms-dropdown--invalid-value-single/components-forms-dropdown--invalid-value-single.png
  - >-
    gui/__snapshots__/components-forms-dropdown--searchable-and-multi-select/components-forms-dropdown--searchable-and-multi-select.png
  - >-
    gui/__snapshots__/components-forms-dropdown--single-select/components-forms-dropdown--single-select.png
  - >-
    gui/__snapshots__/components-forms-dropdown--uncontrolled/components-forms-dropdown--uncontrolled.png
  - >-
    gui/__snapshots__/components-forms-formfield--default-form-field/components-forms-formfield--default-form-field.png
  - >-
    gui/__snapshots__/components-forms-formfield--non-element-children/components-forms-formfield--non-element-children.png
  - >-
    gui/__snapshots__/components-forms-formfield--required-field/components-forms-formfield--required-field.png
  - >-
    gui/__snapshots__/components-forms-formfield--standard/components-forms-formfield--standard.png
  - >-
    gui/__snapshots__/components-forms-formfield--validation-error/components-forms-formfield--validation-error.png
  - >-
    gui/__snapshots__/components-forms-input--default-input/components-forms-input--default-input.png
  - >-
    gui/__snapshots__/components-forms-input--search-pill/components-forms-input--search-pill.png
  - >-
    gui/__snapshots__/components-forms-input--with-error/components-forms-input--with-error.png
  - >-
    gui/__snapshots__/components-forms-input--with-icon/components-forms-input--with-icon.png
  - >-
    gui/__snapshots__/components-forms-radio--default/components-forms-radio--default.png
  - >-
    gui/__snapshots__/components-forms-textarea--default/components-forms-textarea--default.png
  - >-
    gui/__snapshots__/components-forms-textarea--disabled/components-forms-textarea--disabled.png
  - >-
    gui/__snapshots__/components-forms-textarea--with-error/components-forms-textarea--with-error.png
  - gui/__snapshots__/example-button--large/example-button--large.png
  - gui/__snapshots__/example-button--primary/example-button--primary.png
  - gui/__snapshots__/example-button--secondary/example-button--secondary.png
  - gui/__snapshots__/example-button--small/example-button--small.png
  - gui/__snapshots__/example-header--logged-in/example-header--logged-in.png
  - gui/__snapshots__/example-header--logged-out/example-header--logged-out.png
  - gui/__snapshots__/example-page--logged-in/example-page--logged-in.png
  - gui/__snapshots__/example-page--logged-out/example-page--logged-out.png
  - gui/app/clients/page.tsx
  - gui/app/dashboard/custom/page.tsx
  - gui/app/dashboard/dashboard-cards.tsx
  - gui/app/dashboard/dashboard-create-modal.tsx
  - gui/app/dashboard/dashboard-header.tsx
  - gui/app/dashboard/dashboard-page-client.tsx
  - gui/app/dashboard/dashboard-pipeline-view.tsx
  - gui/app/dashboard/use-dashboard-create.ts
  - 'gui/app/deals/[id]/chat/page.tsx'
  - 'gui/app/deals/[id]/deal-detail-modals.tsx'
  - 'gui/app/deals/[id]/deal-detail-model.test.ts'
  - 'gui/app/deals/[id]/deal-detail-model.ts'
  - 'gui/app/deals/[id]/deal-detail-panels.tsx'
  - 'gui/app/deals/[id]/deal-page-client.tsx'
  - 'gui/app/deals/[id]/deal-phase-history-content.tsx'
  - 'gui/app/deals/[id]/engines/engine-workbench-fields.tsx'
  - 'gui/app/deals/[id]/engines/engine-workbench-model.test.ts'
  - 'gui/app/deals/[id]/engines/engine-workbench-model.ts'
  - 'gui/app/deals/[id]/engines/engine-workbench-view.tsx'
  - 'gui/app/deals/[id]/engines/page.tsx'
  - 'gui/app/deals/[id]/engines/use-engines-workbench.ts'
  - 'gui/app/deals/[id]/page.tsx'
  - 'gui/app/deals/[id]/use-deal-detail.tsx'
  - 'gui/app/deals/[id]/use-deal-edit-flow.ts'
  - gui/app/deals/deal-list-model.test.ts
  - gui/app/deals/deal-list-model.ts
  - gui/app/deals/deals-page-client.tsx
  - gui/app/deals/deals-table.tsx
  - gui/app/deals/page.tsx
  - gui/app/deals/use-deal-list.ts
  - 'gui/app/entities/[id]/page.tsx'
  - gui/app/entities/page.tsx
  - gui/app/error.tsx
  - gui/app/favicon.ico
  - gui/app/foundation-boundaries.test.ts
  - gui/app/generative-ui/generative-schema-model.test.ts
  - gui/app/generative-ui/generative-schema-model.ts
  - gui/app/generative-ui/generative-ui-section-model.ts
  - gui/app/generative-ui/generative-ui-sections.test.ts
  - gui/app/generative-ui/generative-ui-sections.tsx
  - gui/app/generative-ui/page.tsx
  - gui/app/globals.css
  - gui/app/layout.tsx
  - gui/app/not-found.tsx
  - gui/app/page.tsx
  - gui/app/settings/page.tsx
  - gui/app/settings/settings-sections.test.ts
  - gui/app/settings/settings-sections.tsx
  - gui/components/AGENTS.md
  - gui/components/Accordion/Accordion.mdx
  - gui/components/Accordion/Accordion.stories.tsx
  - gui/components/Accordion/Accordion.tsx
  - gui/components/Avatar/Avatar.mdx
  - gui/components/Avatar/Avatar.stories.tsx
  - gui/components/Avatar/Avatar.tsx
  - gui/components/Badge/Badge.mdx
  - gui/components/Badge/Badge.stories.tsx
  - gui/components/Badge/Badge.tsx
  - gui/components/Button/Button.mdx
  - gui/components/Button/Button.stories.tsx
  - gui/components/Button/Button.tsx
  - gui/components/Card/Card.mdx
  - gui/components/Card/Card.stories.tsx
  - gui/components/Card/Card.tsx
  - gui/components/Checkbox/Checkbox.mdx
  - gui/components/Checkbox/Checkbox.stories.tsx
  - gui/components/Checkbox/Checkbox.tsx
  - gui/components/CountrySelector/CountrySelector.mdx
  - gui/components/CountrySelector/CountrySelector.stories.tsx
  - gui/components/CountrySelector/CountrySelector.tsx
  - gui/components/Divider/Divider.mdx
  - gui/components/Divider/Divider.stories.tsx
  - gui/components/Divider/Divider.tsx
  - gui/components/Dropdown/Dropdown.mdx
  - gui/components/Dropdown/Dropdown.stories.tsx
  - gui/components/Dropdown/Dropdown.tsx
  - gui/components/Dropdown/dropdown-model.ts
  - gui/components/EmptyState/EmptyState.mdx
  - gui/components/EmptyState/EmptyState.stories.tsx
  - gui/components/EmptyState/EmptyState.tsx
  - gui/components/ErrorBoundary/ErrorBoundary.mdx
  - gui/components/ErrorBoundary/ErrorBoundary.stories.tsx
  - gui/components/ErrorBoundary/ErrorBoundary.tsx
  - gui/components/Footer/Footer.mdx
  - gui/components/Footer/Footer.stories.tsx
  - gui/components/Footer/Footer.tsx
  - gui/components/FormField/FormField.mdx
  - gui/components/FormField/FormField.stories.tsx
  - gui/components/FormField/FormField.tsx
  - gui/components/FoundationStatus/FoundationStatus.mdx
  - gui/components/FoundationStatus/FoundationStatus.stories.tsx
  - gui/components/FoundationStatus/FoundationStatus.test.ts
  - gui/components/FoundationStatus/FoundationStatus.tsx
  - gui/components/Icon/Icon.mdx
  - gui/components/Icon/Icon.stories.tsx
  - gui/components/Icon/Icon.tsx
  - gui/components/Input/Input.mdx
  - gui/components/Input/Input.stories.tsx
  - gui/components/Input/Input.tsx
  - gui/components/Modal/Modal.mdx
  - gui/components/Modal/Modal.stories.tsx
  - gui/components/Modal/Modal.tsx
  - gui/components/Navigation/AppShell.tsx
  - gui/components/Navigation/Navigation.mdx
  - gui/components/Navigation/Navigation.stories.tsx
  - gui/components/Navigation/Sidebar.tsx
  - gui/components/Navigation/TopBar.tsx
  - gui/components/Navigation/navigation-model.test.ts
  - gui/components/Navigation/navigation-model.ts
  - gui/components/Radio/Radio.mdx
  - gui/components/Radio/Radio.stories.tsx
  - gui/components/Radio/Radio.tsx
  - gui/components/Skeleton/Skeleton.mdx
  - gui/components/Skeleton/Skeleton.stories.tsx
  - gui/components/Skeleton/Skeleton.tsx
  - gui/components/Spinner/Spinner.mdx
  - gui/components/Spinner/Spinner.stories.tsx
  - gui/components/Spinner/Spinner.tsx
  - gui/components/Table/Table.mdx
  - gui/components/Table/Table.stories.tsx
  - gui/components/Table/Table.tsx
  - gui/components/Tabs/Tabs.mdx
  - gui/components/Tabs/Tabs.stories.tsx
  - gui/components/Tabs/Tabs.tsx
  - gui/components/Textarea/Textarea.mdx
  - gui/components/Textarea/Textarea.stories.tsx
  - gui/components/Textarea/Textarea.tsx
  - gui/components/Toast/Toast.mdx
  - gui/components/Toast/Toast.stories.tsx
  - gui/components/Toast/Toast.tsx
  - gui/components/_template/ComponentTemplate.mdx
  - gui/components/screens/agentic/AgentConversationPanel.tsx
  - gui/components/screens/agentic/AgentThreadSidebar.tsx
  - gui/components/screens/agentic/AgenticInsightsPanel.tsx
  - gui/components/screens/agentic/AgenticOverlays.tsx
  - gui/components/screens/agentic/AgenticStatusPanels.tsx
  - gui/components/screens/agentic/AgenticWorkspace.tsx
  - gui/components/screens/agentic/AssistantResponse.tsx
  - gui/components/screens/agentic/agentic-stream.ts
  - gui/components/screens/agentic/agentic-workspace-actions.ts
  - gui/components/screens/agentic/agentic-workspace-core-actions.ts
  - gui/components/screens/agentic/agentic-workspace-model.test.ts
  - gui/components/screens/agentic/agentic-workspace-model.ts
  - gui/components/screens/agentic/agentic-workspace-state.ts
  - gui/components/screens/agentic/agentic-workspace-types.ts
  - gui/components/screens/agentic/agentic-workspace-view-model.ts
  - gui/components/screens/agentic/useAgenticWorkspace.ts
  - gui/components/screens/custom-dashboard/CustomDashboard.tsx
  - gui/components/screens/custom-dashboard/CustomDashboardModals.tsx
  - gui/components/screens/custom-dashboard/CustomDashboardStatusPanels.tsx
  - gui/components/screens/custom-dashboard/CustomDashboardToolbar.tsx
  - gui/components/screens/custom-dashboard/CustomDashboardWidgets.tsx
  - gui/components/screens/custom-dashboard/custom-dashboard-actions.ts
  - gui/components/screens/custom-dashboard/custom-dashboard-model.test.ts
  - gui/components/screens/custom-dashboard/custom-dashboard-model.ts
  - gui/components/screens/custom-dashboard/custom-dashboard-types.ts
  - gui/components/screens/custom-dashboard/useCustomDashboard.ts
  - gui/components/screens/dashboard/dashboard-model-clean-code.test.ts
  - gui/components/screens/dashboard/dashboard-model.ts
  - gui/components/screens/dashboard/dashboard-route-state.ts
  - gui/components/screens/entities/EntitiesWorkspace.tsx
  - gui/components/screens/entities/EntitiesWorkspaceModals.tsx
  - gui/components/screens/entities/EntitiesWorkspaceViews.tsx
  - gui/components/screens/entities/EntityDetail.tsx
  - gui/components/screens/entities/EntityDetailViews.tsx
  - gui/components/screens/entities/EntityFormView.tsx
  - gui/components/screens/entities/TargetDossier.tsx
  - gui/components/screens/entities/entities-workspace-actions.ts
  - gui/components/screens/entities/entities-workspace-controller.ts
  - gui/components/screens/entities/entities-workspace-derived.ts
  - gui/components/screens/entities/entities-workspace-model.ts
  - gui/components/screens/entities/entities-workspace-types.ts
  - gui/components/screens/entities/entity-detail-model.test.ts
  - gui/components/screens/entities/entity-detail-model.ts
  - gui/components/screens/entities/entity-detail-route-model.ts
  - gui/components/screens/entities/entity-detail-types.ts
  - gui/components/screens/entities/entity-options.test.ts
  - gui/components/screens/entities/entity-options.ts
  - gui/components/screens/entities/entity-state.test.ts
  - gui/components/screens/entities/entity-state.ts
  - gui/components/screens/entities/target-dossier-payload.ts
  - gui/components/screens/entities/target-dossier.test.ts
  - gui/components/screens/entities/useEntityInvalidFieldFocus.ts
  - gui/docs/user-flow.md
  - gui/lib/dashboard-model.test.ts
  - gui/lib/generative-ui-engine.tsx
  - gui/lib/i18n/locales/en.json
  - gui/lib/i18n/locales/pt-BR.json
  - gui/lib/select-options.test.ts
  - gui/lib/select-options.ts
  - gui/package-lock.json
  - gui/package.json
  - gui/public/file.svg
  - gui/public/globe.svg
  - gui/public/next.svg
  - gui/public/vercel.svg
  - gui/public/window.svg
  - gui/scripts/verify-frontend-foundation.mjs
  - gui/tokens/design-tokens.css
  - gui/vitest.config.ts
  - gui/vitest.unit.config.ts
  - scripts/verify.ts
  - scripts/verify_test.ts
priority: high
ordinal: 800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Delivery step 7 of the MAI-85 initiative.

Establish the frontend foundation that will implement the approved Figma source without preserving the old GUI's visual structure.

Audit the existing GUI and Stitch artifacts into explicit keep, replace, and remove groups. Preserve framework, Storybook, testing, or implementation infrastructure only where it remains useful and conformant. Any deletion must be limited to reviewed task scope and followed by verification.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 An exact keep, replace, and remove inventory covers legacy pages, components, styles, routes, documentation, and Stitch artifacts.
- [x] #2 Stitch design authority, instructions, references, and task assumptions are removed from the active frontend workflow.
- [x] #3 A clean application scaffold builds, lints, and tests with the approved framework and repository conventions.
- [x] #4 Figma is the sole design input for new visual and interaction implementation.
- [x] #5 Prototype-only or mock-backed capability claims are not carried into the clean foundation as production behavior.
- [x] #6 Every approved removal is verified after execution, and retained infrastructure has an explicit purpose.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Baseline verification. 2. Exact keep / replace / remove inventory. 3. Reviewed legacy retirement. 4. Clean scaffold. 5. Focused and full verification. 6. Draft PR and owner review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Roadmap re-baseline: MAI-95 is blocked only by the bounded desktop-first MAI-94 MVP prototype. Deferred MAI-93 responsive/noncritical scope and deferred MAI-94 comprehensive/admin/external/tablet/mobile coverage are not dependencies for frontend-foundation start.

Intake: MAI-94 is Done; GitHub PR #14 is merged into master at ea15eb528837b83bc1b2158a6cb61478519cc9c5. No existing MAI-95 branch or PR was found. Pre-existing worktree was clean before branch creation.

Baseline verification (pre-mutation): npm --prefix gui ci PASS outside sandbox after sandbox esbuild spawn EPERM; lint PASS; test:unit PASS (19 files, 72 tests); build PASS outside sandbox after sandbox Google Fonts fetch failure; validate:storybook-docs PASS (24 MDX); build-storybook PASS; test-storybook PASS outside sandbox (24 files, 89 tests) after sandbox localhost listen EPERM. All initial failures were environment limitations, not product defects.

Inventory complete before deletion: governed doc-15 records 335 exact GUI paths (44 KEEP, 8 REPLACE, 283 REMOVE), resolved tracked importers, exact route/API dispositions, retained owners, and per-path deletion verification. doc-10 and doc-12 register the new canonical frontend-foundation authority.

Implementation verification: all 283 governed REMOVE paths are absent; 44 KEEP and 8 REPLACE decisions are recorded in doc-15. The active authority search returns only negative governance statements in gui/AGENTS.md, gui/README.md, and gui/components/AGENTS.md; retired literals are otherwise confined to regression/verifier code.

Final frontend evidence: clean npm ci PASS (555 packages; npm audit reports 3 moderate and 12 high inherited advisories); lint PASS; unit PASS (5 files/21 tests); Next build PASS; Storybook docs PASS (1 MDX); Storybook build PASS; Chromium story test PASS (1 file/1 test). Built-server smoke PASS for / and 404 MAI-98 deferral. deno task verify PASS across all nine canonical checks.

Dependency decision: framework/package manager versions remain unchanged. Stale lock-only legacy visual-test packages were pruned; aria-query is deduplicated to 5.3.2 and Testing Library CommonJS dependencies are pre-bundled to make Storybook browser tests reproducible after npm ci.

Graphify: graphify update . completed. Generated warnings were zero-node inputs, unavailable tree_sitter_sql, existing extraction metadata warnings, and the graph-size HTML limit; no product regression was reported.

Owner review gate: implementation is complete but MAI-95 intentionally remains In Progress pending review and merge. MAI-96, MAI-97, MAI-98, and later work were not started.
<!-- SECTION:NOTES:END -->
