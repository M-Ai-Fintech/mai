import {
  collectMarkdownFiles,
  hasDocumentationMetadata,
  isInsideDocumentationRoot,
  normalizeDocumentationPath,
} from "./documentation_check_paths.ts";
import {
  type DocumentationDiagnostic,
  documentationDiagnostic,
  type DocumentRecord,
  type InventoryLoadResult,
  type InventoryValidation,
} from "./documentation_check_types.ts";

const requiredFields = [
  "path",
  "owner",
  "purpose",
  "authority",
  "freshness",
  "language",
  "disposition",
] as const;

const requiredBodyMetadata = [
  "Authority ID",
  "Owner",
  "Authority",
  "Freshness",
  "Language",
  "Update trigger",
] as const;
const SHARED_AUTHORITIES = new Set([
  "reference",
  "non-authoritative",
  "generated",
  "none",
]);

interface CanonicalManifest {
  canonicalRoot?: unknown;
  documents?: unknown;
}

interface ManifestDecodeFailure {
  loadResult: InventoryLoadResult;
}

export function parseCanonicalManifest(
  markdown: string,
  inventoryPath: string,
): InventoryLoadResult {
  const section = markdown.match(
    /## Machine-readable canonical manifest\s*\n([\s\S]*?)(?=\n## |$)/i,
  )?.[1];
  const jsonBlock = section?.match(/```json\s*\n([\s\S]*?)\n```/i);
  if (!jsonBlock) {
    return {
      diagnostic: documentationDiagnostic(
        "invalid-manifest",
        inventoryPath,
        "Inventory requires a fenced JSON canonical manifest.",
      ),
    };
  }
  return parseManifestJson(jsonBlock[1], inventoryPath);
}

function parseManifestJson(
  manifestJson: string,
  inventoryPath: string,
): InventoryLoadResult {
  const parsed = decodeManifestJson(manifestJson, inventoryPath);
  if ("loadResult" in parsed) return parsed.loadResult;
  return validateManifestShape(parsed, inventoryPath);
}

function decodeManifestJson(
  manifestJson: string,
  inventoryPath: string,
): CanonicalManifest | ManifestDecodeFailure {
  try {
    const parsed: unknown = JSON.parse(manifestJson);
    if (isCanonicalManifest(parsed)) return parsed;
    return manifestDecodeFailure(
      inventoryPath,
      `Manifest root was '${JSON.stringify(parsed)}'; expected an object.`,
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return manifestDecodeFailure(
      inventoryPath,
      `Invalid JSON in '${inventoryPath}': ${reason}. Expected a canonical manifest object.`,
    );
  }
}

function isCanonicalManifest(value: unknown): value is CanonicalManifest {
  const isObject = typeof value === "object" && value !== null;
  return isObject && !Array.isArray(value);
}

function manifestDecodeFailure(
  inventoryPath: string,
  message: string,
): ManifestDecodeFailure {
  return { loadResult: invalidManifest(inventoryPath, message) };
}

function validateManifestShape(
  manifest: CanonicalManifest,
  inventoryPath: string,
): InventoryLoadResult {
  if (manifest.canonicalRoot !== ".") {
    return invalidManifest(
      inventoryPath,
      `canonicalRoot was '${String(manifest.canonicalRoot)}'; expected '.'.`,
    );
  }
  if (!Array.isArray(manifest.documents)) {
    return invalidManifest(
      inventoryPath,
      `documents was '${typeof manifest.documents}'; expected an array.`,
    );
  }
  return { records: manifest.documents as DocumentRecord[] };
}

function invalidManifest(
  path: string,
  message: string,
): InventoryLoadResult {
  return {
    diagnostic: documentationDiagnostic("invalid-manifest", path, message),
  };
}

export async function loadDocumentationInventory(
  root: string,
): Promise<InventoryLoadResult> {
  for (const file of await collectMarkdownFiles(root)) {
    const markdown = await Deno.readTextFile(file);
    if (/^# Documentation Inventory\b/im.test(markdown)) {
      return parseCanonicalManifest(markdown, file);
    }
  }
  return invalidManifest(
    root,
    "Expected one Markdown document headed 'Documentation Inventory'.",
  );
}

function recordPath(record: DocumentRecord): string {
  return typeof record.path === "string" ? record.path : "<unknown>";
}

function missingFieldDiagnostics(
  record: DocumentRecord,
): DocumentationDiagnostic[] {
  return requiredFields.flatMap((field) => {
    const value = record[field];
    if (typeof value === "string" && value.trim()) return [];
    return [documentationDiagnostic(
      "missing-manifest-field",
      recordPath(record),
      `Missing required manifest field: ${field}.`,
    )];
  });
}

function normalizedRecordPath(
  root: string,
  record: DocumentRecord,
): string | undefined {
  if (typeof record.path !== "string") return undefined;
  const normalizedPath = normalizeDocumentationPath(record.path);
  const fullPath = normalizeDocumentationPath(`${root}/${normalizedPath}`);
  if (
    normalizedPath.endsWith(".md") && isInsideDocumentationRoot(root, fullPath)
  ) {
    return normalizedPath;
  }
  return undefined;
}

async function canonicalBodyDiagnostics(
  root: string,
  record: DocumentRecord,
): Promise<DocumentationDiagnostic[]> {
  if (record.disposition !== "canonical" || typeof record.path !== "string") {
    return [];
  }
  const markdown = await readCanonicalMarkdown(root, record.path);
  if (typeof markdown !== "string") return [markdown];
  return missingBodyMetadataDiagnostics(markdown, record.path);
}

async function readCanonicalMarkdown(
  root: string,
  path: string,
): Promise<string | DocumentationDiagnostic> {
  const fullPath = normalizeDocumentationPath(`${root}/${path}`);
  try {
    return await Deno.readTextFile(fullPath);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return documentationDiagnostic(
      "missing-canonical-document",
      path,
      `Cannot read canonical Markdown '${path}': ${reason}. Expected an existing file.`,
    );
  }
}

function missingBodyMetadataDiagnostics(
  markdown: string,
  path: string,
): DocumentationDiagnostic[] {
  return requiredBodyMetadata.flatMap((field) =>
    hasDocumentationMetadata(markdown, field) ? [] : [documentationDiagnostic(
      "missing-body-metadata",
      path,
      `Canonical document is missing body metadata field: ${field}.`,
    )]
  );
}

function languageDiagnostics(
  record: DocumentRecord,
): DocumentationDiagnostic[] {
  if (record.disposition !== "canonical" || record.language === "English") {
    return [];
  }
  return [documentationDiagnostic(
    "missing-manifest-field",
    recordPath(record),
    "Canonical documentation language must be English.",
  )];
}

function authorityDiagnostics(
  record: DocumentRecord,
  authorityOwners: Map<string, string>,
): DocumentationDiagnostic[] {
  if (typeof record.authority !== "string") return [];
  if (SHARED_AUTHORITIES.has(record.authority)) return [];

  const owner = authorityOwners.get(record.authority);
  if (!owner) {
    authorityOwners.set(record.authority, recordPath(record));
    return [];
  }
  return [duplicateAuthorityDiagnostic(record, owner)];
}

function duplicateAuthorityDiagnostic(
  record: DocumentRecord,
  owner: string,
): DocumentationDiagnostic {
  return documentationDiagnostic(
    "duplicate-authority",
    recordPath(record),
    `Authority '${String(record.authority)}' is also claimed by ${owner}.`,
  );
}

async function validateRecord(
  root: string,
  record: DocumentRecord,
  authorityOwners: Map<string, string>,
): Promise<DocumentationDiagnostic[]> {
  const diagnostics = missingFieldDiagnostics(record);
  const normalizedPath = normalizedRecordPath(root, record);
  if (typeof record.path === "string" && !normalizedPath) {
    diagnostics.push(documentationDiagnostic(
      "outside-canonical-tree",
      record.path,
      "Manifest document paths must be Markdown files inside the canonical tree.",
    ));
    return diagnostics;
  }
  diagnostics.push(...await canonicalBodyDiagnostics(root, record));
  diagnostics.push(...languageDiagnostics(record));
  diagnostics.push(...authorityDiagnostics(record, authorityOwners));
  return diagnostics;
}

export async function validateManifestRecords(
  root: string,
  records: DocumentRecord[],
): Promise<InventoryValidation> {
  const diagnostics: DocumentationDiagnostic[] = [];
  const documentedPaths = new Set<string>();
  const authorityOwners = new Map<string, string>();
  for (const record of records) {
    const path = normalizedRecordPath(root, record);
    if (path) documentedPaths.add(path);
    diagnostics.push(...await validateRecord(root, record, authorityOwners));
  }
  return { diagnostics, documentedPaths };
}
