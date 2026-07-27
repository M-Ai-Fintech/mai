export interface Breadcrumb {
  label: string;
  href?: string;
}

export const PRODUCT_NAVIGATION = [
  { label: "Dashboard", href: "/", icon: "info" },
  { label: "Deals", href: "/deals", icon: "arrowRight" },
  { label: "Entities", href: "/entities", icon: "user" },
  {
    label: "Agentic Workspace",
    href: "/deals/00000000-0000-4000-8000-000000000001/chat",
    icon: "fileText",
  },
  { label: "Custom Dashboard", href: "/dashboard/custom", icon: "settings" },
  { label: "Settings", href: "/settings", icon: "settings" },
] as const;

const HOME_BREADCRUMB: Breadcrumb = { label: "Home", href: "/" };
const BREADCRUMBS_BY_PATH: Record<string, Breadcrumb[]> = {
  "/": [HOME_BREADCRUMB, { label: "Dashboard" }],
  "/clients": [HOME_BREADCRUMB, {
    label: "Portfolio & Clients",
    href: "/entities",
  }],
  "/deals": [HOME_BREADCRUMB, { label: "Deals" }],
  "/entities": [HOME_BREADCRUMB, { label: "Portfolio & Clients" }],
  "/dashboard/custom": [HOME_BREADCRUMB, { label: "Custom dashboard" }],
  "/settings": [HOME_BREADCRUMB, { label: "Settings" }],
};

export function breadcrumbsForPath(pathname: string): Breadcrumb[] {
  const exactMatch = BREADCRUMBS_BY_PATH[pathname];
  if (exactMatch) return exactMatch;
  if (pathname.startsWith("/entities/")) {
    return [HOME_BREADCRUMB, {
      label: "Entities",
      href: "/entities",
    }, { label: "Entity detail" }];
  }
  if (pathname.endsWith("/chat")) {
    return chatBreadcrumbs(pathname);
  }
  if (pathname.includes("/engines")) {
    return [{ label: "Deals", href: "/" }, { label: "Engine analytics" }];
  }
  if (pathname.startsWith("/deals/")) {
    return [{ label: "Deals", href: "/deals" }, { label: "Project Horizon" }];
  }
  return [HOME_BREADCRUMB, { label: "Workspace" }];
}

function chatBreadcrumbs(pathname: string): Breadcrumb[] {
  return [
    { label: "Deals", href: "/" },
    { label: "Project Horizon", href: pathname.replace(/\/chat$/, "") },
    { label: "Agentic Workspace" },
  ];
}

export function navigationItemIsActive(pathname: string | null, href: string) {
  if (!pathname) return false;

  const path = href.split("#")[0];
  if (href === "/") return pathname === "/";
  if (href === "/deals") {
    return pathname === "/deals" || /^\/deals\/[^/]+$/.test(pathname);
  }
  if (href.includes("/deals/") && href.endsWith("/chat")) {
    return pathname.endsWith("/chat");
  }
  return path.length > 1 && pathname.startsWith(path);
}
