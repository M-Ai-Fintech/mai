export type ShellMode = "global" | "deal" | "administration" | "external";
export type Availability = "available" | "unavailable";
export type Permission = "workspace" | "deal" | "administration" | "external";
export type NavigationSection = "primary" | "secondary";

export interface RouteNavigation {
  readonly modes: readonly ShellMode[];
  readonly order: number;
  readonly section: NavigationSection;
}

export interface RouteDefinition {
  readonly id: string;
  readonly label: string;
  readonly pattern: readonly string[];
  readonly shellMode: ShellMode;
  readonly navigationParent: string | null;
  readonly breadcrumbPolicy: ShellMode;
  readonly permission: Permission;
  readonly availability: Availability;
  readonly navigation?: RouteNavigation;
  readonly implementationStatus: "shell-placeholder";
  readonly authority: string;
  readonly deferredScreenOwner: string;
}

type RouteInput = Omit<
  RouteDefinition,
  "breadcrumbPolicy" | "implementationStatus" | "authority" | "deferredScreenOwner"
>;

function route(input: RouteInput): RouteDefinition {
  return {
    ...input,
    breadcrumbPolicy: input.shellMode,
    implementationStatus: "shell-placeholder",
    authority: "Figma v0.3 / MAI-98",
    deferredScreenOwner: "MAI-99+",
  };
}

const headerOnlyGlobalRoutes = new Set(["search", "approvals", "notifications"]);

const globalRoute = (
  name: string,
  label: string,
  order: number,
  options: Partial<Pick<RouteDefinition, "navigationParent" | "availability">> = {},
): RouteDefinition => route({
  id: `global.${name}`,
  label,
  pattern: [name],
  shellMode: "global",
  navigationParent: options.navigationParent ?? (name === "home" ? null : "global.home"),
  permission: "workspace",
  availability: options.availability ?? "available",
  navigation: headerOnlyGlobalRoutes.has(name)
    ? undefined
    : { modes: ["global"], order, section: "primary" },
});

const dealRoute = (name: string, label: string, order: number): RouteDefinition => route({
  id: `deal.${name}`,
  label,
  pattern: ["deals", ":dealId", name],
  shellMode: "deal",
  navigationParent: name === "overview" ? null : "deal.overview",
  permission: "deal",
  availability: "available",
  navigation: { modes: ["deal"], order, section: "primary" },
});

const administrationRoute = (name: string, label: string, order: number): RouteDefinition => route({
  id: `administration.${name}`,
  label,
  pattern: ["settings", name],
  shellMode: "administration",
  navigationParent: name === "profile" ? null : "administration.profile",
  permission: "administration",
  availability: "available",
  navigation: {
    modes: name === "profile" ? ["global", "administration"] : ["administration"],
    order: name === "profile" ? 90 : order,
    section: name === "profile" ? "secondary" : "primary",
  },
});

const externalRoute = (name: string, label: string, order: number): RouteDefinition => route({
  id: `external.${name}`,
  label,
  pattern: ["portal", "project", ":workspaceId", ...(name === "workspace" ? [] : [name])],
  shellMode: "external",
  navigationParent: name === "workspace" ? null : "external.workspace",
  permission: "external",
  availability: "available",
  navigation: { modes: ["external"], order, section: "primary" },
});

export const routeRegistry: readonly RouteDefinition[] = [
  globalRoute("home", "Home", 10),
  globalRoute("deals", "Deals", 20),
  globalRoute("organizations", "Organizations", 30),
  globalRoute("tasks", "Tasks", 40),
  globalRoute("team", "Team", 50),
  globalRoute("notifications", "Notifications", 60),
  globalRoute("search", "Search", 70),
  globalRoute("approvals", "Approvals", 80),
  dealRoute("overview", "Overview", 10),
  dealRoute("dossier", "Target dossier", 20),
  dealRoute("documents", "Documents", 30),
  dealRoute("diligence", "Decision room", 40),
  dealRoute("valuation", "Valuation", 50),
  dealRoute("matching", "Matching", 60),
  dealRoute("negotiation", "Negotiation", 70),
  dealRoute("closing", "Closing", 80),
  dealRoute("workspace", "Workspace", 90),
  dealRoute("activity", "Activity", 100),
  dealRoute("team", "Team", 110),
  dealRoute("deliverables", "Deliverables", 120),
  dealRoute("settings", "Deal settings", 130),
  administrationRoute("profile", "Administration", 10),
  administrationRoute("institution", "Institution", 20),
  administrationRoute("roles", "Roles", 30),
  administrationRoute("integrations", "Integrations", 40),
  administrationRoute("security", "Security", 50),
  administrationRoute("templates", "Templates", 60),
  administrationRoute("commercial", "Commercial", 70),
  administrationRoute("audit", "Audit", 80),
  administrationRoute("developers", "Developers", 90),
  externalRoute("workspace", "Shared workspace", 10),
  externalRoute("requests", "Requests", 20),
  externalRoute("approvals", "Approvals", 30),
  route({
    id: "external.submit",
    label: "Submit documents",
    pattern: ["submit", ":submissionToken"],
    shellMode: "external",
    navigationParent: null,
    permission: "external",
    availability: "available",
  }),
];

export const shellEntryRouteIds = [
  "global.search",
  "global.tasks",
  "global.approvals",
  "global.notifications",
] as const;

export function matchRoute(parts: readonly string[]): RouteDefinition | undefined {
  return routeRegistry.find((item) => item.pattern.length === parts.length && item.pattern.every(
    (segment, index) => segment.startsWith(":") || segment === parts[index],
  ));
}

export function routePatternConflicts(routes: readonly RouteDefinition[] = routeRegistry): string[] {
  return routes.flatMap((candidate, index) => routes.slice(index + 1).flatMap((other) =>
    candidate.pattern.length === other.pattern.length && candidate.pattern.every(
      (segment, part) => segment.startsWith(":") || other.pattern[part]?.startsWith(":") || segment === other.pattern[part],
    ) ? [`${candidate.id}/${other.id}`] : [],
  ));
}

export function navigationRoutes(mode: ShellMode): readonly RouteDefinition[] {
  return routeRegistry
    .filter((definition) => definition.navigation?.modes.includes(mode))
    .toSorted((left, right) => (left.navigation?.order ?? 0) - (right.navigation?.order ?? 0));
}

export function shellEntryRoutes(): readonly RouteDefinition[] {
  return shellEntryRouteIds.map((id) => {
    const definition = routeRegistry.find((candidate) => candidate.id === id);
    if (!definition) throw new Error(`Shell entry route ${id} is missing.`);
    return definition;
  });
}

export function routePath(
  definition: RouteDefinition,
  parameters: Readonly<Record<string, string | undefined>> = {},
): string | undefined {
  const resolved: string[] = [];
  for (const segment of definition.pattern) {
    if (!segment.startsWith(":")) {
      resolved.push(segment);
      continue;
    }
    const value = parameters[segment.slice(1)];
    if (!value) return undefined;
    resolved.push(value);
  }
  return `/${resolved.join("/")}`;
}
