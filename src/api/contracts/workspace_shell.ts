import type { UserIdentityId } from "../../identity_access/v1.ts";
import type {
  ActorId,
  TenantId,
  WorkspaceId,
} from "../../shared/contracts/identifiers.ts";

export interface WorkspaceShellOrganization {
  readonly id: string;
  readonly name: string;
}

export interface WorkspaceShellWorkspace {
  readonly id: WorkspaceId;
  readonly name: string;
}

export interface WorkspaceShellPrincipal {
  readonly actorId: ActorId;
  readonly identityId: UserIdentityId;
  readonly tenantId: TenantId;
}

export interface WorkspaceShellData {
  readonly organization: WorkspaceShellOrganization;
  readonly workspace: WorkspaceShellWorkspace;
  readonly principal: WorkspaceShellPrincipal;
  readonly permissions: readonly ["workspace", "deal"];
  readonly counts: Readonly<Record<string, never>>;
}
