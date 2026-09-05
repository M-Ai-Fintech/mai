import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const webPort = Number(process.env.CAPABILITY_WEB_PORT ?? 3116);
const apiPort = Number(process.env.CAPABILITY_MOCK_PORT ?? 18186);
const baseUrl = `http://127.0.0.1:${webPort}`;
const apiUrl = `http://127.0.0.1:${apiPort}`;
const evidenceDirectory = path.resolve(
  process.env.CAPABILITY_EVIDENCE_DIRECTORY ??
    "/tmp/capability-readiness-evidence",
);
const states = [
  "enabled",
  "forbidden",
  "protected-not-found",
  "degraded",
  "deferred",
  "failed",
];
const logs = [];
const report = { schemaVersion: 1, baseUrl, states: [], passed: false };

fs.mkdirSync(evidenceDirectory, { recursive: true });
const api = start("deno", [
  "run",
  "--allow-env",
  "--allow-net",
  "tests/fixtures/capability_readiness_mock.ts",
], { CAPABILITY_MOCK_PORT: String(apiPort) });
const web = start("npm", [
  "--prefix",
  "gui",
  "run",
  "dev",
  "--",
  "-H",
  "127.0.0.1",
  "-p",
  String(webPort),
], {
  MAI_API_BASE_URL: apiUrl,
  MAI_FRONTEND_DATA_SOURCE: "v1",
  NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED: "true",
  MAI_DEMO_DEAL_ID: "deal_demo",
});

let browser;
try {
  await waitFor(`${apiUrl}/api/v1/capabilities`, api);
  await waitFor(`${baseUrl}/home`, web);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const state of states) await verifyState(page, state);
  report.passed = true;
  fs.writeFileSync(
    path.join(evidenceDirectory, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(`Capability readiness browser evidence: ${evidenceDirectory}`);
} finally {
  if (browser) await browser.close();
  stop(web);
  stop(api);
}

async function verifyState(page, state) {
  const selected = await fetch(`${apiUrl}/__state?value=${state}`, {
    method: "POST",
  });
  assert.equal(selected.ok, true, `mock selected ${state}`);
  await page.goto(`${baseUrl}/home`, { waitUntil: "networkidle" });
  await assertState(page, state);
  const screenshot = path.join(evidenceDirectory, `${state}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  await page.reload({ waitUntil: "networkidle" });
  await assertState(page, state);
  report.states.push({ state, screenshot, reloadStable: true });
}

async function assertState(page, state) {
  await page.locator(`main[data-capability-state="${state}"]`).waitFor();
  const body = await page.locator("body").innerText();
  assert.equal(body.includes("cor_not_rendered"), false, "correlation is hidden");
  assert.equal(body.includes("deal_demo"), false, "resource identifier is hidden");
  if (state === "enabled") {
    await page.getByText("Review readiness evidence", { exact: true }).waitFor();
  } else {
    await page.getByText(new RegExp(`Command Center: ${label(state)}`, "i")).waitFor();
    const navigation = await page
      .locator('nav[aria-label="Workspace navigation"]:visible').innerText();
    assert.match(
      navigation,
      new RegExp(`Home\\s*${label(state)}`, "i"),
      "navigation matches the direct capability state",
    );
  }
}

function label(state) {
  return state.split("-").map((part) =>
    `${part.charAt(0).toUpperCase()}${part.slice(1)}`
  ).join(" ");
}

function start(command, args, environment) {
  const child = spawn(command, args, {
    cwd: repositoryRoot,
    env: { ...process.env, ...environment },
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  child.stderr.on("data", (chunk) => logs.push(chunk.toString()));
  return child;
}

async function waitFor(url, child) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(logs.join(""));
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Startup is still in progress.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}.\n${logs.join("")}`);
}

function stop(child) {
  if (child.exitCode !== null || !child.pid) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}
