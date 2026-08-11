import { assertEquals, assertRejects } from "@std/assert";
import manifestJson from "../fixtures/investor-demo/manifest.json" with {
  type: "json",
};
import {
  DemoReadinessApplication,
  type DemoReadinessApplicationConfig,
  DemoReadinessApplicationError,
} from "../../src/demo_readiness/application.ts";
import type { DemoManifest } from "../../src/demo_readiness/contracts.ts";
import { demoScope } from "../../src/demo_readiness/runner.ts";
import type {
  DealAuthorizationInput,
  DealAuthorizationPort,
} from "../../src/deal_management/contracts.ts";
import type { RequestContext } from "../../src/platform/api/v1.ts";
import type {
  ActorReference,
  AllowedAuthorizationDecision,
} from "../../src/platform/authz/v1.ts";

const actor: ActorReference = {
  id: "actor_demo-banker" as ActorReference["id"],
  kind: "human",
  state: "active",
};

class DemoContextFake {
  constructor(private readonly context: RequestContext) {}

  contextFor(): Promise<{ context: RequestContext; actor: ActorReference }> {
    return Promise.resolve({ context: this.context, actor });
  }
}

class DenyingAuthorizationFake implements DealAuthorizationPort {
  calls = 0;

  authorize(_input: DealAuthorizationInput) {
    this.calls += 1;
    return {
      outcome: "deny" as const,
      reasonCode: "NO_MATCHING_GRANT" as const,
      allowedActions: [],
      approvedScope: undefined,
      fieldMask: {
        include: [],
        omit: [],
        redact: [],
        approvedClassifications: [],
      },
    };
  }
}

class AllowingAuthorizationFake implements DealAuthorizationPort {
  authorize(_input: DealAuthorizationInput) {
    return {
      outcome: "allow" as const,
      reasonCode: "ALLOWED" as const,
      allowedActions: [],
      approvedScope: {
        decisionReference: "decision_demo-application-test",
      } as AllowedAuthorizationDecision["approvedScope"],
      fieldMask: {
        include: [],
        omit: [],
        redact: [],
        approvedClassifications: [],
      },
    };
  }
}

class DealLoadSpy {
  calls = 0;

  find(): Promise<undefined> {
    this.calls += 1;
    return Promise.resolve(undefined);
  }
}

class FailingDealRepositoryFake {
  find(): Promise<never> {
    return Promise.reject(new Error("PostgreSQL connection detail"));
  }
}

class UnusedTransactionRunner {
  run<TResult>(): Promise<TResult> {
    return Promise.reject(new Error("Unexpected transaction."));
  }
}

class UnusedAuditReader {
  list(): Promise<never> {
    return Promise.reject(new Error("Unexpected audit read."));
  }
}

class UnusedWorkflowPersistence {
  persist(): Promise<never> {
    return Promise.reject(new Error("Unexpected persistence write."));
  }

  loadLatest(): Promise<never> {
    return Promise.reject(new Error("Unexpected persistence read."));
  }
}

Deno.test("demo rejects cross-deal scope before policy or protected loading", async () => {
  const authorization = new DenyingAuthorizationFake();
  const deals = new DealLoadSpy();
  const application = applicationFor(
    requestContext("deal_other-scope"),
    authorization,
    deals,
  );

  const error = await assertRejects(
    () =>
      application.readScreen(new Request("http://localhost"), "documents-vdr"),
    DemoReadinessApplicationError,
  );
  assertEquals(error.code, "DEMO_ACCESS_DENIED");
  assertEquals(authorization.calls, 0);
  assertEquals(deals.calls, 0);
});

Deno.test("demo policy denial occurs before protected Deal loading", async () => {
  const authorization = new DenyingAuthorizationFake();
  const deals = new DealLoadSpy();
  const application = applicationFor(
    requestContext(demoScope.dealId),
    authorization,
    deals,
  );

  const error = await assertRejects(
    () =>
      application.readScreen(new Request("http://localhost"), "documents-vdr"),
    DemoReadinessApplicationError,
  );
  assertEquals(error.code, "DEMO_ACCESS_DENIED");
  assertEquals(authorization.calls, 1);
  assertEquals(deals.calls, 0);
});

Deno.test("demo maps Deal repository failure to sanitized dependency unavailable", async () => {
  const application = applicationFor(
    requestContext(demoScope.dealId),
    new AllowingAuthorizationFake(),
    new FailingDealRepositoryFake(),
  );

  const error = await assertRejects(
    () =>
      application.readScreen(new Request("http://localhost"), "documents-vdr"),
    DemoReadinessApplicationError,
  );
  assertEquals(error.status, 503);
  assertEquals(error.code, "DEMO_DEPENDENCY_UNAVAILABLE");
  assertEquals(error.message.includes("PostgreSQL"), false);
});

function applicationFor(
  context: RequestContext,
  authorization: DealAuthorizationPort,
  deals: DemoReadinessApplicationConfig["deals"],
): DemoReadinessApplication {
  const config: DemoReadinessApplicationConfig = {
    manifest: manifestJson as DemoManifest,
    fixtureRoot: new URL("../fixtures/investor-demo/", import.meta.url),
    target: { environment: "test", databaseName: "mai_demo_readiness" },
    context: new DemoContextFake(context),
    authorization,
    deals,
    transactions: new UnusedTransactionRunner(),
    audit: new UnusedAuditReader(),
    persistence: new UnusedWorkflowPersistence(),
  };
  return new DemoReadinessApplication(config);
}

function requestContext(dealId: string): RequestContext {
  return {
    actorId: actor.id,
    sessionId: "session_investor-demo" as RequestContext["sessionId"],
    identityId: "identity_demo-banker" as RequestContext["identityId"],
    tenantId: demoScope.tenantId,
    workspaceId: demoScope.workspaceId,
    dealId: dealId as RequestContext["dealId"],
    correlationId:
      "cor_demo-application-test" as RequestContext["correlationId"],
    origin: "http",
  };
}
