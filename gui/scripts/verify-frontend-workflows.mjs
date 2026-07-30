import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const port = Number(process.env.MAI_WORKFLOW_PORT ?? 3100);
const baseUrl = `http://127.0.0.1:${port}`;
const reportPath = process.env.MAI_WORKFLOW_REPORT
  ? path.resolve(repositoryRoot, process.env.MAI_WORKFLOW_REPORT)
  : undefined;
const serverLog = [];
const report = {
  schemaVersion: 1,
  startedAt: new Date().toISOString(),
  baseUrl,
  browser: null,
  flows: [],
  summary: null,
};

function persist() {
  if (!reportPath) return;
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

async function waitForServer(server) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(
        `Next server exited before readiness (${server.exitCode}).\n${serverLog.join("")}`,
      );
    }
    try {
      const response = await fetch(`${baseUrl}/home`);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${baseUrl}.\n${serverLog.join("")}`);
}

async function expectSurface(page, family, shellMode) {
  await page.locator(`[data-screen-family="${family}"]`).waitFor();
  await page.locator(`[data-shell-mode="${shellMode}"]`).waitFor();
  assert.equal(await page.locator("main").count(), 1, "exactly one main landmark");
  assert.ok(await page.locator("h1").count() >= 1, "page has an h1");
}

async function runFlow(name, execute) {
  const result = {
    name,
    status: "running",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
  };
  report.flows.push(result);
  persist();
  try {
    await execute();
    result.status = "passed";
  } catch (error) {
    result.status = "failed";
    result.error = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { message: String(error) };
    throw error;
  } finally {
    result.finishedAt = new Date().toISOString();
    persist();
  }
}

function stopServer(server) {
  if (server.exitCode !== null || !server.pid) return;
  try {
    if (process.platform === "win32") server.kill("SIGTERM");
    else process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
}

persist();
const server = spawn(
  "npm",
  ["--prefix", "gui", "run", "start", "--", "-H", "127.0.0.1", "-p", String(port)],
  {
    cwd: repositoryRoot,
    env: process.env,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  },
);
server.stdout.on("data", (chunk) => serverLog.push(chunk.toString()));
server.stderr.on("data", (chunk) => serverLog.push(chunk.toString()));

let browser;
try {
  await waitForServer(server);
  browser = await chromium.launch({ headless: true });
  report.browser = {
    playwright: "repository-pinned 1.61.1",
    version: await browser.version(),
    executablePath: chromium.executablePath(),
  };
  persist();

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  await runFlow("banker task to exact decision context", async () => {
    await page.goto(`${baseUrl}/tasks`);
    await expectSurface(page, "tasks-approvals", "global");
    await page.keyboard.press("Tab");
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    assert.notEqual(focusedTag, "BODY", "keyboard focus enters the interface");
    await page.getByRole("link", { name: "Open decision context" }).click();
    await page.waitForURL(`${baseUrl}/deals/demo-deal/diligence`);
    await expectSurface(page, "deal-diligence", "deal");
    await page.goBack();
    await page.waitForURL(`${baseUrl}/tasks`);
    await expectSurface(page, "tasks-approvals", "global");
  });

  await runFlow("banker portfolio to deal workflow", async () => {
    await page.goto(`${baseUrl}/deals`);
    await expectSurface(page, "deals-portfolio", "global");
    await page.getByRole("link", { name: "Open deal" }).click();
    await page.waitForURL(`${baseUrl}/deals/demo-deal/overview`);
    await expectSurface(page, "deal-overview", "deal");
    const dealNavigation = page.getByRole("navigation", {
      name: "Deal navigation",
    });
    await dealNavigation.getByRole("link", { name: "Decision room" }).click();
    await page.waitForURL(`${baseUrl}/deals/demo-deal/diligence`);
    await expectSurface(page, "deal-diligence", "deal");
  });

  await runFlow("administrator governed settings workflow", async () => {
    await page.goto(`${baseUrl}/settings/profile`);
    await expectSurface(page, "settings", "administration");
    await page.getByText("Role policy matrix", { exact: true }).waitFor();
    await page.getByText("Security policy", { exact: true }).waitFor();
    await page.getByText("Developer access", { exact: true }).waitFor();
    assert.equal(
      await page.getByText(/webhook signing secret:/i).count(),
      0,
      "secret value is not rendered",
    );
    await page.getByRole("button", { name: "Propose change" }).waitFor();
  });

  await runFlow("external participant purpose-bound workflow", async () => {
    await page.goto(`${baseUrl}/portal/project/fixture-workspace`);
    await expectSurface(page, "external-participant", "external");
    assert.equal(
      await page.getByRole("navigation", {
        name: "Fixture shell entry points",
      }).count(),
      0,
      "internal utility navigation is absent",
    );
    assert.equal(
      await page.getByText(/BATNA|internal position|negotiation strategy/i).count(),
      0,
      "internal transaction strategy is absent",
    );
    await page.getByRole("button", { name: "Submit response" }).waitFor();
    const participantNavigation = page.getByRole("navigation", {
      name: "Participant navigation",
    });
    await participantNavigation.getByRole("link", { name: "Requests" }).click();
    await page.waitForURL(`${baseUrl}/portal/project/fixture-workspace/requests`);
    await expectSurface(page, "external-participant", "external");
  });

  await context.close();
} finally {
  if (browser) await browser.close();
  stopServer(server);
  report.finishedAt = new Date().toISOString();
  report.summary = {
    expected: 4,
    completed: report.flows.filter((flow) => flow.status !== "running").length,
    passed: report.flows.filter((flow) => flow.status === "passed").length,
    failed: report.flows.filter((flow) => flow.status === "failed").length,
  };
  persist();
}

if (report.summary.failed > 0 || report.summary.passed !== 4) {
  process.exitCode = 1;
} else {
  console.log(
    "MAI-102 principal banker, administrator, and external-participant workflows verified end to end.",
  );
}
