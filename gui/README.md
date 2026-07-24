# M&Ai Web GUI

The GUI is a Next.js 16 and React 19 application for the M&Ai MVP.

Project-wide product behavior is governed by the
[MVP GUI and API Behavior](../backlog/docs/product/mvp-gui-and-api/doc-9%20-%20MVP-GUI-and-API-Behavior.md)
document. The repository-wide documentation entry point is the
[Documentation Index](../backlog/docs/index/doc-10%20-%20Documentation-Index-and-Information-Architecture.md).

Files under `components/**/*.mdx`, `docs/`, and the design Markdown files are
colocated implementation and design references. They do not override governed
product or architecture documentation.

## Run locally

Start the Deno API from the repository root:

```bash
deno task api:start
```

Then start the GUI:

```bash
cd gui
npm install
npm run dev
```

The GUI uses relative `/api/*` requests. `next.config.ts` rewrites them to
`MAI_API_BASE_URL`, defaulting to `http://127.0.0.1:8000`.

## Verification

The canonical repository gate is:

```bash
deno task verify
```

Focused GUI checks:

```bash
npm run test:unit
npm run validate:storybook-docs
npm run build
npm run test-storybook -- --run
```

Storybook component pages remain colocated with their components and must
reference their corresponding story modules.
