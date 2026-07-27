export function normalizeDocumentationPath(path: string): string {
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

export function isInsideDocumentationRoot(
  root: string,
  path: string,
): boolean {
  return path === root || path.startsWith(`${root}/`);
}

export async function collectMarkdownFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(root)) {
    const path = `${root}/${entry.name}`;
    if (entry.isDirectory) files.push(...await collectMarkdownFiles(path));
    else if (entry.isFile && entry.name.endsWith(".md")) files.push(path);
  }
  return files.sort();
}

function stripLinkWrapper(target: string): string {
  if (target.startsWith("<") && target.endsWith(">")) {
    return target.slice(1, -1);
  }
  return target;
}

export function localMarkdownTargets(markdown: string): string[] {
  const targets: string[] = [];
  const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of markdown.matchAll(linkPattern)) {
    const target = stripLinkWrapper(match[1].trim().split(/\s+/)[0]);
    if (
      !target || target.startsWith("#") ||
      /^[a-z][a-z0-9+.-]*:/i.test(target)
    ) continue;
    targets.push(target);
  }
  return targets;
}

export function hasDocumentationMetadata(
  markdown: string,
  field: string,
): boolean {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `^\\s*-\\s+(?:${escapedField}:|\\*\\*${escapedField}:\\*\\*)\\s*\\S`,
    "mi",
  ).test(markdown);
}
