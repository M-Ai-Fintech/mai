export type RegistryErrorCode =
  | "REGISTRY_NOT_FOUND"
  | "REGISTRY_SCOPE_MISMATCH"
  | "REGISTRY_VERSION_CONFLICT"
  | "REGISTRY_INVARIANT_VIOLATION"
  | "REGISTRY_DUPLICATE_IDENTITY"
  | "REGISTRY_IDEMPOTENCY_CONFLICT";

export class OrganizationRegistryError extends Error {
  constructor(
    readonly code: RegistryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OrganizationRegistryError";
  }
}

export class RegistryNotFoundError extends OrganizationRegistryError {
  constructor(kind: string, id: string) {
    super(
      "REGISTRY_NOT_FOUND",
      `Registry ${kind} "${id}" was not found in the requested tenant scope.`,
    );
    this.name = "RegistryNotFoundError";
  }
}

export class RegistryScopeMismatchError extends OrganizationRegistryError {
  constructor(id: string, expectedTenant: string, actualTenant: string) {
    super(
      "REGISTRY_SCOPE_MISMATCH",
      `Registry aggregate "${id}" belongs to tenant "${actualTenant}"; expected tenant "${expectedTenant}".`,
    );
    this.name = "RegistryScopeMismatchError";
  }
}

export class RegistryVersionConflictError extends OrganizationRegistryError {
  constructor(
    kind: string,
    id: string,
    expected: number,
    current: number,
  ) {
    super(
      "REGISTRY_VERSION_CONFLICT",
      `Registry ${kind} "${id}" expected version "${expected}" but current version is "${current}".`,
    );
    this.name = "RegistryVersionConflictError";
    this.expectedVersion = expected;
    this.currentVersion = current;
  }

  readonly expectedVersion: number;
  readonly currentVersion: number;
}

export class RegistryInvariantError extends OrganizationRegistryError {
  constructor(message: string) {
    super("REGISTRY_INVARIANT_VIOLATION", message);
    this.name = "RegistryInvariantError";
  }
}

export class RegistryDuplicateIdentityError extends OrganizationRegistryError {
  constructor(identity: string, value: string) {
    super(
      "REGISTRY_DUPLICATE_IDENTITY",
      `Registry identity "${identity}" already uses value "${value}" in the requested scope.`,
    );
    this.name = "RegistryDuplicateIdentityError";
  }
}

export class RegistryIdempotencyConflictError
  extends OrganizationRegistryError {
  constructor(key: string) {
    super(
      "REGISTRY_IDEMPOTENCY_CONFLICT",
      `Idempotency key "${key}" was already used with a different command payload.`,
    );
    this.name = "RegistryIdempotencyConflictError";
  }
}
