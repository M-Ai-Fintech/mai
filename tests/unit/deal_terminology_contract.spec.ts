import { assert, assertEquals } from "@std/assert";
import { bindingTermSheetSchema } from "../../src/agent/agents/legal-closing/schemas/term-sheet.ts";
import { negotiationProposalSchema } from "../../src/agent/agents/negotiation/schemas/term-sheet.ts";
import { targetDossierDraftSchema } from "../../src/shared/schemas/target-dossier.ts";
import { termSheetCoreSchema } from "../../src/shared/schemas/term-sheet.ts";

Deno.test("Deal terminology uses DealId across proposal and dossier contracts", () => {
  assertEquals(
    termSheetCoreSchema.shape.dealId.description,
    "Unique identifier of the deal.",
  );
  assertEquals(
    negotiationProposalSchema.shape.dealId.description,
    "Unique identifier of the deal.",
  );
  assertEquals(
    targetDossierDraftSchema.shape.dealId.description,
    "Identifier of the associated deal.",
  );
  assertEquals(
    bindingTermSheetSchema.shape.dealId.description,
    "Unique identifier of the deal.",
  );
});

Deno.test("Deal proposal boundaries remain separate from binding and dossier shapes", () => {
  const dossierKeys = Object.keys(targetDossierDraftSchema.shape);
  const bindingKeys = Object.keys(bindingTermSheetSchema.shape);

  assert(!dossierKeys.includes("bindingSignatures"));
  assert(!bindingKeys.includes("marketAnalysis"));
  assert(
    (negotiationProposalSchema as unknown) !==
      (bindingTermSheetSchema as unknown),
  );
});
