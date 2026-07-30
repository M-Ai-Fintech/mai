import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const appBase = process.env.MAI100_APP_BASE ?? "http://127.0.0.1:3000";
const storyBase = process.env.MAI100_STORY_BASE ?? "http://127.0.0.1:6006";
const outputDir = path.resolve("mai100-review");
await mkdir(outputDir, { recursive: true });

const route = (family) => `${appBase}/deals/demo-deal/${family}`;
const story = (id) => `${storyBase}/iframe.html?id=${id}&viewMode=story`;
const desktop = { width: 1440, height: 900 };
const tablet = { width: 1024, height: 720 };
const mobile = { width: 390, height: 844 };

const cases = [
  ...["overview", "dossier", "documents", "diligence", "valuation", "matching"].map((family) => ({ name: `${family}-desktop`, family, url: route(family), viewport: desktop })),
  ...["overview", "dossier", "documents", "valuation", "matching"].map((family) => ({ name: `${family}-tablet`, family, url: route(family), viewport: tablet, responsiveReference: "implementation-owned" })),
  ...["overview", "dossier", "documents", "valuation", "matching"].map((family) => ({ name: `${family}-mobile`, family, url: route(family), viewport: mobile, responsiveReference: "implementation-owned" })),
  { name: "diligence-tablet", family: "diligence", url: route("diligence"), viewport: tablet, responsiveReference: "approved" },
  { name: "diligence-tablet-evidence-drawer", family: "diligence", url: route("diligence"), viewport: tablet, interaction: "Open exact evidence", expectOverlay: "Evidence inspector", responsiveReference: "approved" },
  { name: "diligence-mobile-sequential", family: "diligence", url: route("diligence"), viewport: mobile, responsiveReference: "approved" },
  { name: "diligence-mobile-full-screen-evidence", family: "diligence", url: route("diligence"), viewport: mobile, interaction: "Open exact evidence", expectOverlay: "Evidence inspector", responsiveReference: "approved" },
  { name: "diligence-approval-overlay", family: "diligence", url: route("diligence"), viewport: desktop, interaction: "Open approval", expectOverlay: "Record a human decision" },
  { name: "diligence-invalidated", family: "diligence", url: story("screens-deal-intelligence--decision-room-invalidated"), viewport: desktop, expectedHeading: "Diligence Decision Room" },
  { name: "diligence-recorded", family: "diligence", url: story("screens-deal-intelligence--decision-room-recorded"), viewport: desktop, expectedHeading: "Diligence Decision Room" },
];

const browser = await chromium.launch({ headless: true });
const results = [];

for (const testCase of cases) {
  const context = await browser.newContext({ viewport: testCase.viewport, reducedMotion: "reduce" });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto(testCase.url, { waitUntil: "networkidle", timeout: 90_000 });
  await page.locator("body").waitFor({ state: "visible" });

  if (testCase.interaction) {
    await page.getByRole("button", { name: testCase.interaction, exact: true }).click();
    await page.getByText(testCase.expectOverlay, { exact: true }).first().waitFor({ state: "visible" });
  }

  const metrics = await page.evaluate(({ expectedFamily, expectedHeading, expectOverlay }) => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    };
    const hasHorizontalScroller = (element) => {
      let current = element.parentElement;
      while (current && current !== document.body) {
        const style = getComputedStyle(current);
        if (["auto", "scroll"].includes(style.overflowX) && current.scrollWidth > current.clientWidth) return true;
        current = current.parentElement;
      }
      return false;
    };
    const targetSelector = "a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link]";
    const targets = [...document.querySelectorAll(targetSelector)].filter(visible);
    const smallTargets = targets.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width >= 44 && rect.height >= 44) return [];
      return [{ label: element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 80) || element.tagName, width: Math.round(rect.width), height: Math.round(rect.height) }];
    });
    const clippedTargets = targets.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      if (hasHorizontalScroller(element)) return [];
      if (rect.left >= -1 && rect.right <= innerWidth + 1) return [];
      return [{ label: element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 80) || element.tagName, left: Math.round(rect.left), right: Math.round(rect.right) }];
    });
    const bodyText = document.body.innerText;
    const family = document.querySelector("[data-screen-family]")?.getAttribute("data-screen-family") ?? null;
    const heading = document.querySelector("h1")?.textContent?.trim() ?? null;
    const horizontalOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    const unresolvedContent = [...new Set(bodyText.match(/\b(?:undefined|NaN|\[object Object\])\b/g) ?? [])];
    const protectedExposure = expectedFamily === "matching" && /CP-002|Brazilian consumer platform; R\$ 1\.6bn revenue.{0,120}CP-002/s.test(bodyText);
    const provenanceRequired = ["dossier", "documents", "diligence", "valuation"].includes(expectedFamily);
    const provenancePresent = !provenanceRequired || /(DOC-|FAC-|FND-|CALC-|Evidence|evidence|source|provenance)/.test(bodyText);
    const humanAuthorityRequired = ["overview", "diligence", "valuation", "matching"].includes(expectedFamily);
    const humanAuthorityPresent = !humanAuthorityRequired || /(human|Vice President|VP approval|approval required|authority)/i.test(bodyText);
    const overlayPresent = !expectOverlay || bodyText.includes(expectOverlay);
    return {
      family,
      heading,
      expectedFamily: `deal-${expectedFamily}`,
      expectedHeading: expectedHeading ?? null,
      horizontalOverflow,
      smallTargets,
      clippedTargets,
      unresolvedContent,
      protectedExposure,
      provenancePresent,
      humanAuthorityPresent,
      overlayPresent,
      fixtureDisclosurePresent: bodyText.includes("Local demonstration"),
      dealContextPresent: bodyText.includes("Demo transaction") || location.hostname === "127.0.0.1" && location.port === "6006",
    };
  }, { expectedFamily: testCase.family, expectedHeading: testCase.expectedHeading, expectOverlay: testCase.expectOverlay });

  const failures = [];
  if (metrics.family !== metrics.expectedFamily) failures.push(`family ${metrics.family} != ${metrics.expectedFamily}`);
  if (testCase.expectedHeading && metrics.heading !== testCase.expectedHeading) failures.push(`heading ${metrics.heading} != ${testCase.expectedHeading}`);
  if (metrics.horizontalOverflow) failures.push("page horizontal overflow");
  if (metrics.smallTargets.length) failures.push(`${metrics.smallTargets.length} target(s) below 44x44`);
  if (metrics.clippedTargets.length) failures.push(`${metrics.clippedTargets.length} unclamped target(s) clipped`);
  if (metrics.unresolvedContent.length) failures.push(`unresolved content: ${metrics.unresolvedContent.join(", ")}`);
  if (metrics.protectedExposure) failures.push("restricted candidate identity or metadata exposed");
  if (!metrics.provenancePresent) failures.push("required provenance absent");
  if (!metrics.humanAuthorityPresent) failures.push("human-authority boundary absent");
  if (!metrics.overlayPresent) failures.push("expected overlay absent");
  if (!metrics.fixtureDisclosurePresent) failures.push("fixture disclosure absent");
  if (!metrics.dealContextPresent) failures.push("deal context absent");
  if (consoleErrors.length) failures.push(`${consoleErrors.length} console/page error(s)`);

  await page.screenshot({ path: path.join(outputDir, `${testCase.name}.png`), fullPage: true });
  results.push({ ...testCase, metrics, consoleErrors, failures, passed: failures.length === 0 });
  await context.close();
}

await browser.close();
const report = {
  generatedAt: new Date().toISOString(),
  authority: {
    desktop: ["205:662", "205:767", "205:3738", "52:21", "205:4234", "205:4436"],
    decisionRoomResponsive: ["58:97", "58:139", "59:115", "59:144"],
    implementationResponsive: "Five non-Decision families are behavioral coverage only; deferred Figma drafts are not pixel baselines.",
  },
  total: results.length,
  passed: results.filter((result) => result.passed).length,
  failed: results.filter((result) => !result.passed).length,
  cases: results,
};
await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ total: report.total, passed: report.passed, failed: report.failed }));
