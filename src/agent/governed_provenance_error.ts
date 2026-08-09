export class GovernedProvenanceError extends Error {
  readonly code = "INVALID_GOVERNED_PROVENANCE";

  constructor(reason: string) {
    super(
      `Governed proposal provenance was rejected: ${reason}; expected trusted receipts for the bound actor, scope, run, and definition.`,
    );
    this.name = "GovernedProvenanceError";
  }
}
