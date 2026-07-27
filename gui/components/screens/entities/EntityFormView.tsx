"use client";

import {
  type CountryCode,
  CountrySelector,
} from "@/components/CountrySelector/CountrySelector";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import { Dropdown } from "@/components/Dropdown/Dropdown";
import { FormField } from "@/components/FormField/FormField";
import { Input } from "@/components/Input/Input";
import type { TeamMember } from "@/lib/api-client";

import {
  buildAdvisorOptions,
  ENTITY_FORM_ROLE_OPTIONS,
  ENTITY_FORM_SECTOR_OPTIONS,
  ENTITY_STATUS_OPTIONS,
  entityRoleValues,
  firstDropdownValue,
} from "./entity-options";
import type {
  EntityFormErrors,
  EntityFormState,
  KybStatus,
} from "./entity-state";

interface EntityFormViewProps {
  form: EntityFormState;
  errors: EntityFormErrors;
  teamMembers: TeamMember[];
  advisorHint: string;
  onChange: (form: EntityFormState) => void;
}

export function EntityFormView(props: EntityFormViewProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <EntityIdentityFields {...props} />
      <EntityClassificationFields {...props} />
      <EntityOwnershipFields {...props} />
    </div>
  );
}

function EntityIdentityFields(props: EntityFormViewProps) {
  return (
    <>
      <EntityLegalNameField {...props} />
      <EntityTaxIdField {...props} />
      <EntityEmailField {...props} />
    </>
  );
}

function EntityClassificationFields(props: EntityFormViewProps) {
  return (
    <>
      <EntitySectorField {...props} />
      <EntityRolesField {...props} />
      <EntityCountryField {...props} />
      <EntityKybStatusField {...props} />
    </>
  );
}

function EntityOwnershipFields(props: EntityFormViewProps) {
  return (
    <>
      <EntityAdvisorField {...props} />
      <EntityRegulatoryField {...props} />
    </>
  );
}

interface FieldProps {
  form: EntityFormState;
  errors: EntityFormErrors;
  onChange: (form: EntityFormState) => void;
}

function EntityLegalNameField({ form, errors, onChange }: FieldProps) {
  return (
    <FormField
      label="Corporate Legal Name"
      required
      error={errors.legalName}
      className="md:col-span-2"
      id="entity-legal-name"
    >
      <div data-entity-field="legalName">
        <EntityLegalNameInput
          form={form}
          errors={errors}
          onChange={onChange}
        />
      </div>
    </FormField>
  );
}

function EntityLegalNameInput({ form, errors, onChange }: FieldProps) {
  return (
    <Input
      value={form.legalName}
      hasError={Boolean(errors.legalName)}
      onChange={(event) => onChange({ ...form, legalName: event.target.value })}
    />
  );
}

function EntityTaxIdField({ form, errors, onChange }: FieldProps) {
  return (
    <FormField label="CNPJ / Tax ID" required error={errors.taxId}>
      <div data-entity-field="taxId">
        <Input
          value={form.taxId}
          hasError={Boolean(errors.taxId)}
          onChange={(event) => onChange({ ...form, taxId: event.target.value })}
        />
      </div>
    </FormField>
  );
}

function EntityEmailField({ form, errors, onChange }: FieldProps) {
  return (
    <FormField label="Contact Email" required error={errors.contactEmail}>
      <div data-entity-field="contactEmail">
        <Input
          type="email"
          value={form.contactEmail}
          hasError={Boolean(errors.contactEmail)}
          onChange={(event) =>
            onChange({
              ...form,
              contactEmail: event.target.value,
            })}
        />
      </div>
    </FormField>
  );
}

function EntitySectorField({ form, errors, onChange }: FieldProps) {
  return (
    <FormField label="Industry Sector" required error={errors.sector}>
      <div data-entity-field="sector">
        <Dropdown
          options={ENTITY_FORM_SECTOR_OPTIONS}
          value={form.sector}
          error={errors.sector}
          onChange={(value) =>
            onChange({
              ...form,
              sector: firstDropdownValue(value),
            })}
        />
      </div>
    </FormField>
  );
}

function EntityRolesField({ form, errors, onChange }: FieldProps) {
  return (
    <FormField label="Entity Roles" required error={errors.roles}>
      <div data-entity-field="roles">
        <Dropdown
          options={ENTITY_FORM_ROLE_OPTIONS}
          value={form.roles}
          multiSelect
          searchable
          error={errors.roles}
          onChange={(value) =>
            onChange({
              ...form,
              roles: entityRoleValues(value),
            })}
        />
      </div>
    </FormField>
  );
}

interface CountryFieldProps {
  form: EntityFormState;
  onChange: (form: EntityFormState) => void;
}

function EntityCountryField({ form, onChange }: CountryFieldProps) {
  return (
    <FormField label="Country" required>
      <CountrySelector
        selectedCountry={form.countryCode as CountryCode}
        variant="light"
        onChange={(country) => onChange({ ...form, countryCode: country.code })}
      />
    </FormField>
  );
}

function EntityKybStatusField({ form, onChange }: CountryFieldProps) {
  return (
    <FormField label="KYB Status" required>
      <Dropdown
        options={ENTITY_STATUS_OPTIONS}
        value={form.kybStatus}
        onChange={(value) =>
          onChange({
            ...form,
            kybStatus: firstDropdownValue(value) as KybStatus,
          })}
      />
    </FormField>
  );
}

interface AdvisorFieldProps extends CountryFieldProps {
  teamMembers: TeamMember[];
  advisorHint: string;
}

function EntityAdvisorField(props: AdvisorFieldProps) {
  return (
    <FormField
      label="Primary Advisor"
      hint={props.advisorHint}
      className="md:col-span-2"
    >
      <EntityAdvisorDropdown {...props} />
    </FormField>
  );
}

function EntityAdvisorDropdown(props: AdvisorFieldProps) {
  return (
    <Dropdown
      options={buildAdvisorOptions(props.teamMembers)}
      value={props.form.primaryAdvisorId}
      searchable
      onChange={(value) =>
        props.onChange({
          ...props.form,
          primaryAdvisorId: firstDropdownValue(value),
        })}
    />
  );
}

function EntityRegulatoryField({ form, onChange }: CountryFieldProps) {
  return (
    <div className="md:col-span-2">
      <Checkbox
        label="Subject to BACEN Regulatory Clearance"
        checked={form.regulatoryClearanceRequired}
        onChange={(event) =>
          onChange({
            ...form,
            regulatoryClearanceRequired: event.target.checked,
          })}
      />
    </div>
  );
}
