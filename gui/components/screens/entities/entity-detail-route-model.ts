import type { EntityDetail as EntityDetailData } from "../../../lib/api-client";

export function buildBreadcrumbs(entity: EntityDetailData | null) {
  if (!entity) return null;
  return [
    { label: "Home", href: "/" },
    { label: "Entities", href: "/entities" },
    { label: entity.legalName },
  ];
}

export function archiveReturnQuery(entity: EntityDetailData): string {
  return new URLSearchParams({
    role: entity.roles[0],
    country: entity.countryCode,
    notice: "archived",
    entity: entity.legalName,
  }).toString();
}
