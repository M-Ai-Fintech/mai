import { assertEquals } from "@std/assert";
import {
  getLocale,
  isLocale,
  resolveLocale,
  setLocale,
  t,
  tList,
} from "./index.ts";

Deno.test("i18n defaults unknown locale input to English", () => {
  assertEquals(resolveLocale(undefined), "en");
  assertEquals(resolveLocale("fr"), "en");
  assertEquals(isLocale("pt-BR"), true);
});

Deno.test("i18n selects a locale explicitly", () => {
  setLocale("pt-BR");
  assertEquals(getLocale(), "pt-BR");
  assertEquals(
    t("cli.tables.kybFields.legalName"),
    t("cli.tables.kybFields.legalName", undefined, "pt-BR"),
  );

  setLocale("en");
  assertEquals(t("cli.tables.kybFields.legalName"), "Legal Name");
});

Deno.test("i18n falls back deterministically to English and then the key", () => {
  setLocale("pt-BR");
  assertEquals(t("missing.translation"), "missing.translation");
});

Deno.test("i18n interpolates known variables and preserves unknown variables", () => {
  setLocale("en");
  assertEquals(
    t("cli.spinners.kyb", { cnpj: "123" }),
    "[SourcingAndKYBAgent] Searching registry and background for CNPJ: 123...",
  );
  assertEquals(
    t("cli.spinners.kyb"),
    "[SourcingAndKYBAgent] Searching registry and background for CNPJ: {{cnpj}}...",
  );
});

Deno.test("i18n returns list translations through the list API", () => {
  assertEquals(tList("cli.tables.kybHeader", "en"), ["Field", "Value"]);
  assertEquals(tList("missing.list", "pt-BR"), ["missing.list"]);
});
