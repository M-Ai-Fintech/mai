import { type ReactNode } from "react";
import { NavigationItem } from "@/components";
import type { ShellNavigationEntry } from "@/lib/shell/route-context";
import styles from "./AppShell.module.css";

function navigationItem(entry: ShellNavigationEntry): ReactNode {
  if (entry.state === "forbidden" || entry.state === "protected-not-found") {
    return (
      <NavigationItem
        key={entry.routeId}
        kind="button"
        disabled
        status={stateLabel(entry.state)}
      >
        {entry.label}
      </NavigationItem>
    );
  }

  if (entry.state === "disabled" || !entry.href) {
    return (
      <NavigationItem key={entry.routeId} kind="button" disabled status={stateLabel(entry.state)}>
        {entry.label}
      </NavigationItem>
    );
  }

  return (
    <NavigationItem
      key={entry.routeId}
      kind="link"
      href={entry.href}
      active={entry.state === "active"}
      status={entry.state === "degraded" ? "Degraded" : undefined}
    >
      {entry.label}
    </NavigationItem>
  );
}

function stateLabel(state: ShellNavigationEntry["state"]): string {
  if (state === "forbidden") return "Forbidden";
  if (state === "protected-not-found") return "Protected not found";
  if (state === "deferred") return "Deferred";
  if (state === "failed") return "Failed";
  if (state === "degraded") return "Degraded";
  return "Unavailable";
}

export function ShellNavigation({
  entries,
  label,
  className,
}: {
  entries: readonly ShellNavigationEntry[];
  label: string;
  className?: string;
}) {
  const primary = entries.filter((entry) => entry.section === "primary");
  const secondary = entries.filter((entry) => entry.section === "secondary");

  return (
    <nav aria-label={label} className={className}>
      <div className={styles.navigationGroup}>{primary.map(navigationItem)}</div>
      {secondary.length > 0 ? (
        <div className={styles.secondaryNavigation}>{secondary.map(navigationItem)}</div>
      ) : null}
    </nav>
  );
}
