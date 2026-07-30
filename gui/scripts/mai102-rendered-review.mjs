import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const outputRoot = path.resolve(process.cwd(), "mai102-evidence");
const screenshotRoot = path.join(outputRoot, "screenshots");
fs.mkdirSync(screenshotRoot, { recursive: true });

const applicationUrl = process.env.MAI102_APP_URL ?? "http://127.0.0.1:3000";
const storybookUrl = process.env.MAI102_STORYBOOK_URL ?? "http://127.0.0.1:6006";
const viewports = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 1024, height: 720 },
  mobile: { width: 390, height: 844 },
};

const families = [
  ["command-center", "/home", "command-center", "global"],
  ["deals-portfolio", "/deals", "deals-portfolio", "global"],
  ["new-deal-setup", "/new-deal", "new-deal-setup", "global"],
  ["tasks-approvals", "/tasks", "tasks-approvals", "global"],
  ["organizations", "/organizations", "organizations", "global"],
  ["organization-detail", "/organizations/fixture-org", "organization-detail", "global"],
  ["team-workspace", "/team", "team-workspace", "global"],
  ["notification-center", "/notifications", "notification-center", "global"],
  ["global-search", "/search", "global-search", "global"],
  ["settings-family", "/settings/profile", "settings", "administration"],
  ["external-participant", "/portal/project/fixture-workspace", "external-participant", "external"],
].flatMap(([id, route, expectedFamily, shellMode]) =>
  Object.keys(viewports).map((viewport) => ({
    id,
    route,
    expectedFamily,
    shellMode,
    viewport,
  }))
);

const negotiationControlCase = {
  id: "negotiation-room",
  route: "/deals/demo-deal/negotiation",
  expectedFamily: "deal-negotiation",
  shellMode: "deal",
  viewport: "mobile",
};

const stateStories = [
  ["global-loading", "screens-mai-99-families--loading"],
  ["global-empty-search", "screens-mai-99-families--empty-search"],
  ["global-restricted-history", "screens-mai-99-families--restricted-organization-history"],
  ["settings-sensitive", "screens-mai-99-families--settings-sensitive"],
  ["team-sensitive", "screens-mai-99-families--team-sensitive"],
  ["external-unavailable", "screens-mai-99-families--external-unavailable"],
].map(([id, story]) => ({ id, story, viewport: "desktop" }));

const reportPath = path.join(outputRoot, "report.json");
const report = {
  schemaVersion: 2,
  purpose: "MAI-99 bounded P1 correction",
  startedAt: new Date().toISOString(),
  browser: null,
  matrix: [],
  states: [],
  findings: [],
  summary: null,
};

function persist() {
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function safeName(value) {
  return value.replaceAll(/[^a-z0-9-]+/gi, "-").replaceAll(/-+/g, "-").toLowerCase();
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await page.waitForTimeout(200);
}

async function inspectApplication(page, expected) {
  return page.evaluate(({ expectedFamily, shellMode, viewportName }) => {
    const root = document.documentElement;
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    };
    const controls = [...document.querySelectorAll("a[href], button, input, select, textarea, [role='button'], [role='link']")]
      .filter(visible)
      .map((element) => {
        const labelledTarget = element.matches("input, select, textarea")
          ? element.closest("label")
          : null;
        const target = labelledTarget && visible(labelledTarget)
          ? labelledTarget
          : element;
        const rect = target.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          name: element.getAttribute("aria-label") ?? target.textContent?.trim().slice(0, 80) ?? "",
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      });
    const undersized = controls.filter((item) => item.width < 44 || item.height < 44);
    const actualFamily = document.querySelector("[data-screen-family]")?.getAttribute("data-screen-family") ?? null;
    const actualShellMode = document.querySelector("[data-shell-mode]")?.getAttribute("data-shell-mode") ?? null;
    const layout = document.querySelector("[data-conformance-layout]")?.getAttribute("data-conformance-layout") ?? null;
    const listCount = document.querySelectorAll("ol[aria-label$='items'] > li").length;
    const tableCount = document.querySelectorAll("table tbody tr").length;
    const text = document.body.innerText;
    return {
      actualFamily,
      actualShellMode,
      familyMatches: actualFamily === expectedFamily,
      shellModeMatches: actualShellMode === shellMode,
      layout,
      operationalItemCount: Math.max(listCount, tableCount),
      mainCount: document.querySelectorAll("main").length,
      h1Count: document.querySelectorAll("h1").length,
      pageOverflow: root.scrollWidth > root.clientWidth + 2,
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      undersizedControlCount: undersized.length,
      undersizedControls: undersized.slice(0, 20),
      mobileTargetFailure: viewportName === "mobile" && undersized.length > 0,
      externalBoundaryFailure: expectedFamily === "external-participant" && /BATNA|internal position/i.test(text),
    };
  }, {
    expectedFamily: expected.expectedFamily,
    shellMode: expected.shellMode,
    viewportName: expected.viewport,
  });
}

function recordMatrixFindings(caseId, metrics, isMai99) {
  const add = (rule, detail) => report.findings.push({
    caseId,
    severity: "P1",
    rule,
    detail,
  });
  if (metrics.pageOverflow) add("page-overflow", `${metrics.scrollWidth}px content in ${metrics.clientWidth}px viewport`);
  if (!metrics.familyMatches) add("screen-family", `Rendered ${metrics.actualFamily ?? "none"}`);
  if (!metrics.shellModeMatches) add("shell-mode", `Rendered ${metrics.actualShellMode ?? "none"}`);
  if (metrics.mainCount !== 1) add("main-landmark", `Found ${metrics.mainCount}`);
  if (metrics.h1Count < 1) add("heading-hierarchy", "No h1 rendered");
  if (metrics.mobileTargetFailure) add("mobile-target-size", `${metrics.undersizedControlCount} targets below 44×44px`);
  if (isMai99 && metrics.layout !== "list-detail") add("conformance-layout", `Rendered ${metrics.layout ?? "none"}`);
  if (isMai99 && metrics.operationalItemCount < 4) add("operational-density", `Found ${metrics.operationalItemCount} governed items`);
  if (metrics.externalBoundaryFailure) add("external-data-boundary", "Internal negotiation content exposed");
}

async function captureMatrix(browser, testCase) {
  const caseId = `${testCase.id}--${testCase.viewport}`;
  const context = await browser.newContext({ viewport: viewports[testCase.viewport] });
  const page = await context.newPage();
  const screenshotPath = path.join(screenshotRoot, `${safeName(caseId)}.png`);
  const result = { caseId, ...testCase, screenshotPath, status: "running", metrics: null, error: null };
  report.matrix.push(result);
  persist();
  try {
    await page.goto(`${applicationUrl}${testCase.route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await settle(page);
    result.metrics = await inspectApplication(page, testCase);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    result.status = "passed";
    recordMatrixFindings(caseId, result.metrics, testCase !== negotiationControlCase);
  } catch (error) {
    result.status = "failed";
    result.error = error instanceof Error ? error.message : String(error);
    report.findings.push({ caseId, severity: "P1", rule: "capture-failure", detail: result.error });
  } finally {
    await context.close();
    persist();
  }
}

async function captureState(browser, testCase) {
  const context = await browser.newContext({ viewport: viewports[testCase.viewport] });
  const page = await context.newPage();
  const screenshotPath = path.join(screenshotRoot, `${safeName(testCase.id)}.png`);
  const result = { ...testCase, screenshotPath, status: "running", metrics: null, error: null };
  report.states.push(result);
  persist();
  try {
    await page.goto(`${storybookUrl}/iframe.html?id=${encodeURIComponent(testCase.story)}&viewMode=story`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await settle(page);
    await page.waitForFunction(() => document.body.innerText.trim().length > 0, null, { timeout: 10_000 });
    result.metrics = await page.evaluate(() => ({
      bodyTextLength: document.body.innerText.trim().length,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    }));
    await page.screenshot({ path: screenshotPath, fullPage: false });
    result.status = "passed";
    if (result.metrics.pageOverflow) {
      report.findings.push({ caseId: testCase.id, severity: "P1", rule: "page-overflow", detail: "State story overflows viewport" });
    }
  } catch (error) {
    result.status = "failed";
    result.error = error instanceof Error ? error.message : String(error);
    report.findings.push({ caseId: testCase.id, severity: "P1", rule: "blank-or-failed-story", detail: result.error });
  } finally {
    await context.close();
    persist();
  }
}

persist();
let browser;
try {
  browser = await chromium.launch({ headless: true });
  report.browser = {
    version: await browser.version(),
    executablePath: chromium.executablePath(),
    playwright: "repository-pinned",
  };
  persist();
  for (const testCase of [...families, negotiationControlCase]) {
    await captureMatrix(browser, testCase);
  }
  for (const testCase of stateStories) {
    await captureState(browser, testCase);
  }
} finally {
  if (browser) await browser.close();
  report.finishedAt = new Date().toISOString();
  report.summary = {
    matrixExpected: families.length + 1,
    matrixPassed: report.matrix.filter((item) => item.status === "passed").length,
    matrixFailed: report.matrix.filter((item) => item.status === "failed").length,
    stateExpected: stateStories.length,
    statePassed: report.states.filter((item) => item.status === "passed").length,
    stateFailed: report.states.filter((item) => item.status === "failed").length,
    openP0P1: report.findings.length,
  };
  persist();
  const cards = [...report.matrix, ...report.states].map((item) => {
    const relative = path.relative(outputRoot, item.screenshotPath).replaceAll(path.sep, "/");
    return `<article><h2>${item.caseId ?? item.id}</h2><img src="${relative}" alt="${item.caseId ?? item.id}"></article>`;
  }).join("\n");
  fs.writeFileSync(path.join(outputRoot, "index.html"), `<!doctype html><meta charset="utf-8"><title>MAI-102 correction review</title><style>body{font-family:system-ui;margin:24px;background:#f3f0ee;color:#141413}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}article{background:#fcfbfa;border:1px solid #d1cdc7;padding:16px}img{width:100%;height:auto;border:1px solid #d1cdc7}h2{font-size:16px}</style><h1>MAI-102 correction review</h1><main>${cards}</main>`);
  if (report.findings.length > 0) process.exitCode = 1;
}
