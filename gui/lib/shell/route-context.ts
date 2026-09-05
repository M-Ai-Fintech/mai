import {
  type DealContext,
  fixtureShellAdapter,
  type OrganizationContext,
  type ShellAdapter,
  type ShellCounts,
} from "./adapters";
import { adapterCanaryFor } from "@/lib/adapters/feature-flags";
import { APIError } from "@/lib/api-client/errors";
import type { CapabilityReadiness } from "../../../src/api/contracts/capability_readiness";
import {
  matchRoute,
  navigationRoutes,
  type Permission,
  type RouteDefinition,
  routePath,
  routeRegistry,
} from "./route-registry";

export type RouteResolution =
  | { readonly kind: "not-found" }
  | { readonly kind: "invalid-context"; readonly reason: string }
  | { readonly kind: "forbidden" }
  | { readonly kind: "protected-not-found" }
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
  readonly environment?: Readonly<Record<string, string | undefined>>;
  readonly previousShellAdapter?: ShellAdapter;
  readonly v1ShellAdapter?: ShellAdapter;
}

export type ReadyRouteResolution = Extract<RouteResolution, { kind: "ready" }>;
export type ShellNavigationState =
  | "available"
  | "active"
  | "disabled"
  | Exclude<CapabilityReadiness["state"], "enabled">;

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

const identifier = /^[a-z0-9_-]+$/;

function routeParameters(
  route: RouteDefinition,
  parts: readonly string[],
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    route.pattern.flatMap((segment, index) =>
      segment.startsWith(":") ? [[segment.slice(1), parts[index] ?? ""]] : []
    ),
  );
}

function routeById(routeId: string): RouteDefinition {
  const definition = routeRegistry.find((candidate) =>
    candidate.id === routeId
  );
  if (!definition) {
    throw new Error(`Route ${routeId} is missing from the registry.`);
  }
  return definition;
}

function breadcrumbForRoute(
  resolution: ReadyRouteResolution,
  definition: RouteDefinition,
  label = definition.label,
  current = false,
): ShellBreadcrumb | undefined {
  if (!resolution.permissions.includes(definition.permission)) return undefined;
  if (definition.availability === "unavailable") {
    return { routeId: definition.id, label, current };
  }
  const href = current
    ? undefined
    : routePath(definition, resolution.routeParameters);
  return { routeId: definition.id, label, current, href };
}

export function navigationForResolution(
  resolution: ReadyRouteResolution,
  readinessForRoute?: (routeId: string) => CapabilityReadiness | undefined,
): readonly ShellNavigationEntry[] {
  return navigationRoutes(resolution.route.shellMode).map((definition) =>
    navigationEntryForDefinition(resolution, definition, readinessForRoute)
  );
}

export function navigationEntryForDefinition(
  resolution: ReadyRouteResolution,
  definition: RouteDefinition,
  readinessForRoute?: (routeId: string) => CapabilityReadiness | undefined,
): ShellNavigationEntry {
  const section = definition.navigation?.section ?? "primary";
  const base = { routeId: definition.id, label: definition.label, section };
  if (!resolution.permissions.includes(definition.permission)) {
    return { ...base, state: "forbidden" };
  }
  if (definition.availability === "unavailable") {
    return { ...base, state: "deferred" };
  }
  const href = routePath(definition, resolution.routeParameters);
  if (!href) return { ...base, state: "disabled" };
  const readiness = readinessForRoute?.(definition.id);
  if (readiness !== undefined && readiness.state !== "enabled") {
    return readiness.state === "degraded"
      ? { ...base, state: readiness.state, href }
      : { ...base, state: readiness.state };
  }
  const state = definition.id === resolution.route.id ? "active" : "available";
  return { ...base, state, href };
}

export function breadcrumbsForResolution(
  resolution: ReadyRouteResolution,
): readonly ShellBreadcrumb[] {
  const { route, organization, deal } = resolution;
  const crumbs: Array<ShellBreadcrumb | undefined> = [];

  if (route.shellMode === "global") {
    if (route.id !== "global.home" && organization) {
      crumbs.push(
        breadcrumbForRoute(
          resolution,
          routeById("global.home"),
          organization.name,
        ),
      );
    }
  } else if (route.shellMode === "deal") {
    if (organization) {
      crumbs.push(
        breadcrumbForRoute(
          resolution,
          routeById("global.home"),
          organization.name,
        ),
      );
    }
    if (deal) {
      const overview = routeById("deal.overview");
      crumbs.push(
        breadcrumbForRoute(
          resolution,
          overview,
          deal.name,
          route.id === overview.id,
        ),
      );
    }
  } else if (route.shellMode === "administration") {
    if (organization) {
      crumbs.push(
        breadcrumbForRoute(
          resolution,
          routeById("global.home"),
          organization.name,
        ),
      );
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
  const malformedParameter = Object.entries(parameters).find(([, value]) =>
    !identifier.test(value)
  );
  if (malformedParameter) {
    return {
      kind: "invalid-context",
      reason: `The ${
        malformedParameter[0]
      } route identifier must use lowercase letters, numbers, hyphens, or underscores.`,
    };
  }

  const shellAdapter = shellAdapterFor(options);
  if (shellAdapter === undefined) {
    return unavailableV1Shell(route.id, options.environment);
  }

  let access: Awaited<ReturnType<ShellAdapter["resolveAccess"]>>;
  try {
    access = await shellAdapter.resolveAccess(route.shellMode);
  } catch (error) {
    console.error(JSON.stringify({
      event: "frontend.shell_context_failed",
      kind: error instanceof APIError ? error.kind : "unknown",
      code: error instanceof APIError ? error.code ?? "missing" : "missing",
    }));
    if (error instanceof APIError && error.code === "PROTECTED_NOT_FOUND") {
      return { kind: "protected-not-found" };
    }
    if (
      error instanceof APIError &&
      (error.kind === "forbidden" || error.kind === "unauthenticated")
    ) return { kind: "forbidden" };
    return {
      kind: "unavailable",
      reason: "The authenticated v1 shell context is unavailable.",
    };
  }
  if (!access.permissions.includes(route.permission)) {
    return { kind: "forbidden" };
  }

  if (route.shellMode === "external") {
    return {
      kind: "ready",
      route,
      routeParameters: parameters,
      permissions: access.permissions,
    };
  }

  const organization = await shellAdapter.resolveOrganization();
  const dealId = parameters.dealId;
  const deal = dealId ? await shellAdapter.resolveDeal(dealId) : undefined;
  if (deal === "inaccessible") return { kind: "protected-not-found" };
  if (deal === "unavailable") return { kind: "unavailable" };

  return {
    kind: "ready",
    route,
    routeParameters: parameters,
    permissions: access.permissions,
    organization,
    deal,
    counts: await shellAdapter.resolveCounts(),
  };
}

function shellAdapterFor(
  options: RouteContextOptions,
): ShellAdapter | undefined {
  if (options.dataSource === "fixture") return fixtureShellAdapter;
  const shell = adapterCanaryFor("application-shell", options.environment);
  if (shell.activation === "v1") return options.v1ShellAdapter;
  return shell.activation === "previous"
    ? options.previousShellAdapter
    : undefined;
}

function unavailableV1Shell(
  routeId: string,
  environment?: Readonly<Record<string, string | undefined>>,
): RouteResolution {
  const shell = adapterCanaryFor("application-shell", environment);
  if (shell.activation === "previous") {
    return {
      kind: "unavailable",
      reason: `The previous shell adapter is not registered for ${routeId}.`,
    };
  }
  return {
    kind: "unavailable",
    reason: shell.activation === "off"
      ? `The v1 shell read model is unavailable for ${routeId}; its route is not registered or configured.`
      : "The v1 shell read model requires its banker-facing contract before route context can be resolved.",
  };
}
