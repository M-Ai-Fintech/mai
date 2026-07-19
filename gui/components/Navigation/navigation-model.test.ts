import { describe, expect, it } from "vitest";
import {
  breadcrumbsForPath,
  navigationItemIsActive,
  PRODUCT_NAVIGATION,
} from "./navigation-model";

describe("shared navigation model", () => {
  it("uses the exact approved six-item product navigation", () => {
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
  });

  it("derives the same shell breadcrumbs for each prototype family", () => {
    expect(breadcrumbsForPath("/").at(-1)?.label).toBe("Dashboard");
    expect(breadcrumbsForPath("/clients").at(-1)?.label).toBe("Portfolio & Clients");
    expect(breadcrumbsForPath("/entities").at(-1)?.label).toBe("Portfolio & Clients");
    expect(breadcrumbsForPath("/dashboard/custom").at(-1)?.label).toBe("Custom dashboard");
    expect(breadcrumbsForPath("/deals/deal-1/chat").at(-1)?.label).toBe("Agentic Workspace");
  });

  it("keeps root exact while supporting route-family active navigation", () => {
    expect(navigationItemIsActive("/", "/")).toBe(true);
    expect(navigationItemIsActive("/clients", "/")).toBe(false);
    expect(navigationItemIsActive("/clients/one", "/clients")).toBe(true);
    expect(navigationItemIsActive("/deals/deal-1", "/deals")).toBe(true);
    expect(navigationItemIsActive("/deals/deal-1/chat", "/deals")).toBe(false);
    expect(navigationItemIsActive("/deals/deal-1/chat", "/deals/example/chat")).toBe(true);
  });
});
