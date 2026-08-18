import { z } from "zod";

import { APIError } from "@/lib/api-client/errors";
import { requestV1, type V1RequestOptions } from "@/lib/api-client/v1";
import type {
  DealContext,
  OrganizationContext,
  ShellAdapter,
  ShellCounts,
} from "./adapters";

const permissionSchema = z.enum([
  "workspace",
  "deal",
  "administration",
  "external",
]);

const workspaceShellSchema = z.object({
  organization: z.object({ id: z.string().min(1), name: z.string().min(1) }),
  permissions: z.array(permissionSchema).readonly(),
  counts: z.object({
    tasks: z.number().int().nonnegative().optional(),
    approvals: z.number().int().nonnegative().optional(),
    notifications: z.number().int().nonnegative().optional(),
  }),
});

const dealShellSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  state: z.string().min(1),
});

/** Resolves the operational shell and Deal context through authenticated v1. */
export function createWorkspaceShellAdapter(
  options: V1RequestOptions,
): ShellAdapter {
  const shell = requestV1(
    "/api/v1/workspace-shell",
    workspaceShellSchema,
    options,
  );
  return {
    resolveOrganization: async (): Promise<OrganizationContext> => {
      return (await shell).data.organization;
    },
    resolveAccess: async () => ({
      permissions: (await shell).data.permissions,
    }),
    resolveCounts: async (): Promise<ShellCounts> => {
      return (await shell).data.counts as ShellCounts;
    },
    resolveDeal: async (
      dealId,
    ): Promise<DealContext | "inaccessible" | "unavailable"> => {
      try {
        const response = await requestV1(
          `/api/v1/deals/${encodeURIComponent(dealId)}`,
          dealShellSchema,
          options,
        );
        return {
          id: response.data.id,
          name: response.data.name,
          phase: response.data.state,
        };
      } catch (error) {
        return error instanceof APIError && error.kind === "not_found"
          ? "inaccessible"
          : "unavailable";
      }
    },
  };
}
