import type { Meta, StoryObj } from "@storybook/react";
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
];

export const InteractiveTabs: Story = {
  render: () => {
    const [active, setActive] = useState("all");
    return <Tabs tabs={sampleTabs} activeTab={active} onChange={setActive} />;
  },
};
