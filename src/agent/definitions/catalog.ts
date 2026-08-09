import {
  AGENT_DEFINITION_IDS,
  type AgentDefinition,
  agentDefinitionEnvelopeSchema,
  type AgentDefinitionId,
  CURRENT_DEFINITION_VERSIONS,
} from "./contract.ts";

export interface DefinitionRollbackSelection {
  readonly mode: "rollback";
  readonly id: AgentDefinitionId;
  readonly selectedVersion: string;
  readonly currentVersion: string;
  readonly definition: AgentDefinition;
}

export interface DefinitionCatalog {
  current(id: AgentDefinitionId): AgentDefinition;
  select(id: AgentDefinitionId, version: string): AgentDefinition;
  rollback(
    id: AgentDefinitionId,
    version: string,
  ): DefinitionRollbackSelection;
  versions(id: AgentDefinitionId): readonly string[];
}

export function createDefinitionCatalog(
  definitions: readonly AgentDefinition[],
  currentVersions: Readonly<Record<AgentDefinitionId, string>> =
    CURRENT_DEFINITION_VERSIONS,
): DefinitionCatalog {
  const byId = new Map<AgentDefinitionId, Map<string, AgentDefinition>>();
  for (const definition of definitions) {
    validateEnvelope(definition);
    addDefinition(byId, definition);
  }
  validatePins(byId, currentVersions);
  return new ImmutableDefinitionCatalog(byId, currentVersions);
}

class ImmutableDefinitionCatalog implements DefinitionCatalog {
  constructor(
    private readonly definitions: ReadonlyMap<
      AgentDefinitionId,
      ReadonlyMap<string, AgentDefinition>
    >,
    private readonly currentVersions: Readonly<
      Record<AgentDefinitionId, string>
    >,
  ) {}

  current(id: AgentDefinitionId): AgentDefinition {
    return this.select(id, this.currentVersions[id]);
  }

  select(id: AgentDefinitionId, version: string): AgentDefinition {
    const versions = this.definitions.get(id);
    const definition = versions?.get(version);
    if (definition !== undefined) return definition;
    throw new Error(
      `Agent definition "${id}@${version}" is unavailable; expected a registered historical version.`,
    );
  }

  rollback(
    id: AgentDefinitionId,
    version: string,
  ): DefinitionRollbackSelection {
    const definition = this.select(id, version);
    return {
      mode: "rollback",
      id,
      selectedVersion: version,
      currentVersion: this.currentVersions[id],
      definition,
    };
  }

  versions(id: AgentDefinitionId): readonly string[] {
    return [...(this.definitions.get(id)?.keys() ?? [])].sort(compareVersions);
  }
}

function validateEnvelope(definition: AgentDefinition): void {
  agentDefinitionEnvelopeSchema.parse(definition);
}

function addDefinition(
  byId: Map<AgentDefinitionId, Map<string, AgentDefinition>>,
  definition: AgentDefinition,
): void {
  const versions = byId.get(definition.id) ?? new Map();
  if (versions.has(definition.version)) {
    throw new Error(
      `Agent definition "${definition.id}@${definition.version}" is duplicated; expected one immutable version entry.`,
    );
  }
  versions.set(definition.version, definition);
  byId.set(definition.id, versions);
}

function validatePins(
  byId: ReadonlyMap<AgentDefinitionId, ReadonlyMap<string, AgentDefinition>>,
  currentVersions: Readonly<Record<AgentDefinitionId, string>>,
): void {
  for (const id of AGENT_DEFINITION_IDS) {
    const version = currentVersions[id];
    if (version === undefined) {
      throw new Error(
        `Agent definition "${id}" has no current version pin; expected every specialist to be explicitly pinned.`,
      );
    }
    if (byId.get(id)?.has(version)) continue;
    throw new Error(
      `Agent definition "${id}" is pinned to unavailable version "${version}"; expected the pin to select a registered definition.`,
    );
  }
}

function compareVersions(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true });
}
