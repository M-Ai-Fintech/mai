export interface EmbeddedRow {
  embedding: number[] | string;
}

export function parseEmbedding(embedding: number[] | string): number[] {
  if (Array.isArray(embedding)) return embedding;
  if (embedding.startsWith("[")) {
    const parsed: unknown = JSON.parse(embedding);
    if (isNumberArray(parsed)) return parsed;
    throw new Error(
      `Embedding "${embedding}" is invalid; expected a JSON number array.`,
    );
  }
  return embedding.replace(/[{}]/g, "").split(",").map(Number);
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const length = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < length; index++) {
    dotProduct += vecA[index] * vecB[index];
    normA += vecA[index] * vecA[index];
    normB += vecB[index] * vecB[index];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function rankBySimilarity<TRow extends EmbeddedRow, TResult>(
  rows: TRow[],
  queryEmbedding: number[],
  limit: number,
  toResult: (row: TRow, similarity: number) => TResult,
): TResult[] {
  return rows.map((row) => {
    const similarity = cosineSimilarity(
      queryEmbedding,
      parseEmbedding(row.embedding),
    );
    return { result: toResult(row, similarity), similarity };
  }).sort((left, right) => right.similarity - left.similarity)
    .slice(0, limit)
    .map(({ result }) => result);
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "number");
}
