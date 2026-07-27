import {
  collectMarkdownFiles,
  isInsideDocumentationRoot,
  localMarkdownTargets,
  normalizeDocumentationPath,
} from "./documentation_check_paths.ts";
import {
  type DocumentationDiagnostic,
  documentationDiagnostic,
} from "./documentation_check_types.ts";

async function targetDiagnostic(
  root: string,
  sourceFile: string,
  target: string,
): Promise<DocumentationDiagnostic | undefined> {
  const relativePath = sourceFile.slice(root.length + 1);
  const decodedTarget = decodeURIComponent(target.split("#")[0]);
  if (!decodedTarget) return undefined;
  const directory = sourceFile.slice(0, sourceFile.lastIndexOf("/"));
  const resolved = normalizeDocumentationPath(`${directory}/${decodedTarget}`);
  if (!isInsideDocumentationRoot(root, resolved)) {
    return documentationDiagnostic(
      "outside-canonical-tree",
      relativePath,
      `Relative link leaves canonical tree: ${target}.`,
    );
  }
  return await missingTargetDiagnostic(relativePath, resolved, target);
}

async function missingTargetDiagnostic(
  relativePath: string,
  resolved: string,
  target: string,
): Promise<DocumentationDiagnostic | undefined> {
  try {
    const info = await Deno.stat(resolved);
    if (info.isFile) return undefined;
  } catch {
    // The diagnostic below owns missing and non-file targets.
  }
  return documentationDiagnostic(
    "broken-relative-link",
    relativePath,
    `Relative link target does not exist: ${target}.`,
  );
}

async function markdownFileDiagnostics(
  root: string,
  file: string,
  documentedPaths: Set<string>,
): Promise<DocumentationDiagnostic[]> {
  const relativePath = file.slice(root.length + 1);
  const diagnostics = documentedPaths.has(relativePath) ? [] : [
    documentationDiagnostic(
      "undocumented-markdown",
      relativePath,
      "Markdown file is missing from the inventory.",
    ),
  ];
  const markdown = await Deno.readTextFile(file);
  for (const target of localMarkdownTargets(markdown)) {
    const finding = await targetDiagnostic(root, file, target);
    if (finding) diagnostics.push(finding);
  }
  return diagnostics;
}

export async function validateMarkdownTree(
  root: string,
  documentedPaths: Set<string>,
): Promise<DocumentationDiagnostic[]> {
  const diagnostics: DocumentationDiagnostic[] = [];
  for (const file of await collectMarkdownFiles(root)) {
    diagnostics.push(
      ...await markdownFileDiagnostics(root, file, documentedPaths),
    );
  }
  return diagnostics;
}
