import { describe, expect, it } from "vitest";

import { translate, type TranslationTree } from "./translation";

const english: TranslationTree = {
  settings: { title: "Settings", greeting: "Hello, {name}" },
};

function expectSelectedLocaleTranslation(): void {
  const localizedSettings = "Configura\u00e7\u00f5es";
  const portuguese: TranslationTree = {
    settings: { title: localizedSettings },
  };
  expect(translate("settings.title", portuguese, english)).toBe(
    localizedSettings,
  );
}

function expectEnglishInterpolation(): void {
  expect(translate("settings.greeting", {}, english, { name: "Luis" })).toBe(
    "Hello, Luis",
  );
}

function expectMissingTranslationKey(): void {
  expect(translate("settings", english, english)).toBe("settings");
  expect(translate("missing.key", {}, english)).toBe("missing.key");
}

describe("translate", () => {
  it(
    "resolves a nested key in the selected locale",
    expectSelectedLocaleTranslation,
  );
  it(
    "falls back to English and interpolates variables",
    expectEnglishInterpolation,
  );
  it(
    "returns the key when the value is missing or not a string",
    expectMissingTranslationKey,
  );
});
