import type { ContextMigration } from "./migration.ts";
import { platformMigrations } from "./migrations.ts";
import { auditActivityMigrations } from "../../audit_activity/migrations/index.ts";
import { valuationMigrations } from "../../valuation/migrations/index.ts";
import { matchingMigrations } from "../../matching/migrations/index.ts";
import { deliverablesMigrations } from "../../deliverables/migrations/index.ts";
import { closingMigrations } from "../../closing/migrations/index.ts";
import { dealGovernanceMigrations } from "../../deal_governance/migrations/index.ts";
import { dealManagementMigrations } from "../../deal_management/migrations/index.ts";
import { documentsMigrations } from "../../documents/migrations/index.ts";
import { evidenceKnowledgeMigrations } from "../../evidence_knowledge/migrations/index.ts";
import { identityAccessMigrations } from "../../identity_access/migrations/index.ts";
import { notificationMigrations } from "../../notifications/migrations/index.ts";
import { organizationRegistryMigrations } from "../../organization_registry/migrations/index.ts";
import { workManagementMigrations } from "../../work_management/migrations/index.ts";
import { negotiationMigrations } from "../../negotiation/migrations/index.ts";

/** The complete migration catalog used by the local pre-traffic command. */
export function registeredMigrations(): readonly ContextMigration[] {
  return [
    ...platformMigrations,
    ...auditActivityMigrations,
    ...valuationMigrations,
    ...matchingMigrations,
    ...deliverablesMigrations,
    ...closingMigrations,
    ...dealGovernanceMigrations,
    ...dealManagementMigrations,
    ...documentsMigrations,
    ...evidenceKnowledgeMigrations,
    ...identityAccessMigrations,
    ...notificationMigrations,
    ...organizationRegistryMigrations,
    ...workManagementMigrations,
    ...negotiationMigrations,
  ];
}
