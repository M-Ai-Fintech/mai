import {
  INTEGRATION_PROVIDERS,
  parseIntegrationScope,
  parseProviderConfiguration,
  READINESS_GATES,
  selectIntegrationProvider,
} from "../../src/integrations/v1.ts";
import { assertEquals } from "@std/assert";
import * as publicIntegration from "../../src/integrations/v1.ts";
import * as publicPapermark from "../../src/integrations/papermark/index.ts";

Deno.test("public integration seam exposes selection and readiness contracts", async () => {
  const configuration = parseProviderConfiguration({
    provider: "ideals",
    environment: "interface-only",
    lifecycle: "deferred",
  });

  const selection = await selectIntegrationProvider({
    mode: "configured",
    provider: "ideals",
    configuration,
    scope: parseIntegrationScope({
      tenantId: "tenant_northstar",
      workspaceId: "workspace_meridian",
      dealId: "deal_horizon",
    }),
    connectorAccountId: "connector-1",
    providerWorkspaceId: "provider-workspace-1",
    factories: {},
  });

  assertEquals(INTEGRATION_PROVIDERS, [
    "papermark",
    "ideals",
    "intralinks",
    "fixture",
  ]);
  assertEquals(READINESS_GATES.includes("credentials"), true);
  assertEquals(selection.kind, "blocked");
  if (selection.kind === "blocked") assertEquals(selection.reason, "deferred");
});

Deno.test("public v1 seam does not expose Papermark construction authority", () => {
  assertEquals("PapermarkAdapter" in publicIntegration, false);
  assertEquals("PapermarkIntegrationAdapter" in publicIntegration, false);
  assertEquals("PapermarkTransport" in publicIntegration, false);
  assertEquals(
    "createSyntheticPapermarkCallAuthorizationForTests" in publicIntegration,
    false,
  );
  assertEquals(
    "createSyntheticPapermarkCallAuthorizationForTests" in publicPapermark,
    false,
  );
});
