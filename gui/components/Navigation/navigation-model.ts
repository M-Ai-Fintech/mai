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

export function breadcrumbsForPath(pathname: string): Breadcrumb[] {
  if (pathname === "/") return [{ label: "Home", href: "/" }, { label: "Dashboard" }];
  if (pathname === "/clients") return [{ label: "Home", href: "/" }, { label: "Portfolio & Clients", href: "/entities" }];
  if (pathname === "/deals") return [{ label: "Home", href: "/" }, { label: "Deals" }];
  if (pathname === "/entities") return [{ label: "Home", href: "/" }, { label: "Portfolio & Clients" }];
  if (pathname.startsWith("/entities/")) return [{ label: "Home", href: "/" }, { label: "Entities", href: "/entities" }, { label: "Entity detail" }];
  if (pathname === "/dashboard/custom") return [{ label: "Home", href: "/" }, { label: "Custom dashboard" }];
  if (pathname.endsWith("/chat")) return [
    { label: "Deals", href: "/" },
    { label: "Project Horizon", href: pathname.replace(/\/chat$/, "") },
    { label: "Agentic Workspace" },
  ];
  if (pathname.includes("/engines")) return [{ label: "Deals", href: "/" }, { label: "Engine analytics" }];
  if (pathname.startsWith("/deals/")) return [{ label: "Deals", href: "/deals" }, { label: "Project Horizon" }];
  if (pathname === "/settings") return [{ label: "Home", href: "/" }, { label: "Settings" }];
  return [{ label: "Home", href: "/" }, { label: "Workspace" }];
}

export function navigationItemIsActive(pathname: string, href: string) {
  const path = href.split("#")[0];
  if (href === "/") return pathname === "/";
  if (href === "/deals") return pathname === "/deals" || /^\/deals\/[^/]+$/.test(pathname);
  if (href.includes("/deals/") && href.endsWith("/chat")) return pathname.endsWith("/chat");
  return path.length > 1 && pathname.startsWith(path);
}
