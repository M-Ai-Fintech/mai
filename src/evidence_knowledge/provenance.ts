import type { EvidenceId, FactVersionId, ProvenanceId } from "./ids.ts";
import type { EvidenceScope } from "./model.ts";

export type LineageNode =
  | { readonly kind: "evidence"; readonly id: EvidenceId }
  | { readonly kind: "fact_version"; readonly id: FactVersionId };
export type ProvenanceRelation =
  | "derived_from"
  | "supports"
  | "supersedes"
  | "invalidates";
export interface ProvenanceLink {
  readonly provenanceId: ProvenanceId;
  readonly scope: EvidenceScope;
  readonly relation: ProvenanceRelation;
  readonly source: LineageNode;
  readonly target: LineageNode;
  readonly createdAt: Date;
}

export function createProvenanceLink(input: ProvenanceLink): ProvenanceLink {
  if (
    !input.scope.tenantId || !input.scope.workspaceId || !input.scope.dealId
  ) {
    throw new Error(
      "Provenance scope is incomplete; expected tenant, workspace, and Deal IDs.",
    );
  }
  if (
    input.source.id === input.target.id &&
    input.source.kind === input.target.kind
  ) {
    throw new Error(
      `Provenance link self-target "${input.source.id}" is invalid; expected distinct lineage nodes.`,
    );
  }
  if (
    !(input.createdAt instanceof Date) ||
    Number.isNaN(input.createdAt.getTime())
  ) {
    throw new Error(
      `Provenance timestamp "${
        String(input.createdAt)
      }" is invalid; expected a valid Date.`,
    );
  }
  return Object.freeze({
    ...input,
    scope: Object.freeze({ ...input.scope }),
    source: Object.freeze({ ...input.source }),
    target: Object.freeze({ ...input.target }),
  });
}

export function traverseLineage(
  start: LineageNode,
  links: readonly ProvenanceLink[],
): readonly LineageNode[] {
  const visited = new Set<string>([nodeKey(start)]);
  const result: LineageNode[] = [];
  const pending = [start];
  while (pending.length > 0) {
    const current = pending.shift()!;
    for (
      const link of links.filter(({ source }) =>
        nodeKey(source) === nodeKey(current)
      )
    ) {
      const key = nodeKey(link.target);
      if (visited.has(key)) continue;
      visited.add(key);
      result.push(link.target);
      pending.push(link.target);
    }
  }
  return Object.freeze(result);
}

function nodeKey(node: LineageNode): string {
  return `${node.kind}:${node.id}`;
}
