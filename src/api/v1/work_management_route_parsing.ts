import { parseIdempotencyHeader, parseIfMatch } from "../../platform/api/v1.ts";
import { actor as workActor } from "../../work_management/v1.ts";
import type {
  ActorId,
  DealId,
  WorkScope,
  WorkspaceId,
} from "../../work_management/v1.ts";
import type { WorkManagementCommandMetadata } from "./work_management_contracts.ts";
import { WorkManagementValidationError } from "./work_management_contracts.ts";
import type {
  ApprovalCommand,
  WorkManagementRoute,
} from "./work_management_route_types.ts";
import { requiredObject } from "./work_management_validation.ts";

export const BASE_PATH = "/api/v1/work-management";

export function isWorkManagementPath(pathname: string): boolean {
  return pathname.includes(BASE_PATH);
}

export function parseWorkManagementRoute(
  pathname: string,
): WorkManagementRoute | undefined {
  const parts = pathname.split("/").filter(Boolean);
  if (!isRoutePrefix(parts)) return;
  const collection = parts[3];
  if (collection === "workstreams" || collection === "tasks") {
    return parseWorkItemRoute(collection, parts);
  }
  if (collection !== "approval-requests") return;
  return parseApprovalRoute(parts);
}

function isRoutePrefix(parts: readonly string[]): boolean {
  return parts[0] === "api" && parts[1] === "v1" &&
    parts[2] === "work-management";
}

function parseWorkItemRoute(
  collection: "workstreams" | "tasks",
  parts: readonly string[],
): WorkManagementRoute | undefined {
  if (parts.length === 4) return { kind: collection };
  if (parts.length === 5) return itemRoute(collection, parts[4]);
  if (parts.length === 6 && parts[5] === "transition") {
    return {
      kind: collection,
      id: decodeURIComponent(parts[4]),
      command: "transition",
    };
  }
}

function itemRoute(
  collection: "workstreams" | "tasks",
  id: string,
): WorkManagementRoute {
  return { kind: collection, id: decodeURIComponent(id) };
}

function parseApprovalRoute(
  parts: readonly string[],
): WorkManagementRoute | undefined {
  if (parts.length === 4) return { kind: "approval_requests" };
  if (parts.length === 5) {
    return { kind: "approval_requests", id: decodeURIComponent(parts[4]) };
  }
  const command = parseApprovalCommand(parts[5]);
  if (parts.length === 6 && command !== undefined) {
    return {
      kind: "approval_requests",
      id: decodeURIComponent(parts[4]),
      command,
    };
  }
}

function parseApprovalCommand(
  value: string | undefined,
): ApprovalCommand | undefined {
  const commands: readonly ApprovalCommand[] = [
    "open",
    "approve",
    "reject",
    "withdraw",
    "invalidate",
    "expire",
  ];
  return commands.find((command) => command === value);
}

export function commandMetadata(
  request: Request,
  versionRequired: boolean,
): WorkManagementCommandMetadata {
  const idempotency = parseIdempotencyHeader(
    request.headers.get("Idempotency-Key"),
  );
  if (!idempotency.ok) {
    throw new WorkManagementValidationError(
      "Idempotency-Key is required; expected an idem_ identifier.",
    );
  }
  if (!versionRequired) return { idempotencyKey: idempotency.value };
  return versionedMetadata(request, idempotency.value);
}

function versionedMetadata(
  request: Request,
  idempotencyKey: WorkManagementCommandMetadata["idempotencyKey"],
): WorkManagementCommandMetadata {
  const ifMatch = parseIfMatch(request.headers.get("If-Match"));
  if (!ifMatch.ok) {
    throw new WorkManagementValidationError(
      'If-Match is invalid; expected one strong "v<version>" ETag.',
    );
  }
  return { idempotencyKey, expectedVersion: ifMatch.value };
}

export function requiresVersion(route: WorkManagementRoute): boolean {
  return route.id !== undefined || route.kind === "tasks";
}

export function rejectServerOwnedMetadata(body: Record<string, unknown>): void {
  const forbidden = ["eventId", "decisionId", "currentTargetVersion"].find(
    (field) => body[field] !== undefined,
  );
  if (forbidden === undefined) return;
  throw new WorkManagementValidationError(
    `Field "${forbidden}" is server-owned; expected semantic identity derived by Work Management.`,
  );
}

export function requireWorkspace(value: WorkspaceId | undefined): WorkspaceId {
  if (value !== undefined) return value;
  throw new WorkManagementValidationError(
    "Work Management requires workspace scope; expected an authenticated workspace ID.",
  );
}

export function requireDeal(value: DealId | undefined): DealId {
  if (value !== undefined) return value;
  throw new WorkManagementValidationError(
    "Work Management requires deal scope; expected an authenticated deal ID.",
  );
}

export function actorId(value: string): ActorId {
  try {
    return workActor(value);
  } catch {
    throw new WorkManagementValidationError(
      `Actor ID "${value}" is invalid; expected a canonical actor_ identifier.`,
    );
  }
}

export async function jsonBody(
  request: Request,
): Promise<Record<string, unknown>> {
  return requiredObject(await request.json(), "body");
}

export function workScope(
  context: {
    readonly tenantId: WorkScope["tenantId"];
    readonly workspaceId?: WorkspaceId;
    readonly dealId?: DealId;
  },
): WorkScope {
  return {
    tenantId: context.tenantId,
    workspaceId: requireWorkspace(context.workspaceId),
    dealId: requireDeal(context.dealId),
  };
}
