export interface DocumentationDiagnostic {
  code:
    | "broken-relative-link"
    | "duplicate-authority"
    | "invalid-manifest"
    | "missing-body-metadata"
    | "missing-canonical-document"
    | "missing-manifest-field"
    | "outside-canonical-tree"
    | "undocumented-markdown";
  path: string;
  message: string;
}

export interface DocumentRecord {
  path?: unknown;
  owner?: unknown;
  purpose?: unknown;
  authority?: unknown;
  freshness?: unknown;
  language?: unknown;
  disposition?: unknown;
}

export interface InventoryLoadResult {
  records?: DocumentRecord[];
  diagnostic?: DocumentationDiagnostic;
}

export interface InventoryValidation {
  diagnostics: DocumentationDiagnostic[];
  documentedPaths: Set<string>;
}

export function documentationDiagnostic(
  code: DocumentationDiagnostic["code"],
  path: string,
  message: string,
): DocumentationDiagnostic {
  return { code, path, message };
}
