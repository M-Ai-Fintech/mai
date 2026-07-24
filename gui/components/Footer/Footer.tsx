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

export const Footer: React.FC<FooterProps> = ({
  currentCountry = "BR",
  onCountryChange,
  className = "",
}) => {
  return (
    <footer
      className={`bg-ink-black text-canvas-cream border-t border-dust-taupe/20 pt-12 pb-8 px-6 md:px-12 select-none ${className}`}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12 text-left">
        {/* Col 1: Brand & System Specs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-signal-orange"></span>
            <span className="font-bold text-xl tracking-tight text-white">
              M&Ai Fintech
            </span>
          </div>
          <p className="text-xs text-canvas-cream/80 leading-relaxed">
            Intelligent low-touch M&A middleware orchestrated by Deno + ADK
            agentic ecosystem and ONNX neural engine.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[10px] font-mono text-canvas-cream">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse">
            </span>
            v1.0.0 (Deno Runtime)
          </div>
        </div>

        {/* Col 2: M&A Solutions */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-widest">
            M&A Solutions
          </h4>
          <ul className="space-y-2 text-xs text-canvas-cream/80">
            <li>
              <Link
                href="/#sourcing"
                className="hover:text-white transition-colors"
              >
                Sourcing & Revenue/KYB Validation
              </Link>
            </li>
            <li>
              <Link href="/#dd" className="hover:text-white transition-colors">
                Financial Due Diligence (Altman Z-Score)
              </Link>
            </li>
            <li>
              <Link
                href="/#legal"
                className="hover:text-white transition-colors"
              >
                Legal Audit & Contracts RAG
              </Link>
            </li>
            <li>
              <Link
                href="/#negotiation"
                className="hover:text-white transition-colors"
              >
                Negotiation Table (Genetic Algorithm)
              </Link>
            </li>
            <li>
              <Link
                href="/#closing"
                className="hover:text-white transition-colors"
              >
                Automatic Closing & Term Sheet PDF
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Resources & Tech */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-widest">
            Resources & Docs
          </h4>
          <ul className="space-y-2 text-xs text-canvas-cream/80">
            <li>
              <Link
                href="/docs/api"
                className="hover:text-white transition-colors"
              >
                Core API Documentation
              </Link>
            </li>
            <li>
              <Link
                href="/docs/adk"
                className="hover:text-white transition-colors"
              >
                ADK Agent Framework TypeScript
              </Link>
            </li>
            <li>
              <Link
                href="/docs/onnx"
                className="hover:text-white transition-colors"
              >
                Google Colab ONNX Model Training
              </Link>
            </li>
            <li>
              <Link
                href="/docs/security"
                className="hover:text-white transition-colors"
              >
                Fiduciary Security & VDR Silos
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 4: Institutional */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-widest">
            Governance & Support
          </h4>
          <p className="text-xs text-canvas-cream/80">
            Designed in accordance with banking compliance guidelines and
            LGPD/GDPR privacy.
          </p>
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
        </div>
      </div>

      {/* Bottom Utility Bar */}
      <div className="max-w-7xl mx-auto pt-6 border-t border-dust-taupe/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-canvas-cream/70">
        <div>
          M&Ai Fintech Inc. © {new Date().getFullYear()} — All rights reserved.
        </div>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-white transition-colors">
            Fiduciary Terms of Use
          </Link>
          <Link
            href="/compliance"
            className="hover:text-white transition-colors"
          >
            Central Bank Compliance
          </Link>
        </div>
      </div>
    </footer>
  );
};
