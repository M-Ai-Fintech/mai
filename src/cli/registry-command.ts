import { verifyRegistryTool } from "../agent/actions.ts";
import { AIProvider } from "../agent/ai_provider.ts";
import { AgentOrchestrator } from "../agent/index.ts";

import { RegistryRecord } from "../agent/vdr_mock.ts";
import { t, tList } from "../i18n/index.ts";
import {
  describeCommandError,
  printSectionHeader,
  renderOutputTable,
  TableCell,
} from "./command-output.ts";
import { createCommandProgress } from "./command-progress.ts";

type RegistryExecutionContext = Parameters<
  NonNullable<typeof verifyRegistryTool.execute>
>[1];

/**
 * Checks a corporate registry and prints its qualitative context.
 *
 * @example await checkCorporateRegistry("12345678000199");
 */
export async function checkCorporateRegistry(cnpj: string): Promise<void> {
  printSectionHeader(t("cli.headers.checkRegistry"));
  const progress = createCommandProgress(t("cli.spinners.kyb", { cnpj }));
  progress.start();
  try {
    const registry = await fetchRegistryRecord(cnpj);
    progress.stop();
    renderRegistrySummary(registry);
    await printRegistryCulture(cnpj, registry);
  } catch (error) {
    progress.stop();
    console.error(t("cli.messages.kybError"), describeCommandError(error));
    throw error;
  }
}

async function fetchRegistryRecord(cnpj: string): Promise<RegistryRecord> {
  const result = await verifyRegistryTool.execute!(
    { cnpj },
    {} as RegistryExecutionContext,
  );
  return result.data;
}

function renderRegistrySummary(registry: RegistryRecord): void {
  renderOutputTable(
    [...tList("cli.tables.kybHeader")],
    registryRows(registry),
  );
  const taxMessage = registry.taxDebtsAmount > 0
    ? "cli.messages.taxDebtsWarning"
    : "cli.messages.cleanRegistry";
  console.log(t(taxMessage));
  console.log(t("cli.messages.kybQualitative"));
}

function registryRows(registry: RegistryRecord): TableCell[][] {
  const unavailable = t("cli.tables.notAvailable");
  return [
    [t("cli.tables.kybFields.legalName"), registry.legalName || unavailable],
    [t("cli.tables.kybFields.tradeName"), registry.tradeName || unavailable],
    [t("cli.tables.kybFields.status"), registry.registrationStatus],
    [
      t("cli.tables.kybFields.capital"),
      `R$ ${registry.shareCapital.toLocaleString()}`,
    ],
    [t("cli.tables.kybFields.foundingDate"), registry.foundingDate],
    [
      t("cli.tables.kybFields.taxDebts"),
      `R$ ${registry.taxDebtsAmount.toLocaleString()}`,
    ],
  ];
}

async function printRegistryCulture(
  _cnpj: string,
  registry: RegistryRecord,
): Promise<void> {
  await printGeneratedCulture(registry);
}

async function printGeneratedCulture(registry: RegistryRecord): Promise<void> {
  if (AIProvider.getApiKey().isFallback) {
    printFallbackCulture();
    return;
  }
  try {
    const query = t("cli.messages.cultureQuery", {
      name: registry.legalName || "Target",
    });
    console.log(await AgentOrchestrator.executeAgentQuery("kyb_temp", query));
  } catch {
    printDefaultCulture();
  }
}

function printFallbackCulture(): void {
  printCultureFields(
    t("cli.messages.cultureFallback", {
      sector: t("cli.messages.techSaaS"),
    }),
    t("cli.messages.movementsFallback"),
    t("cli.messages.negotiatorsFallback"),
  );
}

function printDefaultCulture(): void {
  printCultureFields(
    t("cli.messages.defaultCultureGood"),
    t("cli.messages.defaultMovementsGood"),
    t("cli.messages.defaultNegotiatorsGood"),
  );
}

function printCultureFields(
  culture: string,
  movements: string,
  negotiators: string,
): void {
  console.log(t("cli.messages.culture", { value: culture }));
  console.log(t("cli.messages.pastMovements", { value: movements }));
  console.log(t("cli.messages.negotiators", { value: negotiators }));
}
