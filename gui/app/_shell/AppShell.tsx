import Link from "next/link";
import { NavigationItem, StatusIndicator } from "@/components";
import type { AdapterReadModel, AdapterResult } from "@/lib/adapters/contracts";
import {
  breadcrumbsForResolution,
  navigationForResolution,
  type RouteResolution,
} from "@/lib/shell/route-context";
import {
  type RouteDefinition,
  routePath,
  shellEntryRoutes,
} from "@/lib/shell/route-registry";
import { MobileNavigation } from "./MobileNavigation";
import { ShellNavigation } from "./ShellNavigation";
import { ScreenBody } from "@/screens/ScreenBody";
import { DealIntelligenceBody } from "@/screens/deal-intelligence/DealIntelligenceBody";
import { DealExecutionBody } from "@/screens/deal-execution/DealExecutionBody";
import styles from "./AppShell.module.css";
import type { ScreenDataSource } from "@/screens/screen-contracts";

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
  dataSource = "fixture",
  adapter,
}: {
  resolution: Extract<RouteResolution, { kind: "ready" }>;
  dataSource?: ScreenDataSource;
  adapter?: AdapterResult<AdapterReadModel>;
}) {
  const { route, organization, deal, counts } = resolution;
  const entries = navigationForResolution(resolution);
  const utilityEntries = shellEntryRoutes();
  const breadcrumbEntries = breadcrumbsForResolution(resolution);
  const external = route.shellMode === "external";
  const dealMode = route.shellMode === "deal";
  const navigationLabel = dealMode
    ? "Deal navigation"
    : external
    ? "Participant navigation"
    : route.shellMode === "administration"
    ? "Administration navigation"
    : "Workspace navigation";

  return (
    <div
      className={`${styles.shell} md:flex`}
      data-shell-mode={route.shellMode}
    >
      <a className={styles.skip} href="#main-content">
        Skip to main content
      </a>

      {!external
        ? (
          <aside
            className={`${styles.brandRail} hidden md:flex`}
            aria-label="MAI workspace rail"
          >
            <Link
              className={styles.brandMark}
              href="/home"
              aria-label="MAI home"
            >
              MAI
            </Link>
            <span className={styles.modeMarker} aria-hidden="true">
              {dealMode
                ? "D"
                : route.shellMode === "administration"
                ? "A"
                : "G"}
            </span>
          </aside>
        )
        : null}

      <div className={styles.application}>
        <header className={styles.header}>
          <MobileNavigation entries={entries} label={navigationLabel} />
          <div className={styles.contextIdentity}>
            <strong>
              {external ? "Shared workspace" : organization?.name ?? "MAI"}
            </strong>
            <small>{dataSource === "fixture" ? "Fixture adapter" : "v1 adapter"}</small>
          </div>
          {!external
            ? (
              <nav
                className={styles.headerEntries}
                aria-label="Fixture shell entry points"
              >
                {utilityEntries.map((definition) => {
                  if (!resolution.permissions.includes(definition.permission)) {
                    return null;
                  }
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
            )
            : (
              <span className={styles.externalLabel}>
                External participant
              </span>
            )}
        </header>

        <div className={`${styles.workspace} xl:flex`}>
          {!external
            ? (
              <aside className={`${styles.contextSidebar} hidden xl:block`}>
                <div className={styles.sidebarHeading}>
                  <span>
                    {dealMode
                      ? "Deal room"
                      : route.shellMode === "administration"
                      ? "Administration"
                      : "MAI · Home"}
                  </span>
                  {deal ? <strong>{deal.name}</strong> : null}
                </div>
                {!dealMode
                  ? (
                    <ShellNavigation
                      entries={entries}
                      label={navigationLabel}
                    />
                  )
                  : (
                    <dl className={styles.dealContext}>
                      <div>
                        <dt>Deal</dt>
                        <dd>{deal?.name}</dd>
                      </div>
                      <div>
                        <dt>Phase</dt>
                        <dd>{deal?.phase}</dd>
                      </div>
                    </dl>
                  )}
              </aside>
            )
            : null}

          <div className={styles.contentColumn}>
            {dealMode
              ? (
                <ShellNavigation
                  entries={entries}
                  label={navigationLabel}
                  className={`${styles.dealNavigation} hidden md:flex`}
                />
              )
              : null}
            {external
              ? (
                <ShellNavigation
                  entries={entries}
                  label={navigationLabel}
                  className={styles.externalNavigation}
                />
              )
              : null}

            <main id="main-content" className={styles.main}>
              <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
                <ol>
                  {breadcrumbEntries.map((breadcrumb) => (
                    <li key={breadcrumb.routeId}>
                      {breadcrumb.href
                        ? <Link href={breadcrumb.href}>{breadcrumb.label}</Link>
                        : (
                          <span
                            aria-current={breadcrumb.current
                              ? "page"
                              : undefined}
                          >
                            {breadcrumb.label}
                          </span>
                        )}
                    </li>
                  ))}
                </ol>
              </nav>

              {deal
                ? (
                  <header className={styles.dealHeader}>
                    <div>
                      <p className={styles.eyebrow}>Deal context</p>
                      <h1>{deal.name}</h1>
                    </div>
                    <StatusIndicator role="information">
                      {deal.phase}
                    </StatusIndicator>
                  </header>
                )
                : null}

              {route.implementationStatus === "screen-body"
                ? <ScreenBody resolution={resolution} dataSource={dataSource} adapter={adapter} />
                : route.implementationStatus === "deal-intelligence"
                ? <DealIntelligenceBody resolution={resolution} dataSource={dataSource} adapter={adapter} />
                : route.implementationStatus === "deal-execution"
                ? <DealExecutionBody resolution={resolution} dataSource={dataSource} adapter={adapter} />
                : (
                  <DeferredScreenPlaceholder
                    owner={route.deferredScreenOwner}
                  />
                )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeferredScreenPlaceholder({ owner }: { owner: string }) {
  return (
    <section
      className={styles.placeholder}
      data-deferred-screen-owner={owner}
      aria-labelledby="deferred-screen-title"
    >
      <p className={styles.eyebrow}>Screen deferred</p>
      <h2 id="deferred-screen-title">This screen is deferred to {owner}.</h2>
      <p>
        The approved Shell, route context, navigation, and breadcrumbs remain
        available while the screen body is not yet in scope.
      </p>
    </section>
  );
}
