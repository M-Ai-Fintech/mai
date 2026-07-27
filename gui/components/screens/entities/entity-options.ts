import type { DropdownOption } from "@/components/Dropdown/Dropdown";
import type { TeamMember } from "@/lib/api-client";

import type { EntityRole, KybStatus } from "./entity-state";

export const ENTITY_ROLE_VALUES: EntityRole[] = [
  "buyer",
  "seller",
  "target",
  "institution",
];

export const KYB_STATUS_VALUES: KybStatus[] = [
  "pending",
  "in_review",
  "approved",
  "rejected",
];

export const SECTOR_VALUES = [
  "financial_services",
  "fintech",
  "healthcare",
  "saas",
];

export function humanizeEntityValue(value: string): string {
  return value.replaceAll("_", " ").replace(
    /\b\w/g,
    (letter) => letter.toUpperCase(),
  );
}

export function buildEntityRoleOptions(): DropdownOption[] {
  return ENTITY_ROLE_VALUES.map((value) => ({
    value,
    label: humanizeEntityValue(value),
  }));
}

export function buildKybStatusOptions(): DropdownOption[] {
  return KYB_STATUS_VALUES.map((value) => ({
    value,
    label: humanizeEntityValue(value),
  }));
}

export function buildSectorOptions(): DropdownOption[] {
  return SECTOR_VALUES.map((value) => ({
    value,
    label: humanizeEntityValue(value),
  }));
}

export function buildAdvisorOptions(
  teamMembers: TeamMember[],
): DropdownOption[] {
  return [
    { value: "", label: "Unassigned" },
    ...teamMembers.map((member) => ({
      value: member.id,
      label: `${member.displayName} — ${member.role}`,
    })),
  ];
}

export function firstDropdownValue(value: string | string[]): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value;
}

export function entityRoleValues(value: string | string[]): EntityRole[] {
  return (Array.isArray(value) ? value : [value]) as EntityRole[];
}

export function isEntityRole(value: string): value is EntityRole {
  return ENTITY_ROLE_VALUES.includes(value as EntityRole);
}

export function statusVariant(
  status: KybStatus,
): "default" | "orange" | "dark" | "outline" {
  if (status === "approved") return "dark";
  if (status === "pending" || status === "in_review") return "orange";
  return "outline";
}

export const ENTITY_FILTER_ROLE_OPTIONS: DropdownOption[] = [
  { value: "", label: "All entity roles" },
  ...buildEntityRoleOptions(),
];

export const ENTITY_FORM_ROLE_OPTIONS = buildEntityRoleOptions();
export const ENTITY_STATUS_OPTIONS = buildKybStatusOptions();
export const ENTITY_FORM_SECTOR_OPTIONS = buildSectorOptions();
export const ENTITY_FILTER_SECTOR_OPTIONS: DropdownOption[] = [
  { value: "", label: "All sectors" },
  ...ENTITY_FORM_SECTOR_OPTIONS,
];
