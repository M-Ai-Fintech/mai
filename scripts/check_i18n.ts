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
  const begin = "<!-- COMMENTS:BEGIN -->";
  const end = "<!-- COMMENTS:END -->";
  const start = source.indexOf(begin);
  const finish = source.indexOf(end);
  if (start === -1 || finish === -1 || finish <= start) return [];

  const commentsStart = start + begin.length;
  const comments = source.slice(commentsStart, finish);
  const firstLine = source.slice(0, commentsStart).split("\n").length - 1;
  const violations: I18nViolation[] = [];

  for (const [index, text] of comments.split("\n").entries()) {
    if (!PORTUGUESE_MARKERS.some((marker) => marker.test(text))) continue;
    violations.push({ line: firstLine + index + 1, text: text.slice(0, 120) });
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
  const violations: I18nViolation[] = [];

  for (const root of SCANNED_ROOTS) {
    try {
      for (const path of await collectSourceFiles(root)) {
        const source = await Deno.readTextFile(path);
        for (const violation of findPortugueseText(source)) {
          console.error(
            `${path}:${violation.line}: non-English source text: ${violation.text}`,
          );
          violations.push(violation);
        }
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  }

  try {
    for await (const entry of Deno.readDir("backlog/tasks")) {
      if (!entry.isFile || !entry.name.endsWith(".md")) continue;
      const path = `backlog/tasks/${entry.name}`;
      const source = await Deno.readTextFile(path);
      for (const violation of findPortugueseBacklogComments(source)) {
        console.error(
          `${path}:${violation.line}: non-English Backlog comment: ${violation.text}`,
        );
        violations.push(violation);
      }
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }

  return violations;
}

if (import.meta.main) {
  const violations = await checkRepository();
  if (violations.length > 0) Deno.exit(1);
  console.log("i18n source check passed.");
}
