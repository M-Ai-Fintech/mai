# MAI-93 Desktop Execution and Agentic MVP — Figma Handoff

## Scope

MAI-93 is desktop-only for the MVP. Full governed compositions were created for Negotiation Room and Agentic Workspace. Five adjacent families are represented through a governed reuse/defer matrix rather than separate full compositions.

## Governed Figma authority

File key: `otMJE31OKIxdXogV4RNbGQ`

- MAI-93 section: `239:2`
- Negotiation Room desktop: `239:3`
- Agentic Workspace desktop: `239:551`
- Shared Pattern Reuse & Defer Matrix: `239:921`

## Negotiation Room

Route: `/deals/:dealId/negotiation`

The screen includes:

- approved Deal Shell and Ana Costa identity;
- proposal and round registry;
- authoritative source reference;
- normalized-term comparison;
- differences-only control;
- deterministic economic consequences;
- concession ledger and open asks;
- restricted internal position and mandate constraints;
- BATNA context;
- approval route;
- exact action: `Submit counterproposal for approval`.

Authority boundaries distinguish external proposals, normalized terms, deterministic economics, restricted internal positions, proposed counteroffers, and human-authorized external positions. No autonomous external communication is implied.

## Agentic Workspace

Route: `/deals/:dealId/workspace`

The screen includes:

- approved Deal Shell and deal-scoped mission boundary;
- mission navigator and run history;
- active mission objective;
- editable execution plan;
- observable tool and engine trace;
- evidence inspector;
- generated draft artifact;
- approval request;
- side-effect classifications covering read-only evidence, deterministic execution, reversible draft, material internal change, and human authorization.

The workspace exposes concise operational traces and does not expose private chain-of-thought. Specialized transaction screens remain authoritative for review and decision.

## Shared-pattern reuse and defer matrix

The board records route, source pattern, required MVP state, permission boundary, approval/destructive boundary, implementation owner, and full-composition disposition for:

- Closing Control Room — deferred full composition;
- Deal Activity & Audit — reuse;
- Deal Team & Access — reuse;
- Deliverables & Exports — deferred full composition;
- Deal Settings & Archive — deferred full composition.

Tablet/mobile composition is deferred. Runtime responsive implementation and verification remain downstream responsibilities.

## Rendered gate

Natural-size renders were reviewed for all three deliverables.

- Negotiation Room: passed after one layout correction.
- Agentic Workspace: passed after one bottom-edge containment correction.
- Reuse/defer board: passed.
- Open P0 findings: none.
- Open P1 findings: none.
- P2: optional icon breadth and later density refinement do not block MVP implementation.

## Repository finalization still required

A short local/Codex finalization step must:

1. Update frontmatter only in `design/11_Negotiation_Room.md`, `design/12_Closing_Control_Room.md`, `design/13_Agentic_Workspace.md`, and `design/20_Deal_Activity_Audit.md` through `design/23_Deal_Settings_Archive.md`.
2. Update MAI-93 through Backlog CLI/MCP; do not edit Backlog Markdown directly.
3. Run `git diff --check`, documentation validation, definition-link validation, and mandatory Graphify only when required.
4. Append the resulting commits to this branch and update the draft PR.

No frontend, backend, CSS, Storybook, token, package, MAI-94, or responsive design work is included.
