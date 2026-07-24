import { assertEquals } from "@std/assert";
import { TransformersEngine } from "../../src/engines/prediction/transformers.ts";

Deno.test("TransformersEngine uses deterministic embeddings in the test profile", async () => {
  const first = await TransformersEngine.generateEmbedding(
    "offline test embedding",
  );
  const second = await TransformersEngine.generateEmbedding(
    "offline test embedding",
  );

  assertEquals(first.length, 384);
  assertEquals(first, second);
  assertEquals(first.every(Number.isFinite), true);
});
