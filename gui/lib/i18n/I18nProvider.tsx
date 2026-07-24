"use client";

import React, { createContext, ReactNode, useContext, useState } from "react";
import en from "./locales/en.json";
import ptBR from "./locales/pt-BR.json";

type Locale = "en" | "pt-BR";
type Translations = Record<string, any>;

const translations: Record<Locale, Translations> = {
  en,
  "pt-BR": ptBR,
};

interface I18nContextProps {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextProps | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>("en");

  React.useEffect(() => {
    const saved = localStorage.getItem("mai_locale") as Locale;
    if (saved && (saved === "en" || saved === "pt-BR")) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("mai_locale", newLocale);
  };

  const t = (
    key: string,
    variables?: Record<string, string | number>,
  ): string => {
    const keys = key.split(".");
    let value: any = translations[locale];

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        // Fallback to English
        let fallbackValue: any = translations["en"];
        for (const fbK of keys) {
          if (
            fallbackValue && typeof fallbackValue === "object" &&
            fbK in fallbackValue
          ) {
            fallbackValue = fallbackValue[fbK];
          } else {
            return key;
          }
        }
        value = fallbackValue;
        break;
      }
    }

    if (typeof value === "string") {
      if (variables) {
        return Object.entries(variables).reduce(
          (str, [varName, varValue]) =>
            str.replace(new RegExp(`{${varName}}`, "g"), String(varValue)),
          value,
        );
      }
      return value;
    }

    return key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
};
