---
name: model-selection
description: >
  Select the most suitable Codex or Antigravity model for an MAI work phase, balancing task risk, context needs, available tools, and the owner's ChatGPT Plus and Google AI Pro capacity. Use before investigation, planning, implementation, verification, or review handoffs.
---

# Model Selection

Choose the smallest capable model and platform. Read [the routing matrix](references/routing.md) before selecting.

1. Classify the phase, risk, required tools, context size, and whether local repository access is required.
2. Recommend one primary model/platform and one escalation condition. Do not invent plan quotas; treat availability as live owner-controlled capacity.
3. Keep work in the current platform when its tools and context suffice.
4. Recommend a cross-platform handoff only when the receiving model has a clear advantage. The owner executes it.
5. For a handoff, output the packet in the reference exactly: goal, constraints, evidence, state, and requested next action.

Completion: the recommendation names the phase, platform/model class, rationale, escalation trigger, and any owner action.
