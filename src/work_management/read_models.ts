import {
  type AuthorizationDecision,
  field,
  projectAuthorizedDto,
  type ProjectionSchema,
} from "../platform/authz/v1.ts";
import type { ApprovalRequest, Task, Workstream } from "./model.ts";

export type WorkManagementReadDto = Readonly<Record<string, unknown>> & {
  readonly version?: number;
};

const workstreamSchema: ProjectionSchema<Workstream> = {
  id: definition("id", "id", "public"),
  name: definition("name", "name", "restricted", "[redacted]"),
  ownerId: definition("owner_id", "ownerId", "relationship_ownership"),
  state: definition("state", "state", "restricted"),
  taskIds: definition("task_ids", "taskIds", "restricted"),
  version: definition("version", "version", "public"),
};

const taskSchema: ProjectionSchema<Task> = {
  id: definition("id", "id", "public"),
  workstreamId: definition("workstream_id", "workstreamId", "restricted"),
  parentTaskId: definition("parent_task_id", "parentTaskId", "restricted"),
  title: definition("title", "title", "restricted", "[redacted]"),
  assigneeId: definition("assignee_id", "assigneeId", "relationship_ownership"),
  target: definition("target", "target", "restricted"),
  state: definition("state", "state", "restricted"),
  version: definition("version", "version", "public"),
};

interface ApprovalProjectionSource {
  readonly id: ApprovalRequest["id"];
  readonly requesterId: ApprovalRequest["requesterId"];
  readonly namedApproverId: ApprovalRequest["namedApproverId"];
  readonly packageId: ApprovalRequest["package"]["id"];
  readonly packageVersion: number;
  readonly packageDigest: string;
  readonly packagePayload: ApprovalRequest["package"]["payload"];
  readonly evidenceReferences: ApprovalRequest["package"]["evidence"];
  readonly authoritySnapshot: ApprovalRequest["package"]["authoritySnapshot"];
  readonly target: ApprovalRequest["package"]["target"];
  readonly workflowState: ApprovalRequest["state"];
  readonly decisionOutcome?: ApprovalRequest["decision"] extends infer Decision
    ? Decision extends { readonly outcome: infer Outcome } ? Outcome : never
    : never;
  readonly internalRationale?: string;
  readonly version: ApprovalRequest["version"];
}

const approvalSchema: ProjectionSchema<ApprovalProjectionSource> = {
  id: definition("id", "id", "public"),
  requesterId: definition(
    "requester_id",
    "requesterId",
    "relationship_ownership",
  ),
  namedApproverId: definition(
    "named_approver_id",
    "namedApproverId",
    "relationship_ownership",
  ),
  packageId: definition("package_id", "packageId", "restricted"),
  packageVersion: definition("package_version", "packageVersion", "restricted"),
  packageDigest: definition("package_digest", "packageDigest", "restricted"),
  packagePayload: definition("package_payload", "packagePayload", "restricted"),
  evidenceReferences: definition(
    "evidence_references",
    "evidenceReferences",
    "restricted",
  ),
  authoritySnapshot: definition(
    "authority_snapshot",
    "authoritySnapshot",
    "internal_audit",
  ),
  target: definition("target", "target", "restricted"),
  workflowState: definition("workflow_state", "workflowState", "restricted"),
  decisionOutcome: definition(
    "decision_outcome",
    "decisionOutcome",
    "restricted",
  ),
  internalRationale: definition(
    "internal_rationale",
    "internalRationale",
    "internal_audit",
    "[redacted]",
  ),
  version: definition("version", "version", "public"),
};

/** Projects an authorized Workstream into a permission-safe read DTO.
 *
 * @example projectWorkstream(workstream, decision)
 */
export function projectWorkstream(
  value: Workstream,
  decision: AuthorizationDecision,
): WorkManagementReadDto {
  return project(value, workstreamSchema, decision);
}

/** Projects an authorized Task into a permission-safe read DTO.
 *
 * @example projectTask(task, decision)
 */
export function projectTask(
  value: Task,
  decision: AuthorizationDecision,
): WorkManagementReadDto {
  return project(value, taskSchema, decision);
}

/** Projects an authorized Approval Request into a permission-safe read DTO.
 *
 * @example projectApprovalRequest(request, decision)
 */
export function projectApprovalRequest(
  value: ApprovalRequest,
  decision: AuthorizationDecision,
): WorkManagementReadDto {
  return project(approvalSource(value), approvalSchema, decision);
}

function project<Source extends object>(
  value: Source,
  schema: ProjectionSchema<Source>,
  decision: AuthorizationDecision,
): WorkManagementReadDto {
  const fieldMask = localizeUnrenderableRedactions(schema, {
    ...decision.fieldMask,
    include: decision.fieldMask.include.filter((name) =>
      !decision.fieldMask.omit.includes(name)
    ),
    redact: decision.fieldMask.redact.filter((name) =>
      !decision.fieldMask.omit.includes(name)
    ),
    approvedClassifications: decision.fieldMask.approvedClassifications.filter(
      (approved) => !decision.fieldMask.omit.includes(approved.name),
    ),
  });
  const dto = projectAuthorizedDto(
    value,
    schema,
    fieldMask,
    decision.allowedActions,
  );
  return Object.freeze({
    ...dto,
    ...(decision.purpose === undefined ? {} : { purpose: decision.purpose }),
    ...(decision.expiresAt === undefined
      ? {}
      : { expiresAt: decision.expiresAt }),
  });
}

function localizeUnrenderableRedactions<Source extends object>(
  schema: ProjectionSchema<Source>,
  fieldMask: AuthorizationDecision["fieldMask"],
): AuthorizationDecision["fieldMask"] {
  const omitted = new Set(
    Object.values(schema)
      .filter((definition) =>
        fieldMask.redact.includes(definition.field) &&
        definition.redactedPlaceholder === undefined
      )
      .map((definition) => definition.field),
  );
  return {
    ...fieldMask,
    include: fieldMask.include.filter((name) => !omitted.has(name)),
    approvedClassifications: fieldMask.approvedClassifications.filter(
      (approved) => !omitted.has(approved.name),
    ),
  };
}

function approvalSource(value: ApprovalRequest): ApprovalProjectionSource {
  return {
    id: value.id,
    requesterId: value.requesterId,
    namedApproverId: value.namedApproverId,
    packageId: value.package.id,
    packageVersion: value.package.version,
    packageDigest: value.package.contentDigest,
    packagePayload: value.package.payload,
    evidenceReferences: value.package.evidence,
    authoritySnapshot: value.package.authoritySnapshot,
    target: value.package.target,
    workflowState: value.state,
    ...(value.decision === undefined ? {} : {
      decisionOutcome: value.decision.outcome,
      ...(value.decision.reason === undefined
        ? {}
        : { internalRationale: value.decision.reason }),
    }),
    version: value.version,
  };
}

function definition<Source extends object>(
  name: string,
  sourceKey: keyof Source,
  classification: import("../platform/authz/v1.ts").FieldClassification,
  redactedPlaceholder?: string,
): import("../platform/authz/v1.ts").ProjectionField<Source> {
  return {
    field: field(name),
    sourceKey,
    classification,
    ...(redactedPlaceholder === undefined ? {} : { redactedPlaceholder }),
  };
}
