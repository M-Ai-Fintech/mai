"use client";

import Link from "next/link";
import React from "react";
import { Avatar } from "../Avatar/Avatar";
import { Badge } from "../Badge/Badge";
import { CountrySelector } from "../CountrySelector/CountrySelector";

export type Pov = "Institution" | "Banker" | "Client";

export interface TopBarProps {
  breadcrumbs?: { label: string; href?: string }[];
  currentPov?: Pov;
  onPovChange?: (pov: Pov) => void;
  onToggleMobileMenu?: () => void;
}

const povOptions: Pov[] = ["Banker", "Institution", "Client"];

export const TopBar: React.FC<TopBarProps> = ({
  breadcrumbs = [{ label: "Home", href: "/" }, { label: "Dashboard" }],
  currentPov = "Banker",
  onPovChange,
  onToggleMobileMenu,
}) => {
  return (
    <header className="sticky top-0 z-40 flex h-[72px] w-full items-center justify-between border-b border-dust-taupe/60 bg-white/95 px-5 backdrop-blur-md lg:px-8">
      <TopBarNavigation
        breadcrumbs={breadcrumbs}
        onToggleMobileMenu={onToggleMobileMenu}
      />
      <TopBarActions currentPov={currentPov} onPovChange={onPovChange} />
    </header>
  );
};

function TopBarNavigation({
  breadcrumbs,
  onToggleMobileMenu,
}: Pick<TopBarProps, "breadcrumbs" | "onToggleMobileMenu">) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <button
        type="button"
        onClick={onToggleMobileMenu}
        className="grid h-10 w-10 place-items-center rounded-full hover:bg-canvas-cream md:hidden"
        aria-label="Open mobile menu"
      >
        <span className="font-label text-xs font-bold">Menu</span>
      </button>
      <BreadcrumbTrail breadcrumbs={breadcrumbs ?? []} />
    </div>
  );
}

function BreadcrumbTrail(
  { breadcrumbs }: { breadcrumbs: NonNullable<TopBarProps["breadcrumbs"]> },
) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 items-center gap-2 font-label text-xs text-slate-gray"
    >
      {breadcrumbs.map((crumb, index) => (
        <BreadcrumbItem
          crumb={crumb}
          index={index}
          key={crumbKey(crumb, index)}
        />
      ))}
    </nav>
  );
}

interface BreadcrumbItemProps {
  crumb: NonNullable<TopBarProps["breadcrumbs"]>[number];
  index: number;
}

function BreadcrumbItem({ crumb, index }: BreadcrumbItemProps) {
  return (
    <React.Fragment>
      {index > 0 && <span aria-hidden="true">/</span>}
      {crumb.href
        ? (
          <Link href={crumb.href} className="truncate hover:text-ink-black">
            {crumb.label}
          </Link>
        )
        : (
          <span className="truncate font-bold text-ink-black">
            {crumb.label}
          </span>
        )}
    </React.Fragment>
  );
}

function crumbKey(
  crumb: NonNullable<TopBarProps["breadcrumbs"]>[number],
  index: number,
) {
  return `${crumb.label}-${index}`;
}

function TopBarActions({
  currentPov,
  onPovChange,
}: Pick<TopBarProps, "currentPov" | "onPovChange">) {
  return (
    <div className="flex items-center gap-2 lg:gap-3">
      <PovSelector
        currentPov={currentPov ?? "Banker"}
        onPovChange={onPovChange}
      />
      <div className="hidden xl:block">
        <CountrySelector variant="light" />
      </div>
      <div className="hidden lg:block">
        <Badge variant="outline">ONNX online</Badge>
      </div>
      <Avatar size="sm" fallback="AC" aria-label="Ana Costa" />
    </div>
  );
}

interface PovSelectorProps {
  currentPov: Pov;
  onPovChange?: (pov: Pov) => void;
}

function PovSelector({ currentPov, onPovChange }: PovSelectorProps) {
  return (
    <div
      aria-label="Point of view"
      className="hidden rounded-full bg-canvas-cream p-1 sm:flex"
    >
      {povOptions.map((pov) => (
        <PovButton
          currentPov={currentPov}
          key={pov}
          onPovChange={onPovChange}
          pov={pov}
        />
      ))}
    </div>
  );
}

interface PovButtonProps {
  currentPov: Pov;
  onPovChange?: (pov: Pov) => void;
  pov: Pov;
}

function PovButton({ currentPov, onPovChange, pov }: PovButtonProps) {
  const active = currentPov === pov;
  const activeStyles = active
    ? "bg-ink-black text-canvas-cream"
    : "text-slate-gray hover:text-ink-black";
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onPovChange?.(pov)}
      className={`min-h-11 rounded-full px-3 font-label text-xs font-bold transition-colors ${activeStyles}`}
    >
      {pov}
    </button>
  );
}
