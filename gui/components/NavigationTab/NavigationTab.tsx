"use client";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { classNames } from "../internal/classNames";
import styles from "./NavigationTab.module.css";

export type NavigationTabDefinition = { id: string; label: ReactNode; panel: ReactNode; count?: number; disabled?: boolean };
export interface NavigationTabProps { tabs: readonly NavigationTabDefinition[]; defaultSelectedId?: string; onSelectedIdChange?: (id: string) => void; className?: string; }
/** Provides tabs with roving focus and associated panels. @example <NavigationTab tabs={[{ id: "summary", label: "Summary", panel: "…" }]} /> */
export function NavigationTab({ className, defaultSelectedId, onSelectedIdChange, tabs }: NavigationTabProps) {
  const generatedId = useId(); const enabledTabs = tabs.filter((tab) => !tab.disabled); const initialId = defaultSelectedId ?? enabledTabs[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(initialId); const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = tabs.find((tab) => tab.id === selectedId && !tab.disabled) ?? enabledTabs[0];
  const select = (id: string) => { setSelectedId(id); onSelectedIdChange?.(id); };
  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => { const enabledIndexes = tabs.map((tab, position) => !tab.disabled ? position : -1).filter((position) => position >= 0); if (!enabledIndexes.length) return; const current = enabledIndexes.indexOf(index); const next = event.key === "Home" ? enabledIndexes[0] : event.key === "End" ? enabledIndexes.at(-1)! : event.key === "ArrowRight" ? enabledIndexes[(current + 1) % enabledIndexes.length] : event.key === "ArrowLeft" ? enabledIndexes[(current - 1 + enabledIndexes.length) % enabledIndexes.length] : undefined; if (next === undefined) return; event.preventDefault(); select(tabs[next].id); tabRefs.current[next]?.focus(); };
  return <div className={classNames(styles.root, className)}><div className={styles.list} role="tablist" aria-label="Sections">{tabs.map((tab, index) => { const active = tab.id === selected?.id; const tabId = `${generatedId}-${tab.id}-tab`; const panelId = `${generatedId}-${tab.id}-panel`; return <button key={tab.id} ref={(node) => { tabRefs.current[index] = node; }} id={tabId} role="tab" className={classNames(styles.tab, active && styles.active)} aria-controls={panelId} aria-selected={active} disabled={tab.disabled} tabIndex={active ? 0 : -1} onClick={() => select(tab.id)} onKeyDown={(event) => moveFocus(event, index)}>{tab.label}{tab.count !== undefined && <span className={styles.count}>{tab.count}</span>}</button>; })}</div>{selected && <div id={`${generatedId}-${selected.id}-panel`} role="tabpanel" aria-labelledby={`${generatedId}-${selected.id}-tab`} className={styles.panel}>{selected.panel}</div>}</div>;
}
