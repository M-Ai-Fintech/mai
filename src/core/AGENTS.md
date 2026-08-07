# Core Subsystem Agent Instructions (`src/core/`)

This directory contains the core platform services, database abstraction, PubSub
event bus, system bootstrapper, and Virtual Data Room (VDR) integration layer.

## Architecture & Submodules

- **`boot.ts`**: System bootstrapper (`AppBootstrapper`) that initializes core
  services, PubSub, database connection (with fallback mode), Gemini AI provider
  check, and ONNX model loading.
- **`db/`**: Database persistence layer (`DatabaseMemoryService.ts`,
  `DealRepository.ts`, `memory_service.ts`, `schema.sql`, `setup.ts`).
  Provides PostgreSQL connection with graceful in-memory fallback.
- **`pubsub/`**: Asynchronous event-driven messaging infrastructure
  (`LocalPubSubBus.ts`, `MessageBus.ts`, `AgentFlowWrapper.ts`). Handles topic
  subscriptions and cross-module message dispatching. Includes
  `LocalPubSubBus.test.ts`.
- **`vdr/`**: Virtual Data Room integration abstraction layer (`provider.ts`
  defining `VDRProvider` interface and `BaseVDRProvider` abstract class,
  `types.ts` defining `VDRDocument` & `SupergoodConfig`, `mock.ts`,
  `papermark.ts`, `providers/ideals.ts`, `providers/intralinks.ts`).

## Runtime Environment & Tooling

- **Runtime**: Deno runtime (`deno.json`).
- **File Extensions**: Local TypeScript imports must explicitly use `.ts`
  extensions (e.g.,
  `import { LocalPubSubBus } from "./pubsub/LocalPubSubBus.ts"`).
- **Environment & Flags**: Requires environment variables and Deno permissions
  (`--allow-read --allow-write --allow-env --allow-net --allow-ffi --allow-run`).

## Key Commands & Operations

- **Database Setup**: `deno task db:setup`
- **Database Container Control**: `deno task db:start` / `deno task db:stop`
- **Run Core Tests**:
  `deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net tests/core/ tests/pubsub.spec.ts tests/vdr_provider.spec.ts tests/vdr_connectors.spec.ts`
- **Run PubSub Unit Test**:
  `deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net src/core/pubsub/LocalPubSubBus.test.ts`

## Key Interfaces & Operational Conventions

- **Singleton Pattern**: Core singleton services
  (`LocalPubSubBus.getInstance()`, `DatabaseMemoryService.getInstance()`) must
  be accessed through their static factory methods.
- **Graceful Fallback**: Core services must handle connection failures (e.g.
  database unreachability, missing API keys) gracefully without throwing fatal
  boot errors.
- **VDR Provider Extension**: New data room providers must implement the
  `VDRProvider` interface defined in `src/core/vdr/provider.ts` and extend
  `BaseVDRProvider`.

## Documentation Governance

Canonical project architecture and database governance documentation lives in
the [MA&I Linear workspace](https://linear.app/mergesai/), especially the
migrated `doc-2` System and Core Architecture and `doc-3` Data and Memory
Architecture Documents. This file provides directory-local implementation
guidance.
