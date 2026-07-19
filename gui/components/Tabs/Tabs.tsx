import React from "react";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: "pill" | "button";
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = "pill",
  className = "",
}) => {
  return (
    <div data-variant={variant} className={`inline-flex items-center p-1 bg-canvas-cream border border-dust-taupe/60 rounded-full select-none ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all duration-150 cursor-pointer rounded-full min-h-[44px] ${
              isActive
                ? "bg-ink-black text-canvas-cream shadow-sm"
                : "text-slate-gray hover:text-ink-black hover:bg-white/50"
            } ${tab.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive
                    ? "bg-signal-orange text-white"
                    : "bg-dust-taupe/40 text-ink-black"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
