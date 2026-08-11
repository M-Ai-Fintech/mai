import { requestV1, type V1RequestOptions } from "@/lib/api-client/v1";
import { z } from "zod";
import type {
  DealContext,
  OrganizationContext,
  ShellAdapter,
  ShellCounts,
} from "./adapters";

const shellSchema = z.object({
  organization: z.object({ id: z.string().min(1), name: z.string().min(1) }),
  deal: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    phase: z.string().min(1),
  }),
  permissions: z.array(z.enum(["workspace", "deal"])).readonly(),
  counts: z.object({
    tasks: z.number().int().nonnegative(),
    approvals: z.number().int().nonnegative(),
    notifications: z.number().int().nonnegative(),
  }),
});

/** Resolves shell identity only after the protected demo projection succeeds.
 *
 * @example createDemoReadinessShellAdapter("deal_serra-azul", { headers })
 */
export function createDemoReadinessShellAdapter(
  dealId: string,
  options: V1RequestOptions,
): ShellAdapter {
  const projection = requestV1(
    `/api/v1/demo-readiness/deals/${encodeURIComponent(dealId)}/shell`,
    shellSchema,
    options,
  );
  return {
    resolveOrganization: async (): Promise<OrganizationContext> => {
      return (await projection).data.organization;
    },
    resolveDeal: async (requestedId): Promise<DealContext | "unavailable"> => {
      if (requestedId !== dealId) return "unavailable";
      const response = await projection;
      return response.data.deal.id === requestedId
        ? response.data.deal
        : "unavailable";
    },
    resolveAccess: async () => {
      return { permissions: (await projection).data.permissions };
    },
    resolveCounts: async (): Promise<ShellCounts> => {
      return (await projection).data.counts;
    },
  };
}
