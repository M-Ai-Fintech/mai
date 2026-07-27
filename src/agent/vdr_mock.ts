// src/agent/vdr_mock.ts
import { DatabaseMemoryService } from "../core/db/memory_service.ts";

export interface RegistryShareholder {
  name: string;
  role: string;
}

export interface RegistryRecord {
  cnpj: string;
  legalName: string;
  tradeName: string;
  registrationStatus: string;
  foundingDate: string;
  shareCapital: number;
  legalEntity: string;
  shareholders: RegistryShareholder[];
  federalClearance: string;
  laborClearance: string;
  slaveLaborList: string;
  ceis: string;
  taxDebtsAmount: number;
}

interface BusinessRegistryRow {
  id: string;
  name: string;
  cnpj: string;
  sector: string;
  origin_country: string;
  created_at: string;
}

export class VDRIntegration {
  public static async queryKYBRegistry(
    cnpj: string,
  ): Promise<RegistryRecord> {
    console.log(`[VDR Mock] Querying KYB registry for CNPJ: ${cnpj}`);
    try {
      const row = await findBusinessRegistryRow(cnpj);
      if (row) return registryRecordFrom(row);
    } catch (error: unknown) {
      console.warn(
        "[VDR Mock] Could not fetch from database, falling back to mock data:",
        error instanceof Error ? error.message : String(error),
      );
    }
    return fallbackRegistryRecord(cnpj);
  }
}

export class VDRService {
  public static async getDocumentsForDeal(
    dealId: string,
  ): Promise<Array<{ name: string; type: string; size: string }>> {
    console.log(`[VDR Mock] Retrieving documents for Deal: ${dealId}`);
    try {
      const files = await localDealDocuments(dealId);
      if (files.length > 0) return files;
    } catch {
      console.warn(
        `[VDR Mock] Directory not found or empty, falling back to mock...`,
      );
    }
    return fallbackDealDocuments();
  }
}

async function findBusinessRegistryRow(
  cnpj: string,
): Promise<BusinessRegistryRow | undefined> {
  const rows = await DatabaseMemoryService.getInstance().executeRawQuery<
    BusinessRegistryRow
  >("SELECT * FROM business WHERE cnpj = $1 LIMIT 1", [cnpj]);
  return rows[0];
}

function registryRecordFrom(row: BusinessRegistryRow): RegistryRecord {
  console.log("[VDR Mock] Found business in database memory service");
  return {
    ...registryDefaults(),
    cnpj: row.cnpj,
    legalName: row.name,
    tradeName: row.name,
    foundingDate: row.created_at,
    shareCapital: 1000000,
    legalEntity: "Corporation",
    shareholders: [{ name: "Database Founder", role: "partner" }],
  };
}

function registryDefaults(): Omit<
  RegistryRecord,
  | "cnpj"
  | "legalName"
  | "tradeName"
  | "foundingDate"
  | "shareCapital"
  | "legalEntity"
  | "shareholders"
> {
  return {
    registrationStatus: "active",
    federalClearance: "valid",
    laborClearance: "valid",
    slaveLaborList: "clear",
    ceis: "clear",
    taxDebtsAmount: 0,
  };
}

function fallbackRegistryRecord(cnpj: string): RegistryRecord {
  return {
    ...registryDefaults(),
    cnpj,
    legalName: "Target Acquisition Ltda",
    tradeName: "Target M&A Partner",
    foundingDate: "2015-06-15",
    shareCapital: 5000000,
    legalEntity: "Limited Liability Company",
    shareholders: [
      { name: "Carlos Henrique Silva", role: "managing_partner" },
      { name: "Ana Paula Souza", role: "partner" },
    ],
  };
}

type DealDocument = { name: string; type: string; size: string };

async function localDealDocuments(dealId: string): Promise<DealDocument[]> {
  const directory = `./vdr_rooms/${dealId}`;
  const files: DealDocument[] = [];
  for await (const entry of Deno.readDir(directory)) {
    if (!entry.isFile) continue;
    const stat = await Deno.stat(`${directory}/${entry.name}`);
    files.push({
      name: entry.name,
      type: documentType(entry.name),
      size: `${Math.round(stat.size / 1024)}KB`,
    });
  }
  return files;
}

function documentType(name: string): string {
  if (name.includes("Income_Statement") || name.includes("Financial")) {
    return "finance";
  }
  if (name.includes("Bylaws") || name.includes("Agreement")) return "corporate";
  return name.includes("Payroll") ? "labor" : "unknown";
}

function fallbackDealDocuments(): DealDocument[] {
  return [
    { name: "Income_Statement_Target_2025.txt", type: "finance", size: "12KB" },
    { name: "Bylaws_Registered.txt", type: "corporate", size: "45KB" },
    { name: "Payroll_C_Level.txt", type: "labor", size: "8KB" },
    {
      name: "Shareholders_Agreement_Target.txt",
      type: "corporate",
      size: "28KB",
    },
  ];
}
