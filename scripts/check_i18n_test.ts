import { assertEquals } from "@std/assert";
import {
  findPortugueseBacklogComments,
  findPortugueseText,
} from "./check_i18n.ts";

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

Deno.test("i18n checker scans active Backlog comments only", () => {
  const task = `## Description
Descrição histórica outside comments is not part of this boundary.
<!-- COMMENTS:BEGIN -->
created: 2026-07-24
---
Resumo da implementação
<!-- COMMENTS:END -->`;

  const violations = findPortugueseBacklogComments(task);
  assertEquals(violations.length, 1);
  assertEquals(violations[0].text, "Resumo da implementação");
});
