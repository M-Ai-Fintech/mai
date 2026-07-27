import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { vdrStructuredAccessTool } from "../../src/agent/actions.ts";
import { testToolContext } from "../support/tool_context.ts";
import { requireArray, requireRecord } from "../support/value_guards.ts";

Deno.test("vdrStructuredAccessTool - list_files", async () => {
  const result = await vdrStructuredAccessTool.execute!({
    action: "list_files",
    dealId: "test-deal",
  }, testToolContext);
  const output = requireRecord(result);
  const files = requireArray(output.files, "files");
  assertEquals(output.success, true);
  assertEquals(output.dealId, "test-deal");
  if (files.length > 0) {
    assertExists(requireRecord(files[0]).tag);
  }
});

Deno.test("vdrStructuredAccessTool - read_file_content (error propagation)", async () => {
  await assertRejects(async () => {
    await vdrStructuredAccessTool.execute!({
      action: "read_file_content",
      dealId: "test-deal",
      fileName: "Estatuto_Social.pdf",
    }, testToolContext);
  });
});

Deno.test("vdrStructuredAccessTool - query_silo", async () => {
  const result = await vdrStructuredAccessTool.execute!({
    action: "query_silo",
    dealId: "test-deal",
    queryText: "Change of control",
    topK: 2,
  }, testToolContext);
  const output = requireRecord(result);
  assertEquals(output.success, true);
  assertEquals(output.dealId, "test-deal");
  assertEquals(output.query, "Change of control");
  assertExists(output.results);
});

Deno.test("vdrStructuredAccessTool - audit_compliance", async () => {
  const result = await vdrStructuredAccessTool.execute!({
    action: "audit_compliance",
    dealId: "test-deal",
  }, testToolContext);
  const output = requireRecord(result);
  assertEquals(output.success, true);
  assertEquals(output.dealId, "test-deal");
  assertExists(output.status);
  requireArray(output.missingCategories, "missingCategories");
});
