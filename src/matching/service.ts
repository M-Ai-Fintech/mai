import {
  activateCriteriaCommand,
  createCriteriaCommand,
  executeRunCommand,
  startRunCommand,
} from "./criteria_run_commands.ts";
import {
  authorizeOutreachCommand,
  clearRestrictionCommand,
  decideShortlistCommand,
  openConflictCommand,
  openRestrictionCommand,
  resolveConflictCommand,
  revokeOutreachCommand,
} from "./conflict_commands.ts";
import { readCandidate, readConflict } from "./reads.ts";
import type { MatchingRuntime } from "./runtime.ts";
import type {
  ActivateCriteriaInput,
  CandidateReadInput,
  CandidateReadView,
  ClearRestrictionInput,
  ConflictCommandInput,
  ConflictReadInput,
  ConflictReadView,
  CreateConflictInput,
  CreateCriteriaInput,
  MatchingServiceConfig,
  OutreachCommandInput,
  RestrictionCommandInput,
  RevokeOutreachInput,
  RunExecutionInput,
  ShortlistCommandInput,
  StartRunInput,
  StartRunResult,
} from "./service_contracts.ts";
import type {
  CandidateRestriction,
  MatchingConflict,
  MatchingCriteria,
  MatchingRun,
  OutreachAuthorization,
  ShortlistDecision,
} from "./model.ts";

export class MatchingService {
  private readonly runtime: MatchingRuntime;

  constructor(config: MatchingServiceConfig) {
    this.runtime = config;
  }

  createCriteria(input: CreateCriteriaInput): Promise<MatchingCriteria> {
    return createCriteriaCommand(this.runtime, input);
  }

  activateCriteria(input: ActivateCriteriaInput): Promise<MatchingCriteria> {
    return activateCriteriaCommand(this.runtime, input);
  }

  startRun(input: StartRunInput): Promise<StartRunResult> {
    return startRunCommand(this.runtime, input);
  }

  executeRun(input: RunExecutionInput): Promise<MatchingRun> {
    return executeRunCommand(this.runtime, input);
  }

  readCandidate(input: CandidateReadInput): Promise<CandidateReadView> {
    return readCandidate(this.runtime, input);
  }

  readConflict(input: ConflictReadInput): Promise<ConflictReadView> {
    return readConflict(this.runtime, input);
  }

  openConflict(input: CreateConflictInput): Promise<MatchingConflict> {
    return openConflictCommand(this.runtime, input);
  }

  resolveConflict(input: ConflictCommandInput): Promise<MatchingConflict> {
    return resolveConflictCommand(this.runtime, input);
  }

  openRestriction(
    input: RestrictionCommandInput,
  ): Promise<CandidateRestriction> {
    return openRestrictionCommand(this.runtime, input);
  }

  clearRestriction(
    input: ClearRestrictionInput,
  ): Promise<CandidateRestriction> {
    return clearRestrictionCommand(this.runtime, input);
  }

  decideShortlist(input: ShortlistCommandInput): Promise<ShortlistDecision> {
    return decideShortlistCommand(this.runtime, input);
  }

  authorizeOutreach(
    input: OutreachCommandInput,
  ): Promise<OutreachAuthorization> {
    return authorizeOutreachCommand(this.runtime, input);
  }

  revokeOutreach(input: RevokeOutreachInput): Promise<OutreachAuthorization> {
    return revokeOutreachCommand(this.runtime, input);
  }
}
