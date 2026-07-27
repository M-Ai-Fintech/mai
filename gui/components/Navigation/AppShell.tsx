"use client";

import { usePathname } from "next/navigation";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Sidebar } from "./Sidebar";
import { type Pov, TopBar } from "./TopBar";
import { breadcrumbsForPath } from "./navigation-model";
import type { Breadcrumb } from "./navigation-model";

type BreadcrumbOverride =
  | { pathname: string; breadcrumbs: Breadcrumb[] }
  | null;
interface ShellViewModel {
  breadcrumbs: Breadcrumb[];
  collapsed: boolean;
  closeMobile: () => void;
  mobileOpen: boolean;
  openMobile: () => void;
  pov: Pov;
  setPageBreadcrumbs: (breadcrumbs: Breadcrumb[] | null) => void;
  setPov: (pov: Pov) => void;
  toggleCollapse: () => void;
}

const PageBreadcrumbsContext = createContext<
  ((breadcrumbs: Breadcrumb[] | null) => void) | null
>(null);

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
  const shell = useAppShellViewModel();
  return <AppShellView shell={shell}>{children}</AppShellView>;
}

function useAppShellViewModel(): ShellViewModel {
  const pathname = usePathname();
  const [pov, setPov] = useState<Pov>("Banker");
  const shell = useShellNavigationState();
  const [breadcrumbOverride, setBreadcrumbOverride] = useState<
    BreadcrumbOverride
  >(null);
  const setPageBreadcrumbs = useMemo(() => (next: Breadcrumb[] | null) => {
    setBreadcrumbOverride(next ? { pathname, breadcrumbs: next } : null);
  }, [pathname]);
  const breadcrumbs = useMemo(
    () =>
      breadcrumbOverride?.pathname === pathname
        ? breadcrumbOverride.breadcrumbs
        : breadcrumbsForPath(pathname),
    [breadcrumbOverride, pathname],
  );
  return { ...shell, breadcrumbs, pov, setPageBreadcrumbs, setPov };
}

function useShellNavigationState() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return {
    collapsed,
    mobileOpen,
    toggleCollapse: () => setCollapsed((value) => !value),
    openMobile: () => setMobileOpen(true),
    closeMobile: () => setMobileOpen(false),
  };
}

interface AppShellViewProps {
  children: React.ReactNode;
  shell: ShellViewModel;
}

function AppShellView({ children, shell }: AppShellViewProps) {
  return (
    <PageBreadcrumbsContext.Provider value={shell.setPageBreadcrumbs}>
      <div className="h-screen overflow-hidden bg-canvas-cream">
        <ShellSidebar shell={shell} />
        <ShellContent collapsed={shell.collapsed}>
          <TopBar
            breadcrumbs={shell.breadcrumbs}
            currentPov={shell.pov}
            onPovChange={shell.setPov}
            onToggleMobileMenu={shell.openMobile}
          />
          <MainContent>{children}</MainContent>
        </ShellContent>
      </div>
    </PageBreadcrumbsContext.Provider>
  );
}

function ShellSidebar({ shell }: { shell: ShellViewModel }) {
  return (
    <Sidebar
      isCollapsed={shell.collapsed}
      onToggleCollapse={shell.toggleCollapse}
      isMobileOpen={shell.mobileOpen}
      onCloseMobile={shell.closeMobile}
    />
  );
}

function ShellContent(
  { collapsed, children }: { collapsed: boolean; children: React.ReactNode },
) {
  const margin = collapsed ? "md:ml-20" : "md:ml-64";
  return (
    <div
      className={`flex h-screen flex-col overflow-hidden transition-[margin] duration-200 ${margin}`}
    >
      {children}
    </div>
  );
}

function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main-content"
      className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-canvas-cream"
    >
      {children}
    </main>
  );
}
