"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from "react";

import { classNames } from "../internal/classNames";

import styles from "./NavigationTab.module.css";

export interface NavigationTabDefinition {
  id: string;
  label: ReactNode;
  panel: ReactNode;
  count?: number;
  disabled?: boolean;
}

export interface NavigationTabProps {
  tabs: readonly NavigationTabDefinition[];
  selectedId?: string;
  defaultSelectedId?: string;
  onSelectedIdChange?: (id: string) => void;
  className?: string;
}

/**
 * Provides controlled or uncontrolled tabs with roving focus and associated panels.
 *
 * @example <NavigationTab tabs={[{ id: "summary", label: "Summary", panel: "…" }]} />
 */
export function NavigationTab({
  className,
  defaultSelectedId,
  onSelectedIdChange,
  selectedId: controlledSelectedId,
  tabs,
}: NavigationTabProps) {
  const generatedId = useId();
  const enabledIndexes = enabledTabIndexes(tabs);
  const initialId = defaultSelectedId ?? tabs[enabledIndexes[0]]?.id ?? "";
  const [uncontrolledSelectedId, setUncontrolledSelectedId] = useState(
    initialId,
  );
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedId = controlledSelectedId ?? uncontrolledSelectedId;
  const selected = tabs.find((tab) => tab.id === selectedId && !tab.disabled) ??
    tabs[enabledIndexes[0]];

  const select = (id: string) => {
    if (controlledSelectedId === undefined) setUncontrolledSelectedId(id);
    onSelectedIdChange?.(id);
  };
  const moveFocus = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const next = nextEnabledIndex(event.key, index, enabledIndexes);
    if (next === undefined) return;
    event.preventDefault();
    select(tabs[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className={classNames(styles.root, className)}>
      <div className={styles.list} role="tablist" aria-label="Sections">
        {tabs.map((tab, index) => {
          const active = tab.id === selected?.id;
          const tabId = `${generatedId}-${tab.id}-tab`;
          const panelId = `${generatedId}-${tab.id}-panel`;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              id={tabId}
              role="tab"
              className={classNames(styles.tab, active && styles.active)}
              aria-controls={panelId}
              aria-selected={active}
              disabled={tab.disabled}
              tabIndex={active ? 0 : -1}
              onClick={() => select(tab.id)}
              onKeyDown={(event) => moveFocus(event, index)}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={styles.count}>{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>
      {selected && (
        <div
          id={`${generatedId}-${selected.id}-panel`}
          role="tabpanel"
          aria-labelledby={`${generatedId}-${selected.id}-tab`}
          className={styles.panel}
        >
          {selected.panel}
        </div>
      )}
    </div>
  );
}

function enabledTabIndexes(tabs: readonly NavigationTabDefinition[]): number[] {
  return tabs.flatMap((tab, index) => tab.disabled ? [] : [index]);
}

function nextEnabledIndex(
  key: string,
  currentIndex: number,
  enabledIndexes: readonly number[],
): number | undefined {
  if (enabledIndexes.length === 0) return undefined;
  if (key === "Home") return enabledIndexes[0];
  if (key === "End") return enabledIndexes.at(-1);
  const current = enabledIndexes.indexOf(currentIndex);
  if (key === "ArrowRight") {
    return enabledIndexes[(current + 1) % enabledIndexes.length];
  }
  if (key === "ArrowLeft") {
    return enabledIndexes[
      (current - 1 + enabledIndexes.length) % enabledIndexes.length
    ];
  }
  return undefined;
}
