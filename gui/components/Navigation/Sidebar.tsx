"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { Icon, type IconName } from "../Icon/Icon";
import { navigationItemIsActive, PRODUCT_NAVIGATION } from "./navigation-model";

export interface NavGroup {
  title: string;
  items: {
    label: string;
    href: string;
    icon?: IconName;
    badge?: string;
  }[];
}

export interface SidebarProps {
  groups?: NavGroup[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const defaultNavGroups: NavGroup[] = [
  {
    title: "Workspace",
    items: PRODUCT_NAVIGATION.map((item) => ({ ...item })),
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  groups = defaultNavGroups,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();

  return (
    <>
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-ink-black/35 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        aria-label="Main navigation"
        data-collapsed={isCollapsed}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-dust-taupe/60 bg-lifted-cream text-ink-black transition-[width,transform] duration-200 ${
          isCollapsed ? "w-20" : "w-64"
        } ${isMobileOpen ? "translate-x-0" : "max-md:-translate-x-full"}`}
      >
        <div className="flex h-[72px] items-center justify-between border-b border-dust-taupe/60 px-5">
          <Link
            href="/"
            aria-label="M&Ai dashboard"
            className="flex min-w-0 items-center gap-3"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink-black text-sm font-bold text-canvas-cream">
              M&A
            </span>
            {!isCollapsed && (
              <span className="truncate text-lg font-bold tracking-[-0.03em]">
                M&Ai
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden h-11 w-11 place-items-center rounded-full text-slate-gray hover:bg-canvas-cream hover:text-ink-black md:grid"
          >
            <Icon
              name={isCollapsed ? "chevronRight" : "chevronDown"}
              size="sm"
              className={!isCollapsed ? "rotate-90" : ""}
            />
          </button>
        </div>

        <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
          {groups.map((group) => (
            <div key={group.title}>
              {!isCollapsed && (
                <p className="mb-2 px-3 font-label text-[10px] font-bold uppercase tracking-[0.16em] text-slate-gray">
                  {group.title}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = navigationItemIsActive(pathname, item.href);
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      title={isCollapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      onClick={onCloseMobile}
                      className={`flex min-h-11 items-center gap-3 rounded-full px-3 text-sm font-semibold transition-colors ${
                        active
                          ? "bg-ink-black text-canvas-cream"
                          : "text-slate-gray hover:bg-canvas-cream hover:text-ink-black"
                      } ${isCollapsed ? "justify-center" : ""}`}
                    >
                      <Icon
                        name={item.icon ?? "info"}
                        size="md"
                        className="shrink-0"
                      />
                      {!isCollapsed && (
                        <span className="min-w-0 flex-1 truncate">
                          {item.label}
                        </span>
                      )}
                      {!isCollapsed && item.badge && (
                        <span className="font-label text-xs">{item.badge}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export { defaultNavGroups };
