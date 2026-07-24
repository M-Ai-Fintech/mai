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

interface DocumentRecord {
  path?: unknown;
  owner?: unknown;
  purpose?: unknown;
  authority?: unknown;
  freshness?: unknown;
  language?: unknown;
  disposition?: unknown;
}

interface CanonicalManifest {
  canonicalRoot?: unknown;
  documents?: unknown;
}

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

function normalize(path: string): string {
  const absolute = path.startsWith("/");
  const segments: string[] = [];
  for (const segment of path.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (segments.length && segments.at(-1) !== "..") segments.pop();
      else if (!absolute) segments.push(segment);
      continue;
    }
    segments.push(segment);
  }
  return `${absolute ? "/" : ""}${segments.join("/")}` ||
    (absolute ? "/" : ".");
}

function isInside(root: string, path: string): boolean {
  return path === root || path.startsWith(`${root}/`);
}

async function markdownFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(root)) {
    const path = `${root}/${entry.name}`;
    if (entry.isDirectory) files.push(...await markdownFiles(path));
    else if (entry.isFile && entry.name.endsWith(".md")) files.push(path);
  }
  return files.sort();
}

function localLinkTargets(markdown: string): string[] {
  const targets: string[] = [];
  const link = /!?\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of markdown.matchAll(link)) {
    let target = match[1].trim().split(/\s+/)[0];
    if (target.startsWith("<") && target.endsWith(">")) {
      target = target.slice(1, -1);
    }
    if (
      !target || target.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(target)
    ) continue;
    targets.push(target);
  }
  return targets;
}

function diagnostic(
  code: DocumentationDiagnostic["code"],
  path: string,
  message: string,
): DocumentationDiagnostic {
  return { code, path, message };
}

function hasBodyMetadata(markdown: string, field: string): boolean {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `^\\s*-\\s+(?:${escapedField}:|\\*\\*${escapedField}:\\*\\*)\\s*\\S`,
    "mi",
  ).test(markdown);
}

/**
 * Checks a canonical Markdown tree using its governed Markdown inventory.
 */
export async function runDocumentationCheck(
  docsRoot = "backlog/docs",
): Promise<DocumentationDiagnostic[]> {
  const diagnostics: DocumentationDiagnostic[] = [];
  let root: string;
  try {
    root = await Deno.realPath(docsRoot);
  } catch {
    return [
      diagnostic(
        "invalid-manifest",
        docsRoot,
        "Documentation root does not exist.",
      ),
    ];
  }

  const inventoryCandidates = await markdownFiles(root);
  let manifestPath: string | undefined;
  let records: DocumentRecord[] | undefined;
  for (const file of inventoryCandidates) {
    const markdown = await Deno.readTextFile(file);
    if (!/^# Documentation Inventory\b/im.test(markdown)) continue;
    const section = markdown.match(
      /## Machine-readable canonical manifest\s*\n([\s\S]*?)(?=\n## |$)/i,
    )?.[1];
    const jsonBlock = section?.match(/```json\s*\n([\s\S]*?)\n```/i);
    if (!jsonBlock) {
      return [
        diagnostic(
          "invalid-manifest",
          file,
          "Inventory requires a fenced JSON canonical manifest.",
        ),
      ];
    }
    let manifest: CanonicalManifest;
    try {
      manifest = JSON.parse(jsonBlock[1]) as CanonicalManifest;
    } catch {
      return [
        diagnostic(
          "invalid-manifest",
          file,
          "Canonical manifest JSON is invalid.",
        ),
      ];
    }
    if (manifest.canonicalRoot !== ".") {
      return [
        diagnostic("invalid-manifest", file, 'canonicalRoot must be ".".'),
      ];
    }
    if (!Array.isArray(manifest.documents)) {
      return [
        diagnostic(
          "invalid-manifest",
          file,
          "Canonical manifest requires a documents array.",
        ),
      ];
    }
    records = manifest.documents as DocumentRecord[];
    manifestPath = file;
    break;
  }
  if (!manifestPath || !records) {
    return [diagnostic(
      "invalid-manifest",
      root,
      "Expected one Markdown document headed 'Documentation Inventory'.",
    )];
  }

  const documentedPaths = new Set<string>();
  const authorityOwners = new Map<string, string>();
  for (const record of records) {
    const recordPath = typeof record.path === "string"
      ? record.path
      : "<unknown>";
    for (const field of requiredFields) {
      if (
        typeof record[field] !== "string" || !(record[field] as string).trim()
      ) {
        diagnostics.push(diagnostic(
          "missing-manifest-field",
          recordPath,
          `Missing required manifest field: ${field}.`,
        ));
      }
    }
    if (typeof record.path !== "string") continue;
    const normalizedPath = normalize(record.path);
    const fullPath = normalize(`${root}/${normalizedPath}`);
    if (!normalizedPath.endsWith(".md") || !isInside(root, fullPath)) {
      diagnostics.push(diagnostic(
        "outside-canonical-tree",
        record.path,
        "Manifest document paths must be Markdown files inside the canonical tree.",
      ));
      continue;
    }
    documentedPaths.add(normalizedPath);
    const canonical = typeof record.disposition === "string" &&
      record.disposition.toLowerCase() === "canonical";
    if (canonical) {
      let markdown: string | undefined;
      try {
        const info = await Deno.stat(fullPath);
        if (info.isFile) markdown = await Deno.readTextFile(fullPath);
      } catch {
        // Report the canonical path through the diagnostic below.
      }
      if (markdown === undefined) {
        diagnostics.push(diagnostic(
          "missing-canonical-document",
          record.path,
          `Canonical manifest path does not name an existing Markdown file: ${record.path}.`,
        ));
      } else {
        for (const field of requiredBodyMetadata) {
          if (!hasBodyMetadata(markdown, field)) {
            diagnostics.push(diagnostic(
              "missing-body-metadata",
              record.path,
              `Canonical document is missing body metadata field: ${field}.`,
            ));
          }
        }
      }
    }
    if (
      typeof record.language === "string" &&
      record.language !== "English" &&
      canonical
    ) {
      diagnostics.push(
        diagnostic(
          "missing-manifest-field",
          record.path,
          "Canonical documentation language must be English.",
        ),
      );
    }
    if (
      typeof record.authority === "string" &&
      !["reference", "non-authoritative", "generated", "none"].includes(
        record.authority,
      )
    ) {
      const owner = authorityOwners.get(record.authority);
      if (owner) {
        diagnostics.push(diagnostic(
          "duplicate-authority",
          record.path,
          `Authority '${record.authority}' is also claimed by ${owner}.`,
        ));
      } else authorityOwners.set(record.authority, record.path);
    }
  }

  const files = await markdownFiles(root);
  for (const file of files) {
    const relativePath = file.slice(root.length + 1);
    if (!documentedPaths.has(relativePath)) {
      diagnostics.push(
        diagnostic(
          "undocumented-markdown",
          relativePath,
          "Markdown file is missing from the inventory.",
        ),
      );
    }
    const markdown = await Deno.readTextFile(file);
    for (const target of localLinkTargets(markdown)) {
      const decodedTarget = decodeURIComponent(target.split("#")[0]);
      if (!decodedTarget) continue;
      const resolved = normalize(
        `${file.slice(0, file.lastIndexOf("/"))}/${decodedTarget}`,
      );
      if (!isInside(root, resolved)) {
        diagnostics.push(
          diagnostic(
            "outside-canonical-tree",
            relativePath,
            `Relative link leaves canonical tree: ${target}.`,
          ),
        );
        continue;
      }
      try {
        const info = await Deno.stat(resolved);
        if (!info.isFile) throw new Error("Not a file");
      } catch {
        diagnostics.push(
          diagnostic(
            "broken-relative-link",
            relativePath,
            `Relative link target does not exist: ${target}.`,
          ),
        );
      }
    }
  }
  return diagnostics;
}

if (import.meta.main) {
  const diagnostics = await runDocumentationCheck(Deno.args[0]);
  if (!diagnostics.length) {
    console.log("Documentation check passed.");
  } else {
    for (const item of diagnostics) {
      console.error(`ERROR ${item.code} ${item.path}: ${item.message}`);
    }
    Deno.exit(1);
  }
}
