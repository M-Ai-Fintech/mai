import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { SchemaTranslator } from "@/app/generative-ui/generative-schema-model";
import type { Locale } from "@/lib/i18n/I18nProvider";
import {
  createSettingsMemoryEntries,
  MemoryPanel,
  PreferencesPanel,
} from "./settings-sections";

const t: SchemaTranslator = (key, variables) =>
  variables?.date ? `${key}:${variables.date}` : key;

function expectTranslatedMemoryEntries(): void {
  expect(createSettingsMemoryEntries(t)).toEqual([
    {
      category: "settings.memory.domainKnowledge",
      date: "settings.memory.added:Jul 05",
      content: "settings.memory.entry1",
    },
    {
      category: "settings.memory.companyCulture",
      date: "settings.memory.added:Jun 28",
      content: "settings.memory.entry2",
    },
  ]);
}

function settingsView(): React.ReactElement {
  const setLocale = (locale: Locale) => expect(locale).toMatch(/en|pt-BR/);
  return createElement(Fragment, null, [
    createElement(PreferencesPanel, {
      key: "preferences",
      locale: "en",
      setLocale,
      t,
    }),
    createElement(MemoryPanel, { key: "memory", t }),
  ]);
}

function expectSettingsPanelLabels(): void {
  const html = renderToStaticMarkup(settingsView());
  expect(html).toContain("settings.userPreferences.language");
  expect(html).toContain("settings.memory.domainKnowledge");
}

describe("settings sections", () => {
  it("creates translated memory entry models", expectTranslatedMemoryEntries);
  it("renders preferences and memory panel labels", expectSettingsPanelLabels);
});
