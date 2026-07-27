"use client";

import { useTranslation } from "@/lib/i18n/I18nProvider";
import {
  MemoryPanel,
  PreferencesPanel,
  SettingsHeader,
} from "./settings-sections";

export default function SettingsPage() {
  const { t, locale, setLocale } = useTranslation();
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <SettingsHeader t={t} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PreferencesPanel locale={locale} setLocale={setLocale} t={t} />
        <MemoryPanel t={t} />
      </div>
    </div>
  );
}
