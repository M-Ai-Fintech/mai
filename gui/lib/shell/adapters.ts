import type { Permission, ShellMode } from "./route-registry";
export interface OrganizationContext { readonly id: string; readonly name: string; }
export interface DealContext { readonly id: string; readonly name: string; readonly phase: string; }
export interface ShellCounts { readonly tasks: number; readonly approvals: number; readonly notifications: number; }
export interface ShellAdapter { resolveOrganization(): Promise<OrganizationContext>; resolveDeal(dealId: string): Promise<DealContext | "unavailable" | "inaccessible">; resolveAccess(mode: ShellMode): Promise<{ readonly permissions: readonly Permission[] }>; resolveCounts(): Promise<ShellCounts>; }
/** Deterministic fixture only; it does not prove production authorization or resource existence. */
export const fixtureShellAdapter: ShellAdapter = { async resolveOrganization() { return { id: "fixture-org", name: "Demo Advisory" }; }, async resolveDeal(id) { return id === "demo-deal" ? { id, name: "Demo transaction", phase: "Diligence" } : "unavailable"; }, async resolveAccess(mode) { return { permissions: mode === "external" ? ["external"] : ["workspace", "deal", "administration"] }; }, async resolveCounts() { return { tasks: 3, approvals: 1, notifications: 2 }; } };
