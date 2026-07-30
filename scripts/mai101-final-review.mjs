import { mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
const output = process.env.MAI101_EVIDENCE_DIR ?? "mai101-evidence";
const routes = ["negotiation", "closing", "workspace", "activity", "team", "deliverables", "settings"];
const viewports = [["desktop", 1440, 900], ["tablet", 1024, 900], ["mobile", 390, 844]];
mkdirSync(output, { recursive: true }); const server = spawn("npm", ["--prefix", "gui", "run", "start", "--", "--hostname", "127.0.0.1", "--port", "3010"], { stdio: "ignore" });
for (let i = 0; i < 60; i += 1) { try { if ((await fetch("http://127.0.0.1:3010/deals/demo-deal/negotiation")).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 500)); }
const browser = await chromium.launch({ headless: true }); const cases = [];
for (const [viewport, width, height] of viewports) for (const route of routes) { const page = await browser.newPage({ viewport: { width, height } }); const response = await page.goto(`http://127.0.0.1:3010/deals/demo-deal/${route}`, { waitUntil: "networkidle" }); const body = await page.locator(`[data-screen-family="deal-${route}"]`).count(); const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth); const targets = await page.locator("button,a").evaluateAll((items) => items.filter((item) => { const box = item.getBoundingClientRect(); return box.width > 0 && box.height > 0 && (box.width < 44 || box.height < 44); }).length); await page.screenshot({ path: `${output}/${route}-${viewport}.png`, fullPage: true }); cases.push({ route, family: `deal-${route}`, dealId: "demo-deal", viewport, overflow, targetsBelow44: targets, pass: response?.ok() && body === 1 && !overflow && targets === 0 }); await page.close(); }
await browser.close(); server.kill("SIGTERM"); writeFileSync(`${output}/report.json`, JSON.stringify({ candidate: process.env.VERIFIED_CANDIDATE_SHA, cases }, null, 2)); if (cases.some((item) => !item.pass)) process.exit(1);
