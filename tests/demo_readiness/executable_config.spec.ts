import { assertEquals, assertThrows } from "@std/assert";
import { loadExecutableDemoReadinessConfig } from "../../src/demo_readiness/executable_config.ts";

Deno.test("normal API registers demo composition only for the guarded profile", () => {
  assertEquals(loadExecutableDemoReadinessConfig({}), undefined);
  const config = loadExecutableDemoReadinessConfig({
    MAI_DEMO_READINESS_ENABLED: "true",
    DENO_ENV: "local-demo",
    DATABASE_URL: "postgresql://demo:secret@127.0.0.1:55435/mai_demo_readiness",
  });

  assertEquals(config?.target, {
    environment: "local-demo",
    databaseName: "mai_demo_readiness",
  });
});

Deno.test("normal API rejects demo registration outside local-demo or test", () => {
  assertThrows(
    () =>
      loadExecutableDemoReadinessConfig({
        MAI_DEMO_READINESS_ENABLED: "true",
        DENO_ENV: "production",
        DATABASE_URL:
          "postgresql://demo:secret@127.0.0.1:55435/mai_demo_readiness",
      }),
    Error,
    "unsafe",
  );
});
