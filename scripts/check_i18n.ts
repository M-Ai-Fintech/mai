const PORTUGUESE_MARKERS = [
  /[ãõçáéíóúâêôàüÃÕÇÁÉÍÓÚÂÊÔÀÜ]/u,
  /\b(?:ação|ações|arquivo|arquivos|aviso|banco|chave|código|comando|configuração|conteúdo|contrato|critérios|dados|deve|devem|documentação|empresa|erro|falha|implementação|não|negociação|objetivo|padrão|português|projeto|relatório|resultado|resumo|risco|situação|sucesso|tarefa|teste|testes|todos|usuário|validação|valor|verificação)\b/iu,
] as const;

const SCANNED_ROOTS = ["src", "gui", "tests", "scripts"] as const;
const SCANNED_EXTENSIONS = [".ts", ".tsx"] as const;
const EXCLUDED_PATHS = [
  "src/i18n/locales/",
  "gui/lib/i18n/locales/",
  "scripts/check_i18n_test.ts",
] as const;
const BACKLOG_COMMENTS_BEGIN = "<!-- COMMENTS:BEGIN -->";
const BACKLOG_COMMENTS_END = "<!-- COMMENTS:END -->";

export interface I18nViolation {
  readonly line: number;
  readonly text: string;
}

const TEXT_TOKEN =
  /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\/\/[^\n]*|\/\*[\s\S]*?\*\//g;

export function findPortugueseText(source: string): I18nViolation[] {
  const violations: I18nViolation[] = [];

  for (const match of source.matchAll(TEXT_TOKEN)) {
    const text = match[0];
    if (!PORTUGUESE_MARKERS.some((marker) => marker.test(text))) continue;

    violations.push({
      line: source.slice(0, match.index).split("\n").length,
      text: text.slice(0, 120),
    });
  }

  return violations;
}

export function findPortugueseBacklogComments(
  source: string,
): I18nViolation[] {
  const start = source.indexOf(BACKLOG_COMMENTS_BEGIN);
  const finish = source.indexOf(BACKLOG_COMMENTS_END);
  if (start === -1 || finish === -1 || finish <= start) return [];

  const commentsStart = start + BACKLOG_COMMENTS_BEGIN.length;
  const comments = source.slice(commentsStart, finish);
  const firstLine = source.slice(0, commentsStart).split("\n").length - 1;
  return portugueseLineViolations(comments, firstLine);
}

function portugueseLineViolations(
  source: string,
  lineOffset: number,
): I18nViolation[] {
  const violations: I18nViolation[] = [];
  for (const [index, text] of source.split("\n").entries()) {
    if (!PORTUGUESE_MARKERS.some((marker) => marker.test(text))) continue;
    violations.push({ line: lineOffset + index + 1, text: text.slice(0, 120) });
  }
  return violations;
}

function isExcluded(path: string): boolean {
  return path.split("/").includes("node_modules") ||
    EXCLUDED_PATHS.some((prefix) => path.startsWith(prefix));
}

async function collectSourceFiles(
  directory: string,
  files: string[] = [],
): Promise<string[]> {
  for await (const entry of Deno.readDir(directory)) {
    const path = `${directory}/${entry.name}`;
    if (isExcluded(path)) continue;

    if (entry.isDirectory) {
      await collectSourceFiles(path, files);
    } else if (
      entry.isFile &&
      SCANNED_EXTENSIONS.some((extension) => path.endsWith(extension))
    ) {
      files.push(path);
    }
  }

  return files;
}

export async function checkRepository(): Promise<I18nViolation[]> {
  const sourceViolations = await collectRepositorySourceViolations();
  const backlogViolations = await collectBacklogCommentViolations();
  return [...sourceViolations, ...backlogViolations];
}

async function collectRepositorySourceViolations(): Promise<I18nViolation[]> {
  const violations: I18nViolation[] = [];
  for (const root of SCANNED_ROOTS) {
    try {
      for (const path of await collectSourceFiles(root)) {
        violations.push(...await sourceFileViolations(path));
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  }
  return violations;
}

async function sourceFileViolations(path: string): Promise<I18nViolation[]> {
  const source = await Deno.readTextFile(path);
  const violations = findPortugueseText(source);
  reportViolations(path, "non-English source text", violations);
  return violations;
}

async function collectBacklogCommentViolations(): Promise<I18nViolation[]> {
  const violations: I18nViolation[] = [];
  try {
    for await (const entry of Deno.readDir("backlog/tasks")) {
      if (!entry.isFile || !entry.name.endsWith(".md")) continue;
      const path = `backlog/tasks/${entry.name}`;
      const source = await Deno.readTextFile(path);
      const found = findPortugueseBacklogComments(source);
      reportViolations(path, "non-English Backlog comment", found);
      violations.push(...found);
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
  return violations;
}

function reportViolations(
  path: string,
  label: string,
  violations: readonly I18nViolation[],
): void {
  for (const violation of violations) {
    console.error(`${path}:${violation.line}: ${label}: ${violation.text}`);
  }
}

if (import.meta.main) {
  const violations = await checkRepository();
  if (violations.length > 0) Deno.exit(1);
  console.log("i18n source check passed.");
}
