import {
  addDealParty,
  assignDealRole,
  authorityConstraintId,
  createDeal,
  type Deal,
  dealId,
  dealPartyId,
  dealRoleId,
  mandateId,
  setAuthorityConstraint,
  setMandate,
} from "../deal_management/v1.ts";
import { demoScope } from "../demo_readiness/runner.ts";
import { localMvpIdentity, type LocalMvpSqlPort } from "./identity_seed.ts";

export interface LocalMvpDealSeed {
  readonly id: string;
  readonly name: string;
  readonly dealType: string;
  readonly confidentiality: "standard" | "sensitive" | "highly_sensitive";
  readonly currency: "BRL";
  readonly focal?: true;
}

export const localMvpDeals: readonly LocalMvpDealSeed[] = Object.freeze([
  {
    id: demoScope.dealId,
    name: "Serra Azul synthetic sell-side mandate",
    dealType: "Sell-side / Diligence",
    confidentiality: "highly_sensitive",
    currency: "BRL",
    focal: true,
  },
  {
    id: "deal_project-copper",
    name: "Project Copper",
    dealType: "Sell-side / Preparation",
    confidentiality: "sensitive",
    currency: "BRL",
  },
  {
    id: "deal_project-summit",
    name: "Project Summit",
    dealType: "Buy-side / Screening",
    confidentiality: "standard",
    currency: "BRL",
  },
]);

/** Removes only mutable local Deal rows while retaining immutable evidence. */
export async function resetLocalMvpWorkspaceData(
  sql: LocalMvpSqlPort,
): Promise<void> {
  await sql.query(
    "DELETE FROM deal_management.deals WHERE tenant_id = $1 AND workspace_id = $2",
    [localMvpIdentity.tenantId, localMvpIdentity.workspaceId],
  );
}

/** Upserts the fictional banker portfolio used by the local product. */
export async function seedLocalMvpPortfolio(
  sql: LocalMvpSqlPort,
  now = new Date().toISOString(),
): Promise<void> {
  for (const [index, seed] of localMvpDeals.entries()) {
    const updatedAt = new Date(Date.parse(now) - index * 60_000).toISOString();
    await upsertLocalDeal(sql, buildDeal(seed, updatedAt));
  }
}

function buildDeal(seed: LocalMvpDealSeed, now: string): Deal {
  const deal = createDeal({
    id: dealId(seed.id),
    tenantId: demoScope.tenantId,
    workspaceId: demoScope.workspaceId,
    name: seed.name,
    dealType: seed.dealType,
    confidentiality: seed.confidentiality,
    currency: seed.currency,
    now,
  });
  return seed.focal === true ? completeFocalMandate(deal, now) : deal;
}

function completeFocalMandate(deal: Deal, now: string): Deal {
  let configured = addParties(deal, now);
  configured = setMandate(configured, {
    expectedVersion: configured.version,
    id: mandateId("mandate_serra-azul"),
    transactionValueCeiling: { amount: 250_000_000, currency: "BRL" },
    authorityCeiling: 8,
    now,
  });
  configured = assignRoles(configured, now);
  return setAuthorityConstraint(configured, {
    expectedVersion: configured.version,
    id: authorityConstraintId("constraint_human-proposal"),
    roleId: dealRoleId("dealrole_advisor"),
    action: "submit_proposal",
    authorityLevel: 8,
    humanOnly: true,
    now,
  });
}

function addParties(deal: Deal, now: string): Deal {
  const parties = [
    {
      id: "party_target",
      reference: { kind: "organization" as const, id: "org_serra-azul" },
      side: "target" as const,
      label: "Serra Azul Logistica S.A.",
    },
    {
      id: "party_advisor",
      reference: { kind: "organization" as const, id: "org_atlas-advisory" },
      side: "advisor" as const,
      label: "Atlas M&A Advisory",
    },
  ];
  return parties.reduce((current, party) =>
    addDealParty(current, {
      expectedVersion: current.version,
      id: dealPartyId(party.id),
      reference: party.reference,
      side: party.side,
      label: party.label,
      now,
    }), deal);
}

function assignRoles(deal: Deal, now: string): Deal {
  const roles = [
    {
      id: "dealrole_target",
      partyId: "party_target",
      name: "target" as const,
      authorityLevel: 2,
    },
    {
      id: "dealrole_advisor",
      partyId: "party_advisor",
      name: "advisor" as const,
      authorityLevel: 8,
    },
  ];
  return roles.reduce((current, role) =>
    assignDealRole(current, {
      expectedVersion: current.version,
      id: dealRoleId(role.id),
      partyId: dealPartyId(role.partyId),
      name: role.name,
      authorityLevel: role.authorityLevel,
      now,
    }), deal);
}

function upsertLocalDeal(
  sql: LocalMvpSqlPort,
  deal: Deal,
): Promise<{ readonly rowCount?: number | null }> {
  return sql.query(
    `INSERT INTO deal_management.deals
      (deal_id, tenant_id, workspace_id, version, state, document, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'draft', $5, $6, $6)
     ON CONFLICT (tenant_id, workspace_id, deal_id) DO UPDATE SET
       version = EXCLUDED.version, state = 'draft', document = EXCLUDED.document,
       updated_at = EXCLUDED.updated_at`,
    [
      deal.id,
      deal.tenantId,
      deal.workspaceId,
      deal.version,
      JSON.stringify(deal),
      deal.updatedAt,
    ],
  );
}
