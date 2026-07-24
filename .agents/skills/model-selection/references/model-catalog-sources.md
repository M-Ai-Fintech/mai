# Model catalog evidence

Verified against first-party documentation on 2026-07-24. This note records
facts that the model-selection routing matrix may rely on; it is not itself a
benchmark or a claim that one vendor is universally better.

## Evidence rules

- Treat the model picker in the active Codex or Antigravity session as the
  final authority for account-specific availability. Product rollouts,
  workspace policy, capacity, and client version can make the live list
  narrower than plan documentation.
- Keep product availability separate from API specifications. A model's API
  context window is useful capability evidence, but it does **not** prove that
  Codex or Antigravity exposes the same effective context window.
- Do not encode numeric subscription quotas in routing policy. Both Google and
  OpenAI describe usage as workload-dependent and subject to change.
- Prefer current display names when routing a human-operated product session.
  Use API model IDs only when the task is actually configuring an API.

## Google Antigravity on Google AI Pro

Google's current Antigravity model table lists all of these core reasoning
models for Google AI Pro:

| Antigravity display name | Verified Google AI Pro availability | Evidence-backed fit |
| --- | --- | --- |
| Gemini 3.6 Flash, Low/Medium/High | Yes | The best-supported general default on the Google side: coding, multimodal/spatial work, and multi-step agentic workflows, with selectable reasoning depth. |
| Gemini 3.5 Flash, Low/Medium/High | Yes | A capable long-horizon coding and agentic model, but Google now directs 3.5 Flash users toward 3.6 Flash. Keep it as a live-picker fallback or for comparative testing, not the automatic first choice. |
| Gemini 3.1 Pro, Low/High | Yes | Complex tasks needing broad world knowledge and advanced multimodal reasoning. Use when the task justifies Pro latency/consumption and the live picker confirms availability. |
| Claude Sonnet 4.6 (Thinking) | Yes | Balanced coding, agentic search, analysis, and everyday knowledge work; a credible independent implementation or review path inside Antigravity. |
| Claude Opus 4.6 (Thinking) | Yes | Hard, long-running tasks where deeper reasoning, large-codebase work, debugging, code review, or multi-agent coordination is worth the higher consumption. |
| GPT-OSS 120B (Medium) | Yes | Open-weight general reasoning and agentic tool use. It is **not** the same product or capability tier as OpenAI's GPT-5.6 models in Codex. |

Source: [Google Antigravity models](https://antigravity.google/docs/models).
The same page says model choice is sticky for the current user turn and lists
Nano Banana 2 as the non-selectable model used by Antigravity's generative
image tool. It does not list any GPT-5.x model: GPT-OSS 120B is the sole
OpenAI-origin option in the current Antigravity picker. Low, Medium, and High
are reasoning presets for the named Gemini model, not different base models.

This evidence means the routing matrix should not reduce Antigravity to vague
"Flash or Pro" wording, nor reserve it only for visual ideation. Antigravity is
a local agent environment with editor, terminal, browser, and autonomous
plan/execute/verify workflows, according to
[Google AI Pro benefits](https://support.google.com/googleone/answer/14534406?hl=en).
For Google-native integrations, multimodal inspection, browser-driven work,
long-context discovery, and an independent implementation/review pass,
Gemini 3.6 Flash or Gemini 3.1 Pro can be a primary route rather than merely an
escalation from OpenAI.

### Gemini details

#### Gemini 3.6 Flash

- Google describes `gemini-3.6-flash` as generally available and optimized for
  code generation, agentic execution, and spatial reasoning. Its primary
  documented use cases are code generation, spatial/multimodal reasoning, and
  multi-step agentic workflows.
- The API model accepts text, image, video, audio, and PDF input; supports
  caching, code execution, Computer Use (preview), File Search, function
  calling, Maps and Search grounding, structured outputs, thinking, and URL
  context.
- The API specification is 1,048,576 input tokens and 65,536 output tokens.
  Do not transpose those numbers into an Antigravity guarantee.
- Google says 3.6 Flash uses fewer turns and tool calls than 3.5 Flash,
  improves production code generation and instruction following, and reduces
  unwanted file changes during diagnostic work. The default API thinking level
  is Medium; Antigravity offers Low, Medium, and High.

Sources:
[Gemini 3.6 Flash model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash),
[latest Gemini models guide](https://ai.google.dev/gemini-api/docs/latest-model),
and [Gemini 3.6 Flash in Antigravity](https://antigravity.google/blog/gemini-3-6-flash-in-google-antigravity).

#### Gemini 3.5 Flash

- Google calls `gemini-3.5-flash` a stable, generally available model for
  sustained frontier performance in agentic execution, coding, and
  long-horizon work.
- Its documented API limits are a 1M-token context window and roughly 65K
  maximum output. Again, these are API specifications, not an Antigravity
  product promise.
- Because Google's 3.6 migration guide names 3.5 Flash as a source model for
  migration to 3.6 Flash, new routing should normally prefer 3.6 when both are
  live, while retaining 3.5 as a fallback and evaluation baseline.

Sources:
[Gemini 3.5 Flash guide](https://ai.google.dev/gemini-api/docs/whats-new-gemini-3.5)
and [latest Gemini models guide](https://ai.google.dev/gemini-api/docs/latest-model).

#### Gemini 3.1 Pro

- Google describes Gemini 3.1 Pro as best for complex tasks requiring broad
  world knowledge and advanced reasoning across modalities.
- The Gemini API model ID is `gemini-3.1-pro-preview`, with a documented 1M
  input / 64K output window and dynamic thinking. The API page labels the
  Gemini 3-series entries discussed there as preview.
- Antigravity's product model is displayed as `Gemini 3.1 Pro`, without the API
  suffix. Do not replace the product label with the API ID, and do not infer
  that Antigravity inherits the API's preview lifecycle or exact token limits.

Source:
[Gemini 3.1 Pro model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview)
and [Google Antigravity models](https://antigravity.google/docs/models).

#### Gemini API models that are not Antigravity choices

The current Gemini API catalog also includes Gemini 3.5 Flash-Lite, a stable
high-volume, cost-efficient model for subagent execution, parsing, extraction,
and structured data. It has a 1,048,576-token API input limit and 65,536-token
output limit. It is **not** listed in Antigravity's current selectable model
table, so do not recommend it as an Antigravity route.

Sources:
[Gemini 3.5 Flash-Lite model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)
and [Google Antigravity models](https://antigravity.google/docs/models).

### Claude models actually available in Antigravity

Google—not Anthropic—is the availability authority for Claude inside
Antigravity. Google's current model table explicitly lists Claude Sonnet 4.6
(Thinking) and Claude Opus 4.6 (Thinking) for Google AI Pro. Therefore both may
be considered in Antigravity routing when the live picker agrees.

Anthropic's own documentation supplies capability context:

- Claude Sonnet 4.6 is positioned as the best balance of speed and intelligence
  and is suited to everyday coding, analysis, search, content, computer use,
  agent planning, and design. Its Claude API context window is 1M tokens
  (initially documented as beta) with 64K synchronous maximum output.
- Claude Opus 4.6 is positioned for harder agentic coding, large-codebase work,
  debugging, review, research, finance, and long-running tasks. Anthropic
  documents a 1M-token API context window in beta.

Sources:
[Claude models overview](https://platform.claude.com/docs/en/about-claude/models/overview),
[Introducing Claude Sonnet 4.6](https://www.anthropic.com/news/claude-sonnet-4-6),
and [Introducing Claude Opus 4.6](https://www.anthropic.com/news/claude-opus-4-6).

Important boundary: Anthropic's standalone catalog has moved beyond these
versions and currently includes Sonnet 5, Fable 5, and Opus 4.8, but the
Antigravity model page still names Sonnet 4.6 and Opus 4.6. Do not recommend a
newer standalone Claude model *as an Antigravity model* unless Google's live
picker or updated Antigravity documentation exposes it. Likewise, the Claude
API context limits are not evidence of Antigravity's effective context limit.

### Antigravity usage and quotas

Google's current plan documentation says:

- Google AI Pro receives a high baseline quota that refreshes every five hours
  until a weekly limit is reached.
- The amount consumed depends on the work performed by the agent, so simpler
  tasks can yield more prompts than complex ones.
- Baseline usage across Gemini models is shared and drawn down according to
  relative API pricing; non-Gemini models remain on a separate fixed rate
  limit because of capacity constraints.
- After baseline exhaustion, Pro and Ultra users can optionally use purchased
  AI credits. Antigravity has no bring-your-own-key or bring-your-own-endpoint
  mechanism for extra limits.
- Capacity is not guaranteed, and usage rules may change.
- Google AI Pro's Antigravity entitlement is not a bundled Gemini API quota.
  Gemini API rate limits and Cloud Billing tiers are separate from the
  consumer subscription.

Sources:
[Google Antigravity plans](https://antigravity.google/docs/plans),
[Changes to Antigravity plans](https://antigravity.google/blog/changes-to-antigravity-plans),
[Google AI Pro benefits](https://support.google.com/googleone/answer/14534406?hl=en),
[Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits),
and [Gemini API billing](https://ai.google.dev/gemini-api/docs/billing).

Safe routing language is therefore "prefer the smallest capable live model;
check current usage before a long or repeated run." It is not safe to promise a
specific number of prompts, tokens, or remaining runs.

## OpenAI Codex on ChatGPT Plus

OpenAI's current product documentation says Plus users can choose GPT-5.6 Sol,
Terra, and Luna in Codex and set reasoning effort. The active Codex client and
session remain authoritative: rollout, version, workspace, and runtime model
overrides may expose a subset.

| Codex model | First-party positioning | Appropriate MAI route |
| --- | --- | --- |
| GPT-5.6 Luna | Fastest and most cost-efficient tier; high-volume workloads | Narrow triage, repetitive inspection, lightweight transformations, or many independent low-risk checks—only if the active runtime exposes it. |
| GPT-5.6 Terra | Balance of intelligence, speed, and cost for everyday work | Bounded implementation, routine debugging, focused verification, and ordinary repository work. |
| GPT-5.6 Sol | Flagship for complex professional work, reasoning, and coding | Cross-cutting architecture, ambiguous hard bugs, high-risk review, difficult research synthesis, or work that has measured quality gains from higher reasoning. |

Sources:
[GPT-5.6 launch and Codex availability](https://openai.com/index/gpt-5-6/)
and [Codex model guidance](https://developers.openai.com/codex/models).

All three GPT-5.6 API models document a 1.05M context window, 128K maximum
output, image input, and tool support including functions, web search, file
search, and computer use. These are API specifications; they do not guarantee
the effective context available inside a Codex session. The API guide supports
reasoning levels from none through max and explicitly positions Terra as the
balance tier and Luna as the high-volume tier.

Source:
[GPT-5.6 model guidance](https://developers.openai.com/api/docs/guides/latest-model).

Codex usage under a ChatGPT plan is workload-dependent. OpenAI says consumption
varies with task size and complexity, selected model, execution environment,
codebase size, and session duration. Codex shares an agentic usage/credit pool
with other eligible agentic features. Users should inspect the Usage panel or
limit banner; some Plus users may buy credits, while others may need to wait or
upgrade. Do not turn transient promotions or rate-card values into a durable
prompt quota.

Source:
[Using Codex with a ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan).

## Routing conclusions supported by the sources

1. **Use platform fit before vendor preference.** Antigravity is a valid primary
   environment for Google-native, multimodal, browser/computer-use, large-input
   discovery, coding, implementation, and independent review. Codex is a valid
   primary environment when its repository tools and current worktree state
   are decisive.
2. **Give Gemini a concrete default.** Gemini 3.6 Flash Medium is the
   evidence-backed balanced Antigravity starting point; Low is suitable for
   simpler latency-sensitive work, and High or Gemini 3.1 Pro is justified for
   harder reasoning. This avoids treating all Gemini work as an undifferentiated
   "Flash or Pro" category.
3. **Use Claude when it has a real advantage and is actually exposed.** Sonnet
   4.6 is a balanced independent coding/review option in Antigravity; Opus 4.6
   is the quality-first option for hard long-running work. Do not route to a
   standalone Anthropic model absent from Google's Antigravity list.
4. **Do not make OpenAI the automatic default for every software phase.**
   Terra is a sensible everyday Codex choice and Sol a hard-task escalation,
   but Gemini 3.6 Flash is equally legitimate for agentic coding and often the
   better platform match for Google/ADK/GCP, multimodal, or Antigravity-native
   work.
5. **Do not claim that a handoff is free.** A cross-platform handoff loses live
   conversation and worktree state unless the packet carries the relevant
   evidence. Recommend it only for a specific capability advantage or an
   independent critique.
6. **Use live capacity, not invented quotas.** Ask the owner to check the
   product's usage indicator before costly repeated runs; otherwise choose the
   smallest capable model already holding the relevant context.

## Known uncertainties

- Neither Google's Antigravity model page nor its plan page publishes a stable
  numeric Google AI Pro prompt/token allowance. Capacity and consumption are
  dynamic.
- Antigravity does not publish effective per-model context windows on its model
  page. API token limits must remain labeled as API facts.
- OpenAI documents GPT-5.6 Sol, Terra, and Luna for Plus in Codex, but any
  particular Codex runtime may expose fewer model overrides. The live runtime
  wins.
- Google may update Antigravity's third-party models independently of
  Anthropic's standalone catalog. Verify Google's model page or live picker
  before naming a Claude version.
- Google's generic Antigravity plan prose says Ultra receives third-party
  model access, while the current model table and Google AI Pro help explicitly
  show third-party models for Pro. Treat the current model table and live
  picker as authoritative, and do not promise future availability.
