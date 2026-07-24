---
id: doc-8
title: Local Setup and Runtime Operations
type: guide
created_date: '2026-07-24 15:35'
updated_date: '2026-07-24 15:51'
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
deno task verify      # repository verification script
deno task db:start    # docker-compose PostgreSQL
deno task db:setup    # apply/setup database path
deno task gui:start   # Next.js GUI development server
```

Run GUI commands from the provided Deno task or `gui/` package scripts. Common GUI checks include `npm --prefix gui run lint`, `npm --prefix gui run build`, and the Storybook documentation validator.

## Runtime modes and limits

- Database bootstrap failure is logged and the process continues, but database-dependent operations may fail or fall back.
- Missing ONNX artifacts allow startup but cause inference calls to fail until a model is loaded.
- The MVP product store is in-memory; API process restart resets it.
- Authentication and authorization are outside the current MVP product route implementation.

For production, move credentials to a managed secret system and make provider, database, VDR, and model-artifact configuration explicit. Do not use this local setup as a production deployment procedure.
