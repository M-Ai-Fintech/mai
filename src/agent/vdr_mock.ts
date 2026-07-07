// src/agent/vdr_mock.ts

export class VDRIntegration {
  public static async queryKYBRegistry(cnpj: string): Promise<Record<string, any>> {
    console.log(`[VDR Mock] Querying KYB registry for CNPJ: ${cnpj}`);
    // Retorna dados fictícios de cadastro para simular o SERPRO / Receita Federal
    return {
      cnpj,
      razaoSocial: "Target Acquisition Ltda",
      nomeFantasia: "Target M&A Partner",
      situacaoCadastral: "ATIVA",
      dataAbertura: "2015-06-15",
      capitalSocial: 5000000.0,
      naturezaJuridica: "Sociedade Empresária Limitada",
      qsa: [
        { nome: "Carlos Henrique Silva", qualificacao: "Sócio-Administrador" },
        { nome: "Ana Paula Souza", qualificacao: "Sócio" }
      ],
      cndFederal: "VALIDA",
      cndTrabalhista: "VALIDA",
      trabalhoEscravo: "NADA CONSTA",
      ceis: "NADA CONSTA"
    };
  }
}

export class VDRService {
  public static async getDocumentsForDeal(dealId: string): Promise<Array<{ name: string; type: string; size: string }>> {
    console.log(`[VDR Mock] Retrieving documents for Deal: ${dealId}`);
    return [
      { name: "DRE_Target_2025.txt", type: "Financeiro", size: "12KB" },
      { name: "Estatuto_Social_Registrado.txt", type: "Societário", size: "45KB" },
      { name: "Folha_Pagamento_C_Level.txt", type: "Trabalhista", size: "8KB" },
      { name: "Acordo_Acionistas_Target.txt", type: "Societário", size: "28KB" }
    ];
  }
}
