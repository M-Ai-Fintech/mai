import type {
  Deal,
  DealAuthorizationPort,
  DealCommandContext,
  DealProjection,
  DealScope,
} from "./contracts.ts";
import { dealScope, requestedDealFields } from "./contracts.ts";
import { DEAL_ACTION, DEAL_RESOURCE } from "./service.ts";
import type { AllowedAuthorizationDecision } from "../platform/authz/v1.ts";
import { projectDeal } from "./projection.ts";
import type { DealRepository } from "./repository.ts";
import type {
  DealReconciliationRecord,
  DealReconciliationStore,
  LegacyDealMapper,
  LegacyDealSource,
  LegacyMappingIssue,
} from "./legacy_contracts.ts";

export type CompatibilityReadSource = "authoritative" | "legacy";

export type CompatibilityReadResult =
  | {
    readonly kind: "loaded";
    readonly source: CompatibilityReadSource;
    readonly value: DealProjection;
    readonly authorization: AllowedAuthorizationDecision;
    readonly routing: CompatibilityRoutingMetadata;
  }
  | {
    readonly kind: "protected_not_found";
  }
  | {
    readonly kind: "mapping_issue";
    readonly issue: LegacyMappingIssue;
  };

/**
 * Selects one explicit Deal read source from persisted reconciliation state.
 *
 * It authorizes before loading either source, never merges legacy and
 * authoritative fields, and performs no implicit fallback after a selected
 * source fails.
 *
 * @example const result = await reader.read({ context, legacySource, legacyDealId })
 */
export class CompatibilityDealReader {
  constructor(
    private readonly authoritative: DealRepository,
    private readonly legacy: LegacyDealSource,
    private readonly mapper: LegacyDealMapper,
    private readonly reconciliation: DealReconciliationStore,
    private readonly authorization: DealAuthorizationPort,
  ) {}

  async read(input: {
    readonly context: DealCommandContext;
    readonly legacySource: string;
    readonly legacyDealId: string;
  }): Promise<CompatibilityReadResult> {
    const scope = dealScope(input.context);
    const logicalAuthorization = await this.authorize(
      input.context,
      scope,
      input.legacyDealId,
    );
    if (logicalAuthorization === undefined) {
      return { kind: "protected_not_found" };
    }
    const routing = await this.reconciliation.find({
      scope,
      legacySource: input.legacySource,
      legacyDealId: input.legacyDealId,
    });
    const targetId = routing?.authoritativeDealId ?? input.legacyDealId;
    const authorization = targetId === input.legacyDealId
      ? logicalAuthorization
      : await this.authorize(input.context, scope, targetId);
    if (authorization === undefined) return { kind: "protected_not_found" };
    if (routing !== undefined && shouldReadAuthoritative(routing)) {
      return await this.readAuthoritative(scope, routing, authorization);
    }
    return await this.readLegacy(input, scope, routing, authorization);
  }

  /**
   * Reads by authoritative identity while respecting an explicit rollback
   * route recorded for the corresponding legacy source.
   *
   * @example await reader.readByAuthoritative({ context, authoritativeDealId })
   */
  async readByAuthoritative(input: {
    readonly context: DealCommandContext;
    readonly authoritativeDealId: Deal["id"];
  }): Promise<CompatibilityReadResult> {
    const scope = dealScope(input.context);
    const authorization = await this.authorize(
      input.context,
      scope,
      input.authoritativeDealId,
    );
    if (authorization === undefined) return { kind: "protected_not_found" };
    const routing = await this.reconciliation.findByAuthoritativeId({
      scope,
      authoritativeDealId: input.authoritativeDealId,
    });
    if (routing === undefined) return { kind: "protected_not_found" };
    return await this.read({
      context: input.context,
      legacySource: routing.legacySource,
      legacyDealId: routing.legacyDealId,
    });
  }

  /**
   * Exposes one Deal's persisted compatibility route for operator evidence.
   *
   * @example await reader.routingState({ context, legacySource, legacyDealId })
   */
  async routingState(input: {
    readonly context: DealCommandContext;
    readonly legacySource: string;
    readonly legacyDealId: string;
  }): Promise<CompatibilityRoutingMetadata | undefined> {
    const scope = dealScope(input.context);
    const authorization = await this.authorize(
      input.context,
      scope,
      input.legacyDealId,
    );
    if (authorization === undefined) return undefined;
    const routing = await this.reconciliation.find({
      scope,
      legacySource: input.legacySource,
      legacyDealId: input.legacyDealId,
    });
    return routing === undefined
      ? undefined
      : sanitizeRouting(routing, routing.routingMode);
  }

  private async authorize(
    context: DealCommandContext,
    scope: DealScope,
    targetId: string,
  ): Promise<AllowedAuthorizationDecision | undefined> {
    const decision = await this.authorization.authorize({
      context,
      scope,
      resource: { kind: DEAL_RESOURCE, id: targetId },
      action: DEAL_ACTION.read,
      requestedFields: requestedDealFields(),
    });
    return decision.outcome === "allow" ? decision : undefined;
  }

  private async readAuthoritative(
    scope: DealScope,
    routing: DealReconciliationRecord,
    authorization: AllowedAuthorizationDecision,
  ): Promise<CompatibilityReadResult> {
    if (routing.authoritativeDealId === undefined) {
      return { kind: "protected_not_found" };
    }
    const deal = await this.authoritative.find(
      scope,
      routing.authoritativeDealId,
    );
    if (deal === undefined) return { kind: "protected_not_found" };
    return loadedResult("authoritative", deal, authorization, routing);
  }

  private async readLegacy(
    input: {
      readonly context: DealCommandContext;
      readonly legacySource: string;
      readonly legacyDealId: string;
    },
    scope: DealScope,
    routing: DealReconciliationRecord | undefined,
    authorization: AllowedAuthorizationDecision,
  ): Promise<CompatibilityReadResult> {
    const record = await this.legacy.load({
      scope,
      legacyDealId: input.legacyDealId,
    });
    if (record === undefined) return { kind: "protected_not_found" };
    if (record.source !== input.legacySource) {
      return {
        kind: "mapping_issue",
        issue: sourceMismatch(input, record.source),
      };
    }
    const mapping = await this.mapper.map({
      record,
      scope,
      now: input.context.now,
    });
    if (mapping.kind !== "mapped") {
      return { kind: "mapping_issue", issue: mapping.issue };
    }
    return loadedResult("legacy", mapping.deal, authorization, routing);
  }
}

export interface CompatibilityRoutingMetadata {
  readonly source: CompatibilityReadSource;
  readonly routingMode: "authoritative" | "legacy";
}

function loadedResult(
  source: CompatibilityReadSource,
  deal: Deal,
  authorization: AllowedAuthorizationDecision,
  routing: DealReconciliationRecord | undefined,
): CompatibilityReadResult {
  return {
    kind: "loaded",
    source,
    value: projectDeal(deal, authorization.fieldMask),
    authorization,
    routing: sanitizeRouting(routing, source),
  };
}

function sanitizeRouting(
  routing: DealReconciliationRecord | undefined,
  source: CompatibilityReadSource,
): CompatibilityRoutingMetadata {
  return { source, routingMode: routing?.routingMode ?? source };
}

function sourceMismatch(
  input: { readonly legacyDealId: string; readonly legacySource: string },
  receivedSource: string,
): LegacyMappingIssue {
  return {
    code: "SCOPE_MISMATCH",
    legacyDealId: input.legacyDealId,
    received: receivedSource,
    expected: input.legacySource,
    explanation: "The selected legacy adapter returned a different source.",
    operatorInterventionRequired: true,
    retrySafe: false,
  };
}

function shouldReadAuthoritative(
  routing: DealReconciliationRecord | undefined,
): boolean {
  return routing?.status === "verified" &&
    routing.routingMode === "authoritative" &&
    routing.authoritativeDealId !== undefined;
}
