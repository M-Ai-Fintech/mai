import type { Locale } from "@/lib/i18n/I18nProvider";
import type { SchemaTranslator } from "@/app/generative-ui/generative-schema-model";

interface MemoryEntryModel {
  category: string;
  date: string;
  content: string;
}

const selectClass =
  "w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2.5 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange appearance-none";

export function createSettingsMemoryEntries(
  t: SchemaTranslator,
): MemoryEntryModel[] {
  return [
    memoryEntryModel(t, "domainKnowledge", "Jul 05", "entry1"),
    memoryEntryModel(t, "companyCulture", "Jun 28", "entry2"),
  ];
}

function memoryEntryModel(
  t: SchemaTranslator,
  categoryKey: string,
  date: string,
  entryKey: string,
): MemoryEntryModel {
  return {
    category: t(`settings.memory.${categoryKey}`),
    date: t("settings.memory.added", { date }),
    content: t(`settings.memory.${entryKey}`),
  };
}

function SettingLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-1.5 px-1">
      {children}
    </label>
  );
}

function LanguageField(props: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: SchemaTranslator;
}) {
  return (
    <div>
      <SettingLabel>
        {props.t("settings.userPreferences.language")}
      </SettingLabel>
      <LanguageSelect {...props} />
    </div>
  );
}

function LanguageSelect(props: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}) {
  return (
    <select
      className={`${selectClass} cursor-pointer`}
      value={props.locale}
      onChange={(event) => props.setLocale(event.target.value as Locale)}
    >
      <option value="en">English</option>
      <option value="pt-BR">Português (Brasil)</option>
    </select>
  );
}

function RiskField({ t }: { t: SchemaTranslator }) {
  return (
    <div>
      <SettingLabel>{t("settings.userPreferences.riskTolerance")}</SettingLabel>
      <select className={selectClass}>
        <option>{t("settings.userPreferences.riskConservative")}</option>
        <option>{t("settings.userPreferences.riskModerate")}</option>
        <option>{t("settings.userPreferences.riskAggressive")}</option>
      </select>
    </div>
  );
}

function NegotiationField({ t }: { t: SchemaTranslator }) {
  return (
    <div>
      <SettingLabel>
        {t("settings.userPreferences.negotiationStyle")}
      </SettingLabel>
      <select className={selectClass}>
        <option>{t("settings.userPreferences.styleCollaborative")}</option>
        <option>{t("settings.userPreferences.styleCompetitive")}</option>
        <option>{t("settings.userPreferences.styleCompromise")}</option>
      </select>
    </div>
  );
}

export function PreferencesPanel(props: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: SchemaTranslator;
}) {
  return (
    <section className="bg-lifted-cream p-8 rounded-[40px] border border-dark-border shadow-[0_24px_48px_rgba(0,0,0,0.04)]">
      <PreferencesTitle t={props.t} />
      <PreferencesForm {...props} />
    </section>
  );
}

function PreferencesTitle({ t }: { t: SchemaTranslator }) {
  return (
    <h2 className="text-xl font-medium mb-5 text-ink-black flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-light-signal-orange" />
      {t("settings.userPreferences.title")}
    </h2>
  );
}

function PreferencesForm(props: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: SchemaTranslator;
}) {
  return (
    <form className="space-y-4">
      <LanguageField {...props} />
      <RiskField t={props.t} />
      <NegotiationField t={props.t} />
      <SavePreferencesButton t={props.t} />
    </form>
  );
}

function SavePreferencesButton({ t }: { t: SchemaTranslator }) {
  return (
    <button
      type="button"
      className="px-6 py-2.5 bg-ink-black text-canvas-cream rounded-full text-sm font-semibold"
    >
      {t("settings.userPreferences.saveBtn")}
    </button>
  );
}

function MemoryEntry(props: MemoryEntryModel) {
  return (
    <div className="p-4 bg-canvas-cream/50 rounded-[20px] border border-dark-border/40">
      <div className="flex justify-between items-center mb-1 px-1">
        <span className="text-[10px] font-bold text-light-signal-orange uppercase tracking-wider">
          {props.category}
        </span>
        <span className="text-[10px] text-slate-gray">{props.date}</span>
      </div>
      <p className="text-sm text-ink-black mt-1 leading-relaxed">
        {props.content}
      </p>
    </div>
  );
}

export function MemoryPanel({ t }: { t: SchemaTranslator }) {
  const entries = createSettingsMemoryEntries(t);

  return (
    <section className="bg-lifted-cream p-8 rounded-[40px] border border-dark-border shadow-[0_24px_48px_rgba(0,0,0,0.04)]">
      <MemoryHeading t={t} />
      <MemoryEntryList entries={entries} />
      <MemoryAction t={t} />
    </section>
  );
}

function MemoryHeading({ t }: { t: SchemaTranslator }) {
  return (
    <>
      <h2 className="text-xl font-medium mb-4 text-ink-black flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-signal-orange" />
        {t("settings.memory.title")}
      </h2>
      <p className="text-xs text-slate-gray mb-6 leading-relaxed">
        {t("settings.memory.description")}
      </p>
    </>
  );
}

function MemoryEntryList({ entries }: { entries: MemoryEntryModel[] }) {
  return (
    <div className="space-y-4">
      {entries.map((entry) => <MemoryEntry key={entry.category} {...entry} />)}
    </div>
  );
}

function MemoryAction({ t }: { t: SchemaTranslator }) {
  return (
    <button
      type="button"
      className="mt-6 pt-5 border-t border-dark-border/40 text-sm text-light-signal-orange font-bold"
    >
      {t("settings.memory.addBtn")}
    </button>
  );
}

export function SettingsHeader({ t }: { t: SchemaTranslator }) {
  return (
    <header className="mb-8">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-2 h-2 rounded-full bg-signal-orange" />
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
  );
}
