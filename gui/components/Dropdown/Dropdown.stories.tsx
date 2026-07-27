import type { Meta, StoryObj } from "@storybook/nextjs-vite";
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

async function chooseSingleSelectOptions(
  body: HTMLElement,
  trigger: HTMLElement,
) {
  // Click disabled option
  await userEvent.click(await within(body).findByText("Disabled Option"));
  await userEvent.click(await within(body).findByText("Negotiation Table"));
  // Click empty option
  await userEvent.click(trigger);
  await userEvent.click(await within(body).findByText("Empty Value Option"));
}

async function closeSingleSelectOutside(
  canvasElement: HTMLElement,
  trigger: HTMLElement,
) {
  // Open again to test click outside
  await userEvent.click(trigger);
  await userEvent.click(canvasElement);
}

const initialMultiSelection = ["sourcing", "dd_legal"];

async function chooseSearchableOptions(body: HTMLElement) {
  const option = await within(body).findByText("Financial Due Diligence");
  await userEvent.click(option);
  const input = await within(body).findByPlaceholderText("Search option...");
  await userEvent.type(input, "Negotiation");
  const negotiation = await within(body).findByText("Negotiation Table");
  await userEvent.click(negotiation);
  // Click again to unselect
  await userEvent.click(negotiation);
}

export const SingleSelect: Story = {
  render: () => {
    const [selected, setSelected] = useState("dd_financial");

    return (
      <div className="max-w-sm p-4">
        <Dropdown
          label="M&A Transaction Phase"
          options={sampleOptions}
          value={selected}
          onChange={(value) => {
            if (typeof value === "string") setSelected(value);
          }}
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = await canvas.findByRole("button");
    await userEvent.click(trigger);
    const body = canvasElement.ownerDocument.body;
    await chooseSingleSelectOptions(body, trigger);
    await closeSingleSelectOutside(canvasElement, trigger);
  },
};

export const SearchableAndMultiSelect: Story = {
  render: () => {
    const [selected, setSelected] = useState<string[]>(initialMultiSelection);
    return (
      <div className="max-w-sm p-4">
        <Dropdown
          label="Active Agents in Audit"
          options={sampleOptions}
          value={selected}
          onChange={(value) => {
            if (Array.isArray(value)) setSelected(value);
          }}
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
    await chooseSearchableOptions(body);
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
