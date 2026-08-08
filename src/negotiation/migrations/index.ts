import { negotiationControlMigration } from "./negotiation_0001.ts";
import { negotiationEvidenceMigration } from "./negotiation_0002_evidence.ts";

export { negotiationControlMigration, negotiationEvidenceMigration };

export const negotiationMigrations = Object.freeze([
  negotiationControlMigration,
  negotiationEvidenceMigration,
]);
