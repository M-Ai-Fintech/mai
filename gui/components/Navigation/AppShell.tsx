"use client";

import { usePathname } from "next/navigation";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar, type Pov } from "./TopBar";
import { breadcrumbsForPath } from "./navigation-model";
import type { Breadcrumb } from "./navigation-model";

type BreadcrumbOverride = { pathname: string; breadcrumbs: Breadcrumb[] } | null;
const PageBreadcrumbsContext = createContext<((breadcrumbs: Breadcrumb[] | null) => void) | null>(null);

export function usePageBreadcrumbs(breadcrumbs: Breadcrumb[] | null) {
  const pathname = usePathname();
  const setOverride = useContext(PageBreadcrumbsContext);
  useEffect(() => {
    if (!setOverride) return;
    setOverride(breadcrumbs);
    return () => setOverride(null);
  }, [breadcrumbs, pathname, setOverride]);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pov, setPov] = useState<Pov>("Banker");
  const [breadcrumbOverride, setBreadcrumbOverride] = useState<BreadcrumbOverride>(null);
  const setPageBreadcrumbs = useMemo(() => (next: Breadcrumb[] | null) => {
    setBreadcrumbOverride(next ? { pathname, breadcrumbs: next } : null);
  }, [pathname]);
  const breadcrumbs = useMemo(
    () => breadcrumbOverride?.pathname === pathname ? breadcrumbOverride.breadcrumbs : breadcrumbsForPath(pathname),
    [breadcrumbOverride, pathname],
  );

  return (
    <PageBreadcrumbsContext.Provider value={setPageBreadcrumbs}>
    <div className="h-screen overflow-hidden bg-canvas-cream">
      <Sidebar
        isCollapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        isMobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className={`flex h-screen flex-col overflow-hidden transition-[margin] duration-200 ${collapsed ? "md:ml-20" : "md:ml-64"}`}>
        <TopBar
          breadcrumbs={breadcrumbs}
          currentPov={pov}
          onPovChange={setPov}
          onToggleMobileMenu={() => setMobileOpen(true)}
        />
        <main id="main-content" className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-canvas-cream">
          {children}
        </main>
      </div>
    </div>
    </PageBreadcrumbsContext.Provider>
  );
}
