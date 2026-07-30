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
  { id: "application-shell", route: "/home", expectedFamily: "command-center", shellMode: "global", owner: "MAI-98", authority: "MAI-91 direct", breakpoints: ["desktop", "tablet", "mobile"] },
  { id: "command-center", route: "/home", expectedFamily: "command-center", shellMode: "global", owner: "MAI-99", authority: "MAI-91 direct", breakpoints: ["desktop", "tablet", "mobile"] },
  { id: "deals-portfolio", route: "/deals", expectedFamily: "deals-portfolio", shellMode: "global", owner: "MAI-99", authority: "MAI-91 direct", breakpoints: ["desktop", "tablet", "mobile"] },
  { id: "new-deal-setup", route: "/new-deal", expectedFamily: "new-deal-setup", shellMode: "global", owner: "MAI-99", authority: "MAI-91 direct", breakpoints: ["desktop", "tablet", "mobile"] },
  { id: "tasks-approvals", route: "/tasks", expectedFamily: "tasks-approvals", shellMode: "global", owner: "MAI-99", authority: "MAI-91 direct", breakpoints: ["desktop", "tablet", "mobile"] },
  { id: "organizations", route: "/organizations", expectedFamily: "organizations", shellMode: "global", owner: "MAI-99", authority: "MAI-91 direct", breakpoints: ["desktop", "tablet", "mobile"] },
  { id: "organization-detail", route: "/organizations/fixture-org", expectedFamily: "organization-detail", shellMode: "global", owner: "MAI-99", authority: "MAI-91 direct", breakpoints: ["desktop", "tablet", "mobile"] },
  { id: "team-workspace", route: "/team", expectedFamily: "team-workspace", shellMode: "global", owner: "MAI-99", authority: "MAI-91 direct", breakpoints: ["desktop", "tablet", "mobile"] },
  { id: "notification-center", route: "/notifications", expectedFamily: "notification-center", shellMode: "global", owner: "MAI-99", authority: "MAI-91 direct", breakpoints: ["desktop", "tablet", "mobile"] },
  { id: "global-search", route: "/search", expectedFamily: "global-search", shellMode: "global", owner: "MAI-99", authority: "MAI-91 direct", breakpoints: ["desktop", "tablet", "mobile"] },
  { id: "settings-family", route: "/settings/profile", expectedFamily: "settings", shellMode: "administration", owner: "MAI-99", authority: "MAI-91 direct", breakpoints: ["desktop", "tablet", "mobile"] },
  { id: "external-participant", route: "/portal/project/fixture-workspace", expectedFamily: "external-participant", shellMode: "external", owner: "MAI-99", authority: "MAI-91 direct", breakpoints: ["desktop", "tablet", "mobile"] },
  { id: "deal-overview", route: "/deals/demo-deal/overview", expectedFamily: "deal-overview", shellMode: "deal", owner: "MAI-100", authority: "MAI-92 desktop direct", breakpoints: ["desktop"] },
  { id: "target-dossier", route: "/deals/demo-deal/dossier", expectedFamily: "deal-dossier", shellMode: "deal", owner: "MAI-100", authority: "MAI-92 desktop direct", breakpoints: ["desktop"] },
  { id: "documents-vdr", route: "/deals/demo-deal/documents", expectedFamily: "deal-documents", shellMode: "deal", owner: "MAI-100", authority: "MAI-92 desktop direct", breakpoints: ["desktop"] },
  { id: "diligence-decision-room", route: "/deals/demo-deal/diligence", expectedFamily: "deal-diligence", shellMode: "deal", owner: "MAI-100", authority: "MAI-92 direct", breakpoints: ["desktop", "tablet", "mobile"] },
  { id: "valuation-lab", route: "/deals/demo-deal/valuation", expectedFamily: "deal-valuation", shellMode: "deal", owner: "MAI-100", authority: "MAI-92 desktop direct", breakpoints: ["desktop"] },
  { id: "matching-universe", route: "/deals/demo-deal/matching", expectedFamily: "deal-matching", shellMode: "deal", owner: "MAI-100", authority: "MAI-92 desktop direct", breakpoints: ["desktop"] },
  { id: "negotiation-room", route: "/deals/demo-deal/negotiation", expectedFamily: "deal-negotiation", shellMode: "deal", owner: "MAI-101", authority: "MAI-93 desktop direct; responsive runtime", breakpoints: ["desktop", "tablet", "mobile"] },
  { id: "closing-control-room", route: "/deals/demo-deal/closing", expectedFamily: "deal-closing", shellMode: "deal", owner: "MAI-101", authority: "MAI-93 shared pattern; responsive runtime", breakpoints: ["desktop", "tablet", "mobile"] },
  { id: "agentic-workspace", route: "/deals/demo-deal/workspace", expectedFamily: "deal-workspace", shellMode: "deal", owner: "MAI-101", authority: "MAI-93 desktop direct; responsive runtime", breakpoints: ["desktop", "tablet", "mobile"] },
  { id: "deal-activity-audit", route: "/deals/demo-deal/activity", expectedFamily: "deal-activity", shellMode: "deal", owner: "MAI-101", authority: "MAI-93 shared pattern; responsive runtime", breakpoints: ["desktop", "tablet", "mobile"] },
  { id: "deal-team-access", route: "/deals/demo-deal/team", expectedFamily: "deal-team", shellMode: "deal", owner: "MAI-101", authority: "MAI-93 shared pattern; responsive runtime", breakpoints: ["desktop", "tablet", "mobile"] },
  { id: "deliverables-exports", route: "/deals/demo-deal/deliverables", expectedFamily: "deal-deliverables", shellMode: "deal", owner: "MAI-101", authority: "MAI-93 shared pattern; responsive runtime", breakpoints: ["desktop", "tablet", "mobile"] },
  { id: "deal-settings-archive", route: "/deals/demo-deal/settings", expectedFamily: "deal-settings", shellMode: "deal", owner: "MAI-101", authority: "MAI-93 shared pattern; responsive runtime", breakpoints: ["desktop", "tablet", "mobile"] },
];

const stateStories = [
  { id: "shell-restricted-administration", story: "shell-appshell--restricted-administration-navigation", viewport: "desktop" },
  { id: "shell-mobile-drawer-keyboard", story: "shell-appshell--mobile-drawer-keyboard", viewport: "mobile" },
  { id: "shell-long-content", story: "shell-appshell--long-names-and-count-overflow", viewport: "desktop" },
  { id: "global-loading", story: "screens-mai-99-families--loading", viewport: "desktop" },
  { id: "global-empty-search", story: "screens-mai-99-families--empty-search", viewport: "desktop" },
  { id: "global-restricted-history", story: "screens-mai-99-families--restricted-organization-history", viewport: "desktop" },
  { id: "settings-sensitive", story: "screens-mai-99-families--settings-sensitive", viewport: "desktop" },
  { id: "team-sensitive", story: "screens-mai-99-families--team-sensitive", viewport: "desktop" },
  { id: "external-unavailable", story: "screens-mai-99-families--external-unavailable", viewport: "desktop" },
  { id: "decision-invalidated", story: "screens-deal-intelligence--decision-room-invalidated", viewport: "desktop" },
  { id: "decision-recorded", story: "screens-deal-intelligence--decision-room-recorded", viewport: "desktop" },
  { id: "decision-tablet-evidence", story: "screens-deal-intelligence--decision-room-tablet-evidence-drawer", viewport: "tablet" },
  { id: "decision-mobile-sequential", story: "screens-deal-intelligence--decision-room-mobile-sequential", viewport: "mobile" },
  { id: "closing-approval", story: "screens-deal-execution--closing-approval", viewport: "desktop" },
  { id: "team-restricted", story: "screens-deal-execution--team-restricted", viewport: "desktop" },
  { id: "deliverables-failure", story: "screens-deal-execution--deliverables-failure", viewport: "desktop" },
  { id: "settings-destructive", story: "screens-deal-execution--settings-destructive", viewport: "desktop" },
];

const matrixCases = families.flatMap((family) => family.breakpoints.map((viewport) => ({ ...family, viewport })));
const reportPath = path.join(outputRoot, "report.json");
const report = {
  schemaVersion: 1,
  startedAt: new Date().toISOString(),
  applicationUrl,
  storybookUrl,
  browser: null,
  expectedMatrixCases: matrixCases.length,
  expectedStateCases: stateStories.length,
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

async function waitForStablePage(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await page.waitForTimeout(250);
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
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          name: element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 80) ?? "",
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      });
    const undersized = controls.filter((item) => item.width < 44 || item.height < 44);
    const actualFamily = document.querySelector("[data-screen-family]")?.getAttribute("data-screen-family") ?? null;
    const actualShellMode = document.querySelector("[data-shell-mode]")?.getAttribute("data-shell-mode") ?? null;
    return {
      title: document.title,
      actualFamily,
      actualShellMode,
      familyMatches: actualFamily === expectedFamily,
      shellModeMatches: actualShellMode === shellMode,
      mainCount: document.querySelectorAll("main").length,
      h1Count: document.querySelectorAll("h1").length,
      pageOverflow: root.scrollWidth > root.clientWidth + 2,
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      controlCount: controls.length,
      undersizedControlCount: undersized.length,
      undersizedControls: undersized.slice(0, 20),
      mobileTargetFailure: viewportName === "mobile" && undersized.length > 0,
      deferredPlaceholder: Boolean(document.querySelector("[data-deferred-screen-owner]")),
      fixtureDisclosure: Boolean(document.querySelector("[data-fixture-only='true']")),
    };
  }, { expectedFamily: expected.expectedFamily, shellMode: expected.shellMode, viewportName: expected.viewport });
}

async function inspectStory(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    return {
      title: document.title,
      pageOverflow: root.scrollWidth > root.clientWidth + 2,
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      bodyTextLength: document.body.innerText.length,
    };
  });
}

function recordAutomaticFindings(caseId, metrics, kind) {
  const add = (severity, rule, detail) => report.findings.push({ caseId, kind, severity, rule, detail });
  if (metrics.pageOverflow) add("P1", "page-overflow", `${metrics.scrollWidth}px content in ${metrics.clientWidth}px viewport`);
  if (kind === "matrix") {
    if (!metrics.familyMatches) add("P1", "screen-family", `Expected family mismatch; rendered ${metrics.actualFamily ?? "none"}`);
    if (!metrics.shellModeMatches) add("P1", "shell-mode", `Expected shell mismatch; rendered ${metrics.actualShellMode ?? "none"}`);
    if (metrics.mainCount !== 1) add("P1", "main-landmark", `Expected one main landmark; found ${metrics.mainCount}`);
    if (metrics.h1Count < 1) add("P1", "heading-hierarchy", "No h1 rendered");
    if (metrics.mobileTargetFailure) add("P1", "mobile-target-size", `${metrics.undersizedControlCount} visible controls below 44×44px`);
    if (metrics.deferredPlaceholder) add("P0", "deferred-family", "Implemented MAI-102 family rendered a deferred placeholder");
  }
}

persist();
let browser;
try {
  browser = await chromium.launch({ headless: true });
  report.browser = {
    playwright: process.env.npm_package_devDependencies_playwright ?? "repository-pinned",
    version: await browser.version(),
    executablePath: chromium.executablePath(),
  };
  persist();

  for (const testCase of matrixCases) {
    const caseId = `${testCase.id}--${testCase.viewport}`;
    const viewport = viewports[testCase.viewport];
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const screenshotPath = path.join(screenshotRoot, `${safeName(caseId)}.png`);
    const result = { caseId, family: testCase.id, route: testCase.route, viewport: testCase.viewport, owner: testCase.owner, authority: testCase.authority, screenshotPath, status: "running", metrics: null, error: null };
    report.matrix.push(result);
    persist();
    try {
      await page.goto(`${applicationUrl}${testCase.route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await waitForStablePage(page);
      result.metrics = await inspectApplication(page, testCase);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      result.status = "passed";
      recordAutomaticFindings(caseId, result.metrics, "matrix");
    } catch (error) {
      result.status = "failed";
      result.error = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
      report.findings.push({ caseId, kind: "matrix", severity: "P1", rule: "capture-failure", detail: result.error.message });
    } finally {
      await context.close();
      persist();
    }
  }

  for (const testCase of stateStories) {
    const viewport = viewports[testCase.viewport];
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const screenshotPath = path.join(screenshotRoot, `${safeName(testCase.id)}.png`);
    const result = { caseId: testCase.id, story: testCase.story, viewport: testCase.viewport, screenshotPath, status: "running", metrics: null, error: null };
    report.states.push(result);
    persist();
    try {
      await page.goto(`${storybookUrl}/iframe.html?id=${encodeURIComponent(testCase.story)}&viewMode=story`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await waitForStablePage(page);
      result.metrics = await inspectStory(page);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      result.status = "passed";
      recordAutomaticFindings(testCase.id, result.metrics, "state");
    } catch (error) {
      result.status = "failed";
      result.error = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
      report.findings.push({ caseId: testCase.id, kind: "state", severity: "P1", rule: "capture-failure", detail: result.error.message });
    } finally {
      await context.close();
      persist();
    }
  }
} finally {
  if (browser) await browser.close();
  const openP0P1 = report.findings.filter((item) => item.severity === "P0" || item.severity === "P1");
  report.finishedAt = new Date().toISOString();
  report.summary = {
    matrixExpected: matrixCases.length,
    matrixCompleted: report.matrix.filter((item) => item.status !== "running").length,
    matrixPassed: report.matrix.filter((item) => item.status === "passed").length,
    matrixFailed: report.matrix.filter((item) => item.status === "failed").length,
    stateExpected: stateStories.length,
    stateCompleted: report.states.filter((item) => item.status !== "running").length,
    statePassed: report.states.filter((item) => item.status === "passed").length,
    stateFailed: report.states.filter((item) => item.status === "failed").length,
    openP0P1: openP0P1.length,
  };
  persist();

  const cards = [...report.matrix, ...report.states].map((item) => {
    const relative = path.relative(outputRoot, item.screenshotPath).replaceAll(path.sep, "/");
    return `<article><h2>${item.caseId}</h2><p>${item.status}</p><img src="${relative}" alt="${item.caseId}"></article>`;
  }).join("\n");
  fs.writeFileSync(path.join(outputRoot, "index.html"), `<!doctype html><meta charset="utf-8"><title>MAI-102 review</title><style>body{font-family:system-ui;margin:24px;background:#f3f0ee;color:#141413}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}article{background:#fcfbfa;border:1px solid #d1cdc7;padding:16px}img{width:100%;height:auto;border:1px solid #d1cdc7}h2{font-size:16px}</style><h1>MAI-102 rendered review</h1><main>${cards}</main>`);

  if (report.summary.openP0P1 > 0) process.exitCode = 1;
}
