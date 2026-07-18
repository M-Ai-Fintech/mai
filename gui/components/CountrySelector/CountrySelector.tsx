import React, { useState, useRef, useEffect } from "react";
import { Icon } from "../Icon/Icon";

export type CountryCode = "BR" | "ES" | "US";

export interface CountryOption {
  code: CountryCode;
  name: string;
  currency: string;
  flagIcon: "flagBR" | "flagES" | "flagUS";
}

export const COUNTRIES: CountryOption[] = [
  { code: "BR", name: "Brasil", currency: "BRL (R$)", flagIcon: "flagBR" },
  { code: "ES", name: "España", currency: "EUR (€)", flagIcon: "flagES" },
  { code: "US", name: "United States", currency: "USD ($)", flagIcon: "flagUS" },
];

export interface CountrySelectorProps {
  selectedCountry?: CountryCode;
  onChange?: (country: CountryOption) => void;
  variant?: "dark" | "light";
  className?: string;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  selectedCountry = "BR",
  onChange,
  variant = "dark",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [current, setCurrent] = useState<CountryOption>(
    COUNTRIES.find((c) => c.code === selectedCountry) || COUNTRIES[0]
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const found = COUNTRIES.find((c) => c.code === selectedCountry);
    if (found) setCurrent(found);
  }, [selectedCountry]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: CountryOption) => {
    setCurrent(option);
    setIsOpen(false);
    if (onChange) onChange(option);
  };

  const isDark = variant === "dark";

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left select-none ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full border text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-signal-orange ${
          isDark
            ? "bg-ink-black text-canvas-cream border-dust-taupe/30 hover:border-canvas-cream/60"
            : "bg-white text-ink-black border-dust-taupe/60 hover:border-ink-black shadow-sm"
        }`}
        aria-expanded={isOpen}
      >
        <Icon name={current.flagIcon} size="md" />
        <span>{current.name}</span>
        <span className="opacity-60 text-[10px]">({current.currency})</span>
        <Icon
          name="chevronDown"
          size="sm"
          className={`transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute bottom-full mb-2 right-0 w-56 rounded-2xl shadow-level-2 border p-1.5 z-50 animate-fadeIn ${
            isDark
              ? "bg-ink-black border-dust-taupe/30 text-canvas-cream"
              : "bg-white border-dust-taupe/60 text-ink-black"
          }`}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-dust-taupe">
            Selecionar Região & Moeda
          </div>
          {COUNTRIES.map((option) => {
            const isSelected = option.code === current.code;
            return (
              <button
                key={option.code}
                onClick={() => handleSelect(option)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-signal-orange text-white font-bold"
                    : isDark
                    ? "hover:bg-white/10 text-canvas-cream/90"
                    : "hover:bg-soft-bone text-ink-black"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon name={option.flagIcon} size="md" />
                  <span>{option.name}</span>
                </div>
                <span
                  className={
                    isSelected ? "text-white text-[10px]" : "text-dust-taupe text-[10px]"
                  }
                >
                  {option.currency}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
