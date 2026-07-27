import React from "react";
import Link from "next/link";
import {
  CountryOption,
  CountrySelector,
} from "../CountrySelector/CountrySelector";

export interface FooterProps {
  currentCountry?: "BR" | "ES" | "US";
  onCountryChange?: (country: CountryOption) => void;
  className?: string;
}

const SOLUTION_LINKS = [
  { href: "/#sourcing", label: "Sourcing & Revenue/KYB Validation" },
  { href: "/#dd", label: "Financial Due Diligence (Altman Z-Score)" },
  { href: "/#legal", label: "Legal Audit & Contracts RAG" },
  { href: "/#negotiation", label: "Negotiation Table (Genetic Algorithm)" },
  { href: "/#closing", label: "Automatic Closing & Term Sheet PDF" },
] as const;

const RESOURCE_LINKS = [
  { href: "/docs/api", label: "Core API Documentation" },
  { href: "/docs/adk", label: "ADK Agent Framework TypeScript" },
  { href: "/docs/onnx", label: "Google Colab ONNX Model Training" },
  { href: "/docs/security", label: "Fiduciary Security & VDR Silos" },
] as const;

const UTILITY_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Fiduciary Terms of Use" },
  { href: "/compliance", label: "Central Bank Compliance" },
] as const;

export const Footer: React.FC<FooterProps> = (props) => {
  return (
    <footer
      className={`bg-ink-black text-canvas-cream border-t border-dust-taupe/20 pt-12 pb-8 px-6 md:px-12 select-none ${
        props.className ?? ""
      }`}
    >
      <FooterColumns {...props} />
      <FooterUtilityBar />
    </footer>
  );
};

function FooterColumns(props: FooterProps) {
  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12 text-left">
      <FooterBrandColumn />
      <FooterLinkColumn links={SOLUTION_LINKS} title="M&A Solutions" />
      <FooterLinkColumn links={RESOURCE_LINKS} title="Resources & Docs" />
      <FooterGovernanceColumn
        currentCountry={props.currentCountry ?? "BR"}
        onCountryChange={props.onCountryChange}
      />
    </div>
  );
}

function FooterBrandColumn() {
  return (
    <div className="space-y-4">
      <FooterBrandMark />
      <p className="text-xs text-canvas-cream/80 leading-relaxed">
        Intelligent low-touch M&A middleware orchestrated by Deno + ADK agentic
        ecosystem and ONNX neural engine.
      </p>
      <FooterRuntimeBadge />
    </div>
  );
}

function FooterBrandMark() {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3.5 h-3.5 rounded-full bg-signal-orange"></span>
      <span className="font-bold text-xl tracking-tight text-white">
        M&Ai Fintech
      </span>
    </div>
  );
}

function FooterRuntimeBadge() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[10px] font-mono text-canvas-cream">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse">
      </span>
      v1.0.0 (Deno Runtime)
    </div>
  );
}

function FooterLinkColumn({
  links,
  title,
}: {
  links: readonly { href: string; label: string }[];
  title: string;
}) {
  return (
    <div className="space-y-3">
      <FooterColumnTitle>{title}</FooterColumnTitle>
      <ul className="space-y-2 text-xs text-canvas-cream/80">
        {links.map((link) => (
          <li key={link.href}>
            <FooterLink href={link.href}>{link.label}</FooterLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterColumnTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-bold text-white uppercase tracking-widest">
      {children}
    </h4>
  );
}

function FooterLink({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link href={href} className="hover:text-white transition-colors">
      {children}
    </Link>
  );
}

function FooterGovernanceColumn({
  currentCountry,
  onCountryChange,
}:
  & Required<Pick<FooterProps, "currentCountry">>
  & Pick<FooterProps, "onCountryChange">) {
  return (
    <div className="space-y-3">
      <FooterColumnTitle>Governance & Support</FooterColumnTitle>
      <p className="text-xs text-canvas-cream/80">
        Designed in accordance with banking compliance guidelines and LGPD/GDPR
        privacy.
      </p>
      <FooterCountrySelector
        currentCountry={currentCountry}
        onCountryChange={onCountryChange}
      />
    </div>
  );
}

function FooterCountrySelector({
  currentCountry,
  onCountryChange,
}:
  & Required<Pick<FooterProps, "currentCountry">>
  & Pick<FooterProps, "onCountryChange">) {
  return (
    <div className="pt-2">
      <span className="text-[11px] font-bold text-signal-orange uppercase tracking-wider block mb-1">
        Jurisdiction & Currency
      </span>
      <CountrySelector
        selectedCountry={currentCountry}
        onChange={onCountryChange}
        variant="dark"
      />
    </div>
  );
}

function FooterUtilityBar() {
  return (
    <div className="max-w-7xl mx-auto pt-6 border-t border-dust-taupe/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-canvas-cream/70">
      <div>
        M&Ai Fintech Inc. © {new Date().getFullYear()} — All rights reserved.
      </div>
      <div className="flex items-center gap-6">
        {UTILITY_LINKS.map((link) => (
          <FooterLink href={link.href} key={link.href}>{link.label}</FooterLink>
        ))}
      </div>
    </div>
  );
}
