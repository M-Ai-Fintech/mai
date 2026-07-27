import { loadRagDocuments } from "./rag/documents.ts";
import {
  indexRagDocuments,
  InMemoryRagSilos,
  searchRagSilo,
} from "./rag/vectors.ts";

export class ClientSiloedRAG {
  private static inMemorySilos: InMemoryRagSilos = {};

  /**
   * Loads and indexes VDR documents for one deal.
   *
   * @example await ClientSiloedRAG.initializeSilo("deal-1", "./vdr")
   */
  public static async initializeSilo(
    dealId: string,
    vdrSource: string,
    vdrType: "local" | "ideals" | "intralinks" = "local",
  ): Promise<number> {
    console.log(
      `[RAG Silo] Initializing vector silo for Deal ${dealId} using ${vdrType}...`,
    );
    const documents = await loadRagDocuments(vdrSource, vdrType);
    const count = await indexRagDocuments(
      dealId,
      documents,
      this.inMemorySilos,
    );
    console.log(
      `[RAG Silo] Silo initialized with ${count} vector chunks for Deal ${dealId}.`,
    );
    return count;
  }

  /**
   * Searches only the vector silo owned by the requested deal.
   *
   * @example await ClientSiloedRAG.querySilo("deal-1", "change of control")
   */
  public static querySilo(
    dealId: string,
    queryText: string,
    topK = 2,
  ): Promise<Array<{ text: string; document: string; score: number }>> {
    return searchRagSilo(dealId, queryText, topK, this.inMemorySilos);
  }
}
