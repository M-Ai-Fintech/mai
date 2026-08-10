import type { ActorReference } from "../../platform/authz/v1.ts";
import {
  type IdempotencyKey,
  parseIdempotencyKey,
  type RequestContext,
} from "../../platform/api/v1.ts";
import {
  type FindingId,
  parseFindingId,
} from "../../diligence_decisions/ids.ts";
import { FinancialRiskApplication } from "../../financial_risk/application.ts";
import type { FinancialRiskAuthorizedRead } from "../../financial_risk/application.ts";
import { FinancialRiskError } from "../../financial_risk/errors.ts";
import type {
  FinancialRiskFindingProposal,
  FinancialRiskFindingProposalPort,
} from "../../financial_risk/finding_proposal.ts";
import {
  type FinancialRiskAssessmentId,
  parseFinancialRiskAssessmentId,
} from "../../financial_risk/ids.ts";
import type { FinancialRiskResult } from "../../financial_risk/model.ts";
import {
  financialRiskFieldGranted,
  projectFinancialRiskResult,
} from "../../financial_risk/projection.ts";
import type {
  AuthorizedToolInvocation,
  ToolDefinition,
  ToolOutput,
} from "../../agent_runtime/tool_gateway.ts";
import type {
  RuntimeActor,
  RuntimeScope,
  SourceVersionReference,
} from "../../agent_runtime/model.ts";

export const FINANCIAL_RISK_TOOL_NAMES = Object.freeze({
  assessment: "governed.financial-risk.assessment",
  findingProposal: "governed.financial-risk.finding-proposal",
});

const READ_ACTION = "read_financial_risk_assessment";
const PROPOSAL_ACTION = "propose_financial_risk_finding";

export class GovernedFinancialRiskAssessmentTool implements ToolDefinition {
  readonly name = FINANCIAL_RISK_TOOL_NAMES.assessment;
  readonly capability = "read" as const;

  constructor(private readonly application: FinancialRiskApplication) {}

  async execute(invocation: AuthorizedToolInvocation): Promise<ToolOutput> {
    const assessmentId = validAssessment(invocation, READ_ACTION, this.name);
    if (assessmentId === undefined) {
      return denied(this.capability, "INVALID_INPUT");
    }
    try {
      const authorized = await this.application.read(
        invocation.context,
        runtimeActor(invocation.actor),
        assessmentId,
      );
      return readOutput(this.capability, authorized);
    } catch (error) {
      return errorOutput(this.capability, error);
    }
  }
}

export class GovernedFinancialRiskFindingProposalTool
  implements ToolDefinition {
  readonly name = FINANCIAL_RISK_TOOL_NAMES.findingProposal;
  readonly capability = "proposal" as const;

  constructor(
    private readonly application: FinancialRiskApplication,
    private readonly findingProposals?: FinancialRiskFindingProposalPort,
  ) {}

  async execute(invocation: AuthorizedToolInvocation): Promise<ToolOutput> {
    const assessmentId = validAssessment(
      invocation,
      PROPOSAL_ACTION,
      this.name,
    );
    if (assessmentId === undefined) {
      return denied(this.capability, "INVALID_INPUT");
    }
    const title = textInput(invocation.input.title, 512);
    const statement = textInput(invocation.input.statement, 4096);
    if (title === undefined || statement === undefined) {
      return denied(this.capability, "INVALID_INPUT");
    }
    const findingId = parseOptionalFindingId(invocation.input.findingId);
    const idempotencyKey = parseOptionalIdempotencyKey(
      invocation.input.idempotencyKey,
    );
    if (this.findingProposals !== undefined) {
      if (findingId === undefined || idempotencyKey === undefined) {
        return denied(this.capability, "INVALID_INPUT");
      }
    }
    try {
      const authorized = await this.application.read(
        invocation.context,
        runtimeActor(invocation.actor),
        assessmentId,
      );
      return await proposalOutput(
        this.capability,
        authorized,
        title,
        statement,
        findingId,
        idempotencyKey,
        invocation,
        this.findingProposals,
      );
    } catch (error) {
      return errorOutput(this.capability, error);
    }
  }
}

export function createGovernedFinancialRiskTools(
  application: FinancialRiskApplication,
  findingProposals?: FinancialRiskFindingProposalPort,
): readonly ToolDefinition[] {
  return Object.freeze([
    new GovernedFinancialRiskAssessmentTool(application),
    new GovernedFinancialRiskFindingProposalTool(application, findingProposals),
  ]);
}

function validAssessment(
  invocation: AuthorizedToolInvocation,
  expectedAction: string,
  expectedToolName: string,
): FinancialRiskAssessmentId | undefined {
  if (
    invocation.toolName !== expectedToolName ||
    invocation.action !== expectedAction ||
    invocation.resourceKind !== "financial-risk-assessment" &&
      invocation.resourceKind !== "agent_tool" ||
    !sameScope(invocation.context, invocation.scope)
  ) return undefined;
  const requested = invocation.input.assessmentId;
  const resourceId = invocation.resourceKind === "agent_tool"
    ? requested
    : invocation.resourceId;
  const parsed = parseFinancialRiskAssessmentId(resourceId);
  if (!parsed.ok) return undefined;
  if (
    invocation.resourceKind === "financial-risk-assessment" &&
    requested !== undefined && requested !== parsed.value
  ) return undefined;
  return parsed.value;
}

function readOutput(
  capability: "read" | "proposal",
  authorized: FinancialRiskAuthorizedRead,
): ToolOutput {
  const result = authorized.result;
  const projected = projectFinancialRiskResult(
    result,
    authorized.authorization,
  );
  return {
    kind: capability,
    value: {
      status: stateStatus(result.state),
      reasonCode: result.reason ?? result.state,
      authoritative: false,
      ...projected,
    },
    ...(financialRiskFieldGranted(authorized.authorization, "references")
      ? { discoveredSourceVersions: sourceReceipts(result) }
      : {}),
  };
}

async function proposalOutput(
  capability: "proposal",
  authorized: FinancialRiskAuthorizedRead,
  title: string,
  statement: string,
  findingId: FindingId | undefined,
  idempotencyKey: IdempotencyKey | undefined,
  invocation: AuthorizedToolInvocation,
  findingProposals: FinancialRiskFindingProposalPort | undefined,
): Promise<ToolOutput> {
  const result = authorized.result;
  const read = readOutput(capability, authorized);
  if (!financialRiskFieldGranted(authorized.authorization, "references")) {
    return denied(capability, "FIELD_SCOPE_DENIED");
  }
  if (result.state !== "completed" && result.state !== "fallback") return read;
  if (findingProposals === undefined) {
    return proposalOnlyOutput(read, title, statement);
  }
  if (findingProposals.context !== "diligence_decisions") {
    return denied(capability, "INVALID_CONFIGURATION");
  }
  if (findingId === undefined || idempotencyKey === undefined) {
    return denied(capability, "INVALID_INPUT");
  }
  const finding = await findingProposals.propose({
    context: invocation.context,
    scope: result.scope,
    actor: runtimeActor(invocation.actor),
    assessment: result,
    findingId,
    title,
    statement,
    idempotencyKey,
  });
  return proposalOnlyOutput(read, title, statement, finding);
}

function proposalOnlyOutput(
  read: ToolOutput,
  title: string,
  statement: string,
  finding?: FinancialRiskFindingProposal,
): ToolOutput {
  const proposal: Record<string, unknown> = {
    proposalType: "financial-risk-finding",
    title,
    statement,
    proposalOnly: true,
    authoritative: false,
    persisted: finding !== undefined,
    approved: false,
    final: false,
    humanAuthorityRequired: true,
  };
  copyIfPresent(read.value, proposal, "assessmentId");
  copyIfPresent(read.value, proposal, "state", "assessmentState");
  copyIfPresent(read.value, proposal, "provenance");
  copyIfPresent(read.value, proposal, "scope");
  if (read.discoveredSourceVersions !== undefined) {
    proposal.sourceReceipts = read.discoveredSourceVersions;
  }
  if (finding !== undefined) proposal.finding = finding;
  return {
    ...read,
    value: {
      ...read.value,
      status: "proposal",
      proposal,
    },
  };
}

function copyIfPresent(
  source: Readonly<Record<string, unknown>>,
  target: Record<string, unknown>,
  sourceKey: string,
  targetKey = sourceKey,
): void {
  if (source[sourceKey] !== undefined) target[targetKey] = source[sourceKey];
}

function errorOutput(
  capability: "read" | "proposal",
  error: unknown,
): ToolOutput {
  const code = error instanceof FinancialRiskError
    ? error.code
    : "DEPENDENCY_UNAVAILABLE";
  const status = code === "PROTECTED_NOT_FOUND" || code === "ACTOR_DENIED"
    ? "not_found"
    : code === "STALE_VERSION" || code === "EXACT_VERSION_MISMATCH"
    ? "stale"
    : "unavailable";
  return {
    kind: capability,
    value: {
      status,
      reasonCode: code,
      authoritative: false,
    },
  };
}

function denied(
  capability: "read" | "proposal",
  reasonCode: string,
): ToolOutput {
  return {
    kind: capability,
    value: { status: "denied", reasonCode, authoritative: false },
  };
}

function sourceReceipts(
  result: FinancialRiskResult,
): readonly SourceVersionReference[] {
  const receipts: SourceVersionReference[] = [];
  for (const reference of result.references.financialData) {
    receipts.push({
      sourceType: "financial_data",
      sourceId: reference.sourceId,
      version: reference.version as SourceVersionReference["version"],
      checksum: reference.checksum,
    });
  }
  for (const reference of result.references.evidenceBasis.references) {
    if (reference.kind === "document_version") {
      receipts.push({
        sourceType: "document_version",
        sourceId: reference.reference.documentVersionId,
        version: reference.reference
          .processingVersion as unknown as SourceVersionReference["version"],
        checksum: reference.reference.checksum.value,
      });
      continue;
    }
    receipts.push({
      sourceType: reference.kind,
      sourceId: reference.kind === "evidence"
        ? reference.evidenceId
        : reference.factVersionId,
      // Evidence Knowledge exposes a basis digest rather than a numeric
      // aggregate version for these references; the runtime receipt validator
      // accepts the semantic exact marker even though its public type is numeric.
      version: "exact" as unknown as SourceVersionReference["version"],
    });
  }
  for (const reference of result.references.calculations) {
    receipts.push({
      sourceType: "calculation",
      sourceId: reference.calculationId,
      version: reference.version as SourceVersionReference["version"],
    });
  }
  return Object.freeze(receipts);
}

function stateStatus(
  state: FinancialRiskResult["state"],
): "ok" | "stale" | "unavailable" {
  if (state === "completed" || state === "fallback") return "ok";
  if (state === "stale" || state === "superseded") return "stale";
  return "unavailable";
}

function runtimeActor(actor: RuntimeActor): ActorReference {
  return { id: actor.actorId, kind: actor.kind, state: actor.state };
}

function sameScope(
  context: RequestContext,
  scope: RuntimeScope,
): boolean {
  return context.tenantId === scope.tenantId &&
    context.workspaceId === scope.workspaceId &&
    context.dealId === scope.dealId;
}

function textInput(value: unknown, maxLength: number): string | undefined {
  return typeof value === "string" && value.trim() && value.length <= maxLength
    ? value
    : undefined;
}

function parseOptionalFindingId(value: unknown): FindingId | undefined {
  if (value === undefined) return undefined;
  const parsed = parseFindingId(value);
  return parsed.ok ? parsed.value : undefined;
}

function parseOptionalIdempotencyKey(
  value: unknown,
): IdempotencyKey | undefined {
  if (value === undefined) return undefined;
  const parsed = parseIdempotencyKey(value);
  return parsed.ok ? parsed.value : undefined;
}
