---
id: doc-8
title: Local Setup and Runtime Operations
type: guide
created_date: '2026-07-24 15:35'
updated_date: '2026-08-02 03:15'
tags:
  - operations
  - setup
  - google-ai
  - canonical
---
# Local Setup and Runtime Operations

- **Authority ID:** OPS-LOCAL-001
- **Owner:** Developer Experience and Operations
- **Authority:** Canonical local setup and runtime-operations guide
- **Freshness:** Current for `deno.json`, GUI package scripts, and local configuration documented by MAI-84
- **Language:** English
- **Update trigger:** Prerequisites, environment variables, task commands, default ports, persistence modes, model-artifact requirements, or local operational limits change.

`deno.json`, package manifests, and executable scripts are authoritative when commands drift.

## Prerequisites

- Deno for the monolith and tests.
- Node/npm for `gui/` development and GUI checks.
- PostgreSQL when testing database-backed paths; the documented default connection is `postgres://postgres:postgres@localhost:5432/mai` unless `DATABASE_URL` is set.
- An ONNX model at `models/ma_classifier_q8.onnx` only when live ONNX inference is required.

## Google AI Studio configuration

Create an API key in Google AI Studio and expose it only through local secret management. `AIProvider.getApiKey()` checks, in order:

1. `GEMINI_API_KEY`
2. `GOOGLE_GENERATIVE_AI_API_KEY`
3. `GOOGLE_API_KEY`

For example:

```bash
export GEMINI_API_KEY="your-local-secret"
```

Do not commit API keys. If no usable key is present—or in the Deno test environment—the provider enters dry-run/fallback mode. The agent entry point substitutes mock behavior so local development and tests do not make real AI calls. A configured API key is not itself a guarantee that all provider features, models, or grounding tools are enabled.

## Commands

```bash
deno task start       # CLI application
deno task api:start   # HTTP API on port 8000
deno task test        # Deno test suite
deno task verify      # complete repository verification
deno task verify:fast # offline developer/operator preflight
deno task verify:fast:benchmark # ten-run local reference benchmark
deno task db:start    # docker-compose PostgreSQL
deno task db:setup    # apply/setup database path
deno task gui:start   # Next.js GUI development
```

Run GUI commands from the provided Deno task or `gui/` package scripts. Common GUI checks include `npm --prefix gui run lint`, `npm --prefix gui run build`, and the Storybook documentation validator.

## Fast developer preflight

`deno task verify:fast` is developer/operator tooling only. It is not a banker-facing interactive CLI command and does not replace any complete, integration, or deployed-health gate. It runs the fixed `FAST_CHECK_MANIFEST` in `scripts/verify_fast.ts` with explicit `deterministic-test-adapter` fixtures. A live dependency failure is reported as failed or unavailable; it never selects a fixture silently.

The included manifest covers core API parsing, authorization, Deal terminology, workflow transitions, persistence contracts, durable jobs, outbox/inbox mechanics, Target Dossier proposal status, term-sheet separation, DomainArea/RiskSeverity, and offline operations contract parsing. Every included component runs as a Deno test child with `--allow-read` only. The developer runner itself has only `--allow-read --allow-run`; it has no network, write, FFI, cloud, provider, database, or model-download permission.

The manifest explicitly skips production builds, Storybook browser execution, cloud infrastructure, external network access, and long-running model downloads. Live PostgreSQL and live provider health are explicitly unavailable in this profile. Those checks remain owned by `deno task verify`, `deno task verify:integration`, deployment verification, or their owning tasks. Output reports `passed`, `failed`, `skipped`, and `unavailable` per component; unavailable and skipped are not health claims.

Reference evidence for the initial runner target: on `linux/x86_64` with Deno 2.9.3, `deno task verify:fast:benchmark` executed 10 runs with durations 4035, 4047, 4264, 4052, 3912, 3956, 3851, 3993, 4363, and 3965 ms; p95 was 4363 ms. The 5000 ms threshold is an initial target for this documented runner, not a universal cross-machine SLA.

## Verification levels

| Level | Purpose | Dependency boundary | Command or authority |
| --- | --- | --- | --- |
| Fast preflight | Cheap deterministic contract feedback before broader checks | Offline explicit test adapters only | `deno task verify:fast` |
| Canonical repository verification | Complete repository gate | Includes the repository checks selected by MAI-79 | `deno task verify` |
| Live integration verification | Configured PostgreSQL, providers, infrastructure, and external integrations | Real credentials and services | `deno task verify:integration` |
| Deployed environment health | Operational evidence for a running environment | Deployed services, credentials, recovery, and monitoring | Deployment and operations gates |

## Runtime modes and limits

- Database bootstrap failure is logged and the process continues, but database-dependent operations may fail or fall back.
- Missing ONNX artifacts allow startup but cause inference calls to fail until a model is loaded.
- The MVP product store is in-memory; API process restart resets it.
- Authentication and authorization are outside the current MVP product route implementation.

For production, move credentials to a managed secret system and make provider, database, VDR, and model-artifact configuration explicit. Do not use this local setup as a production deployment procedure.
