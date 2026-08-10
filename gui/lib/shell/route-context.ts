import {
  fixtureShellAdapter,
  type DealContext,
  type OrganizationContext,
  type ShellCounts,
} from "./adapters";
import { adapterCanaryFor } from "@/lib/adapters/feature-flags";
import {
  matchRoute,
  navigationRoutes,
  routePath,
  routeRegistry,
  type Permission,
  type RouteDefinition,
} from "./route-registry";

export type RouteResolution =
  | { readonly kind: "not-found" }
  | { readonly kind: "invalid-context"; readonly reason: string }
  | { readonly kind: "restricted" }
  | { readonly kind: "unavailable"; readonly reason?: string }
  | {
      readonly kind: "ready";
      readonly route: RouteDefinition;
      readonly routeParameters: Readonly<Record<string, string>>;
      readonly permissions: readonly Permission[];
      readonly organization?: OrganizationContext;
      readonly deal?: DealContext;
      readonly counts?: ShellCounts;
    };

export interface RouteContextOptions {
  readonly dataSource: "fixture" | "v1";
}

export type ReadyRouteResolution = Extract<RouteResolution, { kind: "ready" }>;
export type ShellNavigationState = "available" | "active" | "restricted" | "unavailable" | "disabled";

export interface ShellNavigationEntry {
  readonly routeId: string;
  readonly label: string;
  readonly state: ShellNavigationState;
  readonly href?: string;
  readonly section: "primary" | "secondary";
}

export interface ShellBreadcrumb {
  readonly routeId: string;
  readonly label: string;
  readonly current: boolean;
  readonly href?: string;
}

const identifier = /^[a-z0-9-]+$/;

function routeParameters(route: RouteDefinition, parts: readonly string[]): Readonly<Record<string, string>> {
  return Object.fromEntries(route.pattern.flatMap((segment, index) =>
    segment.startsWith(":") ? [[segment.slice(1), parts[index] ?? ""]] : [],
  ));
}

function routeById(routeId: string): RouteDefinition {
  const definition = routeRegistry.find((candidate) => candidate.id === routeId);
  if (!definition) throw new Error(`Route ${routeId} is missing from the registry.`);
  return definition;
}

function breadcrumbForRoute(
  resolution: ReadyRouteResolution,
  definition: RouteDefinition,
  label = definition.label,
  current = false,
): ShellBreadcrumb | undefined {
  if (!resolution.permissions.includes(definition.permission)) return undefined;
  if (definition.availability === "unavailable") return { routeId: definition.id, label, current };
  const href = current ? undefined : routePath(definition, resolution.routeParameters);
  return { routeId: definition.id, label, current, href };
}

export function navigationForResolution(
  resolution: ReadyRouteResolution,
): readonly ShellNavigationEntry[] {
  return navigationRoutes(resolution.route.shellMode).map((definition) => {
    const section = definition.navigation?.section ?? "primary";
    if (!resolution.permissions.includes(definition.permission)) {
      return { routeId: definition.id, label: definition.label, state: "restricted", section };
    }
    if (definition.availability === "unavailable") {
      return { routeId: definition.id, label: definition.label, state: "unavailable", section };
    }
    const href = routePath(definition, resolution.routeParameters);
    if (!href) {
      return { routeId: definition.id, label: definition.label, state: "disabled", section };
    }
    return {
      routeId: definition.id,
      label: definition.label,
      state: definition.id === resolution.route.id ? "active" : "available",
      href,
      section,
    };
  });
}

export function breadcrumbsForResolution(
  resolution: ReadyRouteResolution,
): readonly ShellBreadcrumb[] {
  const { route, organization, deal } = resolution;
  const crumbs: Array<ShellBreadcrumb | undefined> = [];

  if (route.shellMode === "global") {
    if (route.id !== "global.home" && organization) {
      crumbs.push(breadcrumbForRoute(resolution, routeById("global.home"), organization.name));
    }
  } else if (route.shellMode === "deal") {
    if (organization) {
      crumbs.push(breadcrumbForRoute(resolution, routeById("global.home"), organization.name));
    }
    if (deal) {
      const overview = routeById("deal.overview");
      crumbs.push(breadcrumbForRoute(resolution, overview, deal.name, route.id === overview.id));
    }
  } else if (route.shellMode === "administration") {
    if (organization) {
      crumbs.push(breadcrumbForRoute(resolution, routeById("global.home"), organization.name));
    }
    const administration = routeById("administration.profile");
    crumbs.push(breadcrumbForRoute(
      resolution,
      administration,
      administration.label,
      route.id === administration.id,
    ));
  } else if (route.id !== "external.submit") {
    const workspace = routeById("external.workspace");
    crumbs.push(breadcrumbForRoute(
      resolution,
      workspace,
      workspace.label,
      route.id === workspace.id,
    ));
  }

  if (crumbs.at(-1)?.current !== true) {
    crumbs.push({ routeId: route.id, label: route.label, current: true });
  }

  return crumbs.filter((crumb): crumb is ShellBreadcrumb => Boolean(crumb));
}

export async function resolveRouteContext(
  parts: readonly string[],
  options: RouteContextOptions,
): Promise<RouteResolution> {
  const route = matchRoute(parts);
  if (!route) return { kind: "not-found" };

  const parameters = routeParameters(route, parts);
  const malformedParameter = Object.entries(parameters).find(([, value]) => !identifier.test(value));
  if (malformedParameter) {
    return {
      kind: "invalid-context",
      reason: `The ${malformedParameter[0]} route identifier must use lowercase letters, numbers, or hyphens.`,
    };
  }

  if (options.dataSource === "v1") return unavailableV1Shell(route.id);

  const access = await fixtureShellAdapter.resolveAccess(route.shellMode);
  if (!access.permissions.includes(route.permission)) return { kind: "restricted" };

  if (route.shellMode === "external") {
    return {
      kind: "ready",
      route,
      routeParameters: parameters,
      permissions: access.permissions,
    };
  }

  const organization = await fixtureShellAdapter.resolveOrganization();
  const dealId = parameters.dealId;
  const deal = dealId ? await fixtureShellAdapter.resolveDeal(dealId) : undefined;
  if (deal === "inaccessible") return { kind: "restricted" };
  if (deal === "unavailable") return { kind: "unavailable" };

  return {
    kind: "ready",
    route,
    routeParameters: parameters,
    permissions: access.permissions,
    organization,
    deal,
    counts: await fixtureShellAdapter.resolveCounts(),
  };
}

function unavailableV1Shell(routeId: string): RouteResolution {
  const shell = adapterCanaryFor("application-shell");
  return {
    kind: "unavailable",
    reason: shell.activation === "off"
      ? `The v1 shell read model is unavailable for ${routeId}; its route is not registered or configured.`
      : "The v1 shell read model requires its banker-facing contract before route context can be resolved.",
  };
}
