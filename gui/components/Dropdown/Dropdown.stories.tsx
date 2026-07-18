import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { Dropdown } from "./Dropdown";

const meta: Meta<typeof Dropdown> = {
  title: "Components/Forms/Dropdown",
  component: Dropdown,
};

export default meta;
type Story = StoryObj<typeof Dropdown>;

const sampleOptions = [
  { value: "sourcing", label: "Sourcing & KYB", badge: "ATUAL" },
  { value: "dd_financial", label: "Due Diligence Financeira" },
  { value: "dd_legal", label: "Due Diligence Jurídica" },
  { value: "negotiation", label: "Mesa de Negociação" },
  { value: "closing", label: "Closing & SPA Term Sheet" },
];

export const SingleSelect: Story = {
  render: () => {
    const [selected, setSelected] = useState<any>("dd_financial");

    return (
      <div className="max-w-sm p-4">
        <Dropdown
          label="Fase da Transação M&A"
          options={sampleOptions}
          value={selected}
          onChange={(v) => setSelected(v)}
        />
      </div>
    );
  },
};

export const SearchableAndMultiSelect: Story = {
  render: () => {
    const [selected, setSelected] = useState<any>(["sourcing", "dd_legal"]);

    return (
      <div className="max-w-sm p-4">
        <Dropdown
          label="Agentes Ativos na Auditoria"
          options={sampleOptions}
          value={selected}
          onChange={(v) => setSelected(v)}
          searchable
          multiSelect
        />
      </div>
    );
  },
};
