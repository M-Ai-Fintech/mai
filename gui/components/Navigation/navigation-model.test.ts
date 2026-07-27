import { describe, expect, it } from "vitest";
import {
  breadcrumbsForPath,
  navigationItemIsActive,
  PRODUCT_NAVIGATION,
} from "./navigation-model";

function expectApprovedProductNavigation(): void {
  expect(PRODUCT_NAVIGATION.map(({ label, href }) => ({ label, href })))
    .toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Deals", href: "/deals" },
      { label: "Entities", href: "/entities" },
      {
        label: "Agentic Workspace",
        href: "/deals/00000000-0000-4000-8000-000000000001/chat",
      },
      { label: "Custom Dashboard", href: "/dashboard/custom" },
      { label: "Settings", href: "/settings" },
    ]);
}

function expectBreadcrumb(path: string, label: string): void {
  expect(breadcrumbsForPath(path).at(-1)?.label).toBe(label);
}

function expectPrototypeBreadcrumbs(): void {
  expectBreadcrumb("/", "Dashboard");
  expectBreadcrumb("/clients", "Portfolio & Clients");
  expectBreadcrumb("/entities", "Portfolio & Clients");
  expectBreadcrumb("/dashboard/custom", "Custom dashboard");
  expectBreadcrumb("/deals/deal-1/chat", "Agentic Workspace");
}

function expectActiveNavigationRules(): void {
  expect(navigationItemIsActive(null, "/")).toBe(false);
  expect(navigationItemIsActive("/", "/")).toBe(true);
  expect(navigationItemIsActive("/clients", "/")).toBe(false);
  expect(navigationItemIsActive("/clients/one", "/clients")).toBe(true);
  expect(navigationItemIsActive("/deals/deal-1", "/deals")).toBe(true);
  expect(navigationItemIsActive("/deals/deal-1/chat", "/deals")).toBe(false);
  expect(navigationItemIsActive("/deals/deal-1/chat", "/deals/example/chat"))
    .toBe(true);
}

describe("shared navigation model", () => {
  it(
    "uses the exact approved six-item product navigation",
    expectApprovedProductNavigation,
  );
  it(
    "derives the same shell breadcrumbs for each prototype family",
    expectPrototypeBreadcrumbs,
  );
  it(
    "keeps root exact while supporting route-family active navigation",
    expectActiveNavigationRules,
  );
});
