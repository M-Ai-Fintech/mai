// src/engines/prediction/transformers.ts
import { pipeline } from "@huggingface/transformers";

export class TransformersEngine {
  private static extractor: any = null;

  /**
   * Inicializa o pipeline de extração de features usando o modelo all-MiniLM-L6-v2 do Hugging Face.
   */
  private static async getExtractor() {
    if (this.extractor) return this.extractor;
    this.extractor = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
    return this.extractor;
  }

  /**
   * Gera um vetor de embedding real para o texto fornecido.
   * Lança exceções reais se o pipeline do Transformers falhar ou não conseguir carregar.
   */
  public static async generateEmbedding(text: string): Promise<number[]> {
    const extractor = await this.getExtractor();
    const output = await extractor(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  }
}
