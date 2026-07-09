import { assertEquals, assertExists, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { vdrStructuredAccessTool } from "../../src/agent/actions.ts";

Deno.test("vdrStructuredAccessTool - list_files", async () => {
  const result = await vdrStructuredAccessTool.execute!({
    action: "list_files",
    dealId: "test-deal",
  }, {} as any);
  assertExists(result);
  assertEquals((result as any).success, true);
  assertEquals((result as any).dealId, "test-deal");
  assertExists((result as any).files);
  assertEquals(Array.isArray((result as any).files), true);
  if ((result as any).files.length > 0) {
    assertExists((result as any).files[0].tag);
  }
});

Deno.test("vdrStructuredAccessTool - read_file_content (error propagation)", async () => {
  await assertRejects(async () => {
    await vdrStructuredAccessTool.execute!({
      action: "read_file_content",
      dealId: "test-deal",
      fileName: "Estatuto_Social.pdf"
    }, {} as any);
  });
});

Deno.test("vdrStructuredAccessTool - query_silo", async () => {
  const result = await vdrStructuredAccessTool.execute!({
    action: "query_silo",
    dealId: "test-deal",
    queryText: "Change of control",
    topK: 2
  }, {} as any);
  assertExists(result);
  assertEquals((result as any).success, true);
  assertEquals((result as any).dealId, "test-deal");
  assertEquals((result as any).query, "Change of control");
  assertExists((result as any).results);
});

Deno.test("vdrStructuredAccessTool - audit_compliance", async () => {
  const result = await vdrStructuredAccessTool.execute!({
    action: "audit_compliance",
    dealId: "test-deal",
  }, {} as any);
  assertExists(result);
  assertEquals((result as any).success, true);
  assertEquals((result as any).dealId, "test-deal");
  assertExists((result as any).status);
  assertExists((result as any).missingCategories);
});
