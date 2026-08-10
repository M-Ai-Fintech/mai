import type { ActorReference } from "../platform/authz/v1.ts";
import type { IdempotencyKey, RequestContext } from "../platform/api/v1.ts";
import type { DiligenceDecisionService } from "../diligence_decisions/service.ts";
import type { FindingId } from "../diligence_decisions/ids.ts";
import type { FinancialRiskResult, FinancialRiskScope } from "./model.ts";

export interface FinancialRiskFindingProposalInput {
  readonly context: RequestContext;
  readonly scope: FinancialRiskScope;
  readonly actor: ActorReference;
  readonly assessment: FinancialRiskResult;
  readonly findingId: FindingId;
  readonly title: string;
  readonly statement: string;
  readonly idempotencyKey: IdempotencyKey;
}

export interface FinancialRiskFindingProposal {
  readonly findingId: FindingId;
  readonly state: "proposed";
  readonly version: number;
  readonly basisDigest: string;
  readonly commandStatus: "accepted" | "replayed";
}

export interface FinancialRiskFindingProposalPort {
  readonly context: "diligence_decisions";
  propose(
    input: FinancialRiskFindingProposalInput,
  ): Promise<FinancialRiskFindingProposal>;
}

export class DiligenceFinancialRiskFindingProposalAdapter
  implements FinancialRiskFindingProposalPort {
  readonly context = "diligence_decisions" as const;

  constructor(private readonly diligence: DiligenceDecisionService) {}

  async propose(
    input: FinancialRiskFindingProposalInput,
  ): Promise<FinancialRiskFindingProposal> {
    const command = await this.diligence.createFinding({
      context: input.context,
      scope: input.scope,
      id: input.findingId,
      title: input.title,
      statement: input.statement,
      basis: input.assessment.references.evidenceBasis,
      proposedBy: input.actor,
      idempotencyKey: input.idempotencyKey,
    });
    if (command.value.state !== "proposed") {
      throw new Error(
        `Diligence finding "${command.value.id}" returned state "${command.value.state}"; expected "proposed".`,
      );
    }
    return {
      findingId: command.value.id,
      state: "proposed",
      version: command.value.version,
      basisDigest: command.value.basis.basisDigest,
      commandStatus: command.status,
    };
  }
}
