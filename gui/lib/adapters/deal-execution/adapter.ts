import {
  readFamilyAdapter,
  type AdapterReadOptions,
} from "../runtime";
import type { AdapterReadModel, AdapterResult } from "../contracts";

export type DealExecutionFamily =
  | "negotiation-room"
  | "closing-control-room"
  | "agentic-workspace"
  | "deal-activity-audit"
  | "deal-team-access"
  | "deliverables-exports"
  | "deal-settings-archive";

export const dealExecutionFamilies: readonly DealExecutionFamily[] = [
  "negotiation-room",
  "closing-control-room",
  "agentic-workspace",
  "deal-activity-audit",
  "deal-team-access",
  "deliverables-exports",
  "deal-settings-archive",
];

export function isDealExecutionFamily(
  value: string,
): value is DealExecutionFamily {
  return dealExecutionFamilies.includes(value as DealExecutionFamily);
}

export function readDealExecutionFamily(
  family: DealExecutionFamily,
  options: AdapterReadOptions = {},
): Promise<AdapterResult<AdapterReadModel>> {
  return readFamilyAdapter(family, options);
}
