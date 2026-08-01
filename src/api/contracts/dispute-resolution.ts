/** Versioned API access to the shared dispute-resolution contract. */
export {
  DISPUTE_RESOLUTION_SCHEMA_VERSION,
  disputeResolutionApiSchema,
  parseDisputeResolution,
  parseSerializedDisputeResolution,
  serializeDisputeResolution,
} from "../../shared/schemas/dispute-resolution.ts";

export type {
  ArbitrationInstitution,
  CanonicalArbitrationInstitution,
  CourtLitigationDisputeResolution,
  DisputeResolution,
  DisputeResolutionMechanism,
  VersionedDisputeResolution,
} from "../../shared/schemas/dispute-resolution.ts";
