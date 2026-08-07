import { assertEquals } from "@std/assert";
import { findPortugueseText } from "./check_i18n.ts";

Deno.test("i18n checker rejects Portuguese presentation literals", () => {
  const violations = findPortugueseText(
    'console.error("Erro ao salvar dados do usuário.");',
  );
  assertEquals(violations.length, 1);
  assertEquals(violations[0].line, 1);
});

Deno.test("i18n checker rejects Portuguese comments and schema descriptions", () => {
  const violations = findPortugueseText(
    '// Retorna informações da empresa\nz.string().describe("Situação cadastral")',
  );
  assertEquals(violations.length, 2);
  assertEquals(violations[1].line, 2);
});

Deno.test("i18n checker accepts English source text", () => {
  assertEquals(
    findPortugueseText('console.error("Unable to save user data.");'),
    [],
  );
});
