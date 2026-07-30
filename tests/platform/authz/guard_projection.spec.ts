import {
  action,
  AUTHORIZATION_ROLLOUT_CONTRACT,
  type AuthorizationRequest,
  type AuthorizationScope,
  createApprovedScopeToken,
  evaluateAuthorization,
  field,
  guardedLoad,
  type PolicyClock,
  projectAuthorizedDto,
  resourceKind,
} from "../../../src/platform/authz/v1.ts";
import { parseRequestContext } from "../../../src/platform/api/v1.ts";
import { assert, assertEquals, assertThrows } from "@std/assert";

const clock: PolicyClock = { now: () => "2026-07-30T12:00:00.000Z" };
const readerRole = {
  id: "deal-reader",
  scope: scope(),
  resourceKinds: [resourceKind("deal")],
  actions: [action("read")],
  fields: [field("name"), field("batna")],
};

Deno.test("v1 guard does not load denied targets and hides denied versus absent", async () => {
  const deniedLoader = new CountingLoader<{ readonly name: string }>({
    name: "secret",
  });
  const denied = await guardedLoad(request(), deniedLoader);
  const absent = await guardedLoad(
    request({ roleFacts: [readerRole] }),
    new AbsentLoader(),
  );

  assertEquals(denied.kind, "protected_not_found");
  assertEquals(absent.kind, "protected_not_found");
  if (
    denied.kind !== "protected_not_found" ||
    absent.kind !== "protected_not_found"
  ) {
    throw new Error("Expected protected-not-found results");
  }
  assertEquals(denied.response, absent.response);
  assertEquals(deniedLoader.calls, 0);
});

Deno.test("v1 guard passes only approved immutable tokens and preserves loader errors", async () => {
  const loader = new CountingLoader({ name: "visible" });
  const loaded = await guardedLoad(
    request({ roleFacts: [readerRole] }),
    loader,
  );

  assertEquals(loaded.kind, "loaded");
  assertEquals(loader.calls, 1);
  assert(Object.isFrozen(loader.scopeToken));
  await assertRejectsLoaderError();
});

Deno.test("v1 projection copies only approved classified fields without mutation", () => {
  const source = {
    name: "Visible",
    batna: "Never disclose",
    unknown: "Ignored",
  };
  const decision = evaluateAuthorization(request({
    roleFacts: [readerRole],
    restrictionFacts: [{
      id: "hide-batna",
      scope: scope(),
      resourceKinds: [resourceKind("deal")],
      actions: [action("read")],
      fields: [field("batna")],
    }],
  }));
  const projected = projectAuthorizedDto(
    source,
    {
      name: {
        field: field("name"),
        sourceKey: "name",
        classification: "public",
      },
      batna: {
        field: field("batna"),
        sourceKey: "batna",
        classification: "batna",
      },
      unknown: {
        field: field("unknown"),
        sourceKey: "unknown",
        classification: "unknown",
      },
    },
    decision.fieldMask,
    decision.allowedActions,
  );

  assertEquals(projected, {
    name: "Visible",
    allowedActions: [action("read")],
  });
  assertEquals(source.batna, "Never disclose");
  assert(!("batna" in projected));
  assert(!("unknown" in projected));
  assertEquals(
    projectAuthorizedDto(
      source,
      {
        visibleName: {
          field: field("name"),
          sourceKey: "name",
          classification: "batna",
        },
      },
      decision.fieldMask,
      decision.allowedActions,
    ),
    { allowedActions: [action("read")] },
  );
});

Deno.test("v1 projection matrix never serializes restricted values", () => {
  const source = { value: "restricted-value" };
  for (
    const classification of [
      "batna",
      "mandate_ceiling",
      "valuation_threshold",
      "negotiation_strategy",
      "unrestricted_evidence",
      "conflict_rationale",
      "relationship_ownership",
      "internal_audit",
      "agent_control",
      "copilot_capability",
    ] as const
  ) {
    const projected = projectAuthorizedDto(
      source,
      {
        value: { field: field("value"), sourceKey: "value", classification },
      },
      {
        include: [],
        omit: [field("value")],
        redact: [],
        approvedClassifications: [],
      },
      [],
    );
    assertEquals(JSON.stringify(projected).includes("restricted-value"), false);
  }
});

Deno.test("v1 tokens are allowed-only, immutable, and non-serializing", () => {
  const denied = evaluateAuthorization(request());
  const allowed = evaluateAuthorization(request({ roleFacts: [readerRole] }));

  assertThrows(() => createApprovedScopeToken(denied));
  const token = createApprovedScopeToken(allowed);
  assert(Object.isFrozen(token));
  assertEquals(JSON.stringify(token), undefined);
});

Deno.test("v1 public boundary has no infrastructure dependencies", async () => {
  const files = [] as string[];
  for await (const entry of Deno.readDir("src/platform/authz")) {
    if (entry.isFile && entry.name.endsWith(".ts")) files.push(entry.name);
  }
  const source = await Promise.all(
    files.map((name) => Deno.readTextFile(`src/platform/authz/${name}`)),
  );
  assertEquals(
    /platform\/(persistence|events|jobs)|core\/db|gui|providers?|routes?/.test(
      source.join("\n"),
    ),
    false,
  );
  const entrypoint = source[files.indexOf("v1.ts")];
  assertEquals(entrypoint.includes("allowedDecision"), false);
  assertEquals(entrypoint.includes("deniedDecision"), false);
  assertEquals(AUTHORIZATION_ROLLOUT_CONTRACT.length, 3);
});

function request(
  overrides: Partial<AuthorizationRequest> = {},
): AuthorizationRequest {
  const context = contextFor(scope());
  return {
    context,
    actor: actor(),
    scope: scope(),
    resource: resource(),
    action: action("read"),
    requestedFields: [{ name: field("name"), classification: "public" }, {
      name: field("batna"),
      classification: "batna",
    }],
    roleFacts: [],
    grantFacts: [],
    restrictionFacts: [],
    relationshipFacts: [],
    clock,
    ...overrides,
  };
}

function contextFor(
  value: { tenantId: string; workspaceId: string; dealId?: string },
) {
  const parsed = parseRequestContext({
    actorId: "actor_reader-7",
    tenantId: value.tenantId,
    workspaceId: value.workspaceId,
    ...(value.dealId === undefined ? {} : { dealId: value.dealId }),
    correlationId: "cor_authz-7",
    origin: "internal",
  });
  if (parsed.ok) return parsed.value;
  throw new Error(`Expected context, got ${parsed.issue.code}`);
}

function scope(): AuthorizationScope {
  const context = contextFor({
    tenantId: "tenant_northstar",
    workspaceId: "workspace_primary",
    dealId: "deal_solar-2026",
  });
  if (context.workspaceId === undefined || context.dealId === undefined) {
    throw new Error("Expected deal scope");
  }
  return {
    tenantId: context.tenantId,
    workspaceId: context.workspaceId,
    dealId: context.dealId,
  };
}

function actor() {
  return {
    id: contextFor(scope()).actorId,
    kind: "human" as const,
    state: "active" as const,
  };
}

function resource() {
  return { kind: resourceKind("deal"), id: "deal_solar-2026" };
}

class CountingLoader<T> {
  calls = 0;
  scopeToken: unknown;
  constructor(private readonly value: T) {}
  load(scopeToken: unknown): Promise<T | undefined> {
    this.calls += 1;
    this.scopeToken = scopeToken;
    return Promise.resolve(this.value);
  }
}

class AbsentLoader {
  load(): Promise<undefined> {
    return Promise.resolve(undefined);
  }
}

async function assertRejectsLoaderError(): Promise<void> {
  try {
    await guardedLoad(
      request({ roleFacts: [readerRole] }),
      new ThrowingLoader(),
    );
  } catch (error) {
    return assertEquals((error as Error).message, "loader-failure");
  }
  throw new Error("Expected loader failure");
}

class ThrowingLoader {
  load(): Promise<never> {
    return Promise.reject(new Error("loader-failure"));
  }
}
