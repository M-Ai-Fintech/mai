import { mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const output = process.env.MAI101_EVIDENCE_DIR ?? "mai101-evidence";
const routes = ["negotiation", "closing", "workspace", "activity", "team", "deliverables", "settings"];
const viewports = [{ id: "desktop", width: 1440, height: 900 }, { id: "tablet", width: 1024, height: 900 }, { id: "mobile", width: 390, height: 844 }];
mkdirSync(output, { recursive: true });
const server = spawn("npm", ["--prefix", "gui", "run", "start", "--", "--hostname", "127.0.0.1", "--port", "3010"], { stdio: "ignore" });
await waitForServer();
const browser = await chromium.launch({ headless: true });
const report = [];
for (const viewport of viewports) for (const route of routes) report.push(await capture(browser, viewport, route));
await browser.close(); server.kill("SIGTERM");
writeFileSync(`${output}/report.json`, JSON.stringify({ candidate: process.env.VERIFIED_CANDIDATE_SHA, cases: report }, null, 2));
if (report.some((caseResult) => !caseResult.pass)) process.exit(1);

async function waitForServer() { for (let attempt = 0; attempt < 60; attempt += 1) { try { const response = await fetch("http://127.0.0.1:3010/deals/demo-deal/negotiation"); if (response.ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 500)); } throw new Error("MAI-101 review server did not become ready."); }
async function capture(browser, viewport, route) { const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } }); const response = await page.goto(`http://127.0.0.1:3010/deals/demo-deal/${route}`, { waitUntil: "networkidle" }); const body = await page.locator(`[data-screen-family="deal-${route}"]`).count(); const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth); const targets = await page.locator("button,a").evaluateAll((items) => items.filter((item) => { const box = item.getBoundingClientRect(); return box.width > 0 && box.height > 0 && (box.width < 44 || box.height < 44); }).map((item) => item.textContent?.trim() ?? item.getAttribute("aria-label"))); await page.screenshot({ path: `${output}/${route}-${viewport.id}.png`, fullPage: true }); await page.close(); return { route, family: `deal-${route}`, dealId: "demo-deal", viewport: viewport.id, status: response?.status(), overflow, targetsBelow44: targets, pass: response?.ok() === true && body === 1 && !overflow && targets.length === 0 }; }
