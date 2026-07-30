import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const outputRoot = path.resolve(process.cwd(), "mai102-evidence");
const screenshotRoot = path.join(outputRoot, "screenshots");
const reportPath = path.join(outputRoot, "rendered-report.json");
const applicationUrl = process.env.MAI102_APP_URL ?? "http://127.0.0.1:3000";
const storybookUrl = process.env.MAI102_STORYBOOK_URL ?? "http://127.0.0.1:6006";
const authorityMatrix = JSON.parse(
  fs.readFileSync(
    path.join(repositoryRoot, "gui/conformance/mai102-authority-matrix.json"),
    "utf8",
  ),
);

fs.mkdirSync(screenshotRoot, { recursive: true });

const viewports = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 1024, height: 720 },
  mobile: { width: 390, height: 844 },
};

const expectedFamilies = {
  "application-shell": "command-center",
  "command-center": "command-center",
  "deals-portfolio": "deals-portfolio",
  "new-deal-setup": "new-deal-setup",
  "tasks-approvals": "tasks-approvals",
  "notification-center": "notification-center",
  "global-search": "global-search",
  organizations: "organizations",
  "organization-detail": "organization-detail",
  "team-workspace": "team-workspace",
  "settings-family": "settings",
  "external-participant": "external-participant",
  "deal-overview": "deal-overview",
  "target-dossier": "deal-dossier",
  "documents-vdr": "deal-documents",
  "diligence-decision-room": "deal-diligence",
  "valuation-lab": "deal-valuation",
  "matching-universe": "deal-matching",
  "negotiation-room": "deal-negotiation",
  "closing-control-room": "deal-closing",
  "agentic-workspace": "deal-workspace",
  "deal-activity-audit": "deal-activity",
  "deal-team-access": "deal-team",
  "deliverables-exports": "deal-deliverables",
  "deal-settings-archive": "deal-settings",
};

const shellModes = {
  "settings-family": "administration",
  "external-participant": "external",
};

const stateStories = [
  {
    id: "shell-restricted-administration",
    story: "shell-appshell--restricted-administration-navigation",
    viewport: "desktop",
    boundary: "permission and restricted navigation",
  },
  {
    id: "shell-mobile-drawer-keyboard",
    story: "shell-appshell--mobile-drawer-keyboard",
    viewport: "mobile",
    boundary: "keyboard, focus trap, Escape and focus return",
  },
  {
    id: "shell-long-content",
    story: "shell-appshell--long-names-and-count-overflow",
    viewport: "desktop",
    boundary: "long-content overflow",
  },
  {
    id: "global-loading",
    story: "screens-mai-99-families--loading",
    viewport: "desktop",
    boundary: "loading semantics",
  },
  {
    id: "global-empty-search",
    story: "screens-mai-99-families--empty-search",
    viewport: "desktop",
    boundary: "empty state",
  },
  {
    id: "global-restricted-history",
    story: "screens-mai-99-families--restricted-organization-history",
    viewport: "desktop",
    boundary: "restricted history redaction",
  },
  {
    id: "settings-sensitive",
    story: "screens-mai-99-families--settings-sensitive",
    viewport: "desktop",
    boundary: "sensitive and destructive settings",
  },
  {
    id: "team-sensitive",
    story: "screens-mai-99-families--team-sensitive",
    viewport: "desktop",
    boundary: "sensitive team action",
  },
  {
    id: "external-unavailable",
    story: "screens-mai-99-families--external-unavailable",
    viewport: "desktop",
    boundary: "external unavailable state",
  },
  {
    id: "decision-invalidated",
    story: "screens-deal-intelligence--decision-room-invalidated",
    viewport: "desktop",
    boundary: "stale-source invalidation",
  },
  {
    id: "decision-recorded",
    story: "screens-deal-intelligence--decision-room-recorded",
    viewport: "desktop",
    boundary: "human decision and audit record",
  },
  {
    id: "decision-tablet-evidence",
    story: "screens-deal-intelligence--decision-room-tablet-evidence-drawer",
    viewport: "tablet",
    boundary: "tablet evidence Drawer",
  },
  {
    id: "decision-mobile-sequential",
    story: "screens-deal-intelligence--decision-room-mobile-sequential",
    viewport: "mobile",
    boundary: "mobile sequential decision flow",
  },
  {
    id: "closing-approval",
    story: "screens-deal-execution--closing-approval",
    viewport: "desktop",
    boundary: "readiness approval and irreversible confirmation",
  },
  {
    id: "team-restricted",
    story: "screens-deal-execution--team-restricted",
    viewport: "desktop",
    boundary: "revoke and restricted access",
  },
  {
    id: "deliverables-failure",
    story: "screens-deal-execution--deliverables-failure",
    viewport: "desktop",
    boundary: "release/export failure",
  },
  {
    id: "settings-destructive",
    story: "screens-deal-execution--settings-destructive",
    viewport: "desktop",
    boundary: "archive and deletion consequences",
  },
];

function resolvedRoute(pattern) {
  return pattern
    .replace(":organizationId", "fixture-org")
    .replace(":externalWorkspaceId", "fixture-workspace")
    .replace(":section", "profile")
    .replace(":dealId", "demo-deal");
}

function expectedShellMode(family) {
  if (shellModes[family.id]) return shellModes[family.id];
  return family.route.startsWith("/deals/:dealId") ? "deal" : "global";
}

const matrixCases = authorityMatrix.families.flatMap((family) =>
  Object.entries(family.breakpoints).map(([viewport, authority]) => ({
    caseId: `${family.id}--${viewport}`,
    familyId: family.id,
    owner: family.owner,
    route: resolvedRoute(family.route),
    expectedFamily: expectedFamilies[family.id],
    expectedShellMode: expectedShellMode(family),
    viewport,
    authority,
    declaredStates: family.states,
  }))
);

const report = {
  schemaVersion: 3,
  purpose: "MAI-102 final Figma-to-code frontend conformance proof",
  figmaFileKey: authorityMatrix.figmaFileKey,
  release: authorityMatrix.release,
  startedAt: new Date().toISOString(),
  applicationUrl,
  storybookUrl,
  browser: null,
  expectedFamilies: authorityMatrix.families.length,
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
  return value
    .replaceAll(/[^a-z0-9-]+/gi, "-")
    .replaceAll(/-+/g, "-")
    .toLowerCase();
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await page.waitForTimeout(250);
}

async function applicationMetrics(page, testCase) {
  return page.evaluate(
    ({ expectedFamily, expectedShellMode, viewportName, familyId }) => {
      const root = document.documentElement;
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.visibility !== "hidden" &&
          style.display !== "none" &&
          rect.width > 0 &&
          rect.height > 0;
      };
      const accessibleName = (element) => {
        const explicit = element.getAttribute("aria-label") ??
          element.getAttribute("title");
        if (explicit?.trim()) return explicit.trim();
        if ("labels" in element && element.labels?.length) {
          const label = [...element.labels]
            .map((item) => item.textContent?.trim() ?? "")
            .join(" ")
            .trim();
          if (label) return label;
        }
        return element.textContent?.trim() ?? "";
      };
      const controls = [...document.querySelectorAll(
        "a[href], button, input:not([type='hidden']), select, textarea, [role='button'], [role='link']",
      )]
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
            name: accessibleName(element),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        });
      const undersized = controls.filter((item) =>
        item.width < 44 || item.height < 44
      );
      const unnamed = controls.filter((item) => !item.name);
      const actualFamily = document.querySelector("[data-screen-family]")
        ?.getAttribute("data-screen-family") ?? null;
      const actualShellMode = document.querySelector("[data-shell-mode]")
        ?.getAttribute("data-shell-mode") ?? null;
      const text = document.body.innerText;
      const layout = document.querySelector("[data-conformance-layout]")
        ?.getAttribute("data-conformance-layout") ?? null;
      const governedItems = Math.max(
        document.querySelectorAll("ol[aria-label$='items'] > li").length,
        document.querySelectorAll("table tbody tr").length,
      );
      return {
        title: document.title,
        actualFamily,
        actualShellMode,
        familyMatches: actualFamily === expectedFamily,
        shellModeMatches: actualShellMode === expectedShellMode,
        layout,
        governedItems,
        mainCount: document.querySelectorAll("main").length,
        h1Count: document.querySelectorAll("h1").length,
        navCount: document.querySelectorAll("nav").length,
        bodyTextLength: text.trim().length,
        pageOverflow: root.scrollWidth > root.clientWidth + 2,
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        controlCount: controls.length,
        unnamedControlCount: unnamed.length,
        unnamedControls: unnamed.slice(0, 20),
        undersizedControlCount: undersized.length,
        undersizedControls: undersized.slice(0, 20),
        mobileTargetFailure: viewportName === "mobile" && undersized.length > 0,
        deferredPlaceholder: Boolean(
          document.querySelector("[data-deferred-screen-owner]"),
        ),
        fixtureDisclosure: Boolean(
          document.querySelector("[data-fixture-only='true']"),
        ),
        mai99OperationalFailure:
          [
            "command-center",
            "deals-portfolio",
            "new-deal-setup",
            "tasks-approvals",
            "notification-center",
            "global-search",
            "organizations",
            "organization-detail",
            "team-workspace",
            "settings-family",
            "external-participant",
          ].includes(familyId) &&
          (layout !== "list-detail" || governedItems < 4),
        externalBoundaryFailure:
          familyId === "external-participant" &&
          /BATNA|internal position|restricted finding|negotiation strategy/i.test(text),
      };
    },
    {
      expectedFamily: testCase.expectedFamily,
      expectedShellMode: testCase.expectedShellMode,
      viewportName: testCase.viewport,
      familyId: testCase.familyId,
    },
  );
}

function addFinding(caseId, kind, rule, detail, severity = "P1") {
  report.findings.push({ caseId, kind, severity, rule, detail });
}

function classifyApplication(testCase, metrics) {
  if (metrics.pageOverflow) {
    addFinding(
      testCase.caseId,
      "matrix",
      "page-overflow",
      `${metrics.scrollWidth}px content in ${metrics.clientWidth}px viewport`,
    );
  }
  if (!metrics.familyMatches) {
    addFinding(
      testCase.caseId,
      "matrix",
      "screen-family",
      `Expected ${testCase.expectedFamily}; rendered ${metrics.actualFamily ?? "none"}`,
    );
  }
  if (!metrics.shellModeMatches) {
    addFinding(
      testCase.caseId,
      "matrix",
      "shell-mode",
      `Expected ${testCase.expectedShellMode}; rendered ${metrics.actualShellMode ?? "none"}`,
    );
  }
  if (metrics.mainCount !== 1) {
    addFinding(
      testCase.caseId,
      "accessibility",
      "main-landmark",
      `Expected one main landmark; found ${metrics.mainCount}`,
    );
  }
  if (metrics.h1Count < 1) {
    addFinding(
      testCase.caseId,
      "accessibility",
      "heading-hierarchy",
      "No h1 rendered",
    );
  }
  if (metrics.unnamedControlCount > 0) {
    addFinding(
      testCase.caseId,
      "accessibility",
      "accessible-name",
      `${metrics.unnamedControlCount} visible controls lack an accessible name`,
    );
  }
  if (metrics.mobileTargetFailure) {
    addFinding(
      testCase.caseId,
      "accessibility",
      "mobile-target-size",
      `${metrics.undersizedControlCount} visible targets below 44×44px`,
    );
  }
  if (metrics.bodyTextLength < 40) {
    addFinding(
      testCase.caseId,
      "matrix",
      "blank-or-sparse-page",
      `Only ${metrics.bodyTextLength} characters rendered`,
    );
  }
  if (metrics.deferredPlaceholder) {
    addFinding(
      testCase.caseId,
      "matrix",
      "deferred-family",
      "A completed frontend family rendered a deferred placeholder",
      "P0",
    );
  }
  if (metrics.mai99OperationalFailure) {
    addFinding(
      testCase.caseId,
      "conformance",
      "operational-hierarchy",
      `Layout ${metrics.layout ?? "none"}; governed items ${metrics.governedItems}`,
    );
  }
  if (metrics.externalBoundaryFailure) {
    addFinding(
      testCase.caseId,
      "permission",
      "external-data-boundary",
      "Internal strategy or findings appeared in an external surface",
      "P0",
    );
  }
}

async function captureApplication(browser, testCase) {
  const context = await browser.newContext({
    viewport: viewports[testCase.viewport],
  });
  const page = await context.newPage();
  const screenshotPath = path.join(
    screenshotRoot,
    `${safeName(testCase.caseId)}.png`,
  );
  const result = {
    ...testCase,
    screenshotPath,
    status: "running",
    metrics: null,
    error: null,
  };
  report.matrix.push(result);
  persist();
  try {
    await page.goto(`${applicationUrl}${testCase.route}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await settle(page);
    result.metrics = await applicationMetrics(page, testCase);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    result.status = "passed";
    classifyApplication(testCase, result.metrics);
  } catch (error) {
    result.status = "failed";
    result.error = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { message: String(error) };
    addFinding(
      testCase.caseId,
      "matrix",
      "capture-failure",
      result.error.message,
    );
  } finally {
    await context.close();
    persist();
  }
}

async function captureState(browser, testCase) {
  const context = await browser.newContext({
    viewport: viewports[testCase.viewport],
    reducedMotion: testCase.id === "shell-mobile-drawer-keyboard"
      ? "reduce"
      : "no-preference",
  });
  const page = await context.newPage();
  const screenshotPath = path.join(
    screenshotRoot,
    `${safeName(testCase.id)}.png`,
  );
  const result = {
    ...testCase,
    screenshotPath,
    status: "running",
    metrics: null,
    error: null,
  };
  report.states.push(result);
  persist();
  try {
    await page.goto(
      `${storybookUrl}/iframe.html?id=${encodeURIComponent(testCase.story)}&viewMode=story`,
      { waitUntil: "domcontentloaded", timeout: 45_000 },
    );
    await settle(page);
    await page.waitForFunction(
      () => document.body.innerText.trim().length > 0,
      null,
      { timeout: 10_000 },
    );
    result.metrics = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        bodyTextLength: document.body.innerText.trim().length,
        pageOverflow: root.scrollWidth > root.clientWidth + 2,
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        dialogCount: document.querySelectorAll("[role='dialog']").length,
        alertCount: document.querySelectorAll("[role='alert']").length,
        ariaBusyCount: document.querySelectorAll("[aria-busy='true']").length,
      };
    });
    await page.screenshot({ path: screenshotPath, fullPage: false });
    result.status = "passed";
    if (result.metrics.pageOverflow) {
      addFinding(
        testCase.id,
        "state",
        "page-overflow",
        `${result.metrics.scrollWidth}px content in ${result.metrics.clientWidth}px viewport`,
      );
    }
  } catch (error) {
    result.status = "failed";
    result.error = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { message: String(error) };
    addFinding(
      testCase.id,
      "state",
      "blank-or-failed-story",
      result.error.message,
    );
  } finally {
    await context.close();
    persist();
  }
}

function writeIndex() {
  const cards = [...report.matrix, ...report.states]
    .map((item) => {
      const relative = path.relative(outputRoot, item.screenshotPath)
        .replaceAll(path.sep, "/");
      const title = item.caseId ?? item.id;
      return `<article><h2>${title}</h2><p>${item.status}</p><img src="${relative}" alt="${title}"></article>`;
    })
    .join("\n");
  fs.writeFileSync(
    path.join(outputRoot, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>MAI-102 final review</title><style>body{font-family:system-ui;margin:24px;background:#f3f0ee;color:#141413}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}article{background:#fcfbfa;border:1px solid #d1cdc7;padding:16px}img{width:100%;height:auto;border:1px solid #d1cdc7}h2{font-size:16px}</style><h1>MAI-102 final rendered review</h1><main>${cards}</main>`,
  );
}

persist();
let browser;
try {
  browser = await chromium.launch({ headless: true });
  report.browser = {
    playwright: "repository-pinned 1.61.1",
    version: await browser.version(),
    executablePath: chromium.executablePath(),
  };
  persist();
  for (const testCase of matrixCases) {
    await captureApplication(browser, testCase);
  }
  for (const testCase of stateStories) {
    await captureState(browser, testCase);
  }
} finally {
  if (browser) await browser.close();
  const openP0P1 = report.findings.filter((finding) =>
    finding.severity === "P0" || finding.severity === "P1"
  );
  report.finishedAt = new Date().toISOString();
  report.summary = {
    uniqueFamilies: new Set(report.matrix.map((item) => item.familyId)).size,
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
  writeIndex();
  if (openP0P1.length > 0) process.exitCode = 1;
}
