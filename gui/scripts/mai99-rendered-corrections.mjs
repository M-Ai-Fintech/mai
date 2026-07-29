import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const outputRoot = "mai99-rendered-corrections";
const applicationUrl = "http://127.0.0.1:3000";
const storybookUrl = "http://127.0.0.1:6006";
const affected = [
  ["deals-portfolio", "/deals"],
  ["tasks-approvals", "/tasks"],
  ["notification-center", "/notifications"],
  ["global-search", "/search"],
  ["organizations", "/organizations"],
];
const viewports = [
  ["desktop", 1440, 900],
  ["tablet", 1024, 720],
  ["mobile", 390, 844],
];
const edgeStories = [
  [
    "new-deal-validation",
    "screens-mai-99-families--new-deal-setup",
    "Enter a working name",
  ],
  [
    "team-destructive",
    "screens-mai-99-families--team-sensitive",
    "Confirm fixture-only action",
  ],
  [
    "settings-secret-policy",
    "screens-mai-99-families--settings",
    "Secret masked",
  ],
  [
    "external-expired-submitted",
    "screens-mai-99-families--external-participant",
    "Submitted responses are fixture-only",
  ],
  [
    "organization-restricted-history",
    "screens-mai-99-families--restricted-organization-history",
    "Restricted",
  ],
];

await mkdir(`${outputRoot}/screenshots`, { recursive: true });
const browser = await chromium.launch();
const report = {
  generatedAt: new Date().toISOString(),
  affectedViews: [],
  edgeViews: [],
};

for (const [family, route] of affected) {
  for (const [name, width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`${applicationUrl}${route}`, { waitUntil: "networkidle" });
    const screenshot = `screenshots/${family}-${name}.png`;
    await page.screenshot({
      path: `${outputRoot}/${screenshot}`,
      fullPage: true,
    });
    const targetsBelow44 = await page.locator(
      "[data-screen-family] a, [data-screen-family] button, [data-screen-family] input",
    ).evaluateAll((elements) =>
      elements.flatMap((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return [];
        return rect.width < 44 || rect.height < 44
          ? [{
            name: element.getAttribute("aria-label") ??
              element.textContent?.trim(),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          }]
          : [];
      })
    );
    report.affectedViews.push({
      family,
      route,
      viewport: { name, width, height },
      screenshot,
      targetsBelow44,
      p0p1: targetsBelow44.length ? ["interactive-target-below-44px"] : [],
    });
    await page.close();
  }
}

for (const [name, storyId, expectedText] of edgeStories) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.goto(`${storybookUrl}/iframe.html?id=${storyId}&viewMode=story`, {
    waitUntil: "networkidle",
  });
  const screenshot = `screenshots/edge-${name}.png`;
  await page.screenshot({
    path: `${outputRoot}/${screenshot}`,
    fullPage: true,
  });
  const text = await page.locator("body").innerText();
  report.edgeViews.push({
    name,
    storyId,
    expectedText,
    screenshot,
    passed: text.includes(expectedText) &&
      !text.includes("Couldn't find story"),
  });
  await page.close();
}

await browser.close();
await writeFile(
  `${outputRoot}/report.json`,
  `${JSON.stringify(report, null, 2)}\n`,
);
const failures = [
  ...report.affectedViews.filter((view) => view.p0p1.length),
  ...report.edgeViews.filter((view) => !view.passed),
];
console.log(
  `Reran ${report.affectedViews.length} affected views and ${report.edgeViews.length} edge views.`,
);
if (failures.length) {
  console.error(
    `Correction review found ${failures.length} unresolved P0/P1 findings.`,
  );
  process.exitCode = 1;
}
