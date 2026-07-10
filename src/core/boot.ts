// src/core/boot.ts
import { DatabaseMemoryService } from "./db/DatabaseMemoryService.ts";
import { AIProvider } from "../agent/ai_provider.ts";
import { LocalPubSubBus } from "./pubsub/LocalPubSubBus.ts";
import { loadOnnxModel } from "../engines/prediction/onnx.ts";

export class AppBootstrapper {
  public static db: DatabaseMemoryService;
  public static pubsub: LocalPubSubBus;
  public static isDbConnected: boolean = false;
  public static aiFallback: boolean = false;

  public static async bootstrap(): Promise<void> {
    console.log("[Boot] Initializing Core Components...");

    try {
      // 1. Initialize PubSub
      this.pubsub = LocalPubSubBus.getInstance();
      console.log("[Boot] LocalPubSubBus initialized.");

      // 2. Initialize Database with Fallback
      this.db = DatabaseMemoryService.getInstance();
      this.isDbConnected = await this.db.connect();
      if (!this.isDbConnected) {
        console.warn("[Boot] Running in Database Fallback mode (DB not available).");
      }

      // 3. Check AI Provider / Gemini
      const aiStatus = AIProvider.getApiKey();
      this.aiFallback = aiStatus.isFallback;
      if (this.aiFallback) {
        console.log("[Boot] AI Provider / Gemini running in Mock/Fallback mode.");
      } else {
        console.log("[Boot] AI Provider / Gemini connected successfully.");
      }

      // 4. Initialize ONNX Engine
      try {
        const modelPath = "models/ma_classifier_q8.onnx";
        const fileInfo = await Deno.stat(modelPath);
        if (fileInfo.isFile) {
          await loadOnnxModel(modelPath);
          console.log("[Boot] ONNX Model loaded successfully.");
        } else {
          console.warn("[Boot] ONNX Model path is not a file. PredictionEngine will fail.");
        }
      } catch (e: any) {
        console.error(`[Boot] Warning: ONNX Model not found or failed to load: ${e.message}`);
      }

      console.log("[Boot] All Core Components initialized successfully.\n");
    } catch (e) {
      console.error("[Boot] Error during bootstrap:", e);
    }
  }
}
