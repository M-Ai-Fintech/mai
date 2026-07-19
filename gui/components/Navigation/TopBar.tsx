import React from "react";
import Link from "next/link";
import { Avatar } from "../Avatar/Avatar";
import { Badge } from "../Badge/Badge";
import { CountrySelector } from "../CountrySelector/CountrySelector";

export interface TopBarProps {
  breadcrumbs?: { label: string; href?: string }[];
  currentPov?: "Institution" | "Banker" | "Client";
  onPovChange?: (pov: "Institution" | "Banker" | "Client") => void;
  onToggleMobileMenu?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  breadcrumbs = [{ label: "Workspace", href: "/" }, { label: "Transactions" }],
  currentPov = "Banker",
  onPovChange,
  onToggleMobileMenu,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-dust-taupe/40 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm text-left">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Trigger */}
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 text-ink-black rounded-lg hover:bg-canvas-cream focus:outline-none cursor-pointer"
          aria-label="Open mobile menu"
        >
          ☰
        </button>

        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold text-slate-gray">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-dust-taupe">/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-ink-black transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-ink-black font-bold truncate max-w-[120px] sm:max-w-none">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* POV Switching Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-canvas-cream px-2.5 sm:px-3 py-1.5 rounded-full border border-dust-taupe/60 text-xs">
          <span className="text-slate-gray font-semibold hidden xs:inline">POV:</span>
          <select
            aria-label="Select POV"
            value={currentPov}
            onChange={(e) => onPovChange && onPovChange(e.target.value as any)}
            className="bg-transparent text-ink-black font-bold focus:outline-none cursor-pointer text-xs"
          >
            <option value="Banker">Banker</option>
            <option value="Institution">Institution</option>
            <option value="Client">Client</option>
          </select>
        </div>

        <div className="hidden sm:inline-flex">
          <CountrySelector />
        </div>

        <div className="hidden sm:inline-flex">
          <Badge variant="orange">• ONNX ON</Badge>
        </div>

        <Avatar
          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256"
          size="sm"
        />
      </div>
    </header>
  );
};
