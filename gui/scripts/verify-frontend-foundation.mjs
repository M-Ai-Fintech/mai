import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const trackedOutput = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "gui"],
  { cwd: repositoryRoot, encoding: "utf8" },
);
const activePaths = trackedOutput.trim().split("\n").filter(Boolean);
const sourcePaths = activePaths.filter((path) =>
  !path.endsWith("package-lock.json") &&
  path !== "gui/scripts/verify-frontend-foundation.mjs"
);
const bannedTerms = [
  "Mastercard",
  "MarkForMC",
  "Plus Jakarta",
  "Public Sans",
  "ghost-watermark",
  "orbital-line",
  "1310231555884111730",
  "STITCH_DESIGN",
  "DESIGN_GUIDELINES.md",
];
const retiredPaths = [
  "gui/DESIGN.md",
  "gui/DESIGN_GUIDELINES.md",
  "gui/STITCH_DESIGN.md",
  "gui/docs/user-flow.md",
  "gui/tokens/design-tokens.css",
  "gui/components/Navigation/AppShell.tsx",
  "gui/components/screens/dashboard/dashboard-model.ts",
  "gui/app/deals/page.tsx",
  "gui/app/entities/page.tsx",
  "gui/app/generative-ui/page.tsx",
];
const deferredImplementationPaths = [
  "gui/components/Card",
  "gui/components/Navigation",
  "gui/components/AppShell",
  "gui/components/Sidebar",
  "gui/components/TopBar",
  "gui/app/deals/page.tsx",
];
const violations = [];

for (const path of sourcePaths) {
  if (!/\.(css|json|md|mdx|mjs|ts|tsx)$/.test(path)) continue;
  const source = readFileSync(resolve(repositoryRoot, path), "utf8");
  if (!path.endsWith(".test.ts")) {
    for (const term of bannedTerms) {
      if (source.includes(term)) violations.push(`${path}: contains ${term}`);
    }
  }
  if (
    /\.(mjs|ts|tsx)$/.test(path) &&
    /@\/components\/(?:AppShell|Sidebar|TopBar|Navigation\/)/.test(source)
  ) {
    violations.push(`${path}: imports deferred MAI-98 implementation`);
  }
}

for (const path of retiredPaths) {
  if (existsSync(resolve(repositoryRoot, path))) {
    violations.push(`${path}: retired path still exists`);
  }
}
for (const path of deferredImplementationPaths) {
  if (existsSync(resolve(repositoryRoot, path))) {
    violations.push(`${path}: MAI-97/98 implementation must remain absent`);
  }
}

const statusSource = readFileSync(
  resolve(
    repositoryRoot,
    "gui/components/FoundationStatus/FoundationStatus.tsx",
  ),
  "utf8",
);
for (
  const statement of [
    "product screens are not implemented",
    "does not provide production product",
    "Figma is the sole visual and interaction authority",
  ]
) {
  if (!statusSource.includes(statement)) {
    violations.push(`FoundationStatus.tsx: missing "${statement}"`);
  }
}

if (violations.length) {
  console.error("Frontend foundation verification failed:");
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Frontend foundation verified across ${sourcePaths.length} active paths.`,
  );
}
