import {
  readFamilyAdapter,
  type AdapterReadOptions,
} from "../runtime";
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
): Promise<AdapterResult<GlobalReadModel>> {
  return readFamilyAdapter(family, options);
}
