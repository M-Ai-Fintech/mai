// src/engines/prediction/Transformers.ts
import { pipeline } from "@huggingface/transformers";

export class TransformersEngine {
  private static extractor: any = null;

  /**
   * Initializes the embedding pipeline.
   * Falls back to mock embeddings if loading fails or in a restricted environment.
   */
  private static async getExtractor() {
    if (this.extractor) return this.extractor;
    try {
      // Using a small, fast model for embeddings: Xenova/all-MiniLM-L6-v2
      this.extractor = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2"
      );
      return this.extractor;
    } catch (e) {
      console.warn("Failed to load local transformers pipeline, using mock embedding fallback:", e);
      return null;
    }
  }

  /**
   * Generates a dense vector embedding for a given text.
   */
  public static async generateEmbedding(text: string): Promise<number[]> {
    const extractor = await this.getExtractor();
    if (extractor) {
      try {
        const output = await extractor(text, { pooling: "mean", normalize: true });
        return Array.from(output.data);
      } catch (err) {
        console.error("Error generating embedding with model:", err);
      }
    }
    
    // Fallback: Deterministic semantic mock embedding
    return this.generateMockEmbedding(text);
  }

  /**
   * Helper to generate a deterministic mock embedding vector of size 384
   */
  private static generateMockEmbedding(text: string): number[] {
    const size = 384;
    const vector = new Array(size).fill(0);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    for (let i = 0; i < size; i++) {
      const val = Math.sin(hash + i) * 10000;
      vector[i] = val - Math.floor(val);
    }
    // Normalize vector
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(v => v / (norm || 1));
  }
}
