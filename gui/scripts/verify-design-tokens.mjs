import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import {
  readTokenSource,
  runGenerator,
  validateTokenSource,
} from "./generate-design-tokens.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const governedPaths = [
  "gui/components/FoundationStatus/FoundationStatus.module.css",
  "gui/components/FoundationStatus/FoundationStatus.tsx",
  "gui/tokens/index.ts",
  "gui/tokens/token-schema.ts",
];
const forbiddenProductPaths = [
  "gui/components/Card",
  "gui/components/Navigation",
  "gui/components/AppShell",
  "gui/components/Sidebar",
  "gui/components/TopBar",
  "gui/app/deals/page.tsx",
];
const rawVisualRules = [
  { label: "raw color", pattern: /#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(/i },
  { label: "raw shadow", pattern: /box-shadow\s*:\s*(?:#[0-9a-f]|rgba?\(|-?\d)/i },
  { label: "raw transition time", pattern: /transition(?:-duration)?\s*:[^;]*\b\d+(?:ms|s)\b/i },
  { label: "raw easing", pattern: /cubic-bezier\(|transition-timing-function\s*:\s*(?!var\()/i },
  { label: "raw visual length", pattern: /(?:padding|margin|gap|border-radius|font-size|line-height|min-(?:width|height|block-size)|max-width)\s*:[^;]*\b\d+(?:px|rem)\b/i },
  { label: "internal Core token", pattern: /var\(--mai-core-/i },
];

export function hardCodedViolations(path, source) {
  return rawVisualRules
    .filter(({ pattern }) => pattern.test(source))
    .map(({ label }) => `${path}: ${label}`);
}

function linearChannel(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(color) {
  return 0.2126 * linearChannel(color.r) +
    0.7152 * linearChannel(color.g) +
    0.0722 * linearChannel(color.b);
}

export function contrastRatio(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function resolvedColors(source) {
  return new Map(source.variables.map((variable) => [
    variable.name,
    Object.values(variable.valuesByMode)[0].resolvedValue,
  ]));
}

export function measureContrastPairs(source) {
  const colors = resolvedColors(source);
  return source.approvedContrastPairs.map((pair) => {
    const foreground = colors.get(pair.foreground);
    const background = colors.get(pair.background);
    if (!foreground || !background) throw new Error(`Missing contrast pair ${pair.name}`);
    return { ...pair, ratio: contrastRatio(foreground, background) };
  });
}

function assertContrast(source) {
  const measurements = measureContrastPairs(source);
  const failures = measurements.filter(({ ratio, minimumRatio }) => ratio < minimumRatio);
  if (failures.length) {
    throw new Error(failures.map(({ name, ratio, minimumRatio }) =>
      `${name}: ${ratio.toFixed(2)} < ${minimumRatio}`
    ).join("\n"));
  }
  return measurements;
}

async function assertNoHardCodedValues() {
  const violations = [];
  for (const path of governedPaths) {
    const source = await readFile(resolve(repositoryRoot, path), "utf8");
    violations.push(...hardCodedViolations(path, source));
  }
  if (violations.length) throw new Error(violations.join("\n"));
}

async function assertDeferredScopeAbsent() {
  const present = [];
  for (const path of forbiddenProductPaths) {
    if (await stat(resolve(repositoryRoot, path)).then(() => true).catch(() => false)) present.push(path);
  }
  if (present.length) throw new Error(`MAI-97/98 implementation present: ${present.join(", ")}`);
}

function assertProofConsumer(source) {
  const required = [
    "--mai-color-surface-canvas",
    "--mai-color-surface-raised",
    "--mai-color-content-primary",
    "--mai-color-content-secondary",
    "--mai-color-border-default",
    "--mai-color-focus-ring",
    "--mai-type-body",
    "--mai-space-",
    "--mai-size-",
    "--mai-radius-",
    "--mai-elevation-",
    "--mai-motion-",
  ];
  for (const token of required) {
    if (!source.includes(token)) throw new Error(`FoundationStatus missing ${token}`);
  }
}

export async function verifyDesignTokens() {
  const source = validateTokenSource(await readTokenSource());
  await runGenerator({ check: true });
  await assertNoHardCodedValues();
  await assertDeferredScopeAbsent();
  const consumer = await readFile(resolve(repositoryRoot, governedPaths[0]), "utf8");
  assertProofConsumer(consumer);
  return assertContrast(source);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const measurements = await verifyDesignTokens();
  for (const pair of measurements) console.log(`${pair.name}: ${pair.ratio.toFixed(2)}:1`);
  console.log(`Verified ${measurements.length} contrast pairs and governed token consumers.`);
}
