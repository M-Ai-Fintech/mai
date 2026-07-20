// src/agent/vdr_mock.ts
import { DatabaseMemoryService } from "../core/db/memory_service.ts";

export class VDRIntegration {
  public static async queryKYBRegistry(cnpj: string): Promise<Record<string, any>> {
    console.log(`[VDR Mock] Querying KYB registry for CNPJ: ${cnpj}`);
    
    try {
      const db = DatabaseMemoryService.getInstance();
      const sql = `SELECT * FROM business WHERE cnpj = $1 LIMIT 1`;
      const result = await db.executeRawQuery<{ id: string, name: string, cnpj: string, sector: string, origin_country: string, created_at: string }>(sql, [cnpj]);
      
      if (result.length > 0) {
        console.log("[VDR Mock] Found business in database memory service");
        const row = result[0];
        return {
          cnpj: row.cnpj,
          legalName: row.name,
          tradeName: row.name,
          registrationStatus: "ATIVA",
          foundingDate: row.created_at,
          shareCapital: 1000000.0,
          legalEntity: "Sociedade Anônima",
          shareholders: [{ name: "Database Founder", role: "Sócio" }],
          federalClearance: "VALIDA",
          laborClearance: "VALIDA",
          slaveLaborList: "NADA CONSTA",
          ceis: "NADA CONSTA",
          taxDebtsAmount: 0
        };
      }
    } catch (err) {
      console.warn("[VDR Mock] Could not fetch from database, falling back to mock data:", err instanceof Error ? err.message : String(err));
    }
    
    // Retorna dados fictícios de cadastro para simular o SERPRO / Receita Federal
    return {
      cnpj,
      legalName: "Target Acquisition Ltda",
      tradeName: "Target M&A Partner",
      registrationStatus: "ATIVA",
      foundingDate: "2015-06-15",
      shareCapital: 5000000.0,
      legalEntity: "Sociedade Empresária Limitada",
      shareholders: [
        { name: "Carlos Henrique Silva", role: "Sócio-Administrador" },
        { name: "Ana Paula Souza", role: "Sócio" }
      ],
      federalClearance: "VALIDA",
      laborClearance: "VALIDA",
      slaveLaborList: "NADA CONSTA",
      ceis: "NADA CONSTA",
      taxDebtsAmount: 0
    };
  }
}

export class VDRService {
  public static async getDocumentsForDeal(dealId: string): Promise<Array<{ name: string; type: string; size: string }>> {
    console.log(`[VDR Mock] Retrieving documents for Deal: ${dealId}`);
    try {
      const dirPath = `./vdr_rooms/${dealId}`;
      const files: Array<{ name: string; type: string; size: string }> = [];
      for await (const entry of Deno.readDir(dirPath)) {
        if (entry.isFile) {
          const stat = await Deno.stat(`${dirPath}/${entry.name}`);
          let type = "Desconhecido";
          if (entry.name.includes("DRE") || entry.name.includes("Financeiro")) type = "Financeiro";
          else if (entry.name.includes("Estatuto") || entry.name.includes("Acordo")) type = "Societário";
          else if (entry.name.includes("Folha")) type = "Trabalhista";
          
          files.push({ name: entry.name, type, size: `${Math.round(stat.size / 1024)}KB` });
        }
      }
      if (files.length > 0) return files;
    } catch (err) {
      console.warn(`[VDR Mock] Directory not found or empty, falling back to mock...`);
    }

    return [
      { name: "DRE_Target_2025.txt", type: "Financeiro", size: "12KB" },
      { name: "Estatuto_Social_Registrado.txt", type: "Societário", size: "45KB" },
      { name: "Folha_Pagamento_C_Level.txt", type: "Trabalhista", size: "8KB" },
      { name: "Acordo_Acionistas_Target.txt", type: "Societário", size: "28KB" }
    ];
  }
}
