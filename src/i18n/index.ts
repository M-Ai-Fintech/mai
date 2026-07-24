import { en } from "./locales/en.ts";
import { ptBR } from "./locales/pt-BR.ts";

export type Locale = "en" | "pt-BR";

let currentLocale: Locale = "pt-BR";

const catalogs: Record<string, any> = {
  en,
  "pt-BR": ptBR,
};

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: string, params?: Record<string, any>): any {
  const catalog = catalogs[currentLocale] || catalogs["pt-BR"];
  const keys = key.split(".");
  let value: any = catalog;
  for (const k of keys) {
    if (value === undefined) break;
    value = value[k];
  }

  if (
    typeof value !== "string" && !Array.isArray(value) &&
    typeof value !== "object"
  ) {
    return key;
  }

  if (params) {
    return value.replace(/\{\{([^}]+)\}\}/g, (_: string, p1: string) => {
      return (params && typeof params === "object" && p1 in params)
        ? String((params as Record<string, unknown>)[p1])
        : `{{${p1}}}`;
    });
  }

  return value;
}
