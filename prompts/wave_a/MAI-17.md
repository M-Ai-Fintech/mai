# MAI-17 — ONNX financial-risk artifact and local inference runtime

**Skill:** `$solve-mai`

Read `prompts/OPERATING_RULES.md` and `## Wave A execution plan — MAI-17` in local `AGENTS.md`; never commit it. Invoke `$solve-mai MAI-17`.

## Focus

Rebuild a reproducible reference model and ONNX artifact with manifest/checksum, exact six-input tensor validation, complete four-output mapping, Deno/WASM runtime, golden vectors, and benchmarks.

## Boundary

Do not present the artifact as product-certified or integrate it into domain workflows.

Use focused`rg`, reproducibility/runtime/benchmark tests and `deno task verify`. Set In Progress, record artifact evidence, open a PR containing MAI-17, never self-merge, and do not mark Done.
