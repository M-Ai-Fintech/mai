// src/agent/rag_layer.ts
import { TransformersEngine } from "../engines/prediction/transformers.ts";
import { DatabaseMemoryService } from "../core/db/memory_service.ts";
import { IDealsVDRProvider } from "../core/vdr/providers/ideals.ts";
import { IntralinksVDRProvider } from "../core/vdr/providers/intralinks.ts";
import { VDRProvider } from "../core/vdr/provider.ts";

export class ClientSiloedRAG {
  private static inMemorySilos: Record<
    string,
    Array<
      {
        documentName: string;
        chunkIndex: number;
        textChunk: string;
        embedding: number[];
      }
    >
  > = {};

  /**
   * Initializes the silo for a given deal by loading and vectorizing VDR documents
   * and saving them to the Postgres database via DatabaseMemoryService.
   */
  public static async initializeSilo(
    dealId: string,
    vdrSource: string,
    vdrType: "local" | "ideals" | "intralinks" = "local",
  ): Promise<number> {
    console.log(
      `[RAG Silo] Initializing vector silo for Deal ${dealId} using ${vdrType}...`,
    );
    const db = DatabaseMemoryService.getInstance();

    let docs: Array<{ name: string; contentSummary: string }> = [];

    try {
      if (vdrType === "ideals" || vdrType === "intralinks") {
        const supergoodConfig = {
          apiKey: Deno.env.get("SUPERGOOD_API_KEY") || "mock-supergood-key",
          clientId: Deno.env.get("SUPERGOOD_CLIENT_ID"),
          proxyUrl: Deno.env.get("SUPERGOOD_PROXY_URL") || undefined,
        };
        let provider: VDRProvider;
        if (vdrType === "ideals") {
          provider = new IDealsVDRProvider(supergoodConfig);
        } else {
          provider = new IntralinksVDRProvider(supergoodConfig);
        }

        const vdrDocs = await provider.listDocuments(vdrSource);
        for (const doc of vdrDocs) {
          try {
            const bytes = await provider.downloadDocument(doc.id);
            const content = new TextDecoder().decode(bytes);
            docs.push({
              name: doc.name,
              contentSummary: content ||
                `Content of file ${doc.name} is empty.`,
            });
          } catch (downloadErr: any) {
            console.warn(
              `[RAG Silo] Failed to download document ${doc.name} (id: ${doc.id}):`,
              downloadErr.message,
            );
            throw downloadErr;
          }
        }
      } else {
        for await (const entry of Deno.readDir(vdrSource)) {
          if (
            entry.isFile &&
            (entry.name.endsWith(".txt") || entry.name.endsWith(".md"))
          ) {
            const content = await Deno.readTextFile(
              `${vdrSource}/${entry.name}`,
            );
            docs.push({
              name: entry.name,
              contentSummary: content,
            });
          }
        }
      }
    } catch (err) {
      console.warn(
        `[RAG Silo] Error reading from ${vdrSource} (${vdrType}), falling back to mock data...`,
        err,
      );
    }

    if (docs.length === 0) {
      docs = [
        {
          name: "Income_Statement_Target_2025.txt",
          contentSummary:
            "Consolidated Income Statement (DRE). EBITDA: 4500000. Revenue: 15000000. Total Assets: 20000000. Total Liabilities: 12000000. Operating Cash: 3200000. Historical Volatility: 0.12.",
        },
        {
          name: "Bylaws_Registered.txt",
          contentSummary:
            "Bylaws filed with the Board of Trade. Includes Change of Control clause determining unanimous approval of the administrative council for hostile acquisitions.",
        },
        {
          name: "Payroll_C_Level.txt",
          contentSummary:
            "Salary and performance bonus details for the Executive board (CEO, CFO, CTO) with 12-month golden parachute clauses.",
        },
        {
          name: "Shareholders_Agreement_Target.txt",
          contentSummary:
            "Shareholders agreement contract establishing 100% tag-along rights and Right of First Refusal.",
        },
      ];
    }

    let chunkCount = 0;

    for (const doc of docs) {
      const chunks = this.chunkText(doc.contentSummary, 150);

      for (let i = 0; i < chunks.length; i++) {
        const textChunk = chunks[i];
        const embedding = await TransformersEngine.generateEmbedding(textChunk);

        try {
          await db.saveVdrDocumentChunk(
            dealId,
            doc.name,
            i,
            textChunk,
            embedding,
          );
        } catch (err) {
          console.warn(
            `[RAG Silo] Failed to save chunk ${i} of ${doc.name} to DB. Using in-memory fallback.`,
          );
          if (!this.inMemorySilos[dealId]) {
            this.inMemorySilos[dealId] = [];
          }
          this.inMemorySilos[dealId].push({
            documentName: doc.name,
            chunkIndex: i,
            textChunk,
            embedding,
          });
        }
        chunkCount++;
      }
    }

    console.log(
      `[RAG Silo] Silo initialized with ${chunkCount} vector chunks for Deal ${dealId}.`,
    );
    return chunkCount;
  }

  /**
   * Performs a vector similarity query restricted to a specific client/deal silo
   * using the DatabaseMemoryService.
   */
  public static async querySilo(
    dealId: string,
    queryText: string,
    topK = 2,
  ): Promise<Array<{ text: string; document: string; score: number }>> {
    const db = DatabaseMemoryService.getInstance();
    const queryEmbedding = await TransformersEngine.generateEmbedding(
      queryText,
    );

    try {
      const results = await db.searchVdrDocumentChunks(
        dealId,
        queryEmbedding,
        topK,
      );
      return results.map((r) => ({
        text: r.textChunk,
        document: r.documentName,
        score: r.similarity,
      }));
    } catch (err) {
      console.warn(
        `[RAG Silo] Query from database failed, using in-memory silo fallback.`,
      );
      const silo = this.inMemorySilos[dealId] || [];
      const results = silo.map((record) => {
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
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    const len = Math.min(vecA.length, vecB.length);
    for (let i = 0; i < len; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0.0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
