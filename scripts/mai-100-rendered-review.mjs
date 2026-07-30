import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "../gui/node_modules/playwright/index.mjs";

const output = "tmp/mai-100-rendered-review";
const base = "http://127.0.0.1:6006/iframe.html";
const cases = [
  ["overview", "overview-desktop", 1440, 900], ["dossier", "dossier-desktop", 1440, 900],
  ["documents", "documents-desktop", 1440, 900], ["diligence", "decision-room-desktop", 1440, 900],
  ["valuation", "valuation-desktop", 1440, 900], ["matching", "matching-desktop", 1440, 900],
  ["diligence", "decision-room-tablet-evidence-drawer", 1024, 900], ["diligence", "decision-room-mobile-sequential", 390, 844],
  ["diligence", "decision-room-invalidated", 1440, 900], ["diligence", "decision-room-recorded", 1440, 900],
  ["overview", "overview-desktop", 1024, 900], ["overview", "overview-desktop", 390, 844],
  ["dossier", "dossier-desktop", 1024, 900], ["dossier", "dossier-desktop", 390, 844],
  ["documents", "documents-desktop", 1024, 900], ["documents", "documents-desktop", 390, 844],
  ["valuation", "valuation-desktop", 1024, 900], ["valuation", "valuation-desktop", 390, 844],
  ["matching", "matching-desktop", 1024, 900], ["matching", "matching-desktop", 390, 844],
];
const server = spawn("python3", ["-m", "http.server", "6006", "--directory", "gui/storybook-static"], { stdio: "ignore" });
await new Promise((resolve) => setTimeout(resolve, 1000));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];
for (const [family, story, width, height] of cases) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`${base}?id=screens-deal-intelligence--${story}&viewMode=story`, { waitUntil: "networkidle" });
  const metric = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    unresolvedTokens: document.documentElement.innerHTML.includes("undefined"),
    targetsBelow44: [...document.querySelectorAll("button,a,input")].filter((node) => { const box = node.getBoundingClientRect(); return box.width > 0 && box.height > 0 && (box.width < 44 || box.height < 44); }).length,
    family: document.querySelector("[data-screen-family]")?.getAttribute("data-screen-family"),
    fixtureDisclosure: document.body.textContent?.includes("Local demonstration adapter") ?? false,
    humanAuthority: document.body.textContent?.includes("AI cannot approve") ?? document.body.textContent?.includes("not an AI-selected price") ?? false,
  }));
  const name = `${family}-${story}-${width}x${height}`;
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
  report.push({ name, storyId: `screens-deal-intelligence--${story}`, viewport: { width, height }, ...metric });
  await page.close();
}
await browser.close();
server.kill();
await writeFile(`${output}/report.json`, JSON.stringify({ cases: report, defects: report.filter((item) => item.overflow || item.targetsBelow44 || item.unresolvedTokens || !item.fixtureDisclosure) }, null, 2));
