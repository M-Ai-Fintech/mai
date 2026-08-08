import type { ActorReference } from "../platform/authz/v1.ts";
import type { ClosingTransaction } from "./repository.ts";

export type ClosingEffectKind = "audit" | "outbox" | "job";

export interface ClosingEffect {
  readonly effectId: string;
  readonly kind: ClosingEffectKind;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly dealId: string;
  readonly aggregateId: string;
  readonly aggregateVersion: number;
  readonly eventType: string;
  readonly actor: ActorReference;
  readonly authorityProofId?: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly occurredAt: string;
}

export interface ClosingEffects {
  append(transaction: ClosingTransaction, effect: ClosingEffect): Promise<void>;
}

export class NoopClosingEffects implements ClosingEffects {
  append(): Promise<void> {
    return Promise.resolve();
  }
}

export class PostgresClosingEffects implements ClosingEffects {
  async append(
    transaction: ClosingTransaction,
    effect: ClosingEffect,
  ): Promise<void> {
    const handle = transaction.handle;
    if (handle === undefined) return;
    await handle.query(
      `INSERT INTO closing.effect_records (
         effect_id, kind, tenant_id, workspace_id, deal_id, aggregate_id,
         aggregate_version, event_type, actor, authority_proof_id, payload,
         occurred_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (effect_id) DO NOTHING`,
      [
        effect.effectId,
        effect.kind,
        effect.tenantId,
        effect.workspaceId,
        effect.dealId,
        effect.aggregateId,
        effect.aggregateVersion,
        effect.eventType,
        JSON.stringify(effect.actor),
        effect.authorityProofId ?? null,
        JSON.stringify(effect.payload),
        effect.occurredAt,
      ],
    );
  }
}
