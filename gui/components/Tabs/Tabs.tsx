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

export const Tabs: React.FC<TabsProps> = (props) => {
  return (
    <div
      data-variant={props.variant ?? "pill"}
      className={`inline-flex items-center p-1 bg-canvas-cream border border-dust-taupe/60 rounded-full select-none ${
        props.className ?? ""
      }`}
    >
      {props.tabs.map((tab) => (
        <TabButton
          isActive={props.activeTab === tab.id}
          key={tab.id}
          onChange={props.onChange}
          tab={tab}
        />
      ))}
    </div>
  );
};

interface TabButtonProps {
  isActive: boolean;
  onChange: (id: string) => void;
  tab: TabItem;
}

function TabButton({ isActive, onChange, tab }: TabButtonProps) {
  return (
    <button
      disabled={tab.disabled}
      onClick={() => onChange(tab.id)}
      className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all duration-150 cursor-pointer rounded-full min-h-[44px] ${
        tabClass(isActive, tab.disabled)
      }`}
    >
      <span>{tab.label}</span>
      {tab.count !== undefined && (
        <TabCount count={tab.count} isActive={isActive} />
      )}
    </button>
  );
}

function tabClass(isActive: boolean, disabled: boolean | undefined) {
  const activeClass = isActive
    ? "bg-ink-black text-canvas-cream shadow-sm"
    : "text-slate-gray hover:text-ink-black hover:bg-white/50";
  return `${activeClass} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`;
}

function TabCount({ count, isActive }: { count: number; isActive: boolean }) {
  const color = isActive
    ? "bg-signal-orange text-white"
    : "bg-dust-taupe/40 text-ink-black";
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${color}`}>
      {count}
    </span>
  );
}
