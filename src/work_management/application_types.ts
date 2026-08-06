import type {
  ApprovalAuthoritySnapshotPort,
  ApprovalEvidencePort,
  ApprovalTargetPort,
} from "./approval_package_factory.ts";
import {
  WorkManagementAuthorization,
  type WorkManagementAuthorizationPort,
} from "./authorization_service.ts";
import {
  type WorkManagementClock,
  WorkManagementCommandExecutor,
} from "./command_execution.ts";
import type { WorkManagementCommandUnitOfWork } from "./command_unit_of_work.ts";

export interface WorkManagementApplicationOptions {
  readonly unitOfWork: WorkManagementCommandUnitOfWork;
  readonly authorization: WorkManagementAuthorizationPort;
  readonly effects:
    import("./transactional_effects.ts").WorkManagementTransactionalEffects;
  readonly targets: ApprovalTargetPort;
  readonly evidence: ApprovalEvidencePort;
  readonly authority: ApprovalAuthoritySnapshotPort;
  readonly requireAuthorityEvaluation?: boolean;
  readonly clock: WorkManagementClock;
}

export interface WorkManagementApplicationContext {
  readonly options: WorkManagementApplicationOptions;
  readonly authorization: WorkManagementAuthorization;
  readonly commands: WorkManagementCommandExecutor;
}

export function createWorkManagementApplicationContext(
  options: WorkManagementApplicationOptions,
): WorkManagementApplicationContext {
  return {
    options,
    authorization: new WorkManagementAuthorization(options.authorization),
    commands: new WorkManagementCommandExecutor(
      options.unitOfWork,
      options.effects,
      options.clock,
      options.requireAuthorityEvaluation === true,
    ),
  };
}
