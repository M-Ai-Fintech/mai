import type {
  ScreenFamily,
  ScreenFixture,
  ScreenState,
} from "./screen-contracts";
import type { Permission } from "@/lib/shell/route-registry";

const disclosure =
  "Local demonstration data only — not connected to production systems." as const;

/** Provides deliberately narrow local screen data; it cannot represent a backend claim. */
export function fixtureFor(
  family: ScreenFamily,
  requiredPermission: Permission,
  state: ScreenState = "default",
): ScreenFixture {
  return { family, requiredPermission, state, disclosure };
}

/** External data deliberately excludes internal deal strategy, findings, counts, organization metadata, and Copilot access. */
export interface ExternalParticipantFixture extends ScreenFixture {
  readonly role: "External Participant";
  readonly accessScope: "Requested documents and approval response only";
  readonly expiry: "Friday, 17:00";
}

export function externalFixture(
  state: ScreenState = "default",
): ExternalParticipantFixture {
  return {
    ...fixtureFor("external-participant", "external", state),
    role: "External Participant",
    accessScope: "Requested documents and approval response only",
    expiry: "Friday, 17:00",
  };
}
