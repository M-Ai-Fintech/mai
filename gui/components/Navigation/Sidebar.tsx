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
    <SidebarView
      groups={groups}
      isCollapsed={isCollapsed}
      isMobileOpen={isMobileOpen}
      onCloseMobile={onCloseMobile}
      onToggleCollapse={onToggleCollapse}
      pathname={pathname}
    />
  );
};

type SidebarViewProps =
  & Required<Pick<SidebarProps, "groups" | "isCollapsed" | "isMobileOpen">>
  & Pick<SidebarProps, "onCloseMobile" | "onToggleCollapse">
  & { pathname: string | null };

function SidebarView(props: SidebarViewProps) {
  return (
    <>
      <MobileSidebarScrim
        isOpen={props.isMobileOpen}
        onClose={props.onCloseMobile}
      />
      <SidebarFrame
        isCollapsed={props.isCollapsed}
        isMobileOpen={props.isMobileOpen}
      >
        <SidebarHeader
          isCollapsed={props.isCollapsed}
          onToggleCollapse={props.onToggleCollapse}
        />
        <SidebarNav {...props} />
      </SidebarFrame>
    </>
  );
}

export { defaultNavGroups };

function MobileSidebarScrim({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose?: () => void;
}) {
  if (!isOpen) return null;
  return (
    <button
      type="button"
      aria-label="Close navigation"
      className="fixed inset-0 z-40 bg-ink-black/35 backdrop-blur-sm md:hidden"
      onClick={onClose}
    />
  );
}

interface SidebarFrameProps {
  children: React.ReactNode;
  isCollapsed: boolean;
  isMobileOpen: boolean;
}

function SidebarFrame(props: SidebarFrameProps) {
  const width = props.isCollapsed ? "w-20" : "w-64";
  const mobile = props.isMobileOpen
    ? "translate-x-0"
    : "max-md:-translate-x-full";
  return (
    <aside
      aria-label="Main navigation"
      data-collapsed={props.isCollapsed}
      className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-dust-taupe/60 bg-lifted-cream text-ink-black transition-[width,transform] duration-200 ${width} ${mobile}`}
    >
      {props.children}
    </aside>
  );
}

function SidebarHeader({
  isCollapsed,
  onToggleCollapse,
}: Pick<SidebarProps, "isCollapsed" | "onToggleCollapse">) {
  return (
    <div className="flex h-[72px] items-center justify-between border-b border-dust-taupe/60 px-5">
      <SidebarLogo isCollapsed={isCollapsed ?? false} />
      <SidebarCollapseButton
        isCollapsed={isCollapsed ?? false}
        onToggleCollapse={onToggleCollapse}
      />
    </div>
  );
}

function SidebarLogo({ isCollapsed }: { isCollapsed: boolean }) {
  return (
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
  );
}

function SidebarCollapseButton({
  isCollapsed,
  onToggleCollapse,
}: {
  isCollapsed: boolean;
  onToggleCollapse?: () => void;
}) {
  const iconName = isCollapsed ? "chevronRight" : "chevronDown";
  const iconClass = !isCollapsed ? "rotate-90" : "";
  return (
    <button
      type="button"
      onClick={onToggleCollapse}
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="hidden h-11 w-11 place-items-center rounded-full text-slate-gray hover:bg-canvas-cream hover:text-ink-black md:grid"
    >
      <Icon name={iconName} size="sm" className={iconClass} />
    </button>
  );
}

function SidebarNav({
  groups,
  isCollapsed,
  onCloseMobile,
  pathname,
}: SidebarProps & { pathname: string | null }) {
  return (
    <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
      {groups?.map((group) => (
        <SidebarNavGroup
          group={group}
          isCollapsed={isCollapsed ?? false}
          key={group.title}
          onCloseMobile={onCloseMobile}
          pathname={pathname}
        />
      ))}
    </nav>
  );
}

interface SidebarNavGroupProps {
  group: NavGroup;
  isCollapsed: boolean;
  onCloseMobile?: () => void;
  pathname: string | null;
}

function SidebarNavGroup(props: SidebarNavGroupProps) {
  return (
    <div>
      {!props.isCollapsed && <SidebarGroupTitle title={props.group.title} />}
      <SidebarGroupItems {...props} />
    </div>
  );
}

function SidebarGroupItems(props: SidebarNavGroupProps) {
  return (
    <div className="space-y-1">
      {props.group.items.map((item) => (
        <SidebarNavItem
          isCollapsed={props.isCollapsed}
          item={item}
          key={item.label}
          onCloseMobile={props.onCloseMobile}
          pathname={props.pathname}
        />
      ))}
    </div>
  );
}

function SidebarGroupTitle({ title }: { title: string }) {
  return (
    <p className="mb-2 px-3 font-label text-[10px] font-bold uppercase tracking-[0.16em] text-slate-gray">
      {title}
    </p>
  );
}

interface SidebarNavItemProps {
  isCollapsed: boolean;
  item: NavGroup["items"][number];
  onCloseMobile?: () => void;
  pathname: string | null;
}

function SidebarNavItem(props: SidebarNavItemProps) {
  const active = navigationItemIsActive(props.pathname, props.item.href);
  return (
    <Link
      key={props.item.label}
      href={props.item.href}
      title={props.isCollapsed ? props.item.label : undefined}
      aria-current={active ? "page" : undefined}
      onClick={props.onCloseMobile}
      className={sidebarItemClass(active, props.isCollapsed)}
    >
      <Icon name={props.item.icon ?? "info"} size="md" className="shrink-0" />
      {!props.isCollapsed && <SidebarItemText item={props.item} />}
    </Link>
  );
}

function sidebarItemClass(active: boolean, isCollapsed: boolean) {
  const color = active
    ? "bg-ink-black text-canvas-cream"
    : "text-slate-gray hover:bg-canvas-cream hover:text-ink-black";
  return `flex min-h-11 items-center gap-3 rounded-full px-3 text-sm font-semibold transition-colors ${color} ${
    isCollapsed ? "justify-center" : ""
  }`;
}

function SidebarItemText({ item }: { item: NavGroup["items"][number] }) {
  return (
    <>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge && <span className="font-label text-xs">{item.badge}</span>}
    </>
  );
}
