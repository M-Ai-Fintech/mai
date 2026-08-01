import { z } from "zod";

const nonEmptyText = z.string().trim().min(1);
const environmentNames = ["development", "staging", "production"] as const;

const approvalSchema = z.object({
  state: z.enum(["approved", "pending", "not-required"]),
  provider: nonEmptyText.nullable(),
  regions: z.array(nonEmptyText),
  accountProject: nonEmptyText.nullable(),
  availability: nonEmptyText.nullable(),
  rpoMinutes: z.number().int().positive().nullable(),
  rtoMinutes: z.number().int().positive().nullable(),
  securityControls: z.array(nonEmptyText),
  approvers: z.array(nonEmptyText),
  approvedAt: z.string().datetime({ offset: true }).nullable(),
}).strict();

const processSchema = z.object({
  name: z.enum(["api", "worker"]),
  owner: nonEmptyText,
  command: nonEmptyText,
  healthPath: nonEmptyText,
  readinessPath: nonEmptyText,
  cpuMillicores: z.number().int().positive(),
  memoryMiB: z.number().int().positive(),
  timeoutSeconds: z.number().int().positive(),
  concurrency: z.number().int().positive(),
  minReplicas: z.number().int().positive().nullable(),
  maxReplicas: z.number().int().positive().nullable(),
  shutdownGraceSeconds: z.number().int().positive(),
  drainSeconds: z.number().int().positive(),
  scalingRationale: nonEmptyText,
}).strict();

const topologySchema = z.object({
  name: z.literal("modular-monolith"),
  eventTransport: z.literal("database-outbox-inbox"),
  processes: z.array(processSchema),
}).strict();

const databaseSchema = z.object({
  engine: z.literal("postgresql"),
  management: z.literal("managed-postgresql"),
  environmentDatabase: nonEmptyText,
  connectivity: z.enum(["private", "approved-private", "local-only"]),
  automatedBackups: z.literal(true),
  pointInTimeRecovery: z.literal(true),
  migrationStrategy: z.enum(["pre-traffic", "compatibility-safe"]),
  runtimeOwnsMigrations: z.literal(false),
  authoritativeData: z.array(nonEmptyText),
  restoreProcedure: nonEmptyText,
}).strict();

const objectStorageSchema = z.object({
  keyTemplate: nonEmptyText,
  environmentBoundary: z.literal(true),
  tenantBoundary: z.literal(true),
  versioning: z.literal(true),
  lifecyclePolicy: nonEmptyText,
  retentionPolicy: nonEmptyText,
  legalHoldCompatible: z.literal(true),
  deletionBehavior: z.literal("approval-controlled"),
  encryptionControl: z.enum(["approved-key-management", "local-only"]),
  classifications: z.array(nonEmptyText),
}).strict();

const secretsSchema = z.object({
  manager: nonEmptyText,
  longLivedCredentialsAllowed: z.literal(false),
  ciCredentialMode: z.literal("workload-identity-federation"),
  outputRedaction: z.literal(true),
}).strict();

const networkSchema = z.object({
  publicIngress: z.enum(["api-only", "none", "local-only"]),
  privateConnectivity: z.enum(["required", "approved", "local-only"]),
  egress: z.enum(["allowlisted", "approved", "local-only"]),
  administrativeAccess: z.enum(["private-only", "approved", "local-only"]),
  serviceToService: z.enum(["internal-only", "approved", "local-only"]),
}).strict();

const observabilitySchema = z.object({
  structuredLogs: z.literal(true),
  metrics: z.literal(true),
  traces: z.literal(true),
  correlationIds: z.literal(true),
  dashboards: z.array(nonEmptyText),
  alerts: z.array(nonEmptyText),
  auditAccess: nonEmptyText,
  sensitiveFieldRedaction: z.literal(true),
  secretRedaction: z.literal(true),
}).strict();

const costControlsSchema = z.object({
  budgetControl: z.literal(true),
  costAttribution: nonEmptyText,
  alertThresholdPercent: z.number().int().min(1).max(100),
  capacityThresholds: z.array(nonEmptyText),
  unexpectedSpendAlerts: z.literal(true),
}).strict();

const stateBackendSchema = z.object({
  type: z.enum(["local-only", "planned-remote", "approved-remote"]),
  stateNamespace: nonEmptyText,
  accessControl: z.literal(true),
  locking: z.literal(true),
  backup: z.literal(true),
  recoveryProcedure: nonEmptyText,
}).strict();

const iamSchema = z.object({
  workloadIdentity: z.literal(true),
  runtimeRoles: z.array(nonEmptyText),
  separateMigrationRole: z.literal(true),
  broadProductionGrant: z.literal(false),
}).strict();

const recoverySchema = z.object({
  protectedRecords: z.array(nonEmptyText),
  rollbackDeletesAuthoritativeData: z.literal(false),
  smokeStatus: z.enum(["not-executed", "passed", "failed"]),
  restartRecoveryStatus: z.enum(["not-executed", "passed", "failed"]),
  backupRestoreStatus: z.enum(["not-executed", "passed", "failed"]),
  rollbackStatus: z.enum(["not-executed", "passed", "failed"]),
}).strict();

const migrationSchema = z.object({
  owner: nonEmptyText,
  strategy: z.enum(["pre-traffic", "compatibility-safe"]),
  runtimeOwnsMigrations: z.literal(false),
  rollback: nonEmptyText,
}).strict();

const cloudTransportSchema = z.object({
  enabled: z.literal(false),
  interface: nonEmptyText,
  retryPolicy: nonEmptyText,
  deadLetterPolicy: nonEmptyText,
  idempotencyPolicy: nonEmptyText,
}).strict();

export const infrastructurePlanSchema = z.object({
  $schema: nonEmptyText.optional(),
  task: z.literal("MAI-148"),
  environment: z.enum(environmentNames),
  approval: approvalSchema,
  providerAdapter: nonEmptyText.nullable(),
  stateBackend: stateBackendSchema,
  topology: topologySchema,
  database: databaseSchema,
  objectStorage: objectStorageSchema,
  secrets: secretsSchema,
  network: networkSchema,
  observability: observabilitySchema,
  iam: iamSchema,
  costControls: costControlsSchema,
  migration: migrationSchema,
  cloudTransport: cloudTransportSchema,
  recovery: recoverySchema,
  readinessClaim: z.enum(["not-ready", "candidate", "production-ready"]),
}).strict();

export type InfrastructurePlan = z.infer<typeof infrastructurePlanSchema>;
export type EnvironmentName = InfrastructurePlan["environment"];

const REQUIRED_AUTHORITATIVE_RECORDS = [
  "database",
  "platform.outbox",
  "platform.inbox",
  "platform.jobs",
  "audit",
  "evidence",
  "object-storage",
] as const;

export function parseInfrastructurePlan(value: unknown): InfrastructurePlan {
  const parsed = infrastructurePlanSchema.safeParse(value);
  if (!parsed.success) throw invalidPlanError(parsed.error);
  assertPlanInvariants(parsed.data);
  return parsed.data;
}

export function assertInfrastructurePlan(plan: InfrastructurePlan): void {
  parseInfrastructurePlan(plan);
}

export function parseInfrastructureSet(
  values: readonly unknown[],
): InfrastructurePlan[] {
  const plans = values.map(parseInfrastructurePlan);
  assertEnvironmentSet(plans);
  return plans;
}

export function assertEnvironmentSet(
  plans: readonly InfrastructurePlan[],
): void {
  const names = plans.map((plan) => plan.environment);
  const expected = [...environmentNames];
  if (
    names.length !== expected.length || new Set(names).size !== names.length
  ) {
    throw new Error(
      `Infrastructure environments "${
        names.join(",")
      }" are invalid; expected exactly development, staging, and production once each.`,
    );
  }
  if (expected.some((name) => !names.includes(name))) {
    throw new Error(
      `Infrastructure environments "${
        names.join(",")
      }" are incomplete; expected development, staging, and production.`,
    );
  }
  assertDistinctEnvironmentBoundaries(plans);
}

export function assertProvisionable(plan: InfrastructurePlan): void {
  assertInfrastructurePlan(plan);
  if (plan.approval.state === "pending") {
    throw new Error(
      `Infrastructure environment "${plan.environment}" lacks owner approval; expected provider, region, account, availability, RPO/RTO, and security approval.`,
    );
  }
  if (plan.providerAdapter === null) {
    throw new Error(
      `Infrastructure environment "${plan.environment}" has no provider adapter; expected an approved adapter before provisioning.`,
    );
  }
  if (
    plan.environment !== "development" &&
    plan.stateBackend.type !== "approved-remote"
  ) {
    throw new Error(
      `Infrastructure environment "${plan.environment}" uses "${plan.stateBackend.type}" state; expected an approved remote backend before provisioning.`,
    );
  }
}

export function isProvisionable(plan: InfrastructurePlan): boolean {
  try {
    assertProvisionable(plan);
    return true;
  } catch {
    return false;
  }
}

export function requiredAuthoritativeRecords(): readonly string[] {
  return REQUIRED_AUTHORITATIVE_RECORDS;
}

function assertPlanInvariants(plan: InfrastructurePlan): void {
  assertTopology(plan);
  assertApproval(plan);
  assertStorageBoundary(plan);
  assertRecoveryBoundary(plan);
  assertReadinessClaim(plan);
}

function assertTopology(plan: InfrastructurePlan): void {
  const processNames = plan.topology.processes.map((process) => process.name);
  const expected = ["api", "worker"];
  if (
    processNames.length !== expected.length ||
    expected.some((name) => !processNames.includes(name as "api" | "worker"))
  ) {
    throw new Error(
      `Infrastructure topology for "${plan.environment}" has processes "${
        processNames.join(",")
      }"; expected only api and worker.`,
    );
  }
  if (
    plan.topology.processes.some((process) =>
      process.maxReplicas !== null &&
      process.minReplicas !== null && process.maxReplicas < process.minReplicas
    )
  ) {
    throw new Error(
      `Infrastructure topology for "${plan.environment}" has a replica maximum below its minimum; expected maxReplicas >= minReplicas.`,
    );
  }
}

function assertApproval(plan: InfrastructurePlan): void {
  if (plan.approval.state === "pending") {
    if (plan.providerAdapter !== null) {
      throw new Error(
        `Infrastructure environment "${plan.environment}" has provider adapter "${plan.providerAdapter}" before approval; expected null.`,
      );
    }
    return;
  }
  if (
    plan.approval.state === "not-required" && plan.environment !== "development"
  ) {
    throw new Error(
      `Infrastructure environment "${plan.environment}" uses not-required approval; expected owner approval outside local development.`,
    );
  }
  if (plan.approval.provider === null || plan.approval.regions.length === 0) {
    throw new Error(
      `Infrastructure environment "${plan.environment}" has approval state "${plan.approval.state}" with missing provider or region; expected complete approval fields.`,
    );
  }
  if (
    plan.approval.accountProject === null ||
    plan.approval.availability === null ||
    plan.approval.rpoMinutes === null ||
    plan.approval.rtoMinutes === null ||
    plan.approval.securityControls.length === 0 ||
    (plan.approval.state === "approved" &&
      (plan.approval.approvers.length === 0 ||
        plan.approval.approvedAt === null))
  ) {
    throw new Error(
      `Infrastructure environment "${plan.environment}" has incomplete approval state "${plan.approval.state}"; expected account, availability, RPO, RTO, and security controls.`,
    );
  }
}

function assertStorageBoundary(plan: InfrastructurePlan): void {
  const requiredTokens = [
    "environment",
    "tenant",
    "workspace",
    "deal",
    "object",
    "version",
  ];
  const missing = requiredTokens.filter((token) =>
    !plan.objectStorage.keyTemplate.includes(token)
  );
  if (missing.length === 0) return;
  throw new Error(
    `Object-storage key template for "${plan.environment}" is missing "${
      missing.join(",")
    }"; expected environment and tenant/workspace/deal/object/version boundaries.`,
  );
}

function assertRecoveryBoundary(plan: InfrastructurePlan): void {
  const missing = REQUIRED_AUTHORITATIVE_RECORDS.filter((record) =>
    !plan.recovery.protectedRecords.includes(record)
  );
  if (missing.length === 0) return;
  throw new Error(
    `Recovery plan for "${plan.environment}" omits "${
      missing.join(",")
    }"; expected authoritative records to survive restore and rollback.`,
  );
}

function assertReadinessClaim(plan: InfrastructurePlan): void {
  if (plan.readinessClaim !== "production-ready") return;
  if (plan.approval.state !== "approved" || plan.providerAdapter === null) {
    throw new Error(
      `Infrastructure environment "${plan.environment}" claims production-ready without approved provider configuration; expected approval and adapter.`,
    );
  }
  const statuses = [
    plan.recovery.smokeStatus,
    plan.recovery.restartRecoveryStatus,
    plan.recovery.backupRestoreStatus,
    plan.recovery.rollbackStatus,
  ];
  if (statuses.some((status) => status !== "passed")) {
    throw new Error(
      `Infrastructure environment "${plan.environment}" claims production-ready without passed recovery evidence; expected all four statuses to be passed.`,
    );
  }
}

function assertDistinctEnvironmentBoundaries(
  plans: readonly InfrastructurePlan[],
): void {
  const signatures = plans.map((plan) =>
    [
      plan.environment,
      plan.stateBackend.stateNamespace,
      plan.database.environmentDatabase,
      plan.objectStorage.keyTemplate,
      plan.database.authoritativeData.join("|"),
    ].join("::")
  );
  if (new Set(signatures).size === signatures.length) return;
  throw new Error(
    `Infrastructure environment boundaries "${
      signatures.join(",")
    }" are not distinct; expected isolated storage and database declarations.`,
  );
}

function invalidPlanError(error: z.ZodError): Error {
  const issue = error.issues[0];
  const path = issue?.path.join(".") || "root";
  const received = issue && "received" in issue
    ? String(issue.received)
    : "invalid";
  return new Error(
    `Infrastructure plan field "${path}" has value "${received}"; expected the MAI-148 contract shape.`,
  );
}
