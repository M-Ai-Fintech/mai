// src/agent/rag_layer.ts
import { TransformersEngine } from "../engines/prediction/transformers.ts";

export interface VectorRecord {
  documentName: string;
  chunkIndex: number;
  textChunk: string;
  embedding: number[];
}

export class ClientSiloedRAG {
  private static silos: Record<string, VectorRecord[]> = {};

  /**
   * Initializes the silo for a given deal by loading and vectorizing VDR documents.
   */
  public static async initializeSilo(dealId: string, vdrDirectory: string): Promise<number> {
    console.log(`[RAG Silo] Initializing vector silo for Deal ${dealId}...`);
    
    let docs: Array<{ name: string; contentSummary: string }> = [];
    
    try {
      for await (const entry of Deno.readDir(vdrDirectory)) {
        if (entry.isFile && (entry.name.endsWith('.txt') || entry.name.endsWith('.md'))) {
          const content = await Deno.readTextFile(`${vdrDirectory}/${entry.name}`);
          docs.push({
            name: entry.name,
            contentSummary: content,
          });
        }
      }
    } catch (err) {
      console.warn(`[RAG Silo] Directory ${vdrDirectory} not found or empty, falling back to mock data...`);
    }

    if (docs.length === 0) {
      docs = [
        {
          name: "DRE_Target_2025.txt",
          contentSummary: "Demonstração de Resultados do Exercício (DRE) consolidada. EBITDA: 4500000. Receita: 15000000. Total Ativos: 20000000. Total Passivos: 12000000. Caixa Operacional: 3200000. Volatilidade Histórica: 0.12.",
        },
        {
          name: "Estatuto_Social_Registrado.txt",
          contentSummary: "Estatuto social arquivado na Junta Comercial. Contempla cláusula de Mudança de Controle (Change of Control) determinando aprovação unânime do conselho administrativo para aquisições hostis.",
        },
        {
          name: "Folha_Pagamento_C_Level.txt",
          contentSummary: "Detalhamento salarial e bônus de performance do quadro Executivo (CEO, CFO, CTO) com cláusulas de golden parachute de 12 meses.",
        },
        {
          name: "Acordo_Acionistas_Target.txt",
          contentSummary: "Contrato de acordo de acionistas estabelecendo direitos de tag-along de 100% e direito de preferência (Right of First Refusal).",
        },
      ];
    }
    
    const records: VectorRecord[] = [];
    
    for (const doc of docs) {
      const chunks = this.chunkText(doc.contentSummary, 150);
      
      for (let i = 0; i < chunks.length; i++) {
        const textChunk = chunks[i];
        const embedding = await TransformersEngine.generateEmbedding(textChunk);
        
        records.push({
          documentName: doc.name,
          chunkIndex: i,
          textChunk,
          embedding,
        });
      }
    }
    
    this.silos[dealId] = records;
    console.log(`[RAG Silo] Silo initialized with ${records.length} vector chunks for Deal ${dealId}.`);
    return records.length;
  }

  /**
   * Performs a vector similarity query restricted to a specific client/deal silo.
   */
  public static async querySilo(
    dealId: string,
    queryText: string,
    topK = 2
  ): Promise<Array<{ text: string; document: string; score: number }>> {
    const silo = this.silos[dealId];
    if (!silo) {
      console.warn(`[RAG Silo] No vector silo found for Deal ${dealId}. Initializing empty.`);
      return [];
    }

    const queryEmbedding = await TransformersEngine.generateEmbedding(queryText);
    
    const results = silo.map(record => {
      const score = this.cosineSimilarity(queryEmbedding, record.embedding);
      return {
        text: record.textChunk,
        document: record.documentName,
        score,
      };
    });

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  private static chunkText(text: string, maxWords: number): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += maxWords) {
      chunks.push(words.slice(i, i + maxWords).join(" "));
    }
    return chunks;
  }

  private static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
  }
}
