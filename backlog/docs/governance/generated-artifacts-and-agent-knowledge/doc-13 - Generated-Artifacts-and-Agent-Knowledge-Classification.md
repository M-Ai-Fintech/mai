---
id: doc-13
title: Generated Artifacts and Agent Knowledge Classification
type: guide
created_date: '2026-07-24 15:38'
tags:
  - documentation
  - agents
  - generated
  - canonical
---
# Generated Artifacts and Agent Knowledge Classification

- Authority ID: DOC-CLASS-001
- Owner: Repository maintainers
- Authority: Classification policy for non-canonical knowledge assets
- Freshness: Current as of 2026-07-24
- Language: English
- Update trigger: New generator, agent role, knowledge directory, or asset class

## Generated artifacts

`graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` are generated Graphify outputs. They support scoped discovery but are not authoritative documentation, must not make policy claims, and may be dirty after hooks or incremental analysis. Regenerate with `graphify update .` after source changes as required by repository instructions.

## Agent knowledge

Colocated assets under `src/agent/agents/<role>/` are runtime-local inputs:

- `instructions.md`: role behavior.
- `rules.md`: constraints.
- `playbook.md`: procedures.
- `fonts/`: source knowledge and reference material.
- `checklists/` and `templates/`: role-specific procedural/output assets.

They are owned by the relevant agent role. They may be cited by canonical architecture or product documents, but they do not supersede English ADRs or canonical cross-project documentation. Changes require the normal code-review path plus inventory refresh if the asset class changes.

## Storybook and skill assets

`gui/components/**/\*.mdx` documents a component beside its implementation. `.agents/skills/**/*.md` documents development-agent workflows. Both are referenced assets with local authority only; neither is a canonical project-policy source.

## Promotion rule

Promote a fact from a local knowledge asset only when it is stable, cross-project, and reviewed. Put the promoted rule in a canonical English document, cite the source asset, and retain the source as runtime or component context.
