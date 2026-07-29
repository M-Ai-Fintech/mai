import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../..");
const required = ["gui/lib/shell/route-registry.ts", "gui/lib/shell/route-context.ts", "gui/lib/shell/adapters.ts", "gui/app/_shell/AppShell.tsx", "gui/app/[route]/[[...segments]]/page.tsx"];
const forbidden = ["gui/components/Sidebar", "gui/components/TopBar", "gui/app/deals/page.tsx"];
const violations = [...required.filter((path) => !existsSync(resolve(root, path))).map((path) => `${path}: required MAI-98 path missing`), ...forbidden.filter((path) => existsSync(resolve(root, path))).map((path) => `${path}: prohibited product-screen path`)];
const shell = readFileSync(resolve(root, "gui/app/_shell/AppShell.tsx"), "utf8");
if (!shell.includes("Drawer") || !shell.includes("aria-label")) violations.push("AppShell: required accessible navigation boundary missing");
const coreTokenPrefix = "--mai-" + "core-";
const retiredAuthority = new RegExp(["ST" + "ITCH_DESIGN", "131023155" + "5884111730", "Master" + "card"].join("|"));
for (const path of ["gui/app/_shell/AppShell.tsx", "gui/app/_shell/AppShell.module.css", "gui/lib/shell/route-registry.ts", "gui/lib/shell/route-context.ts"]) { const source = readFileSync(resolve(root, path), "utf8"); if (source.includes(coreTokenPrefix)) violations.push(`${path}: direct Core-token consumption is prohibited`); if (retiredAuthority.test(source)) violations.push(`${path}: retired authority reference`); }
if (violations.length) { console.error(violations.join("\n")); process.exitCode = 1; } else console.log("MAI-98 shell boundary verified.");
