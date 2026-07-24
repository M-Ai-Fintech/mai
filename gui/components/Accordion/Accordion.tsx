import React, { useState } from "react";
import { Icon } from "../Icon/Icon";

export interface AccordionItemData {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  content: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItemData[];
  allowMultiple?: boolean;
  defaultOpenIds?: string[];
  variant?: "plain" | "bordered";
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  items,
  allowMultiple = false,
  defaultOpenIds = [],
  variant = "bordered",
  className = "",
}) => {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds);

  const toggleItem = (id: string) => {
    if (allowMultiple) {
      setOpenIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    } else {
      setOpenIds((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  return (
    <div className={`w-full space-y-3 select-none ${className}`}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);

        return (
          <div
            key={item.id}
            className={`transition-all duration-200 overflow-hidden ${
              variant === "bordered"
                ? `border rounded-2xl bg-white shadow-sm ${
                  isOpen
                    ? "border-signal-orange ring-1 ring-signal-orange/20"
                    : "border-dust-taupe/40"
                }`
                : "border-b border-dust-taupe/30 pb-3"
            }`}
          >
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              className="w-full flex items-center justify-between p-4 text-left cursor-pointer focus:outline-none"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold transition-colors ${
                      isOpen ? "text-signal-orange" : "text-ink-black"
                    }`}
                  >
                    {item.title}
                  </span>
                  {item.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-soft-bone text-ink-black font-extrabold">
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.subtitle && (
                  <span className="text-xs text-slate-gray">
                    {item.subtitle}
                  </span>
                )}
              </div>

              <div
                className={`p-1.5 rounded-full transition-transform duration-200 ${
                  isOpen
                    ? "bg-signal-orange text-white rotate-180"
                    : "bg-canvas-cream text-ink-black"
                }`}
              >
                <Icon name="chevronDown" size="sm" />
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 pt-1 text-xs text-ink-black/90 border-t border-dust-taupe/20 animate-fadeIn">
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
