import type { RequestContext } from "../shared/contracts/request_context.ts";
import type { Action, FieldMask } from "../platform/authz/v1.ts";
import type {
  RegistryAggregate,
  RegistryEntityKind,
  RegistryReadRoute,
} from "./contracts.ts";
import { registryScope } from "./contracts.ts";
import type { RegistryEntityId } from "./ids.ts";
import {
  defaultRegistryFieldMask,
  projectRegistryAggregate,
  type RegistryProjection,
} from "./projection.ts";
import type {
  OrganizationRegistryRepository,
  RegistryReference,
} from "./repository.ts";

export interface RegistryReadQuery {
  readonly context: RequestContext;
  readonly kind: RegistryEntityKind;
  readonly id: RegistryEntityId;
  readonly route?: RegistryReadRoute;
  readonly fieldMask?: FieldMask;
  readonly allowedActions?: readonly Action[];
}

export interface OrganizationRegistryReadModelPort {
  read(query: RegistryReadQuery): Promise<RegistryProjection | undefined>;
}

/**
 * Builds permission-safe registry views without registering an HTTP route.
 *
 * @example await readModel.read({ context, kind: "person", id, fieldMask });
 */
export class OrganizationRegistryReadModel
  implements OrganizationRegistryReadModelPort {
  constructor(private readonly repository: OrganizationRegistryRepository) {}

  async read(
    query: RegistryReadQuery,
  ): Promise<RegistryProjection | undefined> {
    const aggregate = await this.resolve(query);
    if (aggregate === undefined || aggregate.kind !== query.kind) {
      return undefined;
    }
    return projectRegistryAggregate(
      aggregate,
      query.fieldMask ?? defaultRegistryFieldMask,
      query.allowedActions,
    );
  }

  private resolve(
    query: RegistryReadQuery,
  ): Promise<RegistryAggregate | undefined> {
    return query.route === "historical"
      ? this.repository.get(registryScope(query.context), reference(query))
      : this.resolveCanonical(query);
  }

  private async resolveCanonical(
    query: RegistryReadQuery,
  ): Promise<RegistryAggregate | undefined> {
    const scope = registryScope(query.context);
    let current = await this.repository.get(scope, reference(query));
    const visited = new Set<string>();
    while (current?.state === "merged") {
      if (current.mergedIntoId === undefined) return undefined;
      if (visited.has(current.id)) return undefined;
      visited.add(current.id);
      current = await this.repository.get(scope, {
        kind: current.kind,
        id: current.mergedIntoId,
      });
    }
    return current;
  }
}

function reference(query: RegistryReadQuery): RegistryReference {
  return { kind: query.kind, id: query.id };
}
