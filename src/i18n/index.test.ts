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
    t("documentGen.latex.buyer"),
    t("documentGen.latex.buyer", undefined, "pt-BR"),
  );

  setLocale("en");
  assertEquals(t("documentGen.latex.buyer"), "Buyer:");
});

Deno.test("i18n falls back deterministically to English and then the key", () => {
  setLocale("pt-BR");
  assertEquals(t("missing.translation"), "missing.translation");
});

Deno.test("i18n interpolates document-generation variables", () => {
  setLocale("en");
  assertEquals(
    t("documentGen.latex.signatureBuyer", { buyer: "Acme" }),
    "Buyer: Acme",
  );
  assertEquals(
    t("documentGen.latex.signatureBuyer"),
    "Buyer: {{buyer}}",
  );
});

Deno.test("i18n returns list translations through the list API", () => {
  assertEquals(tList("documentGen.latex.buyer", "en"), [
    "documentGen.latex.buyer",
  ]);
  assertEquals(tList("missing.list", "pt-BR"), ["missing.list"]);
});
