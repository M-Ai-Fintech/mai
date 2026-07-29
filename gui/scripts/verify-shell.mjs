import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { hardCodedViolations } from "./verify-design-tokens.mjs";

const root = resolve(import.meta.dirname, "../..");
const required = [
  "gui/lib/shell/route-registry.ts",
  "gui/lib/shell/route-context.ts",
  "gui/lib/shell/adapters.ts",
  "gui/app/_shell/AppShell.tsx",
  "gui/app/_shell/AppShell.module.css",
  "gui/app/_shell/AppShell.stories.tsx",
  "gui/app/[route]/[[...segments]]/page.tsx",
];
const forbidden = [
  "gui/components/Sidebar",
  "gui/components/TopBar",
  "gui/app/deals",
  "gui/app/organizations",
  "gui/app/settings",
  "gui/app/portal",
  "gui/app/submit",
  ".github/workflows/mai-98-bounded-visual-review.yml",
];
const governedRoots = ["gui/app/_shell", "gui/lib/shell"];
const violations = [
  ...required
    .filter((path) => !existsSync(resolve(root, path)))
    .map((path) => `${path}: required MAI-98 path missing`),
  ...forbidden
    .filter((path) => existsSync(resolve(root, path)))
    .map((path) => `${path}: prohibited MAI-98 final-tree path`),
];

function filesBelow(relativePath) {
  const absolutePath = resolve(root, relativePath);
  if (!existsSync(absolutePath)) return [];
  return readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    const child = `${relativePath}/${entry.name}`;
    return entry.isDirectory() ? filesBelow(child) : [child];
  });
}

const governedFiles = governedRoots.flatMap(filesBelow).filter((path) =>
  [".css", ".ts", ".tsx"].includes(extname(path)),
);
const coreTokenPrefix = "--mai-" + "core-";
const retiredAuthority = new RegExp([
  "ST" + "ITCH_DESIGN",
  "131023155" + "5884111730",
  "Master" + "card",
].join("|"));
const rawBreakpoint = /@media\s*\([^)]*\b\d+(?:px|rem)\b/i;

for (const path of governedFiles) {
  const source = readFileSync(resolve(root, path), "utf8");
  if (source.includes(coreTokenPrefix)) {
    violations.push(`${path}: direct Core-token consumption is prohibited`);
  }
  if (retiredAuthority.test(source)) {
    violations.push(`${path}: retired authority reference`);
  }
  if (rawBreakpoint.test(source)) {
    violations.push(`${path}: raw responsive breakpoint is prohibited`);
  }
  violations.push(...hardCodedViolations(path, source));
}

const shell = readFileSync(resolve(root, "gui/app/_shell/AppShell.tsx"), "utf8");
if (!shell.includes("navigationForResolution")) {
  violations.push("AppShell: navigation must derive from the typed route registry");
}
if (/const\s+(?:global|deal|administration|external)Items\b/.test(shell)) {
  violations.push("AppShell: duplicated navigation arrays are prohibited");
}
if (!shell.includes("Drawer") || !shell.includes("Skip to main content") || !shell.includes("aria-current")) {
  violations.push("AppShell: required keyboard and navigation semantics are missing");
}

const registry = readFileSync(resolve(root, "gui/lib/shell/route-registry.ts"), "utf8");
for (const mode of ["global", "deal", "administration", "external"]) {
  if (!registry.includes(`\"${mode}\"`)) violations.push(`route-registry: ${mode} shell mode missing`);
}
for (const contract of ["navigationRoutes", "routePath", "navigationParent", "permission", "availability"]) {
  if (!registry.includes(contract)) violations.push(`route-registry: ${contract} contract missing`);
}

const context = readFileSync(resolve(root, "gui/lib/shell/route-context.ts"), "utf8");
for (const state of ["invalid-context", "restricted", "unavailable", "not-found", "ready"]) {
  if (!context.includes(`\"${state}\"`)) violations.push(`route-context: ${state} state missing`);
}
if (!context.includes("navigationForResolution") || !context.includes("permissions.includes")) {
  violations.push("route-context: permission-safe navigation resolution missing");
}

const adapter = readFileSync(resolve(root, "gui/lib/shell/adapters.ts"), "utf8");
if (!/fixture/i.test(adapter) || !/does not prove production authorization/i.test(adapter)) {
  violations.push("adapters: fixture and authorization limitation must remain explicit");
}

const stories = readFileSync(resolve(root, "gui/app/_shell/AppShell.stories.tsx"), "utf8");
for (const node of ["41:16", "43:10", "44:20", "44:41", "44:62", "44:85"]) {
  if (!stories.includes(node)) violations.push(`AppShell stories: Figma node ${node} trace missing`);
}
for (const story of [
  "GlobalDesktop",
  "DealDesktop",
  "DealMobile",
  "AdministrationDesktop",
  "ExternalParticipant",
  "RestrictedState",
  "InvalidContext",
  "UnavailableState",
  "LongNamesAndCountOverflow",
  "MobileDrawerKeyboard",
]) {
  if (!stories.includes(`export const ${story}`)) violations.push(`AppShell stories: ${story} missing`);
}

if (violations.length) {
  console.error(`MAI-98 shell verification failed:\n${violations.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`MAI-98 shell boundary verified across ${governedFiles.length} governed files.`);
}
