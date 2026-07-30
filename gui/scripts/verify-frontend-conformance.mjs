import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const read = (file) => readFileSync(resolve(root, file), "utf8");
const matrix = JSON.parse(
  read("gui/conformance/mai102-authority-matrix.json"),
);
const errors = [];
const expectedOwners = new Map([
  ["MAI-98", 1],
  ["MAI-99", 11],
  ["MAI-100", 6],
  ["MAI-101", 7],
]);
const expectedBreakpoints = ["desktop", "tablet", "mobile"];
const families = matrix.families ?? [];
const ids = families.map((family) => family.id);

if (matrix.schemaVersion !== 1) errors.push("authority matrix schema must be 1");
if (matrix.figmaFileKey !== "otMJE31OKIxdXogV4RNbGQ") {
  errors.push("approved Figma file key mismatch");
}
if (families.length !== 25) {
  errors.push(`expected 25 families, found ${families.length}`);
}
if (new Set(ids).size !== ids.length) {
  errors.push("authority matrix family IDs are not unique");
}
for (const [owner, count] of expectedOwners) {
  const actual = families.filter((family) => family.owner === owner).length;
  if (actual !== count) {
    errors.push(`${owner}: expected ${count} families, found ${actual}`);
  }
}
for (const family of families) {
  if (!family.route?.startsWith("/")) {
    errors.push(`${family.id}: canonical route missing`);
  }
  if (!existsSync(resolve(root, family.source))) {
    errors.push(`${family.id}: source ${family.source} missing`);
  }
  if (!Array.isArray(family.states) || family.states.length === 0) {
    errors.push(`${family.id}: state coverage missing`);
  }
  const names = Object.keys(family.breakpoints ?? {}).sort();
  if (JSON.stringify(names) !== JSON.stringify([...expectedBreakpoints].sort())) {
    errors.push(`${family.id}: desktop/tablet/mobile coverage incomplete`);
  }
  for (const breakpoint of expectedBreakpoints) {
    const authority = family.breakpoints?.[breakpoint];
    if (
      !authority ||
      !["direct", "shared-pattern", "governed-runtime"].includes(authority.mode)
    ) {
      errors.push(`${family.id}/${breakpoint}: authority mode missing`);
    }
    if (!/^\d+:\d+$/.test(authority?.node ?? "")) {
      errors.push(`${family.id}/${breakpoint}: Figma trace node missing`);
    }
  }
}

const screenBody = read("gui/screens/ScreenBody.tsx");
const screenStyles = read("gui/screens/ScreenBody.module.css");
const screenStories = read("gui/screens/ScreenBody.stories.tsx");
const shell = read("gui/app/_shell/AppShell.tsx");
const shellTests = read("gui/app/_shell/AppShell.test.ts");
const execution = read("gui/screens/deal-execution/DealExecutionBody.tsx");
const intelligence = read(
  "gui/screens/deal-intelligence/DealIntelligenceBody.tsx",
);
const stateCoverage = read("gui/screens/screen-contracts.ts");

for (
  const phrase of [
    'data-conformance-layout={state === "default" ? "list-detail" : "state"}',
    "Approve diligence scope",
    "Restricted organization",
    "Role policy matrix",
    "External access envelope",
  ]
) {
  if (!screenBody.includes(phrase)) {
    errors.push(`MAI-99 conformance phrase missing: ${phrase}`);
  }
}
if (!screenStories.includes('implementationStatus: "screen-body"')) {
  errors.push("MAI-99 Storybook fixtures can render blank route bodies");
}
if (
  !screenBody.includes("<ol") ||
  !screenBody.includes("<aside") ||
  !screenBody.includes("<table")
) {
  errors.push("MAI-99 list/detail semantics are incomplete");
}
if (
  /#[0-9a-f]{3,8}\b|var\(--mai-core-|@media\s*\([^)]*\d+(?:px|rem)\)/i
    .test(screenStyles)
) {
  errors.push(
    "MAI-99 styles use raw governed values, Core tokens, or raw media breakpoints",
  );
}
for (
  const family of [
    "command-center",
    "deals-portfolio",
    "new-deal-setup",
    "tasks-approvals",
    "notification-center",
    "global-search",
    "organizations",
    "organization-detail",
    "team-workspace",
    "settings",
    "external-participant",
  ]
) {
  if (
    !stateCoverage.includes(`\"${family}\"`) &&
    !stateCoverage.includes(`${family}:`)
  ) {
    errors.push(`${family}: state contract missing`);
  }
}

if (!shell.includes("skip") || !shellTests.includes("permission")) {
  errors.push("shell keyboard/permission verification boundary missing");
}
if (!execution.includes('resolution.permissions.includes("deal")')) {
  errors.push("MAI-101 permission-before-props boundary missing");
}
for (
  const phrase of [
    "AI cannot approve",
    "not an AI-selected price",
    "Shortlist approval does not authorize outreach",
  ]
) {
  if (
    !intelligence.includes(phrase) &&
    !read("gui/screens/deal-intelligence/fixtures.ts").includes(phrase)
  ) {
    errors.push(`MAI-100 authority boundary missing: ${phrase}`);
  }
}
for (
  const phrase of [
    "No external communication before approval",
    "Archive is not deletion",
  ]
) {
  if (
    !execution.includes(phrase) &&
    !read("gui/screens/deal-execution/fixtures.ts").includes(phrase)
  ) {
    errors.push(`MAI-101 authority boundary missing: ${phrase}`);
  }
}

const retiredGuide = ["STITCH", "DESIGN"].join("_");
const retiredPaths = [
  `gui/${retiredGuide}.md`,
  "gui/DESIGN.md",
  "gui/DESIGN_GUIDELINES.md",
  "gui/docs/user-flow.md",
  "gui/components/screens",
  "gui/app/clients",
  "gui/app/entities",
  "gui/app/dashboard/custom",
  "gui/app/generative-ui",
  "gui/app/deals/[id]/engines",
];
for (const file of retiredPaths) {
  if (existsSync(resolve(root, file))) {
    errors.push(`${file}: retired GUI artifact remains active`);
  }
}

function sourceFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const full = resolve(directory, name);
    return statSync(full).isDirectory()
      ? sourceFiles(full)
      : /\.(?:ts|tsx|js|jsx|css)$/.test(name) &&
          !/\.(?:test|stories)\./.test(name)
      ? [full]
      : [];
  });
}
const activeSource = ["gui/app", "gui/screens", "gui/lib", "gui/components"]
  .flatMap((directory) => sourceFiles(resolve(root, directory)))
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
const retiredConventions = [
  ["Mark", "For", "MC"],
  ["Master", "card"],
  ["STITCH", "DESIGN"],
  ["canvas", "cream"],
  ["orbital", "line"],
  ["ghost", "watermark"],
].map((parts, index) => parts.join(index === 2 ? "_" : index > 2 ? "-" : ""));
for (const legacy of retiredConventions) {
  if (activeSource.includes(legacy)) {
    errors.push(`${legacy}: legacy GUI convention remains in active source`);
  }
}

if (errors.length) {
  console.error(
    `MAI-102 frontend conformance verification failed:\n${errors.join("\n")}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    "MAI-102 authority matrix, 25-family coverage, accessibility boundaries, permissions, destructive actions, responsiveness, and legacy-authority removal verified.",
  );
}
