# MAI Model Routing

Catalog checked: 2026-07-24. Model selectors and plan limits are volatile;
verify them at route time.

## Decision order

Route in this order:

1. Required surface capabilities and access.
2. Task complexity and consequence of error.
3. Model-specific strengths.
4. Live model availability and remaining capacity.
5. Evidence continuity when the first four factors tie.

Google-native work does not automatically require Gemini, and repository work
does not automatically require Codex. The decisive question is which available
model has the capabilities needed for this run.

## Complexity and reasoning

Task complexity and reasoning level are separate variables.

| Complexity | Typical evidence | Starting route |
| --- | --- | --- |
| Low | one component, known pattern, reversible edit, direct test | fast model at low reasoning |
| Medium | several files or sources, integration boundary, partial ambiguity, multiple checks | balanced model at medium reasoning |
| High | cross-system cause, large mixed context, security/data risk, architecture choice, failed prior pass | stronger model at medium reasoning; high only at the gate below |

Use high reasoning only when at least one condition is true:

- a medium pass failed to resolve a named contradiction;
- a security, financial, legal, data-loss, or migration decision remains
  materially uncertain;
- the task needs deep cross-system reasoning that cannot be decomposed safely;
- verification disagrees with the implementation and the cause is unclear.

High complexity alone does not force high reasoning. Prefer a more capable
model at medium reasoning before increasing effort.

## Current model catalog

Token limits below describe the underlying public model where the vendor
publishes them. A managed coding surface may impose a smaller effective limit.
Plan quota is a separate, task-weighted allowance.

### Antigravity on Google AI Pro

| Model | Reasoning choices in Antigravity | Capabilities and best-performing use cases | Published model limits | Capacity and cautions |
| --- | --- | --- | --- | --- |
| **Gemini 3.6 Flash** | Low, Medium, High | Default Antigravity route. Strong code generation, multimodal and spatial reasoning, browser/computer use, Google Search grounding, and multi-step agentic workflows. Use Medium for most MAI discovery, planning, Google integration, UI, and implementation work. | Public API: 1,048,576 input and 65,536 output tokens; text, image, video, audio, and PDF input. | Draws from the shared Gemini baseline, refreshed every five hours until the weekly cap. Start Low or Medium; High consumes more task-weighted capacity. |
| **Gemini 3.5 Flash** | Low, Medium, High | Long-horizon agents, subagent deployment, rapid coding loops, and multi-step work at scale. Use when 3.6 is unavailable, when comparing a suspected 3.6 regression, or when an existing run already holds decisive 3.5 context. | Public API: 1,048,576 input and 65,536 output tokens; multimodal input. | Draws from the shared Gemini baseline. Stable and capable, but 3.6 is the newer general route; continuity or comparative testing must justify it. |
| **Gemini 3.1 Pro** | Low, High | Advanced reasoning across modalities, broad world knowledge, architecture, difficult software-engineering analysis, and precise multi-tool workflows. Use Low for a bounded task that needs Pro capability; use High only for a high-reasoning gate. | Public preview API: 1,048,576 input and 65,536 output tokens; multimodal input. | Draws from the shared Gemini baseline. No Medium choice is currently shown in Antigravity; the managed surface controls versioning and effective limits. |
| **Claude Sonnet 4.6 (Thinking)** | Thinking | Balanced coding, computer use, long-context synthesis, agent planning, contract/document analysis, and an independent review from a non-Gemini/non-Codex model family. | Anthropic API: 1M context in beta and 64k synchronous output. Antigravity can impose different limits. | Uses a separate third-party rate limit rather than the shared Gemini baseline. Antigravity's model table lists it for AI Pro despite conflicting generic plan prose; trust the live selector. |
| **Claude Opus 4.6 (Thinking)** | Thinking | Deepest Antigravity alternative for difficult refactors, long-horizon root-cause analysis, multi-agent coordination, high-stakes review, and problems where correctness dominates latency. | Anthropic API: 1M context in beta and up to 128k output. Antigravity can impose different limits. | Uses a separate, capacity-constrained third-party rate limit. Use only after a medium route leaves a named reasoning gap, and verify live availability first. |
| **GPT-OSS-120b** | Medium | Open-weight comparison or emergency third-party fallback when Gemini and Claude are unsuitable or unavailable. | Antigravity does not publish an effective context limit on its model page. | Uses a separate third-party rate limit. It has no privileged Google or MAI-repository advantage and is not a default route. |

Antigravity also uses Nano Banana 2 internally for generated images and visual
artifacts. It is not a selectable core reasoning route.

Gemini 3.5 Flash-Lite is a current Gemini API model for high-throughput
subagents, parsing, extraction, and structured data, but it is not in
Antigravity's current reasoning-model selector. Do not recommend it as an
Antigravity route unless the live selector adds it.

### Codex in this workspace

These are the current Codex product routes. This runtime exposes Terra and Sol
as overrides; Luna remains conditional on a future live selector entry.

| Model | Reasoning choices | Capabilities and best-performing use cases | Published limits | Capacity and cautions |
| --- | --- | --- | --- | --- |
| **gpt-5.6-luna** | Runtime-dependent | Fast, cost-efficient Codex tier for repetitive inspection, lightweight transformations, narrow triage, or many independent low-risk checks. | Public API: 1.05M context and 128k maximum output; effective Codex limits unverified. | OpenAI documents it for Codex, but this runtime does not expose it as a model override. Recommend it only when the live selector offers it. |
| **gpt-5.6-terra** | Low, Medium, High, XHigh, Max, Ultra; environment default is Medium | Balanced everyday agentic coding. Use Low for mechanical inspection or edits and Medium for bounded implementation, tests, Linear work, and repository operations. | Public API: 1.05M context and 128k maximum output; effective Codex limits unverified. | ChatGPT-plan capacity is dynamic. Local configuration currently selects Terra, but configuration is not a routing rule. |
| **gpt-5.6-sol** | Low, Medium, High, XHigh, Max, Ultra; environment default is Low | Frontier agentic coding for cross-cutting defects, architecture, risky refactors, and rigorous repository review when direct workspace tools and branch evidence matter. Start Medium for substantive work. | Public API: 1.05M context and 128k maximum output; effective Codex limits unverified. | ChatGPT-plan capacity is dynamic. More capability is not evidence that it should be the default. Use only when Terra or a better-fit Gemini/Claude route leaves a named gap. |

Codex has a practical advantage when the current session already owns
uncommitted changes, approvals, test processes, or connected tools. That
advantage disappears when a self-contained handoff can transfer all decisive
evidence and another model is a better task fit.

## Phase routes

Each cell is a starting candidate. Apply required capabilities and live
availability before selecting the exact primary.

| MAI phase | Low complexity | Medium complexity | High complexity |
| --- | --- | --- | --- |
| **Intake** | Gemini 3.6 Flash Low for classification; Luna when live or Terra Low when intake is entirely local metadata | Gemini 3.6 Flash Medium for mixed requirements and context | Gemini 3.1 Pro Low for unusually ambiguous multimodal intake; Sol Medium when ambiguity is embedded in repository state |
| **Discovery and planning** | Gemini 3.6 Flash Low for scoped lookup or outline | Gemini 3.6 Flash Medium for web-grounded research, Google/GCP work, diagrams, and implementation plans; Terra Medium when the plan is purely local | Gemini 3.6 Flash Medium for broad Google/multimodal discovery or Sol Medium when direct code-graph evidence dominates; use Gemini 3.1 Pro High or Claude Sonnet Thinking only at a named reasoning or independent-critique gate |
| **Investigation** | Terra Low for a known local failure; Gemini 3.6 Flash Low for Google/product facts | Terra Medium for repository diagnosis; Gemini 3.6 Flash Medium for Google-native, browser, multimodal, or external-evidence diagnosis | Sol Medium for a cross-cutting local root cause or Gemini 3.6 Flash Medium for difficult Google/provider evidence; use Gemini 3.1 Pro High or Claude Opus Thinking only after a named reasoning deadlock |
| **Implementation** | Terra Low for mechanical local edits; Gemini 3.6 Flash Low for small Google-native or UI work | Terra Medium for ordinary repository changes; Gemini 3.6 Flash Medium for ADK/Gemini, browser, multimodal, or frontend agentic work | Sol Medium for risky cross-cutting local changes or Gemini 3.6 Flash Medium for complex Google-native implementation; use Gemini 3.1 Pro High only at the high-reasoning gate and Claude Sonnet Thinking when long-context code understanding is decisive |
| **Verification** | Terra Low to run deterministic local checks | Terra Medium for multi-part verification; Gemini 3.6 Flash Medium or Claude Sonnet Thinking for an independent semantic review | Sol Medium for systemic verification failures or Gemini 3.6 Flash Medium for cross-platform and multimodal evidence; use Gemini 3.1 Pro High or Claude Opus Thinking only for a consequential unresolved challenge |
| **Review and PR** | Luna when live or Terra Low for diff hygiene and mechanical PR metadata | Gemini 3.6 Flash Medium or Claude Sonnet Thinking for independent review; Terra Medium retains local mutation and GitHub operations when already authorized | Sol Medium for deep repository review or Gemini 3.6 Flash Medium for Google architecture review; use Gemini 3.1 Pro High or Claude Opus Thinking only for consequential unresolved design or security findings |
| **Finalization** | Terra Low for Linear and status updates | Terra Medium when several artifacts and completion gates must be reconciled; Gemini 3.6 Flash Medium when evidence is distributed across Google surfaces | Use the same model that owns unresolved completion evidence; escalate only if the completion gate itself is disputed |

## Task-shape overrides

These overrides beat the phase table:

| Task shape | Prefer | Escalate or switch when |
| --- | --- | --- |
| Google ADK, Gemini API, Vertex AI, Search grounding, or Google product research | Gemini 3.6 Flash Medium | Gemini 3.1 Pro High for difficult architecture or tool-use reliability |
| Browser automation, screenshots, video, diagrams, or spatial UI reasoning | Gemini 3.6 Flash Medium | Gemini 3.1 Pro High when multimodal evidence is dense or consequential |
| High-volume extraction, classification, or many independent subagents | Gemini 3.6 Flash Low/Medium; use 3.5 Flash when continuity or regression testing justifies it | split the workload before raising reasoning |
| Long contracts, financial documents, or research synthesis | Claude Sonnet 4.6 Thinking if live; otherwise Gemini 3.1 Pro Low/High | Claude Opus 4.6 Thinking for a high-stakes unresolved interpretation |
| Mechanical local edit, tests, git, Linear, or connected workspace tools | Terra Low/Medium | Sol Medium for cross-cutting risk or failed proof |
| Systemic local bug, architecture migration, or risky refactor | Sol Medium | Sol High only at the high-reasoning gate; Gemini 3.1 Pro High when Google-native reasoning dominates |
| Independent review of work produced by one model family | Gemini 3.6 Flash Medium, Claude Sonnet Thinking, or Terra Medium from a different family than the author | Opus Thinking or Gemini 3.1 Pro High only for consequential unresolved findings |

## Capacity and limits

### Antigravity

Google AI Pro currently provides a high Gemini baseline that refreshes every
five hours until a weekly limit is reached. Consumption is correlated with
work performed and shared across Gemini models according to relative
consumption, so a prompt count would be misleading. Third-party models such as
Claude and GPT-OSS use separate fixed rate limits. Capacity and rules can
change with demand.

Before a long or repeated Antigravity run:

1. Check the model selector or `/usage` / `/quota`.
2. Prefer Low or Medium when they satisfy the completion gate.
3. Treat a missing model as unavailable even if the documentation lists it.
4. When the baseline is exhausted, wait for refresh or ask the owner before
   spending purchased AI credits. Never enable automatic overages silently.

### Codex

The current workspace identifies ChatGPT Plus capacity but exposes no stable
numeric quota or model-specific context limit that this skill can verify.
Report capacity as **unknown** unless the live surface shows it. Do not turn a
local default model or a previously successful long run into a quota claim.

### Honest limit language

Use these forms:

- `Published API context: 1M; effective Antigravity limit unverified.`
- `AI Pro baseline: refreshes every five hours until weekly cap; current
  remaining capacity unknown.`
- `Codex plan quota: not exposed in this session; check the live surface.`

Do not say `unlimited`, estimate prompts remaining, or transfer API token
limits to a managed coding surface without evidence.

## Escalation ladder

Escalate one dimension at a time:

1. Increase reasoning on the same model when the capability fit is right.
2. Move to a stronger model on the same platform when reasoning is the gap.
3. Change platform when tools, modality, evidence access, or an independent
   model family is the gap.
4. Ask the owner before a capacity purchase, paid overage, or material
   cross-platform execution.

## Handoff packet

```text
Goal: <single outcome>
Phase / complexity: <phase> / <low|medium|high>
Constraints: <non-negotiables, scope, language, no-go actions>
Evidence: <files, commands, errors, links>
Current state: <what is known, unknown, and already tried>
Primary model and reason: <exact receiving model and capability advantage>
Request: <one concrete next deliverable and completion gate>
Return format: <decision, plan, findings, or critique>
```

The handoff excludes secrets and ambiguous authority. Repository mutations,
messages, paid overages, and other consequential actions remain limited to the
owner's authorization.
