import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const outputRoot = process.env.MAI99_REVIEW_OUTPUT ?? "mai99-rendered-review";
const applicationUrl = process.env.MAI99_APPLICATION_URL ?? "http://127.0.0.1:3000";
const storybookUrl = process.env.MAI99_STORYBOOK_URL ?? "http://127.0.0.1:6006";

const screens = [
  ["command-center", "global", "screens-mai-99-families--command-center", "/home"],
  ["deals-portfolio", "global", "screens-mai-99-families--deals-portfolio", "/deals"],
  ["new-deal-setup", "global", "screens-mai-99-families--new-deal-setup", "/new-deal"],
  ["tasks-approvals", "global", "screens-mai-99-families--tasks-and-approvals", "/tasks"],
  ["notification-center", "global", "screens-mai-99-families--notifications", "/notifications"],
  ["global-search", "global", "screens-mai-99-families--global-search", "/search"],
  ["organizations", "global", "screens-mai-99-families--organizations", "/organizations"],
  ["organization-detail", "global", "screens-mai-99-families--organization-detail", "/organizations/fixture-org"],
  ["team-workspace", "global", "screens-mai-99-families--team-workspace", "/team"],
  ["settings", "administration", "screens-mai-99-families--settings", "/settings/profile"],
  ["external-participant", "external", "screens-mai-99-families--external-participant", "/portal/project/fixture-workspace"],
];

const viewports = [
  ["desktop", 1440, 900],
  ["tablet", 1024, 720],
  ["mobile", 390, 844],
];

const edgeStories = [
  ["new-deal-validation", "screens-mai-99-families--new-deal-setup"],
  ["team-destructive", "screens-mai-99-families--team-sensitive"],
  ["settings-secret-policy", "screens-mai-99-families--settings"],
  ["external-expired-submitted", "screens-mai-99-families--external-participant"],
  ["organization-restricted-history", "screens-mai-99-families--restricted-organization-history"],
];

await mkdir(`${outputRoot}/screenshots`, { recursive: true });
const browser = await chromium.launch();
const report = { generatedAt: new Date().toISOString(), views: [], edgeViews: [] };

for (const [family, expectedShellMode, storyId, route] of screens) {
  for (const [viewportName, width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`${applicationUrl}${route}`, { waitUntil: "networkidle" });
    const screenshot = `screenshots/${family}-${viewportName}.png`;
    await page.screenshot({ path: `${outputRoot}/${screenshot}`, fullPage: true });
    report.views.push(await inspectView(page, {
      family,
      expectedShellMode,
      storyId,
      viewport: { name: viewportName, width, height },
      screenshot,
      route,
    }));
    await page.close();
  }
}

for (const [name, storyId] of edgeStories) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${storybookUrl}/iframe.html?id=${storyId}&viewMode=story`, {
    waitUntil: "networkidle",
  });
  const screenshot = `screenshots/edge-${name}.png`;
  await page.screenshot({ path: `${outputRoot}/${screenshot}`, fullPage: true });
  report.edgeViews.push({
    name,
    storyId,
    screenshot,
    text: (await page.locator("body").innerText()).slice(0, 2_000),
  });
  await page.close();
}

await browser.close();
await writeFile(
  `${outputRoot}/report.json`,
  `${JSON.stringify(report, null, 2)}\n`,
);

const p0p1 = report.views.flatMap((view) => view.p0p1);
console.log(`Captured ${report.views.length} approved views and ${report.edgeViews.length} edge views.`);
if (p0p1.length) {
  console.error(`Rendered review found ${p0p1.length} P0/P1 findings.`);
  process.exitCode = 1;
}

async function inspectView(page, identity) {
  return page.evaluate((view) => {
    const body = document.body;
    const all = [...document.querySelectorAll("*")];
    const interactive = [
      ...document.querySelectorAll(
        "a, button, input, select, textarea, [role='button'], [tabindex]:not([tabindex='-1'])",
      ),
    ];
    const targetsBelow44 = interactive.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return [];
      if (rect.width >= 44 && rect.height >= 44) return [];
      return [{
        name: element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 80),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      }];
    });
    const clippedRegions = all
      .filter((element) =>
        element.matches("[data-screen-family], [data-screen-family] section, [data-screen-family] form, [data-screen-family] table")
      )
      .flatMap((element) => {
      if (element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight) {
        return [];
      }
      const style = getComputedStyle(element);
      if (!["hidden", "clip"].includes(style.overflow) &&
          !["hidden", "clip"].includes(style.overflowX) &&
          !["hidden", "clip"].includes(style.overflowY)) return [];
      return [element.getAttribute("data-screen-family") ?? element.tagName.toLowerCase()];
    }).slice(0, 25);
    const unresolvedTokens = all.flatMap((element) => {
      const style = getComputedStyle(element);
      return [...style].flatMap((property) =>
        style.getPropertyValue(property).includes("var(--mai-") ? [property] : []
      );
    });
    const text = body.innerText;
    const externalPrivacyViolations = view.family === "external-participant"
      ? ["Project Horizon", "Demo Advisory", "negotiation recommendation", "internal finding"]
        .filter((term) => text.includes(term))
      : [];
    const protectedDataExposure = /(?:api[_ -]?key|secret[_ -]?value)\s*[:=]\s*[A-Za-z0-9_-]{8,}/i
      .test(text);
    const destructiveControls = [
      ...document.querySelectorAll("button"),
    ].filter((button) =>
      /discard|remove|offboard|delete|confirm/i.test(button.textContent ?? "")
    ).map((button) => ({
      name: button.getAttribute("aria-label") ?? button.textContent?.trim(),
      disabled: button.hasAttribute("disabled"),
    }));
    const actualShellMode = document.querySelector("[data-shell-mode]")
      ?.getAttribute("data-shell-mode") ?? null;
    const actualFamily = document.querySelector("[data-screen-family]")
      ?.getAttribute("data-screen-family") ?? null;
    const pageOverflow = body.scrollWidth > window.innerWidth;
    const p0p1 = [];
    if (actualShellMode !== view.expectedShellMode) p0p1.push("incorrect-shell-mode");
    if (actualFamily !== view.family) p0p1.push("incorrect-screen-family");
    if (pageOverflow) p0p1.push("page-horizontal-overflow");
    if (clippedRegions.length) p0p1.push("clipped-content");
    if (targetsBelow44.length) p0p1.push("interactive-target-below-44px");
    if (unresolvedTokens.length) p0p1.push("unresolved-semantic-token");
    if (protectedDataExposure) p0p1.push("protected-data-exposure");
    if (externalPrivacyViolations.length) p0p1.push("external-privacy-violation");
    return {
      ...view,
      actualShellMode,
      actualFamily,
      pageOverflow,
      clippedRegions,
      targetsBelow44,
      unresolvedTokens,
      protectedDataExposure,
      externalPrivacyViolations,
      destructiveControls,
      longContentFailure: pageOverflow || clippedRegions.length > 0,
      p0p1,
    };
  }, identity);
}
