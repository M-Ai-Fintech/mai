import Link from "next/link";
import { NavigationItem, StatusIndicator } from "@/components";
import {
  navigationForResolution,
  type RouteResolution,
} from "@/lib/shell/route-context";
import {
  breadcrumbs,
  routePath,
  shellEntryRoutes,
  type RouteDefinition,
} from "@/lib/shell/route-registry";
import { MobileNavigation } from "./MobileNavigation";
import { ShellNavigation } from "./ShellNavigation";
import styles from "./AppShell.module.css";

function entryCount(
  definition: RouteDefinition,
  counts: Extract<RouteResolution, { kind: "ready" }>["counts"],
): number | undefined {
  if (definition.id === "global.tasks") return counts?.tasks;
  if (definition.id === "global.approvals") return counts?.approvals;
  if (definition.id === "global.notifications") return counts?.notifications;
  return undefined;
}

export function AppShell({
  resolution,
}: {
  resolution: Extract<RouteResolution, { kind: "ready" }>;
}) {
  const { route, organization, deal, counts } = resolution;
  const entries = navigationForResolution(resolution);
  const utilityEntries = shellEntryRoutes();
  const external = route.shellMode === "external";
  const dealMode = route.shellMode === "deal";
  const navigationLabel = dealMode
    ? "Deal navigation"
    : external
      ? "Participant navigation"
      : route.shellMode === "administration"
        ? "Administration navigation"
        : "Workspace navigation";
  const breadcrumbLabels = breadcrumbs(route, organization?.name, deal?.name);

  return (
    <div className={`${styles.shell} md:flex`} data-shell-mode={route.shellMode}>
      <a className={styles.skip} href="#main-content">
        Skip to main content
      </a>

      {!external ? (
        <aside className={`${styles.brandRail} hidden md:flex`} aria-label="MAI workspace rail">
          <Link className={styles.brandMark} href="/home" aria-label="MAI home">
            MAI
          </Link>
          <span className={styles.modeMarker} aria-hidden="true">
            {dealMode ? "D" : route.shellMode === "administration" ? "A" : "G"}
          </span>
        </aside>
      ) : null}

      <div className={styles.application}>
        <header className={styles.header}>
          <MobileNavigation entries={entries} label={navigationLabel} />
          <div className={styles.contextIdentity}>
            <strong>
              {external ? "Shared workspace" : organization?.name ?? "MAI"}
            </strong>
            <small>Fixture adapter</small>
          </div>
          {!external ? (
            <nav className={styles.headerEntries} aria-label="Fixture shell entry points">
              {utilityEntries.map((definition) => {
                if (!resolution.permissions.includes(definition.permission)) return null;
                const href = routePath(definition);
                if (!href) return null;
                return (
                  <NavigationItem
                    key={definition.id}
                    kind="link"
                    href={href}
                    active={route.id === definition.id}
                    count={entryCount(definition, counts)}
                  >
                    {definition.label}
                  </NavigationItem>
                );
              })}
            </nav>
          ) : (
            <span className={styles.externalLabel}>External participant</span>
          )}
        </header>

        <div className={`${styles.workspace} xl:flex`}>
          {!external ? (
            <aside className={`${styles.contextSidebar} hidden xl:block`}>
              <div className={styles.sidebarHeading}>
                <span>{dealMode ? "Deal room" : route.shellMode === "administration" ? "Administration" : "MAI · Home"}</span>
                {deal ? <strong>{deal.name}</strong> : null}
              </div>
              {!dealMode ? (
                <ShellNavigation entries={entries} label={navigationLabel} />
              ) : (
                <dl className={styles.dealContext}>
                  <div><dt>Deal</dt><dd>{deal?.name}</dd></div>
                  <div><dt>Phase</dt><dd>{deal?.phase}</dd></div>
                </dl>
              )}
            </aside>
          ) : null}

          <div className={styles.contentColumn}>
            {dealMode ? (
              <ShellNavigation
                entries={entries}
                label={navigationLabel}
                className={`${styles.dealNavigation} hidden md:flex`}
              />
            ) : null}
            {external ? (
              <ShellNavigation
                entries={entries}
                label={navigationLabel}
                className={styles.externalNavigation}
              />
            ) : null}

            <main id="main-content" className={styles.main}>
              <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
                <ol>
                  {breadcrumbLabels.map((label, index) => (
                    <li
                      key={`${label}-${index}`}
                      aria-current={index === breadcrumbLabels.length - 1 ? "page" : undefined}
                    >
                      {label}
                    </li>
                  ))}
                </ol>
              </nav>

              {deal ? (
                <header className={styles.dealHeader}>
                  <div>
                    <p className={styles.eyebrow}>Deal context</p>
                    <h1>{deal.name}</h1>
                  </div>
                  <StatusIndicator role="information">{deal.phase}</StatusIndicator>
                </header>
              ) : null}

              <section className={styles.placeholder} aria-labelledby="shell-placeholder-title">
                <StatusIndicator role="incomplete">Fixture shell route</StatusIndicator>
                <h2 id="shell-placeholder-title">{route.label}</h2>
                <p>
                  This neutral placeholder is intentionally deferred to {route.deferredScreenOwner}.
                  Local fixture data does not prove production access, authorization, or availability.
                </p>
              </section>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
