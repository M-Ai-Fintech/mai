// src/agent/rag_layer.ts
import { VDRIntegration, VDRDocument } from "../core/vdr.ts";
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
    const docs: VDRDocument[] = await VDRIntegration.scanVDR(vdrDirectory);
    
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
