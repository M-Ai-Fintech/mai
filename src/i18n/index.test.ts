import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getLocale, setLocale, t } from "./index.ts";

Deno.test("i18n - should return translated string for default locale (pt-BR)", () => {
  setLocale("pt-BR");
  assertEquals(
    t("cli.headers.checkRegistry"),
    "Verificação Cadastral de KYB (SERPRO/Receita)",
  );
});

Deno.test("i18n - should change locale to en and return english strings", () => {
  setLocale("en");
  assertEquals(t("cli.tables.kybFields.legalName"), "Legal Name");

  setLocale("pt-BR");
  // Assuming we have pt-BR keys correctly configured
  assertEquals(t("cli.tables.statusActive"), "ATIVA");
});

Deno.test("i18n - should fallback to key if translation is missing", () => {
  assertEquals(t("non.existent.key"), "non.existent.key");
});

Deno.test("i18n - should interpolate variables in string", () => {
  setLocale("en");
  assertEquals(
    t("cli.messages.culture", { value: "Great" }),
    "- Corporate Culture: Great",
  );
});

Deno.test("i18n - should return raw arrays/objects if not a string", () => {
  setLocale("en");
  const headers = t("cli.tables.kybHeader");
  assertEquals(Array.isArray(headers), true);
  assertEquals(headers.length, 2);
  assertEquals(headers[0], "Field");
});
