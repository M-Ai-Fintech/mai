import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { hardCodedViolations } from "./verify-design-tokens.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const componentsRoot = resolve(repositoryRoot, "gui/components");

export const approvedComponentFamilies = [
  "Button",
  "DataTable",
  "DataTableCell",
  "DataTableHeader",
  "DataTableRow",
  "Dialog",
  "Divider",
  "Drawer",
  "EvidenceProvenanceLabel",
  "EvidenceReference",
  "FieldWrapper",
  "FinancialDelta",
  "FinancialValue",
  "IconButton",
  "InlineNotice",
  "NavigationItem",
  "NavigationTab",
  "Select",
  "StatusIndicator",
  "Surface",
  "TextField",
];

const nonPublicDirectories = new Set(["FoundationStatus", "internal"]);
const forbiddenMai98Paths = [
  "gui/components/Sidebar",
  "gui/components/TopBar",
  "gui/app/deals/page.tsx",
  "gui/app/entities/page.tsx",
  "gui/app/generative-ui/page.tsx",
];

function publicDirectories() {
  return readdirSync(componentsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !nonPublicDirectories.has(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function assertApprovedDirectoryBoundary(violations) {
  const approved = new Set(approvedComponentFamilies);
  for (const directory of publicDirectories()) {
    if (!approved.has(directory)) {
      violations.push(`gui/components/${directory}: unapproved public component family`);
    }
  }
  if (existsSync(resolve(componentsRoot, "index.ts"))) {
    for (const family of approvedComponentFamilies) {
      if (!existsSync(resolve(componentsRoot, family))) {
        violations.push(`gui/components/${family}: approved family missing`);
      }
    }
  }
}

function assertTriadsAndTokens(violations) {
  for (const family of approvedComponentFamilies) {
    const directory = resolve(componentsRoot, family);
    if (!existsSync(directory)) continue;
    for (const suffix of [".tsx", ".stories.tsx", ".mdx"]) {
      const path = `gui/components/${family}/${family}${suffix}`;
      if (!existsSync(resolve(repositoryRoot, path))) {
        violations.push(`${path}: component triad file missing`);
      }
    }
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isFile() || !/\.(css|ts|tsx)$/.test(entry.name)) continue;
      const path = `gui/components/${family}/${entry.name}`;
      const source = readFileSync(resolve(repositoryRoot, path), "utf8");
      violations.push(...hardCodedViolations(path, source));
    }
  }
}

function assertMai98Absent(violations) {
  for (const path of forbiddenMai98Paths) {
    if (existsSync(resolve(repositoryRoot, path))) {
      violations.push(`${path}: MAI-98 scope must remain absent`);
    }
  }
}

export function componentViolations() {
  const violations = [];
  assertApprovedDirectoryBoundary(violations);
  assertTriadsAndTokens(violations);
  assertMai98Absent(violations);
  return violations;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const violations = componentViolations();
  if (violations.length) {
    console.error(`Component verification failed:\n${violations.join("\n")}`);
    process.exitCode = 1;
  } else {
    console.log(`Verified ${approvedComponentFamilies.length} approved component families.`);
  }
}
