import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "storybook/test";
import React, { useState } from "react";
import { Dropdown } from "./Dropdown";

const meta: Meta<typeof Dropdown> = {
  title: "Components/Forms/Dropdown",
  component: Dropdown,
};

export default meta;
type Story = StoryObj<typeof Dropdown>;

const sampleOptions = [
  { value: "sourcing", label: "Sourcing & KYB", badge: "CURRENT" },
  { value: "dd_financial", label: "Financial Due Diligence" },
  { value: "dd_legal", label: "Legal Due Diligence" },
  { value: "negotiation", label: "Negotiation Table" },
  { value: "closing", label: "Closing & SPA Term Sheet" },
  { value: "disabled_opt", label: "Disabled Option", disabled: true },
  { value: "", label: "Empty Value Option" },
];

export const SingleSelect: Story = {
  render: () => {
    const [selected, setSelected] = useState<any>("dd_financial");

    return (
      <div className="max-w-sm p-4">
        <Dropdown
          label="M&A Transaction Phase"
          options={sampleOptions}
          value={selected}
          onChange={(v) => setSelected(v)}
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = await canvas.findByRole("button");
    await userEvent.click(trigger);

    const body = canvasElement.ownerDocument.body;

    // Click disabled option
    const disabledOption = await within(body).findByText("Disabled Option");
    await userEvent.click(disabledOption);

    const option = await within(body).findByText("Negotiation Table");
    await userEvent.click(option);

    // Click empty option
    await userEvent.click(trigger);
    const emptyOption = await within(body).findByText("Empty Value Option");
    await userEvent.click(emptyOption);

    // Open again to test click outside
    await userEvent.click(trigger);
    await userEvent.click(canvasElement);
  },
};

export const SearchableAndMultiSelect: Story = {
  render: () => {
    const [selected, setSelected] = useState<any>(["sourcing", "dd_legal"]);

    return (
      <div className="max-w-sm p-4">
        <Dropdown
          label="Active Agents in Audit"
          options={sampleOptions}
          value={selected}
          onChange={(v) => setSelected(v)}
          searchable
          multiSelect
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = await canvas.findByRole("button");
    await userEvent.click(trigger);

    const body = canvasElement.ownerDocument.body;
    const option = await within(body).findByText("Financial Due Diligence");
    await userEvent.click(option);

    const input = await within(body).findByPlaceholderText("Search option...");
    await userEvent.type(input, "Negotiation");

    const option2 = await within(body).findByText("Negotiation Table");
    await userEvent.click(option2);

    // Click again to unselect
    await userEvent.click(option2);

    // click trigger to close
    await userEvent.click(trigger);
  },
};

export const DisabledDropdown: Story = {
  args: {
    disabled: true,
    options: sampleOptions,
    value: "sourcing",
  },
};

export const EmptyAndErrorDropdown: Story = {
  args: {
    options: [],
    error: "Required",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = await canvas.findByRole("button");
    await userEvent.click(trigger);
  },
};

export const Uncontrolled: Story = {
  args: {
    label: "No onChange handler",
    options: sampleOptions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = await canvas.findByRole("button");
    await userEvent.click(trigger);

    const body = canvasElement.ownerDocument.body;
    const option = await within(body).findByText("Financial Due Diligence");
    await userEvent.click(option);
  },
};

export const InvalidValueSingle: Story = {
  args: {
    options: sampleOptions,
    value: "not-found",
  },
};

export const InvalidValueMulti: Story = {
  args: {
    options: sampleOptions,
    value: ["sourcing", "not-found"],
    multiSelect: true,
  },
};
