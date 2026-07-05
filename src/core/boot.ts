// src/core/boot.ts
import { DatabaseMemoryService } from "./db/DatabaseMemoryService.ts";
import { AIProvider } from "../agent/ai_provider.ts";
import { LocalPubSubBus } from "./pubsub/LocalPubSubBus.ts";

export class AppBootstrapper {
  public static db: DatabaseMemoryService;
  public static pubsub: LocalPubSubBus;
  public static isDbConnected: boolean = false;
  public static aiFallback: boolean = false;

  public static async bootstrap(): Promise<void> {
    console.log("[Boot] Initializing Core Components...");

    try {
      // 1. Initialize PubSub
      this.pubsub = new LocalPubSubBus();
      console.log("[Boot] LocalPubSubBus initialized.");

      // 2. Initialize Database with Fallback
      this.db = new DatabaseMemoryService();
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

      console.log("[Boot] All Core Components initialized successfully.\n");
    } catch (e) {
      console.error("[Boot] Error during bootstrap:", e);
    }
  }
}
