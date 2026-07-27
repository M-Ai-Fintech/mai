export type TranslationTree = {
  readonly [key: string]: string | TranslationTree;
};

export type TranslationVariables = Record<string, string | number>;

function nestedTranslation(
  tree: TranslationTree,
  path: readonly string[],
): string | undefined {
  let current: string | TranslationTree = tree;
  for (const segment of path) {
    if (typeof current === "string" || !(segment in current)) return undefined;
    current = current[segment];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolateTranslation(
  template: string,
  variables?: TranslationVariables,
): string {
  if (!variables) return template;
  return Object.entries(variables).reduce(
    (result, [name, value]) =>
      result.replace(new RegExp(`{${name}}`, "g"), String(value)),
    template,
  );
}

/**
 * Resolves a dotted translation key with an English fallback.
 * Example: `translate("settings.title", selected, english)`.
 */
export function translate(
  key: string,
  selected: TranslationTree,
  english: TranslationTree,
  variables?: TranslationVariables,
): string {
  const path = key.split(".");
  const template = nestedTranslation(selected, path) ??
    nestedTranslation(english, path);
  return template ? interpolateTranslation(template, variables) : key;
}
