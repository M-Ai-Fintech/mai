import {
  type InfrastructurePlan,
  isProvisionable,
  parseInfrastructureSet,
} from "../src/platform/operations/contract.ts";

const environmentFiles = ["development"] as const;

export async function loadInfrastructurePlans(): Promise<InfrastructurePlan[]> {
  const values = await Promise.all(environmentFiles.map(readEnvironment));
  return parseInfrastructureSet(values);
}

export async function validateInfrastructureContracts(): Promise<void> {
  const plans = await loadInfrastructurePlans();
  for (const plan of plans) {
    const state = isProvisionable(plan) ? "provisionable" : "approval-gated";
    console.log(`MVP local ${plan.environment}: ${state}`);
  }
  console.log(
    "MVP local infrastructure contract validated; no cloud readiness is claimed.",
  );
}

async function readEnvironment(
  environment: (typeof environmentFiles)[number],
): Promise<unknown> {
  const path = new URL(
    `../infra/environments/${environment}.json`,
    import.meta.url,
  );
  return JSON.parse(await Deno.readTextFile(path));
}

if (import.meta.main) await validateInfrastructureContracts();
