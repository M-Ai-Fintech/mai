import pg from "pg";
import {
  createDealManagementComposition,
  type DealManagementComposition,
} from "../deal_management/composition.ts";
import {
  PostgresDealAuthorization,
  PostgresIdentityAccessAuthentication,
} from "./deal_management_bootstrap.ts";

const DATABASE_KEYS = [
  "POSTGRES_INTEGRATION_TEST_DATABASE_URL",
  "DATABASE_URL",
] as const;

/** Loads the executable Deal graph from repository-owned production adapters. */
export function loadExecutableDealManagement(
  environment: Readonly<Record<string, string | undefined>> = explicitEnv(),
): DealManagementComposition {
  const pool = new pg.Pool({
    connectionString: configuredDatabaseUrl(environment),
    max: 10,
  });
  const result = createDealManagementComposition({
    pool,
    poolOwnership: "owned",
    authentication: new PostgresIdentityAccessAuthentication(pool),
    authorization: new PostgresDealAuthorization(pool),
  });
  if (result.kind === "configured") return result.composition;
  void pool.end();
  throw new Error(result.message);
}

function explicitEnv(): Readonly<Record<string, string | undefined>> {
  return {
    POSTGRES_INTEGRATION_TEST_DATABASE_URL: Deno.env.get(
      "POSTGRES_INTEGRATION_TEST_DATABASE_URL",
    ),
    DATABASE_URL: Deno.env.get("DATABASE_URL"),
  };
}

function configuredDatabaseUrl(
  environment: Readonly<Record<string, string | undefined>>,
): string {
  const value = DATABASE_KEYS.map((key) => environment[key]).find((item) =>
    item?.trim()
  );
  if (value === undefined) {
    throw new Error(
      "API database configuration is missing; expected POSTGRES_INTEGRATION_TEST_DATABASE_URL or DATABASE_URL.",
    );
  }
  const protocol = new URL(value).protocol;
  if (protocol === "postgres:" || protocol === "postgresql:") return value;
  throw new Error(
    `API database URL protocol "${protocol}" is invalid; expected postgres or postgresql.`,
  );
}
