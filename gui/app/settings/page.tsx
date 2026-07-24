"use client";

import { useTranslation } from "@/lib/i18n/I18nProvider";

export default function SettingsPage() {
  const { t, locale, setLocale } = useTranslation();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-signal-orange"></span>
          <p className="text-xs font-bold text-slate-gray uppercase tracking-wider">
            {t("settings.headerBadge")}
          </p>
        </div>
        <h1 className="text-4xl font-medium text-ink-black tracking-tight">
          {t("settings.title")}
        </h1>
        <p className="text-slate-gray mt-1 text-sm">
          {t("settings.description")}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-lifted-cream p-8 rounded-[40px] border border-dark-border shadow-[0_24px_48px_rgba(0,0,0,0.04)]">
          <h2 className="text-xl font-medium mb-5 text-ink-black flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-light-signal-orange">
            </span>
            {t("settings.userPreferences.title")}
          </h2>
          <form className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-1.5 px-1">
                {t("settings.userPreferences.language") || "Language"}
              </label>
              <select
                className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2.5 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange appearance-none cursor-pointer"
                value={locale}
                onChange={(e) => setLocale(e.target.value as "en" | "pt-BR")}
              >
                <option value="en">English</option>
                <option value="pt-BR">Português (Brasil)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-1.5 px-1">
                {t("settings.userPreferences.riskTolerance")}
              </label>
              <select className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2.5 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange appearance-none">
                <option>
                  {t("settings.userPreferences.riskConservative")}
                </option>
                <option>{t("settings.userPreferences.riskModerate")}</option>
                <option>{t("settings.userPreferences.riskAggressive")}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-1.5 px-1">
                {t("settings.userPreferences.negotiationStyle")}
              </label>
              <select className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2.5 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange appearance-none">
                <option>
                  {t("settings.userPreferences.styleCollaborative")}
                </option>
                <option>
                  {t("settings.userPreferences.styleCompetitive")}
                </option>
                <option>{t("settings.userPreferences.styleCompromise")}</option>
              </select>
            </div>
            <div className="pt-2">
              <button
                type="button"
                className="px-6 py-2.5 bg-ink-black hover:bg-slate-800 text-canvas-cream rounded-full text-sm font-semibold transition-colors cursor-pointer"
              >
                {t("settings.userPreferences.saveBtn")}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-lifted-cream p-8 rounded-[40px] border border-dark-border shadow-[0_24px_48px_rgba(0,0,0,0.04)]">
          <h2 className="text-xl font-medium mb-4 text-ink-black flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-signal-orange"></span>
            {t("settings.memory.title")}
          </h2>
          <p className="text-xs text-slate-gray mb-6 leading-relaxed">
            {t("settings.memory.description")}
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-canvas-cream/50 rounded-[20px] border border-dark-border/40">
              <div className="flex justify-between items-center mb-1 px-1">
                <span className="text-[10px] font-bold text-light-signal-orange uppercase tracking-wider">
                  {t("settings.memory.domainKnowledge")}
                </span>
                <span className="text-[10px] text-slate-gray">
                  {t("settings.memory.added", { date: "Jul 05" })}
                </span>
              </div>
              <p className="text-sm text-ink-black mt-1 leading-relaxed">
                {t("settings.memory.entry1")}
              </p>
            </div>
            <div className="p-4 bg-canvas-cream/50 rounded-[20px] border border-dark-border/40">
              <div className="flex justify-between items-center mb-1 px-1">
                <span className="text-[10px] font-bold text-light-signal-orange uppercase tracking-wider">
                  {t("settings.memory.companyCulture")}
                </span>
                <span className="text-[10px] text-slate-gray">
                  {t("settings.memory.added", { date: "Jun 28" })}
                </span>
              </div>
              <p className="text-sm text-ink-black mt-1 leading-relaxed">
                {t("settings.memory.entry2")}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-dark-border/40">
            <button
              type="button"
              className="text-sm text-light-signal-orange hover:text-signal-orange font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>{t("settings.memory.addBtn")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
