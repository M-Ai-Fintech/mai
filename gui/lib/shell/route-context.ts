import {
  fixtureShellAdapter,
  type DealContext,
  type OrganizationContext,
  type ShellCounts,
} from "./adapters";
import {
  matchRoute,
  navigationRoutes,
  routePath,
  type Permission,
  type RouteDefinition,
} from "./route-registry";

export type RouteResolution =
  | { readonly kind: "not-found" }
  | { readonly kind: "invalid-context"; readonly reason: string }
  | { readonly kind: "restricted" }
  | { readonly kind: "unavailable" }
  | {
      readonly kind: "ready";
      readonly route: RouteDefinition;
      readonly routeParameters: Readonly<Record<string, string>>;
      readonly permissions: readonly Permission[];
      readonly organization?: OrganizationContext;
      readonly deal?: DealContext;
      readonly counts?: ShellCounts;
    };

export type ShellNavigationState = "available" | "active" | "restricted" | "unavailable" | "disabled";

export interface ShellNavigationEntry {
  readonly routeId: string;
  readonly label: string;
  readonly state: ShellNavigationState;
  readonly href?: string;
  readonly section: "primary" | "secondary";
}

const identifier = /^[a-z0-9-]+$/;

function routeParameters(route: RouteDefinition, parts: readonly string[]): Readonly<Record<string, string>> {
  return Object.fromEntries(route.pattern.flatMap((segment, index) =>
    segment.startsWith(":") ? [[segment.slice(1), parts[index] ?? ""]] : [],
  ));
}

export function navigationForResolution(
  resolution: Extract<RouteResolution, { kind: "ready" }>,
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

export async function resolveRouteContext(parts: readonly string[]): Promise<RouteResolution> {
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
