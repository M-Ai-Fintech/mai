import { en } from "./locales/en.ts";
import { ptBR } from "./locales/pt-BR.ts";

export const SUPPORTED_LOCALES = ["en", "pt-BR"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type TranslationParameters = Readonly<Record<string, string | number>>;

type CatalogValue = string | Catalog;
type Catalog = { readonly [key: string]: CatalogValue };

const catalogs: Readonly<Record<Locale, Catalog>> = {
  en,
  "pt-BR": ptBR,
};

let currentLocale: Locale = "en";

export function isLocale(value: string | undefined): value is Locale {
  return SUPPORTED_LOCALES.some((locale) => locale === value);
}

export function resolveLocale(value?: string): Locale {
  return isLocale(value) ? value : "en";
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

function lookup(catalog: Catalog, key: string): CatalogValue | undefined {
  let value: CatalogValue | undefined = catalog;

  for (const segment of key.split(".")) {
    if (typeof value !== "object") return undefined;
    value = (value as Catalog)[segment];
  }

  return value;
}

function interpolate(
  value: string,
  parameters?: TranslationParameters,
): string {
  if (!parameters) return value;

  return value.replace(
    /\{\{([^}]+)\}\}/g,
    (placeholder, name: string) =>
      name in parameters ? String(parameters[name]) : placeholder,
  );
}

export function t(
  key: string,
  parameters?: TranslationParameters,
  locale: Locale = currentLocale,
): string {
  const localized = lookup(catalogs[locale], key);
  const fallback = locale === "en" ? localized : lookup(catalogs.en, key);
  const value = typeof localized === "string"
    ? localized
    : typeof fallback === "string"
    ? fallback
    : key;

  return interpolate(value, parameters);
}
