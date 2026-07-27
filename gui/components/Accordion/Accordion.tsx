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

interface AccordionModel {
  className: string;
  items: AccordionItemData[];
  openIds: string[];
  toggleItem: (id: string) => void;
  variant: NonNullable<AccordionProps["variant"]>;
}

function nextOpenIds(
  currentIds: string[],
  itemId: string,
  allowMultiple: boolean,
): string[] {
  if (!allowMultiple) return currentIds.includes(itemId) ? [] : [itemId];
  if (currentIds.includes(itemId)) {
    return currentIds.filter((openId) => openId !== itemId);
  }
  return [...currentIds, itemId];
}

export const Accordion: React.FC<AccordionProps> = (props) => {
  const model = useAccordionModel(props);
  return <AccordionItems model={model} />;
};

function useAccordionModel({
  items,
  allowMultiple = false,
  defaultOpenIds = [],
  variant = "bordered",
  className = "",
}: AccordionProps): AccordionModel {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds);
  const toggleItem = (id: string) => {
    setOpenIds((currentIds) => nextOpenIds(currentIds, id, allowMultiple));
  };
  return { className, items, openIds, toggleItem, variant };
}

function AccordionItems({ model }: { model: AccordionModel }) {
  return (
    <div className={`w-full space-y-3 select-none ${model.className}`}>
      {model.items.map((item) => (
        <AccordionItem
          isOpen={model.openIds.includes(item.id)}
          item={item}
          key={item.id}
          onToggle={model.toggleItem}
          variant={model.variant}
        />
      ))}
    </div>
  );
}

function AccordionItem({
  isOpen,
  item,
  onToggle,
  variant,
}: {
  isOpen: boolean;
  item: AccordionItemData;
  onToggle: (id: string) => void;
  variant: NonNullable<AccordionProps["variant"]>;
}) {
  return (
    <div className={accordionItemClass(variant, isOpen)}>
      <AccordionButton isOpen={isOpen} item={item} onToggle={onToggle} />
      {isOpen && <AccordionPanel item={item} />}
    </div>
  );
}

function accordionItemClass(
  variant: NonNullable<AccordionProps["variant"]>,
  isOpen: boolean,
) {
  if (variant !== "bordered") {
    return "transition-all duration-200 overflow-hidden border-b border-dust-taupe/30 pb-3";
  }
  const open = isOpen
    ? "border-signal-orange ring-1 ring-signal-orange/20"
    : "border-dust-taupe/40";
  return `transition-all duration-200 overflow-hidden border rounded-2xl bg-white shadow-sm ${open}`;
}

function AccordionButton({
  isOpen,
  item,
  onToggle,
}: {
  isOpen: boolean;
  item: AccordionItemData;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(item.id)}
      className="w-full flex items-center justify-between p-4 text-left cursor-pointer focus:outline-none"
    >
      <AccordionTitle isOpen={isOpen} item={item} />
      <AccordionChevron isOpen={isOpen} />
    </button>
  );
}

function AccordionTitle({
  isOpen,
  item,
}: {
  isOpen: boolean;
  item: AccordionItemData;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <AccordionTitleRow isOpen={isOpen} item={item} />
      {item.subtitle && <AccordionSubtitle subtitle={item.subtitle} />}
    </div>
  );
}

function AccordionTitleRow({
  isOpen,
  item,
}: {
  isOpen: boolean;
  item: AccordionItemData;
}) {
  return (
    <div className="flex items-center gap-2">
      <AccordionTitleText isOpen={isOpen} title={item.title} />
      {item.badge && <AccordionBadge badge={item.badge} />}
    </div>
  );
}

function AccordionTitleText({
  isOpen,
  title,
}: {
  isOpen: boolean;
  title: string;
}) {
  const color = isOpen ? "text-signal-orange" : "text-ink-black";
  return (
    <span className={`text-sm font-bold transition-colors ${color}`}>
      {title}
    </span>
  );
}

function AccordionSubtitle({ subtitle }: { subtitle: string }) {
  return <span className="text-xs text-slate-gray">{subtitle}</span>;
}

function AccordionBadge({ badge }: { badge: string }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-soft-bone text-ink-black font-extrabold">
      {badge}
    </span>
  );
}

function AccordionChevron({ isOpen }: { isOpen: boolean }) {
  const color = isOpen
    ? "bg-signal-orange text-white rotate-180"
    : "bg-canvas-cream text-ink-black";
  return (
    <div
      className={`p-1.5 rounded-full transition-transform duration-200 ${color}`}
    >
      <Icon name="chevronDown" size="sm" />
    </div>
  );
}

function AccordionPanel({ item }: { item: AccordionItemData }) {
  return (
    <div className="px-4 pb-4 pt-1 text-xs text-ink-black/90 border-t border-dust-taupe/20 animate-fadeIn">
      {item.content}
    </div>
  );
}
