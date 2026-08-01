// src/core/boot.ts
import { DatabaseMemoryService } from "./db/DatabaseMemoryService.ts";
import { AIProvider } from "../agent/ai_provider.ts";
import { LocalPubSubBus } from "./pubsub/LocalPubSubBus.ts";
import {
  DEFAULT_MODEL_PATH,
  loadOnnxModel,
} from "../engines/prediction/onnx.ts";
import { describeError } from "../shared/errors.ts";

export class AppBootstrapper {
  public static db: DatabaseMemoryService;
  public static pubsub: LocalPubSubBus;
  public static isDbConnected: boolean = false;
  public static aiFallback: boolean = false;
  public static onnxReady: boolean = false;

  public static async bootstrap(): Promise<void> {
    console.log("[Boot] Initializing Core Components...");
    try {
      this.initializePubSub();
      await this.initializeDatabase();
      this.initializeAiProvider();
      await initializeOnnxEngine();
      this.onnxReady = true;
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

export async function initializeOnnxEngine(
  modelPath: string = DEFAULT_MODEL_PATH,
): Promise<void> {
  // 4. Initialize ONNX Engine.
  try {
    await loadOnnxFile(modelPath);
  } catch (error: unknown) {
    console.error(
      `[Boot] Warning: ONNX Model "${modelPath}" failed to load; expected a readable model file: ${
        describeError(error)
      }`,
    );
    throw error;
  }
}

async function loadOnnxFile(modelPath: string): Promise<void> {
  await loadOnnxModel(modelPath);
  console.log("[Boot] ONNX Model loaded successfully.");
}
