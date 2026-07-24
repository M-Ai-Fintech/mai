import { assertEquals, assertStringIncludes } from "@std/assert";
import { runDocumentationCheck } from "./check_docs.ts";

async function withDocs(
  files: Record<string, string>,
  test: (root: string) => Promise<void>,
): Promise<void> {
  const root = await Deno.makeTempDir({ prefix: "mai-docs-check-" });
  try {
    for (const [relativePath, content] of Object.entries(files)) {
      const path = `${root}/${relativePath}`;
      await Deno.mkdir(path.slice(0, path.lastIndexOf("/")), {
        recursive: true,
      });
      await Deno.writeTextFile(path, content);
    }
    await test(root);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
}

const inventory = (documents: Array<Record<string, string>>) =>
  `# Documentation Inventory

- Authority ID: canonical:inventory.md
- Owner: Documentation owner
- Authority: Canonical inventory
- Freshness: 2026-07-24
- Language: English
- Update trigger: Documentation changes

## Individual tracked documentation-like inventory

| Path | Owner | Purpose | Authority | Freshness | Language | Disposition |
| --- | --- | --- | --- | --- | --- | --- |
| ` +
  "`human-only.md` | Maintainers | Human inventory | none | current | English | reference |\n" +
  `
## Machine-readable canonical manifest

\`\`\`json
${JSON.stringify({ canonicalRoot: ".", documents }, null, 2)}
\`\`\`
`;

const governedDoc = (title: string, content = "") =>
  `# ${title}

- Authority ID: canonical:${title.toLowerCase()}
- Owner: Documentation owner
- Authority: Canonical test documentation
- Freshness: 2026-07-24
- Language: English
- Update trigger: Test behavior changes

${content}`;

const boldGovernedDoc = (title: string) =>
  `# ${title}

- **Authority ID:** canonical:${title.toLowerCase()}
- **Owner:** Documentation owner
- **Authority:** Canonical test documentation
- **Freshness:** 2026-07-24
- **Language:** English
- **Update trigger:** Test behavior changes
`;

const entry = (path: string, authority = `canonical:${path}`) => ({
  path,
  owner: "Documentation owner",
  purpose: "Test documentation",
  authority,
  freshness: "2026-07-24",
  language: "English",
  disposition: "canonical",
});

Deno.test("documentation checker accepts a governed canonical tree with valid relative links", async () => {
  await withDocs({
    "inventory.md": inventory([
      entry("inventory.md"),
      entry("index.md"),
      entry("architecture.md"),
    ]),
    "index.md": governedDoc(
      "Documentation",
      "[Architecture](architecture.md)\n",
    ),
    "architecture.md": governedDoc("Architecture"),
  }, async (root) => {
    assertEquals(await runDocumentationCheck(root), []);
  });
});

Deno.test("documentation checker reports broken relative Markdown links", async () => {
  await withDocs({
    "inventory.md": inventory([entry("inventory.md"), entry("index.md")]),
    "index.md": governedDoc("Documentation", "[Missing](missing.md)\n"),
  }, async (root) => {
    const diagnostics = await runDocumentationCheck(root);
    assertEquals(diagnostics.map((diagnostic) => diagnostic.code), [
      "broken-relative-link",
    ]);
    assertStringIncludes(diagnostics[0].message, "missing.md");
  });
});

Deno.test("documentation checker reports duplicate explicit authority claims", async () => {
  await withDocs({
    "inventory.md": inventory([
      entry("inventory.md"),
      entry("index.md", "canonical:architecture"),
      entry("architecture.md", "canonical:architecture"),
    ]),
    "index.md": governedDoc("Documentation"),
    "architecture.md": governedDoc("Architecture"),
  }, async (root) => {
    const diagnostics = await runDocumentationCheck(root);
    assertEquals(diagnostics.map((diagnostic) => diagnostic.code), [
      "duplicate-authority",
    ]);
  });
});

Deno.test("documentation checker reports missing governance metadata and undocumented Markdown files", async () => {
  await withDocs({
    "inventory.md": inventory([entry("inventory.md"), {
      path: "index.md",
      owner: "Documentation owner",
      purpose: "Test documentation",
      authority: "canonical:index",
      freshness: "2026-07-24",
      language: "English",
      disposition: "",
    }]),
    "index.md": governedDoc("Documentation"),
    "unlisted.md": "# Unlisted\n",
  }, async (root) => {
    const diagnostics = await runDocumentationCheck(root);
    assertEquals(
      diagnostics.map((diagnostic) => diagnostic.code),
      ["missing-manifest-field", "undocumented-markdown"],
    );
  });
});

Deno.test("documentation checker keeps canonical documents inside their tree", async () => {
  await withDocs({
    "inventory.md": inventory([entry("inventory.md"), entry("index.md")]),
    "index.md": governedDoc("Documentation", "[Legacy](../../README.md)\n"),
  }, async (root) => {
    const diagnostics = await runDocumentationCheck(root);
    assertEquals(diagnostics.map((diagnostic) => diagnostic.code), [
      "outside-canonical-tree",
    ]);
  });
});

Deno.test("documentation checker command returns diagnostics and a non-zero status", async () => {
  await withDocs({
    "inventory.md": inventory([entry("inventory.md"), entry("index.md")]),
    "index.md": governedDoc("Documentation", "[Missing](missing.md)\n"),
  }, async (root) => {
    const output = await new Deno.Command(Deno.execPath(), {
      args: ["run", "--quiet", "--allow-read", "scripts/check_docs.ts", root],
      stdout: "piped",
      stderr: "piped",
    }).output();
    const text = new TextDecoder().decode(output.stderr);

    assertEquals(output.code, 1);
    assertStringIncludes(text, "ERROR broken-relative-link index.md");
  });
});

Deno.test("documentation checker reports canonical manifest paths whose Markdown file is missing", async () => {
  await withDocs({
    "inventory.md": inventory([
      entry("inventory.md"),
      entry("missing.md"),
    ]),
  }, async (root) => {
    const diagnostics = await runDocumentationCheck(root);
    assertEquals(diagnostics.map((diagnostic) => diagnostic.code), [
      "missing-canonical-document",
    ]);
    assertStringIncludes(diagnostics[0].message, "missing.md");
  });
});

Deno.test("documentation checker requires stable body metadata on canonical documents only", async () => {
  await withDocs({
    "inventory.md": inventory([
      entry("inventory.md"),
      entry("canonical.md"),
      {
        ...entry("deprecated.md", "none"),
        disposition: "deprecated",
        language: "Portuguese",
      },
    ]),
    "canonical.md": "# Canonical\n",
    "deprecated.md": "# Deprecated\n",
  }, async (root) => {
    const diagnostics = await runDocumentationCheck(root);
    assertEquals(
      diagnostics.map((diagnostic) => diagnostic.code),
      Array(6).fill("missing-body-metadata"),
    );
    assertStringIncludes(diagnostics[0].path, "canonical.md");
  });
});

Deno.test("documentation checker accepts bold governed body metadata labels", async () => {
  await withDocs({
    "inventory.md": inventory([
      entry("inventory.md"),
      entry("architecture.md"),
    ]),
    "architecture.md": boldGovernedDoc("Architecture"),
  }, async (root) => {
    assertEquals(await runDocumentationCheck(root), []);
  });
});
