import { assertAlmostEquals, assertEquals } from "@std/assert";
import {
  cosineSimilarity,
  parseEmbedding,
  rankBySimilarity,
} from "./similarity.ts";

Deno.test("parseEmbedding accepts JSON and Postgres vector formats", () => {
  assertEquals(parseEmbedding("[1,2]"), [1, 2]);
  assertEquals(parseEmbedding("{3,4}"), [3, 4]);
});

Deno.test("cosineSimilarity returns one for identical vectors", () => {
  assertAlmostEquals(cosineSimilarity([1, 2], [1, 2]), 1);
});

Deno.test("rankBySimilarity returns the closest rows first", () => {
  const ranked = rankBySimilarity(
    [
      { id: "far", embedding: [0, 1] },
      { id: "near", embedding: [1, 0] },
    ],
    [1, 0],
    1,
    (row) => row.id,
  );
  assertEquals(ranked, ["near"]);
});
