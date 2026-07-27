import { DatabaseMemoryService } from "../../core/db/memory_service.ts";
import { TransformersEngine } from "../../engines/prediction/transformers.ts";
import { RagDocument } from "./documents.ts";

interface RagChunk {
  documentName: string;
  chunkIndex: number;
  textChunk: string;
  embedding: number[];
}

export type InMemoryRagSilos = Record<string, RagChunk[]>;

export async function indexRagDocuments(
  dealId: string,
  documents: RagDocument[],
  silos: InMemoryRagSilos,
): Promise<number> {
  let count = 0;
  for (const document of documents) {
    const chunks = chunkText(document.contentSummary, 150);
    for (const [index, text] of chunks.entries()) {
      await indexChunk(dealId, document.name, index, text, silos);
      count++;
    }
  }
  return count;
}

async function indexChunk(
  dealId: string,
  documentName: string,
  index: number,
  text: string,
  silos: InMemoryRagSilos,
): Promise<void> {
  const embedding = await TransformersEngine.generateEmbedding(text);
  try {
    await saveChunk(dealId, documentName, index, text, embedding);
  } catch {
    cacheChunk(silos, dealId, documentName, index, text, embedding);
  }
}

function cacheChunk(
  silos: InMemoryRagSilos,
  dealId: string,
  documentName: string,
  index: number,
  text: string,
  embedding: number[],
): void {
  console.warn(
    `[RAG Silo] Failed to save chunk ${index} of ${documentName} to DB. Using in-memory fallback.`,
  );
  (silos[dealId] ??= []).push({
    documentName,
    chunkIndex: index,
    textChunk: text,
    embedding,
  });
}

async function saveChunk(
  dealId: string,
  documentName: string,
  index: number,
  text: string,
  embedding: number[],
): Promise<void> {
  await DatabaseMemoryService.getInstance().saveVdrDocumentChunk(
    dealId,
    documentName,
    index,
    text,
    embedding,
  );
}

export async function searchRagSilo(
  dealId: string,
  queryText: string,
  topK: number,
  silos: InMemoryRagSilos,
): Promise<Array<{ text: string; document: string; score: number }>> {
  const embedding = await TransformersEngine.generateEmbedding(queryText);
  try {
    return await databaseRagResults(dealId, embedding, topK);
  } catch {
    console.warn(
      "[RAG Silo] Database query failed; using the in-memory deal silo.",
    );
    return inMemoryResults(silos[dealId] ?? [], embedding, topK);
  }
}

async function databaseRagResults(
  dealId: string,
  embedding: number[],
  topK: number,
) {
  const results = await DatabaseMemoryService.getInstance()
    .searchVdrDocumentChunks(dealId, embedding, topK);
  return results.map((result) => ({
    text: result.textChunk,
    document: result.documentName,
    score: result.similarity,
  }));
}

function inMemoryResults(
  chunks: RagChunk[],
  embedding: number[],
  topK: number,
) {
  return chunks.map((chunk) => ({
    text: chunk.textChunk,
    document: chunk.documentName,
    score: cosineSimilarity(embedding, chunk.embedding),
  })).sort((left, right) => right.score - left.score).slice(0, topK);
}

function chunkText(text: string, maxWords: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  for (let index = 0; index < words.length; index += maxWords) {
    chunks.push(words.slice(index, index + maxWords).join(" "));
  }
  return chunks;
}

function cosineSimilarity(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  let dotProduct = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < length; index++) {
    dotProduct += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dotProduct / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}
