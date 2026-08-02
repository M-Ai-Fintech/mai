import { assertHumanAdministrator, assertTenantScope } from "./errors.ts";
import {
  aggregateBase,
  assertName,
  nextAggregateVersion,
} from "./aggregate.ts";
import type {
  AdministrationContext,
  Institution,
  InstitutionState,
  Workspace,
  WorkspaceState,
} from "./contracts.ts";
import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type { InstitutionId } from "./ids.ts";
import type { TenantId, WorkspaceId } from "../shared/contracts/identifiers.ts";

export function createInstitution(
  input: {
    readonly id: InstitutionId;
    readonly tenantId: TenantId;
    readonly name: string;
  },
  context: AdministrationContext,
): Institution {
  assertHumanAdministrator(context);
  assertTenantScope(context, input.tenantId);
  assertName(input.name, "institution name");
  return Object.freeze({
    aggregateType: "institution",
    id: input.id,
    name: input.name,
    state: "active" as const,
    ...aggregateBase(context),
  });
}

export function changeInstitutionState(
  institution: Institution,
  input: {
    readonly expectedVersion: number;
    readonly state: InstitutionState;
    readonly context: AdministrationContext;
  },
): Institution {
  assertHumanAdministrator(input.context);
  assertTenantScope(input.context, institution.tenantId);
  const base = nextAggregateVersion(
    institution,
    input.expectedVersion,
    input.context,
  );
  return Object.freeze({ ...institution, ...base, state: input.state });
}

export function suspendInstitution(
  institution: Institution,
  input: {
    readonly expectedVersion: number;
    readonly reason: string;
    readonly context: AdministrationContext;
  },
): Institution {
  if (!input.reason.trim()) {
    throw new Error("Institution suspension reason is required.");
  }
  return changeInstitutionState(institution, {
    expectedVersion: input.expectedVersion,
    state: "suspended",
    context: input.context,
  });
}

export function createWorkspace(
  input: {
    readonly id: WorkspaceId;
    readonly institutionId: InstitutionId;
    readonly tenantId: TenantId;
    readonly name: string;
  },
  context: AdministrationContext,
): Workspace {
  assertHumanAdministrator(context);
  assertTenantScope(context, input.tenantId);
  assertName(input.name, "workspace name");
  return Object.freeze({
    aggregateType: "workspace",
    id: input.id,
    institutionId: input.institutionId,
    name: input.name,
    state: "active" as const,
    ...aggregateBase(context),
  });
}

export function changeWorkspaceState(
  workspace: Workspace,
  input: {
    readonly expectedVersion: AggregateVersion;
    readonly state: WorkspaceState;
    readonly context: AdministrationContext;
  },
): Workspace {
  assertHumanAdministrator(input.context);
  assertTenantScope(input.context, workspace.tenantId);
  const base = nextAggregateVersion(
    workspace,
    input.expectedVersion,
    input.context,
  );
  return Object.freeze({ ...workspace, ...base, state: input.state });
}
