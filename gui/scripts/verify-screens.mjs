import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../..");
const files = [
  "gui/screens/ScreenBody.tsx",
  "gui/screens/ScreenBody.module.css",
  "gui/screens/screen-contracts.ts",
  "gui/screens/fixtures.ts",
  "gui/screens/ScreenBody.test.ts",
  "gui/screens/ScreenBody.stories.tsx",
  "gui/.storybook/main.ts",
];
const sources = files.map((file) =>
  existsSync(resolve(root, file))
    ? readFileSync(resolve(root, file), "utf8")
    : ""
);
const text = sources.join("\n");
const families = [
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
];
const errors = files.filter((file, index) => !sources[index]).map((file) =>
  `${file}: missing`
);
for (const family of families) {
  if (!text.includes(`\"${family}\"`)) {
    errors.push(`${family}: approved family missing`);
  }
}
if (
  !text.includes("Local demonstration data only") ||
  !text.includes("External data deliberately excludes")
) errors.push("fixture disclosure or external exclusion missing");
const css = sources[1];
if (
  /#[0-9a-f]{3,8}\b|var\(--mai-core-|@media\s*\([^)]*\d+(?:px|rem)\)/i.test(css)
) {
  errors.push(
    "screen styles use raw governed visual values, Core tokens, or raw breakpoints",
  );
}
if (!text.includes("stateCoverage") || !text.includes("data-screen-family")) {
  errors.push("state coverage or route-to-family proof missing");
}
if (!sources[6].includes("../screens/**/*.stories")) {
  errors.push("Storybook does not discover MAI-99 screen stories");
}
if (errors.length) {
  console.error(`MAI-99 screen verification failed:\n${errors.join("\n")}`);
  process.exitCode = 1;
} else {console.log(
    "MAI-99 screen families, fixture boundaries, state coverage, and MAI-100 exclusion verified.",
  );}
