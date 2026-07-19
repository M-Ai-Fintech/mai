import {
  type EntityInput,
  MVP_SEED_IDS,
  MvpStoreError,
} from "../../../src/api/mvp_store.ts";
import { EntityRole, KybStatus } from "../../../src/api/contracts.ts";
import { assertEquals, assertThrows } from "@std/assert";

export const newEntity = (
  overrides: Partial<EntityInput> = {},
): EntityInput => ({
  legalName: "Cobalt Software Ltda.",
  taxId: "11.222.333/0001-44",
  sector: "saas",
  countryCode: "BR",
  roles: [EntityRole.Target],
  contactEmail: "deals@cobalt.example",
  kybStatus: KybStatus.Pending,
  regulatoryClearanceRequired: false,
  primaryAdvisorId: MVP_SEED_IDS.advisorAna,
  ...overrides,
});

export function expectStoreError(
  action: () => unknown,
  code: MvpStoreError["code"],
  status: number,
): MvpStoreError {
  const error = assertThrows(action, MvpStoreError);
  assertEquals(error.code, code);
  assertEquals(error.status, status);
  return error;
}
