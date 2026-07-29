# MAI frontend tokens

`source/mai-figma-v0.3.json` is the normalized, versioned read-only extraction
of the approved live Figma variables and styles. Generated files are never
edited by hand.

```bash
npm run tokens:generate
npm run tokens:check
npm run verify:tokens
```

Application code imports typed references from `@/tokens` or consumes public
`--mai-*` semantic, responsive, component, typography, elevation, and motion
properties. Public consumers must not use `--mai-core-*`.

The generated Sofia Sans stack states the approved family but does not bundle a
font file. Runtime rendering uses Sofia Sans only when it is locally available;
otherwise the documented system fallbacks render. MAI-96 adds no font package
or network-only font loading.
