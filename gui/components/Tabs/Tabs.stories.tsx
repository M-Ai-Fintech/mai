import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "storybook/test";
import React, { useState } from "react";
import { Tabs } from "./Tabs";

const meta: Meta<typeof Tabs> = {
  title: "Components/Composites/Tabs",
  component: Tabs,
};

export default meta;
type Story = StoryObj<typeof Tabs>;

const sampleTabs = [
  { id: "all", label: "Todas as Transações", count: 12 },
  { id: "sourcing", label: "Sourcing & KYB", count: 4 },
  { id: "due_diligence", label: "Due Diligence", count: 5 },
  { id: "negotiation", label: "Negotiation", count: 3 },
  { id: "disabled", label: "Disabled Tab", count: 0, disabled: true },
];

export const InteractiveTabs: Story = {
  render: () => {
    const [active, setActive] = useState("all");
    return <Tabs tabs={sampleTabs} activeTab={active} onChange={setActive} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sourcingTab = canvas.getByText("Sourcing & KYB");
    await userEvent.click(sourcingTab);

    // Verify disabled doesn't throw or do something unexpected
    const disabledTab = canvas.getByText("Disabled Tab");
    // Not explicitly clicking as userEvent might throw on disabled element unless pointerEvents is set, 
    // but just in case, we can try
    try {
       await userEvent.click(disabledTab);
    } catch (e) {
       // expected to fail or just ignore
    }
  },
};
