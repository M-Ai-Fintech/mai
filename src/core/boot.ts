// src/core/boot.ts
import { DatabaseMemoryService } from "./db/DatabaseMemoryService.ts";
import { AIProvider } from "../agent/ai_provider.ts";
import { LocalPubSubBus } from "./pubsub/LocalPubSubBus.ts";
import { loadOnnxModel } from "../engines/prediction/onnx.ts";
import { describeError } from "../shared/errors.ts";

export class AppBootstrapper {
  public static db: DatabaseMemoryService;
  public static pubsub: LocalPubSubBus;
  public static isDbConnected: boolean = false;
  public static aiFallback: boolean = false;

  public static async bootstrap(): Promise<void> {
    console.log("[Boot] Initializing Core Components...");
    try {
      this.initializePubSub();
      await this.initializeDatabase();
      this.initializeAiProvider();
      await initializeOnnxEngine();
      console.log("[Boot] All Core Components initialized successfully.\n");
    } catch (error: unknown) {
      console.error("[Boot] Error during bootstrap:", error);
    }
  }

  private static initializePubSub(): void {
    // 1. Initialize PubSub.
    this.pubsub = LocalPubSubBus.getInstance();
    console.log("[Boot] LocalPubSubBus initialized.");
  }

  private static async initializeDatabase(): Promise<void> {
    // 2. Initialize Database with Fallback.
    this.db = DatabaseMemoryService.getInstance();
    this.isDbConnected = await this.db.connect();
    if (this.isDbConnected) return;
    console.warn(
      "[Boot] Running in Database Fallback mode (DB not available).",
    );
  }

  private static initializeAiProvider(): void {
    // 3. Check AI Provider / Gemini.
    this.aiFallback = AIProvider.getApiKey().isFallback;
    const status = this.aiFallback
      ? "running in Mock/Fallback mode."
      : "connected successfully.";
    console.log(`[Boot] AI Provider / Gemini ${status}`);
  }
}

async function initializeOnnxEngine(): Promise<void> {
  // 4. Initialize ONNX Engine.
  const modelPath = "models/ma_classifier_q8.onnx";
  try {
    await loadOnnxFile(modelPath);
  } catch (error: unknown) {
    console.error(
      `[Boot] Warning: ONNX Model "${modelPath}" failed to load; expected a readable model file: ${
        describeError(error)
      }`,
    );
  }
}

async function loadOnnxFile(modelPath: string): Promise<void> {
  const fileInfo = await Deno.stat(modelPath);
  if (!fileInfo.isFile) {
    console.warn(`[Boot] ONNX Model path "${modelPath}" is not a file.`);
    return;
  }
  await loadOnnxModel(modelPath);
  console.log("[Boot] ONNX Model loaded successfully.");
}
