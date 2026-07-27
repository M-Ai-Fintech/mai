import { EmbeddedRow } from "./similarity.ts";
import type {
  SimilarCultureMemory,
  SimilarKnowledge,
  SimilarPreference,
  SimilarVdrChunk,
} from "./DatabaseMemoryService.ts";

export interface SimilaritySearchConfig<
  TRow extends EmbeddedRow,
  TResult,
> {
  nativeSql: string;
  nativeParams: unknown[];
  fallbackSql: string;
  fallbackParams?: unknown[];
  queryEmbedding: number[];
  limit: number;
  warning: string;
  map: (row: TRow, similarity: number) => TResult;
}

export interface KnowledgeEmbeddingRow extends EmbeddedRow {
  id: string;
  category: string;
  knowledge: Record<string, unknown>;
}

export interface PreferenceEmbeddingRow extends EmbeddedRow {
  id: string;
  userId: string;
  preferences: Record<string, unknown>;
}

export interface CultureEmbeddingRow extends EmbeddedRow {
  id: string;
  businessId: string;
  cultureData: Record<string, unknown>;
}

export interface VdrEmbeddingRow extends EmbeddedRow {
  document_name: string;
  chunk_index: number;
  text_chunk: string;
}

const KNOWLEDGE_VECTOR_SQL = `
  SELECT id, category, knowledge, 1 - (embedding <=> $1::vector) AS similarity
  FROM domain_knowledge WHERE embedding IS NOT NULL
  ORDER BY embedding <=> $1::vector LIMIT $2;`;
const KNOWLEDGE_FALLBACK_SQL = `
  SELECT id, category, knowledge, embedding
  FROM domain_knowledge WHERE embedding IS NOT NULL;`;
const PREFERENCE_VECTOR_SQL = `
  SELECT id, user_id AS "userId", preferences,
    1 - (embedding <=> $1::vector) AS similarity
  FROM user_preferences WHERE embedding IS NOT NULL
  ORDER BY embedding <=> $1::vector LIMIT $2;`;
const PREFERENCE_FALLBACK_SQL = `
  SELECT id, user_id AS "userId", preferences, embedding
  FROM user_preferences WHERE embedding IS NOT NULL;`;
const CULTURE_VECTOR_SQL = `
  SELECT id, business_id AS "businessId", culture_data AS "cultureData",
    1 - (embedding <=> $1::vector) AS similarity
  FROM company_culture_memory WHERE embedding IS NOT NULL
  ORDER BY embedding <=> $1::vector LIMIT $2;`;
const CULTURE_FALLBACK_SQL = `
  SELECT id, business_id AS "businessId", culture_data AS "cultureData", embedding
  FROM company_culture_memory WHERE embedding IS NOT NULL;`;
const VDR_VECTOR_SQL = `
  SELECT document_name AS "documentName", chunk_index AS "chunkIndex",
    text_chunk AS "textChunk", 1 - (embedding <=> $1::vector) AS similarity
  FROM vdr_document_chunks WHERE deal_id = $2 AND embedding IS NOT NULL
  ORDER BY embedding <=> $1::vector LIMIT $3;`;
const VDR_FALLBACK_SQL = `
  SELECT document_name, chunk_index, text_chunk, embedding
  FROM vdr_document_chunks
  WHERE deal_id = $1 AND embedding IS NOT NULL;`;

export function knowledgeSearch(
  embedding: number[],
  limit: number,
): SimilaritySearchConfig<KnowledgeEmbeddingRow, SimilarKnowledge> {
  return searchConfig(
    KNOWLEDGE_VECTOR_SQL,
    KNOWLEDGE_FALLBACK_SQL,
    embedding,
    limit,
    "[DatabaseMemoryService] pgvector knowledge search failed",
    (row, similarity) => ({
      id: row.id,
      category: row.category,
      knowledge: row.knowledge,
      similarity,
    }),
  );
}

export function preferenceSearch(
  embedding: number[],
  limit: number,
): SimilaritySearchConfig<PreferenceEmbeddingRow, SimilarPreference> {
  return searchConfig(
    PREFERENCE_VECTOR_SQL,
    PREFERENCE_FALLBACK_SQL,
    embedding,
    limit,
    "[DatabaseMemoryService] pgvector preferences search failed",
    (row, similarity) => ({
      id: row.id,
      userId: row.userId,
      preferences: row.preferences,
      similarity,
    }),
  );
}

export function cultureSearch(
  embedding: number[],
  limit: number,
): SimilaritySearchConfig<CultureEmbeddingRow, SimilarCultureMemory> {
  return searchConfig(
    CULTURE_VECTOR_SQL,
    CULTURE_FALLBACK_SQL,
    embedding,
    limit,
    "[DatabaseMemoryService] pgvector culture search failed",
    (row, similarity) => ({
      id: row.id,
      businessId: row.businessId,
      cultureData: row.cultureData,
      similarity,
    }),
  );
}

export function vdrSearch(
  dealId: string,
  embedding: number[],
  limit: number,
): SimilaritySearchConfig<VdrEmbeddingRow, SimilarVdrChunk> {
  return {
    ...searchConfig(
      VDR_VECTOR_SQL,
      VDR_FALLBACK_SQL,
      embedding,
      limit,
      "[DatabaseMemoryService] pgvector VDR search failed",
      mapVdrChunk,
    ),
    nativeParams: [JSON.stringify(embedding), dealId, limit],
    fallbackParams: [dealId],
  };
}

function mapVdrChunk(
  row: VdrEmbeddingRow,
  similarity: number,
): SimilarVdrChunk {
  return {
    documentName: row.document_name,
    chunkIndex: row.chunk_index,
    textChunk: row.text_chunk,
    similarity,
  };
}

function searchConfig<TRow extends EmbeddedRow, TResult>(
  nativeSql: string,
  fallbackSql: string,
  embedding: number[],
  limit: number,
  warning: string,
  map: (row: TRow, similarity: number) => TResult,
): SimilaritySearchConfig<TRow, TResult> {
  return {
    nativeSql,
    fallbackSql,
    queryEmbedding: embedding,
    limit,
    warning,
    map,
    nativeParams: [JSON.stringify(embedding), limit],
  };
}
