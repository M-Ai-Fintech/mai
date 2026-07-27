import {
  loadDocumentationInventory,
  validateManifestRecords,
} from "./documentation_check_inventory.ts";
import { validateMarkdownTree } from "./documentation_check_links.ts";
import {
  type DocumentationDiagnostic,
  documentationDiagnostic,
} from "./documentation_check_types.ts";

export type { DocumentationDiagnostic } from "./documentation_check_types.ts";

async function documentationRoot(
  docsRoot: string,
): Promise<string | DocumentationDiagnostic> {
  try {
    return await Deno.realPath(docsRoot);
  } catch {
    return documentationDiagnostic(
      "invalid-manifest",
      docsRoot,
      `Documentation root '${docsRoot}' does not exist; expected a readable directory.`,
    );
  }
}

/**
 * Checks a canonical Markdown tree using its governed Markdown inventory.
 *
 * @example await runDocumentationCheck("backlog/docs");
 */
export async function runDocumentationCheck(
  docsRoot = "backlog/docs",
): Promise<DocumentationDiagnostic[]> {
  const root = await documentationRoot(docsRoot);
  if (typeof root !== "string") return [root];
  const inventory = await loadDocumentationInventory(root);
  if (inventory.diagnostic) return [inventory.diagnostic];
  const validation = await validateManifestRecords(root, inventory.records!);
  return validation.diagnostics.concat(
    await validateMarkdownTree(root, validation.documentedPaths),
  );
}

function reportDiagnostics(diagnostics: DocumentationDiagnostic[]): void {
  for (const item of diagnostics) {
    console.error(`ERROR ${item.code} ${item.path}: ${item.message}`);
  }
}

if (import.meta.main) {
  const diagnostics = await runDocumentationCheck(Deno.args[0]);
  if (!diagnostics.length) console.log("Documentation check passed.");
  else {
    reportDiagnostics(diagnostics);
    Deno.exit(1);
  }
}
