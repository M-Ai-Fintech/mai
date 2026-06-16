// src/core/integrations/vdr.ts

export interface KYBRegistryData {
  cnpj: string;
  legalName: string;
  tradeName: string;
  status: "ATIVA" | "INATIVA" | "SUSPENSA";
  shareCapital: number;
  incorporationDate: string;
  taxDebtsAmount: number;
}

export interface VDRDocument {
  name: string;
  size: number;
  category: "financial" | "legal" | "hr" | "operations" | "uncategorized";
  contentSummary: string;
  confidentialityLevel: "public" | "internal" | "restricted" | "highly-confidential";
}

export class VDRIntegration {
  /**
   * Simulates querying the Receita Federal/SERPRO registry database for KYB verification.
   */
  public static async queryKYBRegistry(cnpj: string): Promise<KYBRegistryData> {
    // Simulate API network delay
    await new Promise((resolve) => setTimeout(resolve, 80));

    const cnpjDigits = cnpj.replace(/\D/g, "");
    
    // Fallback/Mock registry query based on CNPJ digits
    const seed = parseInt(cnpjDigits.slice(-4)) || 1000;
    const isSuspended = seed % 13 === 0;
    const isInactive = seed % 17 === 0;
    
    const taxDebts = seed % 5 === 0 ? seed * 5000 : 0;
    const shareCapital = seed * 10000;

    return {
      cnpj,
      legalName: `Sociedade M&A Target ${seed} Ltda`,
      tradeName: `Target Brand ${seed}`,
      status: isSuspended ? "SUSPENSA" : (isInactive ? "INATIVA" : "ATIVA"),
      shareCapital,
      incorporationDate: new Date(2010 + (seed % 15), seed % 12, 1).toISOString().split("T")[0],
      taxDebtsAmount: taxDebts,
    };
  }

  /**
   * Scans a client Virtual Data Room (VDR) directory and indexes the documents found.
   */
  public static async scanVDR(vdrDirectory: string): Promise<VDRDocument[]> {
    // Real check: see if directory exists
    const docs: VDRDocument[] = [];
    try {
      for await (const entry of Deno.readDir(vdrDirectory)) {
        if (entry.isFile) {
          const fileInfo = await Deno.stat(`${vdrDirectory}/${entry.name}`);
          const category = this.detectCategory(entry.name);
          const confidentiality = this.detectConfidentiality(entry.name);
          
          docs.push({
            name: entry.name,
            size: fileInfo.size,
            category,
            contentSummary: `Parsed file ${entry.name}. Size ${fileInfo.size} bytes.`,
            confidentialityLevel: confidentiality,
          });
        }
      }
    } catch (_err) {
      // If folder doesn't exist, generate standard sandbox VDR files
      return this.generateMockVDRDocuments();
    }
    
    if (docs.length === 0) {
      return this.generateMockVDRDocuments();
    }
    return docs;
  }

  private static detectCategory(filename: string): VDRDocument["category"] {
    const fn = filename.toLowerCase();
    if (fn.includes("dre") || fn.includes("balance") || fn.includes("fiscal") || fn.includes("audit") || fn.includes("contabil")) {
      return "financial";
    }
    if (fn.includes("contract") || fn.includes("acordo") || fn.includes("estatuto") || fn.includes("judicial") || fn.includes("nda")) {
      return "legal";
    }
    if (fn.includes("rh") || fn.includes("folha") || fn.includes("salary") || fn.includes("employee")) {
      return "hr";
    }
    if (fn.includes("operac") || fn.includes("process") || fn.includes("infra") || fn.includes("tec")) {
      return "operations";
    }
    return "uncategorized";
  }

  private static detectConfidentiality(filename: string): VDRDocument["confidentialityLevel"] {
    const fn = filename.toLowerCase();
    if (fn.includes("confidencial") || fn.includes("segredo") || fn.includes("patent")) {
      return "highly-confidential";
    }
    if (fn.includes("internal") || fn.includes("interno") || fn.includes("dre") || fn.includes("folha")) {
      return "restricted";
    }
    if (fn.includes("relatorio") || fn.includes("public")) {
      return "public";
    }
    return "internal";
  }

  /**
   * Generates sample/standard mock VDR files for testing and evaluation
   */
  public static generateMockVDRDocuments(): VDRDocument[] {
    return [
      {
        name: "DRE_Target_2025.txt",
        size: 2048,
        category: "financial",
        contentSummary: "Demonstração de Resultados do Exercício (DRE) consolidada. EBITDA: 4500000. Receita: 15000000. Total Ativos: 20000000. Total Passivos: 12000000. Caixa Operacional: 3200000. Volatilidade Histórica: 0.12.",
        confidentialityLevel: "highly-confidential",
      },
      {
        name: "Estatuto_Social_Registrado.txt",
        size: 5120,
        category: "legal",
        contentSummary: "Estatuto social arquivado na Junta Comercial. Contempla cláusula de Mudança de Controle (Change of Control) determinando aprovação unânime do conselho administrativo para aquisições hostis.",
        confidentialityLevel: "restricted",
      },
      {
        name: "Folha_Pagamento_C_Level.txt",
        size: 1024,
        category: "hr",
        contentSummary: "Detalhamento salarial e bônus de performance do quadro Executivo (CEO, CFO, CTO) com cláusulas de golden parachute de 12 meses.",
        confidentialityLevel: "highly-confidential",
      },
      {
        name: "Acordo_Acionistas_Target.txt",
        size: 4096,
        category: "legal",
        contentSummary: "Contrato de acordo de acionistas estabelecendo direitos de tag-along de 100% e direito de preferência (Right of First Refusal).",
        confidentialityLevel: "highly-confidential",
      },
    ];
  }
}
