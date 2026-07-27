"use client";

import React, { createContext, ReactNode, useContext, useState } from "react";
import en from "./locales/en.json";
import ptBR from "./locales/pt-BR.json";
import {
  translate,
  type TranslationTree,
  type TranslationVariables,
} from "./translation";

export type Locale = "en" | "pt-BR";

const translations: Record<Locale, TranslationTree> = {
  en,
  "pt-BR": ptBR,
};

interface I18nContextProps {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, variables?: TranslationVariables) => string;
}

const I18nContext = createContext<I18nContextProps | undefined>(undefined);

function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "pt-BR";
}

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>("en");

  useStoredLocale(setLocaleState);
  const setLocale = localeWriter(setLocaleState);
  const t = translatorForLocale(locale);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

function useStoredLocale(setLocaleState: (locale: Locale) => void): void {
  React.useEffect(() => {
    const saved = localStorage.getItem("mai_locale");
    if (isLocale(saved)) queueMicrotask(() => setLocaleState(saved));
  }, [setLocaleState]);
}

function localeWriter(setLocaleState: (locale: Locale) => void) {
  return (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("mai_locale", newLocale);
  };
}

function translatorForLocale(locale: Locale) {
  return (key: string, variables?: TranslationVariables): string =>
    translate(key, translations[locale], translations.en, variables);
}

export const useTranslation = (): I18nContextProps => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error(
      "useTranslation has no I18nContext; expected an ancestor I18nProvider",
    );
  }
  return context;
};
