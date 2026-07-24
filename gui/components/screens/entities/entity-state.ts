import type { EntitySummary, EntityWrite } from "@/lib/api-client";

export type EntityRole = "buyer" | "seller" | "target" | "institution";
export type KybStatus = "pending" | "in_review" | "approved" | "rejected";
export type EntityCountry = "BR" | "ES" | "US";

export interface EntityFormState {
  legalName: string;
  taxId: string;
  sector: string;
  countryCode: EntityCountry;
  roles: EntityRole[];
  contactEmail: string;
  kybStatus: KybStatus;
  regulatoryClearanceRequired: boolean;
  primaryAdvisorId: string;
}

export type EntityFormErrors = Partial<Record<keyof EntityFormState, string>>;

export const ENTITY_FORM_FIELD_ORDER: (keyof EntityFormState)[] = [
  "legalName",
  "taxId",
  "contactEmail",
  "sector",
  "roles",
  "countryCode",
  "kybStatus",
  "primaryAdvisorId",
  "regulatoryClearanceRequired",
];

export const EMPTY_ENTITY_FORM: EntityFormState = {
  legalName: "",
  taxId: "",
  sector: "",
  countryCode: "BR",
  roles: ["target"],
  contactEmail: "",
  kybStatus: "pending",
  regulatoryClearanceRequired: false,
  primaryAdvisorId: "",
};

export function entityToForm(entity: EntitySummary): EntityFormState {
  return {
    legalName: entity.legalName,
    taxId: entity.taxId,
    sector: entity.sector,
    countryCode: entity.countryCode as EntityCountry,
    roles: [...entity.roles],
    contactEmail: entity.contactEmail,
    kybStatus: entity.kybStatus,
    regulatoryClearanceRequired: entity.regulatoryClearanceRequired,
    primaryAdvisorId: entity.primaryAdvisorId ?? "",
  };
}

export function validateEntityForm(form: EntityFormState): EntityFormErrors {
  const errors: EntityFormErrors = {};
  if (!form.legalName.trim()) {
    errors.legalName = "Corporate legal name is required.";
  }
  if (!form.taxId.trim()) errors.taxId = "CNPJ / Tax ID is required.";
  if (!form.sector.trim()) errors.sector = "Industry sector is required.";
  if (!/^\S+@\S+\.\S+$/.test(form.contactEmail)) {
    errors.contactEmail = "Enter a valid contact email.";
  }
  if (form.roles.length === 0) {
    errors.roles = "Select at least one entity role.";
  }
  return errors;
}

export function toEntityWrite(form: EntityFormState): EntityWrite {
  return {
    legalName: form.legalName.trim(),
    taxId: form.taxId.trim(),
    sector: form.sector.trim(),
    countryCode: form.countryCode,
    roles: form.roles,
    contactEmail: form.contactEmail.trim(),
    kybStatus: form.kybStatus,
    regulatoryClearanceRequired: form.regulatoryClearanceRequired,
    primaryAdvisorId: form.primaryAdvisorId || null,
  };
}

export function firstFieldError(
  fieldErrors?: Record<string, string[]>,
): EntityFormErrors {
  if (!fieldErrors) return {};
  return Object.fromEntries(
    Object.entries(fieldErrors)
      .filter(([, messages]) => messages.length > 0)
      .map(([field, messages]) => [field, messages[0]]),
  ) as EntityFormErrors;
}

export function firstEntityErrorField(
  errors: EntityFormErrors,
): keyof EntityFormState | undefined {
  return ENTITY_FORM_FIELD_ORDER.find((field) => Boolean(errors[field]));
}

export function entityArchiveSuccessNotice(entityName: string) {
  return {
    title: "Entity archived",
    message: `${entityName || "The entity"} was removed from active results.`,
  };
}
