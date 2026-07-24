// src/agent/vdr_mock.ts
import { DatabaseMemoryService } from "../core/db/memory_service.ts";

export class VDRIntegration {
  public static async queryKYBRegistry(
    cnpj: string,
  ): Promise<Record<string, any>> {
    console.log(`[VDR Mock] Querying KYB registry for CNPJ: ${cnpj}`);

    try {
      const db = DatabaseMemoryService.getInstance();
      const sql = `SELECT * FROM business WHERE cnpj = $1 LIMIT 1`;
      const result = await db.executeRawQuery<
        {
          id: string;
          name: string;
          cnpj: string;
          sector: string;
          origin_country: string;
          created_at: string;
        }
      >(sql, [cnpj]);

      if (result.length > 0) {
        console.log("[VDR Mock] Found business in database memory service");
        const row = result[0];
        return {
          cnpj: row.cnpj,
          legalName: row.name,
          tradeName: row.name,
          registrationStatus: "active",
          foundingDate: row.created_at,
          shareCapital: 1000000.0,
          legalEntity: "Corporation",
          shareholders: [{ name: "Database Founder", role: "partner" }],
          federalClearance: "valid",
          laborClearance: "valid",
          slaveLaborList: "clear",
          ceis: "clear",
          taxDebtsAmount: 0,
        };
      }
    } catch (err) {
      console.warn(
        "[VDR Mock] Could not fetch from database, falling back to mock data:",
        err instanceof Error ? err.message : String(err),
      );
    }

    // Returns dummy registration data to simulate SERPRO / Federal Revenue
    return {
      cnpj,
      legalName: "Target Acquisition Ltda",
      tradeName: "Target M&A Partner",
      registrationStatus: "active",
      foundingDate: "2015-06-15",
      shareCapital: 5000000.0,
      legalEntity: "Limited Liability Company",
      shareholders: [
        { name: "Carlos Henrique Silva", role: "managing_partner" },
        { name: "Ana Paula Souza", role: "partner" },
      ],
      federalClearance: "valid",
      laborClearance: "valid",
      slaveLaborList: "clear",
      ceis: "clear",
      taxDebtsAmount: 0,
    };
  }
}

export class VDRService {
  public static async getDocumentsForDeal(
    dealId: string,
  ): Promise<Array<{ name: string; type: string; size: string }>> {
    console.log(`[VDR Mock] Retrieving documents for Deal: ${dealId}`);
    try {
      const dirPath = `./vdr_rooms/${dealId}`;
      const files: Array<{ name: string; type: string; size: string }> = [];
      for await (const entry of Deno.readDir(dirPath)) {
        if (entry.isFile) {
          const stat = await Deno.stat(`${dirPath}/${entry.name}`);
          let type = "unknown";
          if (
            entry.name.includes("Income_Statement") ||
            entry.name.includes("Financial")
          ) type = "finance";
          else if (
            entry.name.includes("Bylaws") || entry.name.includes("Agreement")
          ) type = "corporate";
          else if (entry.name.includes("Payroll")) type = "labor";

          files.push({
            name: entry.name,
            type,
            size: `${Math.round(stat.size / 1024)}KB`,
          });
        }
      }
      if (files.length > 0) return files;
    } catch (err) {
      console.warn(
        `[VDR Mock] Directory not found or empty, falling back to mock...`,
      );
    }

    return [
      {
        name: "Income_Statement_Target_2025.txt",
        type: "finance",
        size: "12KB",
      },
      { name: "Bylaws_Registered.txt", type: "corporate", size: "45KB" },
      { name: "Payroll_C_Level.txt", type: "labor", size: "8KB" },
      {
        name: "Shareholders_Agreement_Target.txt",
        type: "corporate",
        size: "28KB",
      },
    ];
  }
}
