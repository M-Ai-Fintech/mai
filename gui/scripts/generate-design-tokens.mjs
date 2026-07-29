import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const guiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(guiRoot, "tokens/source/mai-figma-v0.3.json");
const cssPath = resolve(guiRoot, "tokens/generated/tokens.css");
const typescriptPath = resolve(guiRoot, "tokens/generated/tokens.ts");
const requiredCollections = ["Component", "Core", "Motion", "Responsive", "Semantic"];
const requiredCategories = [
  "color/action/",
  "color/border/",
  "color/content/",
  "color/evidence/",
  "color/financial-impact/",
  "color/focus/",
  "color/overlay/",
  "color/status/",
  "color/surface/",
  "elevation/",
  "motion/",
  "radius/",
  "size/",
  "space/",
];
const canonicalColors = {
  "color/canvas-cream": "#f3f0ee",
  "color/lifted-cream": "#fcfbfa",
  "color/ink-black": "#141413",
  "color/signal-orange": "#cf4500",
  "color/light-signal-orange": "#f37338",
  "color/dust-taupe": "#d1cdc7",
  "color/slate-gray": "#696969",
};
const breakpointContracts = { mobile: 0, tablet: 768, desktop: 1280 };

export async function readTokenSource(path = sourcePath) {
  return JSON.parse(await readFile(path, "utf8"));
}

function firstModeValue(variable) {
  const value = Object.values(variable.valuesByMode)[0];
  if (!value) throw new Error(`Variable ${variable.name} has no mode value`);
  return value;
}

function variableMap(source) {
  return new Map(source.variables.map((variable) => [variable.name, variable]));
}

function assertSourceShape(source) {
  if (source.schemaVersion !== "1.0.0") {
    throw new Error(`Unsupported schema ${source.schemaVersion}; expected 1.0.0`);
  }
  if (source.variables.length !== source.liveCounts.variables) {
    throw new Error(`Variable count ${source.variables.length}; expected ${source.liveCounts.variables}`);
  }
  if (source.approvedVisualModes.join() !== "Light / Standard") {
    throw new Error(`Modes ${source.approvedVisualModes.join()}; expected Light / Standard`);
  }
}

function assertCollections(source) {
  const names = source.collections.map(({ name }) => name).sort();
  if (names.join() !== requiredCollections.join()) {
    throw new Error(`Collections ${names.join()}; expected ${requiredCollections.join()}`);
  }
  for (const collection of source.collections) {
    const modes = collection.modes.map(({ name }) => name);
    if (modes.join() !== "Light / Standard") {
      throw new Error(`Collection ${collection.name} modes ${modes.join()}; expected Light / Standard`);
    }
  }
}

function assertAliases(source) {
  const byId = new Map(source.variables.map((variable) => [variable.id, variable]));
  for (const variable of source.variables) validateVariableAliases(variable, byId);
}

function validateVariableAliases(variable, byId) {
  const modeValue = firstModeValue(variable);
  const ids = modeValue.aliasChain.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) throw new Error(`Alias cycle for ${variable.name}`);
  if (ids.at(-1) && !byId.has(ids.at(-1))) throw new Error(`Missing alias for ${variable.name}`);
  if (modeValue.source.kind !== "alias") return;
  const target = byId.get(modeValue.source.target.id);
  if (!target) throw new Error(`Missing alias target ${modeValue.source.target.id}`);
  if (target.resolvedType !== variable.resolvedType) {
    throw new Error(`Alias type ${variable.resolvedType} -> ${target.resolvedType} for ${variable.name}`);
  }
}

function assertCategories(source) {
  const semanticNames = source.variables
    .filter(({ collectionName }) => collectionName === "Semantic")
    .map(({ name }) => name);
  for (const category of requiredCategories) {
    if (!semanticNames.some((name) => name.startsWith(category))) {
      throw new Error(`Missing semantic category ${category}`);
    }
  }
}

function colorHex(color) {
  const channel = (value) => Math.round(value * 255).toString(16).padStart(2, "0");
  const alpha = typeof color.a === "number" && color.a < 1 ? channel(color.a) : "";
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}${alpha}`;
}

function resolvedColor(source, name) {
  const variable = variableMap(source).get(name);
  if (!variable) throw new Error(`Missing color ${name}`);
  return colorHex(firstModeValue(variable).resolvedValue);
}

function assertCanonicalContracts(source) {
  for (const [name, expected] of Object.entries(canonicalColors)) {
    const actual = resolvedColor(source, name);
    if (actual !== expected) throw new Error(`Canonical ${name} is ${actual}; expected ${expected}`);
  }
  for (const [name, expected] of Object.entries(breakpointContracts)) {
    const variable = variableMap(source).get(`breakpoint/${name}`);
    const actual = firstModeValue(variable).resolvedValue;
    if (actual !== expected) throw new Error(`Breakpoint ${name} is ${actual}; expected ${expected}`);
  }
}

function checksumFor(source) {
  const checksumView = structuredClone(source);
  delete checksumView.sourceContentChecksum;
  return `sha256:${createHash("sha256").update(JSON.stringify(checksumView)).digest("hex")}`;
}

export function validateTokenSource(source) {
  assertSourceShape(source);
  assertCollections(source);
  assertAliases(source);
  assertCategories(source);
  assertCanonicalContracts(source);
  const checksum = checksumFor(source);
  if (checksum !== source.sourceContentChecksum) {
    throw new Error(`Source checksum ${source.sourceContentChecksum}; expected ${checksum}`);
  }
  return source;
}

function slug(path) {
  return path.toLowerCase().replaceAll("/", "-").replaceAll(/[^a-z0-9-]/g, "-");
}

function cssName(variable) {
  const prefix = variable.collectionName === "Core" ? "core-" : "";
  return `--mai-${prefix}${slug(variable.name)}`;
}

function numberUnit(variable) {
  if (variable.name.startsWith("duration/") || variable.name.startsWith("motion/")) return "ms";
  if (variable.name.includes("easing/")) return "";
  if (variable.name.includes("columns")) return "";
  if (variable.name.includes("weight")) return "";
  return "px";
}

function rawCssValue(variable, value) {
  if (variable.resolvedType === "COLOR") return colorHex(value);
  return `${Number(value)}${numberUnit(variable)}`;
}

function variableCssValue(variable, source, byId) {
  const mode = firstModeValue(variable);
  if (mode.source.kind === "raw") return rawCssValue(variable, mode.source.value);
  const target = byId.get(mode.source.target.id);
  if (!target) throw new Error(`Missing CSS alias ${mode.source.target.id}`);
  return `var(${cssName(target)})`;
}

function cssVariableLines(source) {
  const byId = new Map(source.variables.map((variable) => [variable.id, variable]));
  return source.variables.map((variable) =>
    `  ${cssName(variable)}: ${variableCssValue(variable, source, byId)};`
  );
}

function textStyleSlug(style) {
  return slug(style.name.replace(/^Type\//, ""));
}

function fontWeight(style) {
  if (style.name === "Type/Body") return 450;
  return { Regular: 400, Medium: 500, Bold: 700 }[style.properties.fontName.style] ?? 400;
}

function typographyLines(source) {
  return source.styles.text.flatMap((style) => {
    const name = textStyleSlug(style);
    const letter = style.properties.letterSpacing.value;
    const lines = [
      `  --mai-type-${name}-font-family: "Sofia Sans", "Segoe UI", Arial, sans-serif;`,
      `  --mai-type-${name}-font-size: ${style.properties.fontSize}px;`,
      `  --mai-type-${name}-line-height: ${style.properties.lineHeight.value}px;`,
      `  --mai-type-${name}-font-weight: ${fontWeight(style)};`,
      `  --mai-type-${name}-letter-spacing: ${letter}px;`,
    ];
    if (style.name.includes("Financial")) lines.push(`  --mai-type-${name}-numeric: tabular-nums;`);
    return lines;
  });
}

function effectLines(source) {
  return source.styles.effect.map((style) => {
    const effect = style.effects[0];
    const color = colorHex(effect.color);
    return `  --mai-${slug(style.name)}: ${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${effect.spread}px ${color};`;
  });
}

function value(source, name) {
  const variable = variableMap(source).get(name);
  if (!variable) throw new Error(`Missing variable ${name}`);
  return firstModeValue(variable).resolvedValue;
}

function responsiveBlock(source, name) {
  const suffix = name === "mobile" ? "" : `@media (min-width: ${value(source, `breakpoint/${name}`)}px)`;
  const declarations = [
    `    --mai-layout-grid-columns: ${value(source, `grid/columns/${name}`)};`,
    `    --mai-layout-grid-gutter: ${value(source, `layout/gutter/${name}`)}px;`,
    `    --mai-layout-grid-margin: ${value(source, `grid/margin/${name}`)}px;`,
    `    --mai-layout-content-max: ${value(source, `layout/content-max/${name}`)}px;`,
    `    --mai-layout-rail: ${value(source, `layout/rail/${name}`)}px;`,
    `    --mai-layout-sidebar: ${value(source, `layout/sidebar/${name}`)}px;`,
  ].join("\n");
  return suffix ? `${suffix} {\n  :root {\n${declarations}\n  }\n}` : `:root {\n${declarations}\n}`;
}

function tailwindTheme() {
  return `@theme inline {
  --color-surface-canvas: var(--mai-color-surface-canvas);
  --color-surface-raised: var(--mai-color-surface-raised);
  --color-content-primary: var(--mai-color-content-primary);
  --color-content-secondary: var(--mai-color-content-secondary);
  --color-border-default: var(--mai-color-border-default);
  --color-action-primary: var(--mai-color-action-primary-background);
  --color-status-critical: var(--mai-color-status-critical-content);
  --color-evidence-calculation: var(--mai-color-evidence-calculation);
  --font-sans: var(--mai-type-body-font-family);
  --radius-panel: var(--mai-radius-panel);
  --shadow-panel: var(--mai-elevation-panel);
}`;
}

export function generateCss(source) {
  const root = [...cssVariableLines(source), ...typographyLines(source), ...effectLines(source)];
  return `/* Generated from tokens/source/mai-figma-v0.3.json. Do not edit. */
:root {
${root.join("\n")}
  --mai-border-width-default: var(--mai-core-border-width-1);
  --mai-elevation-panel: none;
  --mai-elevation-overlay: var(--mai-elevation-raised);
  --mai-motion-easing-standard: cubic-bezier(${value(source, "easing/standard/x1")}, ${value(source, "easing/standard/y1")}, ${value(source, "easing/standard/x2")}, ${value(source, "easing/standard/y2")});
  --mai-font-feature-financial: "tnum" 1;
}

${responsiveBlock(source, "mobile")}

${responsiveBlock(source, "tablet")}

${responsiveBlock(source, "desktop")}

@media (prefers-reduced-motion: reduce) {
  :root {
    --mai-motion-fast: 0ms;
    --mai-motion-standard: 0ms;
    --mai-motion-deliberate: 0ms;
    --mai-motion-reduced: 0ms;
    --mai-motion-essential-opacity: ${value(source, "reduced-motion/opacity-duration")}ms;
  }
}

${tailwindTheme()}
`;
}

function publicVariables(source) {
  return source.variables.filter(({ collectionName }) => collectionName !== "Core");
}

function nestedTokens(source) {
  const root = {};
  for (const variable of publicVariables(source)) assignToken(root, variable.name, cssName(variable));
  return root;
}

function assignToken(root, path, reference) {
  const segments = path.split("/");
  let cursor = root;
  for (const segment of segments.slice(0, -1)) cursor = cursor[segment] ??= {};
  cursor[segments.at(-1)] = `var(${reference})`;
}

export function generateTypescript(source) {
  const paths = publicVariables(source).map(({ name }) => name).sort();
  const breakpoints = Object.fromEntries(Object.keys(breakpointContracts).map((name) => [
    name, value(source, `breakpoint/${name}`),
  ]));
  return `// Generated from tokens/source/mai-figma-v0.3.json. Do not edit.
export const semanticTokens = ${JSON.stringify(nestedTokens(source), null, 2)} as const;
export const publicTokenPaths = ${JSON.stringify(paths, null, 2)} as const;
export type PublicTokenPath = (typeof publicTokenPaths)[number];
export type SupportedMode = "Light / Standard";
export const supportedModes = ["Light / Standard"] as const;
export const breakpoints = ${JSON.stringify(breakpoints, null, 2)} as const;
export type BreakpointName = keyof typeof breakpoints;
export const tokenMetadata = ${JSON.stringify({
    release: source.designSystemRelease,
    fileKey: source.figmaFileKey,
    counts: source.liveCounts,
    sourceChecksum: source.sourceContentChecksum,
  }, null, 2)} as const;

/** Returns a CSS variable reference for a governed public token path.
 * @example tokenVar("color/surface/canvas")
 */
export function tokenVar(path: PublicTokenPath): \`var(--mai-\${string})\` {
  return \`var(--mai-\${path.replaceAll("/", "-")})\`;
}
`;
}

async function generatedFiles(source) {
  return new Map([[cssPath, generateCss(source)], [typescriptPath, generateTypescript(source)]]);
}

async function writeGenerated(files) {
  for (const [path, content] of files) await writeFile(path, content);
}

async function checkGenerated(files) {
  for (const [path, expected] of files) {
    const actual = await readFile(path, "utf8").catch(() => "");
    if (actual !== expected) throw new Error(`Generated token drift: ${path}`);
  }
}

export async function runGenerator({ check = false } = {}) {
  const source = validateTokenSource(await readTokenSource());
  const files = await generatedFiles(source);
  if (check) await checkGenerated(files);
  else await writeGenerated(files);
  return source;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runGenerator({ check: process.argv.includes("--check") });
  console.log(process.argv.includes("--check") ? "Generated tokens match source." : "Generated tokens updated.");
}
