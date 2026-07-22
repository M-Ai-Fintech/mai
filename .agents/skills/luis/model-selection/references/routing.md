# MAI Model Routing

## Default routing

| Phase | Default | Escalate when |
| --- | --- | --- |
| Triage, narrow inspection, metadata | `gpt-5.6-terra` at medium reasoning | evidence spans many subsystems |
| Investigation, architecture, dependency analysis | `gpt-5.6-sol` at high reasoning | external research or Google-native workflow dominates |
| Planning and task decomposition | `gpt-5.6-sol` at high reasoning | a second independent design critique is valuable |
| Implementation and verification in this repository | `gpt-5.6-terra` for bounded edits; `gpt-5.6-sol` for cross-cutting risk | none; Codex has the local tools and branch state |
| Gemini/Google product exploration or visual ideation | Antigravity with the smallest suitable Gemini Flash or Pro model | local repository evidence becomes decisive |
| Final review, commit, push, PR | Codex | never hand off ownership of repository mutations |

## Capacity policy

ChatGPT Plus and Google AI Pro availability changes. Do not encode numeric quotas. Ask the owner before a costly, long, or repeated external-model run; otherwise prefer the platform already holding the worktree and evidence.

## Handoff packet

```text
Goal: <single outcome>
Phase: <investigation|planning|review|research>
Constraints: <non-negotiables, scope, language, no-go actions>
Evidence: <files, commands, errors, links>
Current state: <what is known, unknown, and already tried>
Request: <one concrete next deliverable>
Return format: <decision, plan, findings, or critique>
```
