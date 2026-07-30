import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../..");
const read = (file) => readFileSync(resolve(root, file), "utf8");
const registry = read("gui/lib/shell/route-registry.ts");
const body = read("gui/screens/deal-execution/DealExecutionBody.tsx");
const contracts = read("gui/screens/deal-execution/contracts.ts");
const stories = read(
  "gui/screens/deal-execution/DealExecutionBody.stories.tsx",
);
const errors = [];
const routes = [
  "negotiation",
  "closing",
  "workspace",
  "activity",
  "team",
  "deliverables",
  "settings",
];
if (
  routes.filter((route) => registry.includes(`\"${route}\"`)).length !== 7 ||
  !registry.includes("dealExecutionRoute")
) {
  errors.push(
    "exactly seven MAI-101 routes must use the explicit execution resolver",
  );
}
if (
  !registry.includes("routeBodyOwner") ||
  !registry.includes("deal-intelligence")
) errors.push("MAI-99/100 ownership boundary is missing");
if (
  !body.includes("if (!families.includes(family)) return null") ||
  !body.includes('if (!resolution.permissions.includes("deal"))')
) errors.push("no-fallback or permission-before-props boundary is missing");
for (
  const name of [
    "NegotiationProposal",
    "ClosingCondition",
    "AgentMission",
    "AuditEvent",
    "ParticipantAccess",
    "Deliverable",
    "DealGovernance",
  ]
) {
  if (!contracts.includes(`interface ${name}`)) {
    errors.push(`missing contract ${name}`);
  }
}
for (
  const phrase of [
    "no live negotiation",
    "No external communication before approval",
    "Archive is not deletion",
    "Local deterministic demonstration",
  ]
) {
  if (
    !body.includes(phrase) &&
    !read("gui/screens/deal-execution/fixtures.ts").includes(phrase)
  ) errors.push(`missing truthfulness boundary: ${phrase}`);
}
for (const node of ["239:3", "239:551", "239:921"]) {
  if (!stories.includes(node)) {
    errors.push(`missing Figma traceability ${node}`);
  }
}
if (
  /#[0-9a-f]{3,8}\b|@media \([^p]/i.test(
    read("gui/screens/deal-execution/DealExecutionBody.module.css"),
  )
) errors.push("raw governed visual values or raw breakpoint");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("MAI-101 execution screen boundary verified.");
