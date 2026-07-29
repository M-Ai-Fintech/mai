import { type ReactNode } from "react";
import { NavigationItem } from "@/components";
import type { ShellNavigationEntry } from "@/lib/shell/route-context";
import styles from "./AppShell.module.css";

function navigationItem(entry: ShellNavigationEntry): ReactNode {
  if (entry.state === "restricted") {
    return (
      <NavigationItem key={entry.routeId} kind="button" restricted>
        {entry.label}
      </NavigationItem>
    );
  }

  if (entry.state === "unavailable" || entry.state === "disabled" || !entry.href) {
    return (
      <NavigationItem key={entry.routeId} kind="button" disabled status="Unavailable">
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
    >
      {entry.label}
    </NavigationItem>
  );
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
