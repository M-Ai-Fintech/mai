import { assert } from "@std/assert";

const productionModules = [
  "src/api/deal_management_bootstrap.ts",
  "src/deal_management/reconciliation.ts",
  "src/deal_management/reconciliation_store.ts",
  "src/deal_management/reconciliation_verification.ts",
  "src/deal_management/repository.ts",
] as const;

Deno.test("MAI-110 production modules remain below the repository size limit", async () => {
  for (const path of productionModules) {
    const source = await Deno.readTextFile(path);
    const lines = source.split("\n").length - 1;
    assert(lines < 500, `${path} has ${lines} lines; expected fewer than 500`);
  }
});
