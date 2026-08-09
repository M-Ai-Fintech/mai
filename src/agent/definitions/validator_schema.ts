import { z, type ZodTypeAny } from "zod";

const approvedZodValidatorOwnKeys = new Set([
  ...Object.keys(z.any()),
  ...Object.keys(z.unknown()),
  ...Object.keys(z.object({})),
  ...Object.keys(z.number()),
  ...Object.keys(z.bigint()),
  ...Object.keys(z.function()),
]);
const sensitiveValidatorKeys = new Set([
  "apiKey",
  "providerClient",
  "rawClient",
  "secret",
  "secrets",
]);
const prohibitedSchemaKeyPattern =
  /(?:^|_)(?:api[_]?key|access[_]?key|private[_]?key|token|secret|password|credentials?|provider[_]?client|raw[_]?client)(?:_|$)/;

export const validatorSchema = z.custom<ZodTypeAny>(isZodValidator);

function isZodValidator(value: unknown): value is ZodTypeAny {
  if (!(value instanceof z.ZodType)) return false;
  if (!hasApprovedOwnKeys(value)) return false;
  return inspectSchemaDefinition(value, {
    schemas: new WeakSet(),
    lazyGetters: new WeakSet(),
  });
}

function hasApprovedOwnKeys(value: ZodTypeAny): boolean {
  return Object.keys(value).every((key) =>
    approvedZodValidatorOwnKeys.has(key) && !sensitiveValidatorKeys.has(key)
  );
}

function inspectSchemaDefinition(
  schema: ZodTypeAny,
  state: SchemaInspectionState,
): boolean {
  if (state.schemas.has(schema)) return true;
  state.schemas.add(schema);

  const definition = schemaDefinition(schema);
  if (definition === undefined) return false;
  switch (definition.typeName) {
    case "ZodObject":
      return inspectObjectDefinition(definition, state);
    case "ZodArray":
    case "ZodPromise":
      return inspectNestedSchema(definition.type, state);
    case "ZodUnion":
    case "ZodDiscriminatedUnion":
      return inspectUnionDefinition(definition, state);
    case "ZodIntersection":
      return inspectNestedSchema(definition.left, state) &&
        inspectNestedSchema(definition.right, state);
    case "ZodOptional":
    case "ZodNullable":
    case "ZodDefault":
    case "ZodCatch":
    case "ZodReadonly":
      return inspectNestedSchema(definition.innerType, state);
    case "ZodBranded":
      return inspectNestedSchema(definition.type, state);
    case "ZodEffects":
      return inspectNestedSchema(definition.schema, state);
    case "ZodLazy":
      return inspectLazyDefinition(definition, state);
    case "ZodTuple":
      return inspectTupleDefinition(definition, state);
    case "ZodRecord":
    case "ZodMap":
      return inspectNestedSchema(definition.keyType, state) &&
        inspectNestedSchema(definition.valueType, state);
    case "ZodSet":
      return inspectNestedSchema(definition.valueType, state);
    case "ZodPipeline":
      return inspectNestedSchema(definition.in, state) &&
        inspectNestedSchema(definition.out, state);
    case "ZodFunction":
      return inspectNestedSchema(definition.args, state) &&
        inspectNestedSchema(definition.returns, state);
    case "ZodString":
    case "ZodNumber":
    case "ZodBigInt":
    case "ZodBoolean":
    case "ZodDate":
    case "ZodSymbol":
    case "ZodUndefined":
    case "ZodNull":
    case "ZodAny":
    case "ZodUnknown":
    case "ZodNever":
    case "ZodVoid":
    case "ZodNaN":
    case "ZodLiteral":
    case "ZodEnum":
    case "ZodNativeEnum":
    case "ZodCustom":
      return true;
    default:
      return false;
  }
}

type SchemaInspectionState = {
  readonly schemas: WeakSet<object>;
  readonly lazyGetters: WeakSet<() => unknown>;
};

type SchemaDefinition = {
  readonly typeName: unknown;
  readonly shape?: unknown;
  readonly catchall?: unknown;
  readonly type?: unknown;
  readonly options?: unknown;
  readonly left?: unknown;
  readonly right?: unknown;
  readonly innerType?: unknown;
  readonly schema?: unknown;
  readonly getter?: unknown;
  readonly items?: unknown;
  readonly rest?: unknown;
  readonly keyType?: unknown;
  readonly valueType?: unknown;
  readonly in?: unknown;
  readonly out?: unknown;
  readonly args?: unknown;
  readonly returns?: unknown;
};

function schemaDefinition(schema: ZodTypeAny): SchemaDefinition | undefined {
  const definition = (schema as unknown as { _def?: unknown })._def;
  if (typeof definition !== "object" || definition === null) return undefined;
  if (!("typeName" in definition)) return undefined;
  return definition as SchemaDefinition;
}

function inspectObjectDefinition(
  definition: SchemaDefinition,
  state: SchemaInspectionState,
): boolean {
  const shape = resolveShape(definition.shape);
  if (shape === undefined) return false;
  for (const [key, child] of Object.entries(shape)) {
    if (hasProhibitedSchemaConcept(key)) return false;
    if (!inspectNestedSchema(child, state)) return false;
  }
  return definition.catchall === undefined ||
    inspectNestedSchema(definition.catchall, state);
}

function resolveShape(
  shape: unknown,
): Record<string, unknown> | undefined {
  try {
    const resolved = typeof shape === "function" ? shape() : shape;
    if (typeof resolved !== "object" || resolved === null) return undefined;
    if (Array.isArray(resolved)) return undefined;
    return resolved as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function inspectUnionDefinition(
  definition: SchemaDefinition,
  state: SchemaInspectionState,
): boolean {
  if (definition.options instanceof Map) {
    return [...definition.options.values()].every((schema) =>
      inspectNestedSchema(schema, state)
    );
  }
  if (!Array.isArray(definition.options)) return false;
  return definition.options.every((schema) =>
    inspectNestedSchema(schema, state)
  );
}

function inspectTupleDefinition(
  definition: SchemaDefinition,
  state: SchemaInspectionState,
): boolean {
  if (!Array.isArray(definition.items)) return false;
  if (
    !definition.items.every((schema) => inspectNestedSchema(schema, state))
  ) {
    return false;
  }
  return definition.rest === undefined || definition.rest === null ||
    inspectNestedSchema(definition.rest, state);
}

function inspectLazyDefinition(
  definition: SchemaDefinition,
  state: SchemaInspectionState,
): boolean {
  if (typeof definition.getter !== "function") return false;
  const getter = definition.getter as () => unknown;
  if (state.lazyGetters.has(getter)) return false;
  state.lazyGetters.add(getter);
  try {
    return inspectNestedSchema(getter(), state);
  } catch {
    return false;
  } finally {
    state.lazyGetters.delete(getter);
  }
}

function inspectNestedSchema(
  value: unknown,
  state: SchemaInspectionState,
): boolean {
  return value instanceof z.ZodType && hasApprovedOwnKeys(value) &&
    inspectSchemaDefinition(value, state);
}

function hasProhibitedSchemaConcept(key: string): boolean {
  const normalized = key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toLowerCase();
  return prohibitedSchemaKeyPattern.test(normalized);
}
