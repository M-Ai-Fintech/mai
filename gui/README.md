# M&Ai Frontend Foundation

The GUI is a Next.js 16 and React 19 foundation for the governed M&Ai
banker workspace. Product screens and production capabilities are not
implemented by the current root scaffold.

Project-wide product behavior is governed by the
[MVP GUI and API Behavior Linear Document](https://linear.app/mergesai/document/mvp-gui-and-api-behavior-1b432ee81db9).
The repository-wide documentation entry point is the
[MAI Linear workspace](https://linear.app/mergesai/).

The exact MAI-95 keep, replace, and remove inventory is governed by the
[Frontend Foundation Inventory Linear Document](https://linear.app/mergesai/document/mai-95-frontend-foundation-inventory-903eec38cc51).

Figma file `otMJE31OKIxdXogV4RNbGQ` is the sole visual and interaction design
authority. Product definitions `design/1–28` govern behavior and boundaries,
and `design/28_Critical_Desktop_Banker_Path_Prototype.md` governs the MAI-94
critical MVP workflow. Stitch and the retired GUI are historical only.

MAI-96 owns final tokens, MAI-97 owns governed components, and MAI-98 owns the
approved Shell, navigation, and route architecture.

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
npm run tokens:check
npm run verify:tokens
npm run test:unit
npm run validate:storybook-docs
npm run build
npm run test-storybook -- --run
```

Storybook remains available for neutral infrastructure examples. Final
component design authority and conformance belong to MAI-97.
