import { type AdapterReadOptions, readFamilyAdapter } from "../runtime";
import type { AdapterReadModel, AdapterResult } from "../contracts";

export type GlobalFamily =
  | "command-center"
  | "deals-portfolio"
  | "new-deal-setup"
  | "tasks-approvals"
  | "notification-center"
  | "global-search"
  | "organizations"
  | "organization-detail"
  | "team-workspace"
  | "settings-family"
  | "external-participant";

export type GlobalReadModel = AdapterReadModel;

export function readGlobalFamily(
  family: GlobalFamily,
  options: AdapterReadOptions = {},
  previousAdapter?: () => Promise<AdapterResult<GlobalReadModel>>,
): Promise<AdapterResult<GlobalReadModel>> {
  return readFamilyAdapter(family, options, previousAdapter);
}
