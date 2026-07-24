import { normalize } from "https://deno.land/std@0.224.0/path/mod.ts";

const PORTUGUESE_CHARS = /[ãõçáéíóúâêôÃÕÇÁÉÍÓÚÂÊÔ]/;
// Expand the list of Portuguese diagnostic strings to include common unaccented words and phrases.
const DIAGNOSTIC_STRINGS = [
  // Originally
  "erro",
  "falha",
  "aviso",
  "sucesso",
  "não",
  "inválido",
  "usuário",
  "exceção",
  // Common unaccented connectors and prepositions often found in Portuguese phrases
  "para",
  "com",
  "que",
  "como",
  "mas",
  "por",
  // Common nouns
  "empresa",
  "alvo",
  "teste",
  "arquivo",
  "valor",
  "dados",
  "resultado",
  "modelo",
  "transação",
  "mercado",
  "acordo",
  "termo",
  "cliente",
  "projeto",
  // Common verbs
  "executa",
  "gera",
  "salva",
  "busca",
  "cria",
  "retorna",
  "verifica",
  // X corruption
  "aquisiXX",
  "provisX",
  "condiXX",
  "reputaXX",
];

// Create a regex that matches these words as whole words
const DIAGNOSTIC_REGEX = new RegExp(
  `\\b(${DIAGNOSTIC_STRINGS.join("|")})\\b`,
  "i",
);

const TARGET_DIRS = ["src", "gui"];
const EXCLUDED_DIRS = [
  "src/i18n",
  "gui/lib/i18n/locales",
  "node_modules",
  "gui/node_modules",
];
const ALLOWED_EXTENSIONS = [".ts", ".tsx"];

async function walk(dir: string, files: string[] = []) {
  for await (const dirEntry of Deno.readDir(dir)) {
    const entryPath = `${dir}/${dirEntry.name}`;

    // Check exclusions
    const isExcluded = EXCLUDED_DIRS.some((ex) => entryPath.startsWith(ex));
    if (isExcluded) continue;

    if (dirEntry.isDirectory) {
      await walk(entryPath, files);
    } else if (dirEntry.isFile) {
      if (ALLOWED_EXTENSIONS.some((ext) => entryPath.endsWith(ext))) {
        files.push(entryPath);
      }
    }
  }
  return files;
}

let hasError = false;

// Matches string literals in JS/TS.
const stringRegex = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g;

// Words to ignore if they happen to overlap with English or other valid cases
const ALLOW_LIST = ["para", "por", "que", "com"]; // Just in case, let's keep them if they are part of something else, but actually as whole words they are clearly Portuguese in our context. Let's not allow them if they are alone. Wait, "para" could be short for parameter? "com" could be short for communication? We'll only flag if we find multiple indicators or longer words.

// Let's refine the logic to avoid false positives on short words.
const STRONG_DIAGNOSTIC_STRINGS = [
  "erro",
  "falha",
  "aviso",
  "sucesso",
  "não",
  "inválido",
  "usuário",
  "exceção",
  "empresa",
  "alvo",
  "teste",
  "arquivo",
  "valor",
  "dados",
  "resultado",
  "modelo",
  "transação",
  "mercado",
  "acordo",
  "termo",
  "cliente",
  "projeto",
  "executa",
  "gera",
  "salva",
  "busca",
  "cria",
  "retorna",
  "verifica",
  "aquisiXX",
  "provisX",
  "condiXX",
  "reputaXX",
];
const STRONG_REGEX = new RegExp(
  `\\b(${STRONG_DIAGNOSTIC_STRINGS.join("|")})\\b`,
  "i",
);

for (const targetDir of TARGET_DIRS) {
  try {
    const stat = await Deno.stat(targetDir);
    if (!stat.isDirectory) continue;
  } catch {
    continue;
  }

  const files = await walk(targetDir);
  for (const file of files) {
    const content = await Deno.readTextFile(file);
    let match;

    // Check strings and comments
    const allTextRegex =
      /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\/\/.*|\/\*[\s\S]*?\*\//g;

    while ((match = allTextRegex.exec(content)) !== null) {
      const text = match[0];

      if (PORTUGUESE_CHARS.test(text) || STRONG_REGEX.test(text)) {
        // Skip obvious english words that might collide, e.g. "para" (if we added it)
        const prefix = content.substring(0, match.index);
        const lineNo = prefix.split("\n").length;

        console.error(`i18n Error: Portuguese text found in ${file}:${lineNo}`);
        console.error(`  Text: ${text.substring(0, 100)}...`);
        hasError = true;
      }
    }
  }
}

if (hasError) {
  console.error(
    "i18n verification failed: Found Portuguese literals/comments in source files.",
  );
  Deno.exit(1);
} else {
  console.log("i18n verification passed.");
}
