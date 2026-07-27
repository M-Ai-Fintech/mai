import type { DropdownOption, DropdownProps } from "./Dropdown";

export function dropdownValues(value: DropdownProps["value"]): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function nextSelectedValues(
  option: DropdownOption,
  multiSelect: boolean,
  currentValues: string[],
): string[] {
  if (!multiSelect) return [option.value];
  if (currentValues.includes(option.value)) {
    return currentValues.filter((selected) => selected !== option.value);
  }
  return [...currentValues, option.value];
}
