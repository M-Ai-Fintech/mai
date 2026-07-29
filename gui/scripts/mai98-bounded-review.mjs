import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const cases = [
  { name: "global-desktop", id: "shell-appshell--global-desktop", width: 1440, height: 900, mode: "global" },
  { name: "deal-desktop", id: "shell-appshell--deal-desktop", width: 1440, height: 900, mode: "deal" },
  { name: "administration-desktop", id: "shell-appshell--administration-desktop", width: 1440, height: 900, mode: "administration" },
  { name: "external-desktop", id: "shell-appshell--external-participant", width: 1440, height: 900, mode: "external" },
  { name: "deal-tablet", id: "shell-appshell--deal-desktop", width: 1024, height: 900, mode: "deal" },
  { name: "long-tablet", id: "shell-appshell--long-names-and-count-overflow", width: 1024, height: 900, mode: "deal" },
  { name: "deal-mobile", id: "shell-appshell--deal-mobile", width: 390, height: 844, mode: "deal" },
  { name: "long-mobile", id: "shell-appshell--long-names-and-count-overflow", width: 390, height: 844, mode: "deal" },
  { name: "restricted-mobile", id: "shell-appshell--restricted-state", width: 390, height: 844 },
  { name: "invalid-mobile", id: "shell-appshell--invalid-context", width: 390, height: 844 },
  { name: "unavailable-mobile", id: "shell-appshell--unavailable-state", width: 390, height: 844 },
  { name: "drawer-mobile-open", id: "shell-appshell--deal-mobile", width: 390, height: 844, mode: "deal", openDrawer: true },
];

await mkdir("visual-review", { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];
let failed = false;

for (const item of cases) {
  const page = await browser.newPage({ viewport: { width: item.width, height: item.height } });
  const url = `http://127.0.0.1:6006/iframe.html?id=${item.id}&viewMode=story`;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator("#storybook-root").waitFor({ state: "visible" });
  if (item.openDrawer) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("dialog").waitFor({ state: "visible" });
  }

  const metrics = await page.evaluate((expectedMode) => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    };
    const interactive = [...document.querySelectorAll("a[href], button, input, select, textarea, [role='button']")]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 80) || element.tagName,
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
        };
      });
    const clipped = [...document.querySelectorAll("#storybook-root *")]
      .filter(visible)
      .filter((element) => {
        const style = getComputedStyle(element);
        const hides = ["hidden", "clip"].includes(style.overflowX) || ["hidden", "clip"].includes(style.overflowY);
        return hides && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1);
      })
      .map((element) => ({
        tag: element.tagName,
        className: String(element.className).slice(0, 120),
        text: element.textContent?.trim().slice(0, 100),
      }));
    const shell = document.querySelector("[data-shell-mode]");
    const currentBreadcrumb = document.querySelector('[aria-label="Breadcrumb"] [aria-current="page"]');
    return {
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      smallTargets: interactive.filter((target) => target.width < 44 || target.height < 44),
      clipped,
      actualMode: shell?.getAttribute("data-shell-mode"),
      expectedMode,
      currentBreadcrumb: currentBreadcrumb?.textContent?.trim() ?? null,
      bodyText: document.body.innerText.slice(0, 500),
    };
  }, item.mode ?? null);

  if (
    metrics.pageOverflow ||
    metrics.smallTargets.length ||
    metrics.clipped.length ||
    (item.mode && metrics.actualMode !== item.mode) ||
    (item.mode && !metrics.currentBreadcrumb)
  ) {
    failed = true;
  }
  await page.screenshot({ path: `visual-review/${item.name}.png`, fullPage: true });
  report.push({ ...item, url, metrics });
  await page.close();
}

await browser.close();
await writeFile("visual-review/report.json", JSON.stringify(report, null, 2));
if (failed) process.exitCode = 1;
