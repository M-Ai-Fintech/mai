import React, { useState, useRef, useEffect } from "react";
import { Icon } from "../Icon/Icon";

export interface DropdownOption {
  value: string;
  label: string;
  badge?: string;
  disabled?: boolean;
}

export interface DropdownProps {
  options: DropdownOption[];
  value?: string | string[];
  placeholder?: string;
  onChange?: (value: string | string[]) => void;
  searchable?: boolean;
  multiSelect?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  placeholder = "Selecione uma opção...",
  onChange,
  searchable = false,
  multiSelect = false,
  disabled = false,
  error,
  label,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedValues, setSelectedValues] = useState<string[]>(() => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      setSelectedValues(Array.isArray(value) ? value : [value]);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectOption = (opt: DropdownOption) => {
    if (opt.disabled) return;

    let updated: string[];
    if (multiSelect) {
      if (selectedValues.includes(opt.value)) {
        updated = selectedValues.filter((v) => v !== opt.value);
      } else {
        updated = [...selectedValues, opt.value];
      }
    } else {
      updated = [opt.value];
      setIsOpen(false);
    }

    setSelectedValues(updated);
    if (onChange) {
      onChange(multiSelect ? updated : updated[0] || "");
    }
  };

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTriggerContent = () => {
    if (selectedValues.length === 0) {
      return <span className="text-slate-gray">{placeholder}</span>;
    }

    if (multiSelect) {
      return (
        <div className="flex flex-wrap gap-1.5 items-center">
          {selectedValues.map((val) => {
            const opt = options.find((o) => o.value === val);
            return (
              <span
                key={val}
                className="inline-flex items-center gap-1 bg-ink-black text-canvas-cream text-[11px] font-bold px-2.5 py-0.5 rounded-full"
              >
                {opt?.label || val}
              </span>
            );
          })}
        </div>
      );
    }

    const selectedOption = options.find((o) => o.value === selectedValues[0]);
    return <span>{selectedOption?.label || selectedValues[0]}</span>;
  };

  return (
    <div className={`w-full text-left space-y-1.5 select-none ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-ink-black uppercase tracking-wider">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer bg-white text-ink-black min-h-[44px] ${
            error
              ? "border-red-500 ring-1 ring-red-500"
              : isOpen
              ? "border-ink-black ring-2 ring-ink-black/20"
              : "border-dust-taupe/60 hover:border-ink-black"
          } ${disabled ? "opacity-50 cursor-not-allowed bg-canvas-cream" : ""}`}
        >
          <div className="flex-1 truncate mr-2">{renderTriggerContent()}</div>
          <Icon
            name="chevronDown"
            size="sm"
            className={`transition-transform duration-200 text-slate-gray ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full mt-1.5 left-0 w-full rounded-2xl bg-white border border-dust-taupe/60 shadow-level-2 p-2 z-50 max-h-60 overflow-y-auto animate-fadeIn">
            {searchable && (
              <div className="mb-2 p-1 border-b border-dust-taupe/30">
                <input
                  type="text"
                  placeholder="Pesquisar opção..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-canvas-cream border border-dust-taupe/40 focus:outline-none focus:border-ink-black"
                />
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div className="p-3 text-xs text-slate-gray text-center">
                Nenhuma opção encontrada
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelectOption(opt)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      opt.disabled
                        ? "opacity-40 cursor-not-allowed"
                        : isSelected
                        ? "bg-ink-black text-canvas-cream font-bold"
                        : "hover:bg-soft-bone text-ink-black"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-signal-orange text-white font-extrabold ml-2">
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && !opt.badge && (
                      <Icon name="check" size="sm" className="text-canvas-cream" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
};
