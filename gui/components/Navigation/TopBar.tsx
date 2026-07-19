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
}) => (
  <header className="sticky top-0 z-40 flex h-[72px] w-full items-center justify-between border-b border-dust-taupe/60 bg-white/95 px-5 backdrop-blur-md lg:px-8">
    <div className="flex min-w-0 items-center gap-3">
      <button
        type="button"
        onClick={onToggleMobileMenu}
        className="grid h-10 w-10 place-items-center rounded-full hover:bg-canvas-cream md:hidden"
        aria-label="Open mobile menu"
      >
        <span className="font-label text-xs font-bold">Menu</span>
      </button>
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 font-label text-xs text-slate-gray">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={`${crumb.label}-${index}`}>
            {index > 0 && <span aria-hidden="true">/</span>}
            {crumb.href ? (
              <Link href={crumb.href} className="truncate hover:text-ink-black">{crumb.label}</Link>
            ) : (
              <span className="truncate font-bold text-ink-black">{crumb.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>
    </div>

    <div className="flex items-center gap-2 lg:gap-3">
      <div aria-label="Point of view" className="hidden rounded-full bg-canvas-cream p-1 sm:flex">
        {povOptions.map((pov) => (
          <button
            type="button"
            key={pov}
            aria-pressed={currentPov === pov}
            onClick={() => onPovChange?.(pov)}
            className={`min-h-11 rounded-full px-3 font-label text-xs font-bold transition-colors ${
              currentPov === pov ? "bg-ink-black text-canvas-cream" : "text-slate-gray hover:text-ink-black"
            }`}
          >
            {pov}
          </button>
        ))}
      </div>
      <div className="hidden xl:block"><CountrySelector variant="light" /></div>
      <div className="hidden lg:block"><Badge variant="outline">ONNX online</Badge></div>
      <Avatar size="sm" fallback="AC" aria-label="Ana Costa" />
    </div>
  </header>
);
