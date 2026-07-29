import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRef, useState } from "react";

import { Button } from "../Button/Button";
import { DataTable } from "../DataTable/DataTable";
import { DataTableCell } from "../DataTableCell/DataTableCell";
import { DataTableHeader } from "../DataTableHeader/DataTableHeader";
import { DataTableRow } from "../DataTableRow/DataTableRow";
import { Dialog } from "../Dialog/Dialog";
import { Drawer } from "../Drawer/Drawer";
import { EvidenceProvenanceLabel } from "../EvidenceProvenanceLabel/EvidenceProvenanceLabel";
import { EvidenceReference } from "../EvidenceReference/EvidenceReference";
import { FieldWrapper } from "../FieldWrapper/FieldWrapper";
import { FinancialDelta } from "../FinancialDelta/FinancialDelta";
import { FinancialValue } from "../FinancialValue/FinancialValue";
import { InlineNotice } from "../InlineNotice/InlineNotice";
import { Select } from "../Select/Select";
import { TextField } from "../TextField/TextField";

const meta = {
  title: "Compositions/Component interoperability",
  parameters: { layout: "centered" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const FieldWrapperWithTextField: Story = {
  render: () => (
    <FieldWrapper
      label="Company name"
      error="Enter the registered legal name."
      required
    >
      {(fieldAttributes) => <TextField {...fieldAttributes} />}
    </FieldWrapper>
  ),
};

export const FieldWrapperWithSelect: Story = {
  render: () => (
    <FieldWrapper label="Review stage" helperText="Choose the current stage.">
      {(fieldAttributes) => (
        <Select {...fieldAttributes} defaultValue="">
          <option value="" disabled>Select a stage</option>
          <option value="review">Review</option>
        </Select>
      )}
    </FieldWrapper>
  ),
};

export const NoticeWithButton: Story = {
  render: () => (
    <InlineNotice role="warning" title="Evidence review required">
      Review the incomplete source before continuing.{" "}
      <Button>Review evidence</Button>
    </InlineNotice>
  ),
};

export const FinancialValueWithDelta: Story = {
  render: () => (
    <div>
      <FinancialValue format="currency" value={0} />
      <FinancialDelta direction="positive" interpretation="Increase">
        +4.2%
      </FinancialDelta>
    </div>
  ),
};

export const EvidenceWithProvenance: Story = {
  render: () => (
    <div>
      <EvidenceReference
        availability="current"
        metadata={{
          source: "Annual report",
          location: "Page 12",
          documentVersion: "2026.1",
          freshness: "Current",
        }}
      />
      <EvidenceProvenanceLabel use="finding">
        Extracted from source
      </EvidenceProvenanceLabel>
    </div>
  ),
};

export const ComposedDataTable: Story = {
  render: () => (
    <DataTable columnCount={2}>
      <thead>
        <DataTableRow>
          <DataTableHeader>Company</DataTableHeader>
          <DataTableHeader>Value</DataTableHeader>
        </DataTableRow>
      </thead>
      <tbody>
        <DataTableRow>
          <DataTableCell>Northstar</DataTableCell>
          <DataTableCell kind="financial">
            <FinancialValue
              format="currency"
              presentation="table"
              value={1250000}
            />
          </DataTableCell>
        </DataTableRow>
      </tbody>
    </DataTable>
  ),
};

export const DialogWithButton: Story = { render: () => <DialogComposition /> };
export const DrawerWithButton: Story = { render: () => <DrawerComposition /> };

function DialogComposition() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button ref={triggerRef} onClick={() => setOpen(true)}>
        Open dialog
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        returnFocusRef={triggerRef}
        title="Review evidence"
      >
        Dialog and Button interoperability.
      </Dialog>
    </>
  );
}

function DrawerComposition() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button ref={triggerRef} onClick={() => setOpen(true)}>
        Open drawer
      </Button>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        returnFocusRef={triggerRef}
        title="Evidence details"
      >
        Drawer and Button interoperability.
      </Drawer>
    </>
  );
}
