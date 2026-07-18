import React from "react";
import Link from "next/link";
import { CountrySelector, CountryOption } from "../CountrySelector/CountrySelector";

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
    <footer className={`bg-ink-black text-canvas-cream border-t border-dust-taupe/20 pt-12 pb-8 px-6 md:px-12 select-none ${className}`}>
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12 text-left">
        {/* Col 1: Brand & System Specs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-signal-orange"></span>
            <span className="font-bold text-xl tracking-tight text-white">
              M&Ai Fintech
            </span>
          </div>
          <p className="text-xs text-dust-taupe leading-relaxed">
            Middleware inteligente de M&A low-touch orquestrado por ecossistema agêntico Deno + ADK e motor neural ONNX.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[10px] font-mono text-canvas-cream">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
            v1.0.0 (Deno Runtime)
          </div>
        </div>

        {/* Col 2: Soluções M&A */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-widest">
            Soluções M&A
          </h4>
          <ul className="space-y-2 text-xs text-dust-taupe">
            <li>
              <Link href="/#sourcing" className="hover:text-white transition-colors">
                Sourcing & Validação Receita/KYB
              </Link>
            </li>
            <li>
              <Link href="/#dd" className="hover:text-white transition-colors">
                Due Diligence Financeira (Altman Z-Score)
              </Link>
            </li>
            <li>
              <Link href="/#legal" className="hover:text-white transition-colors">
                Auditoria Legal & Contracts RAG
              </Link>
            </li>
            <li>
              <Link href="/#negotiation" className="hover:text-white transition-colors">
                Mesa de Negociação (Algoritmo Genético)
              </Link>
            </li>
            <li>
              <Link href="/#closing" className="hover:text-white transition-colors">
                Closing Automático & Term Sheet PDF
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Recursos & Tecnologia */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-widest">
            Recursos & Docs
          </h4>
          <ul className="space-y-2 text-xs text-dust-taupe">
            <li>
              <Link href="/docs/api" className="hover:text-white transition-colors">
                Documentação da Core API
              </Link>
            </li>
            <li>
              <Link href="/docs/adk" className="hover:text-white transition-colors">
                ADK Agent Framework TypeScript
              </Link>
            </li>
            <li>
              <Link href="/docs/onnx" className="hover:text-white transition-colors">
                Google Colab ONNX Model Training
              </Link>
            </li>
            <li>
              <Link href="/docs/security" className="hover:text-white transition-colors">
                Segurança Fiduciária & Silos VDR
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 4: Institucional */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-widest">
            Governança & Suporte
          </h4>
          <p className="text-xs text-dust-taupe">
            Projetado de acordo com as diretrizes de conformidade bancária e privacidade LGPD/GDPR.
          </p>
          <div className="pt-2">
            <span className="text-[11px] font-bold text-signal-orange uppercase tracking-wider block mb-1">
              Jurisdição & Moeda
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
      <div className="max-w-7xl mx-auto pt-6 border-t border-dust-taupe/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-dust-taupe/70">
        <div>
          M&Ai Fintech Inc. © {new Date().getFullYear()} — Todos os direitos reservados.
        </div>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="hover:text-white transition-colors">
            Política de Privacidade
          </Link>
          <Link href="/terms" className="hover:text-white transition-colors">
            Termos de Uso Fiduciário
          </Link>
          <Link href="/compliance" className="hover:text-white transition-colors">
            Compliance Banco Central
          </Link>
        </div>
      </div>
    </footer>
  );
};
