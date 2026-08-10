import {
  readFamilyAdapter,
  type AdapterReadOptions,
} from "../runtime";
import type { AdapterReadModel, AdapterResult } from "../contracts";

export type DealIntelligenceFamily =
  | "deal-overview"
  | "target-dossier"
  | "documents-vdr"
  | "diligence-decision-room"
  | "valuation-lab"
  | "matching-universe";

export const dealIntelligenceFamilies: readonly DealIntelligenceFamily[] = [
  "deal-overview",
  "target-dossier",
  "documents-vdr",
  "diligence-decision-room",
  "valuation-lab",
  "matching-universe",
];

export function isDealIntelligenceFamily(
  value: string,
): value is DealIntelligenceFamily {
  return dealIntelligenceFamilies.includes(value as DealIntelligenceFamily);
}

export function readDealIntelligenceFamily(
  family: DealIntelligenceFamily,
  options: AdapterReadOptions = {},
): Promise<AdapterResult<AdapterReadModel>> {
  return readFamilyAdapter(family, options);
}
