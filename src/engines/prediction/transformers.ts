// src/engines/prediction/transformers.ts
import { pipeline } from "@huggingface/transformers";

type FeatureExtractor = (
  text: string,
  options: { pooling: "mean"; normalize: true },
) => Promise<{ data: ArrayLike<number> }>;

export class TransformersEngine {
  private static extractor: FeatureExtractor | null = null;
  private static readonly testEmbeddingDimensions = 384;

  /**
   * Initializes the feature-extraction pipeline using Hugging Face's all-MiniLM-L6-v2 model.
   */
  private static async getExtractor() {
    if (this.extractor) return this.extractor;
    this.extractor = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
    ) as FeatureExtractor;
    return this.extractor;
  }

  /**
   * Generates a real embedding vector for the supplied text.
   * Propagates errors if the Transformers pipeline fails or cannot load.
   */
  public static async generateEmbedding(text: string): Promise<number[]> {
    if (Deno.env.get("DENO_ENV") === "test") {
      return this.generateDeterministicTestEmbedding(text);
    }

    const extractor = await this.getExtractor();
    const output = await extractor(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  }

  private static generateDeterministicTestEmbedding(text: string): number[] {
    const embedding = new Array<number>(this.testEmbeddingDimensions).fill(0);
    let hash = 2166136261;

    for (const char of text) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
      embedding[(hash >>> 0) % this.testEmbeddingDimensions] += 1;
    }

    const magnitude = Math.hypot(...embedding);
    return magnitude === 0
      ? embedding
      : embedding.map((value) => value / magnitude);
  }
}
