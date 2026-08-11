import manifestJson from "../../tests/fixtures/investor-demo/manifest.json" with {
  type: "json",
};
import type { ExecutableDemoReadinessConfig } from "../api/demo_readiness_executable_composition.ts";
import type { DemoManifest, DemoResetTarget } from "./contracts.ts";
import { assertSafeDemoDatabaseUrl } from "./reset.ts";

/** Loads the explicit local-only demo composition for the normal API process.
 *
 * @example loadExecutableDemoReadinessConfig({ MAI_DEMO_READINESS_ENABLED: "true", DENO_ENV: "local-demo", DATABASE_URL })
 */
export function loadExecutableDemoReadinessConfig(
  environment: Readonly<Record<string, string | undefined>>,
): ExecutableDemoReadinessConfig | undefined {
  if (environment.MAI_DEMO_READINESS_ENABLED !== "true") return undefined;
  const target = demoTarget(environment.DENO_ENV);
  const databaseUrl = environment.DATABASE_URL;
  if (databaseUrl === undefined) {
    throw new Error(
      "Demo API configuration is missing DATABASE_URL; expected the guarded local demo target.",
    );
  }
  assertSafeDemoDatabaseUrl(databaseUrl, target);
  return {
    manifest: manifestJson as DemoManifest,
    fixtureRoot: new URL(
      "../../tests/fixtures/investor-demo/",
      import.meta.url,
    ),
    target,
  };
}

function demoTarget(environment: string | undefined): DemoResetTarget {
  if (environment === "test") {
    return { environment, databaseName: "mai_demo_readiness" };
  }
  if (environment === "local-demo") {
    return { environment, databaseName: "mai_demo_readiness" };
  }
  throw new Error(
    `Demo API environment "${
      environment ?? "missing"
    }" is unsafe; expected local-demo or test.`,
  );
}
