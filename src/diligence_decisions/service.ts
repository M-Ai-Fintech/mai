import type {
  ChangeDecisionCommand,
  CommandResult,
  CreateDecisionRequestCommand,
  CreateFindingCommand,
  CreateImpactCommand,
  DiligenceDecisionServiceConfig,
  RecordDecisionCommand,
  RequestDecisionCommand,
  SupersedeDecisionCommand,
  TransitionFindingCommand,
  TransitionImpactCommand,
} from "./contracts.ts";
import { createCommandDependencies } from "./command_support.ts";
import { DiligenceDecisionCommands } from "./decision_commands.ts";
import { DiligenceProposalCommands } from "./proposal_commands.ts";
import { DiligenceDecisionQueries } from "./query_service.ts";
import type {
  DecisionProjection,
  DecisionRecord,
  DecisionRequest,
  DiligenceScope,
  Finding,
  Impact,
} from "./model.ts";
import type {
  DecisionRecordId,
  DecisionRequestId,
  FindingId,
  ImpactId,
} from "./ids.ts";
import type { RequestContext } from "../platform/api/v1.ts";

export type {
  ChangeDecisionCommand,
  CommandResult,
  CreateDecisionRequestCommand,
  CreateFindingCommand,
  CreateImpactCommand,
  DiligenceDecisionServiceConfig,
  RecordDecisionCommand,
  RequestDecisionCommand,
  SupersedeDecisionCommand,
  TransitionFindingCommand,
  TransitionImpactCommand,
} from "./contracts.ts";

export class DiligenceDecisionService {
  private readonly proposals: DiligenceProposalCommands;
  private readonly decisions: DiligenceDecisionCommands;
  private readonly queries: DiligenceDecisionQueries;

  constructor(config: DiligenceDecisionServiceConfig) {
    const dependencies = createCommandDependencies(config);
    this.proposals = new DiligenceProposalCommands(dependencies);
    this.decisions = new DiligenceDecisionCommands(dependencies);
    this.queries = new DiligenceDecisionQueries(dependencies);
  }

  createFinding(input: CreateFindingCommand): Promise<CommandResult<Finding>> {
    return this.proposals.createFinding(input);
  }

  createImpact(input: CreateImpactCommand): Promise<CommandResult<Impact>> {
    return this.proposals.createImpact(input);
  }

  createDecisionRequest(
    input: CreateDecisionRequestCommand,
  ): Promise<CommandResult<DecisionRequest>> {
    return this.proposals.createDecisionRequest(input);
  }

  transitionFinding(
    input: TransitionFindingCommand,
  ): Promise<CommandResult<Finding>> {
    return this.proposals.transitionFinding(input);
  }

  transitionImpact(
    input: TransitionImpactCommand,
  ): Promise<CommandResult<Impact>> {
    return this.proposals.transitionImpact(input);
  }

  requestDecision(
    input: RequestDecisionCommand,
  ): Promise<CommandResult<DecisionRequest>> {
    return this.decisions.requestDecision(input);
  }

  recordDecision(
    input: RecordDecisionCommand,
  ): Promise<CommandResult<DecisionRecord>> {
    return this.decisions.recordDecision(input);
  }

  invalidateDecision(
    input: ChangeDecisionCommand,
  ): Promise<CommandResult<DecisionProjection>> {
    return this.decisions.invalidateDecision(input);
  }

  supersedeDecision(
    input: SupersedeDecisionCommand,
  ): Promise<CommandResult<DecisionProjection>> {
    return this.decisions.supersedeDecision(input);
  }

  getFinding(
    context: RequestContext,
    scope: DiligenceScope,
    id: FindingId,
  ): Promise<Finding> {
    return this.queries.getFinding(context, scope, id);
  }

  getImpact(
    context: RequestContext,
    scope: DiligenceScope,
    id: ImpactId,
  ): Promise<Impact> {
    return this.queries.getImpact(context, scope, id);
  }

  getDecisionRequest(
    context: RequestContext,
    scope: DiligenceScope,
    id: DecisionRequestId,
  ): Promise<DecisionRequest> {
    return this.queries.getDecisionRequest(context, scope, id);
  }

  getDecisionRecord(
    context: RequestContext,
    scope: DiligenceScope,
    id: DecisionRecordId,
  ): Promise<DecisionRecord> {
    return this.queries.getDecisionRecord(context, scope, id);
  }

  getDecisionProjection(
    context: RequestContext,
    scope: DiligenceScope,
    id: DecisionRequestId,
  ): Promise<DecisionProjection> {
    return this.queries.getDecisionProjection(context, scope, id);
  }
}
