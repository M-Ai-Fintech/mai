import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";

const meta: Meta<typeof Sidebar> = {
  title: "Components/Composites/Navigation",
  component: Sidebar,
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

export const CompleteNavigationSuite: Story = {
  render: () => {
    const [collapsed, setCollapsed] = useState(false);
    return (
      <div className="flex bg-canvas-cream min-h-screen text-left">
        <Sidebar isCollapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
        <div className="flex-1">
          <TopBar breadcrumbs={[{ label: "Workspace" }, { label: "Transações" }]} />
          <div className="p-8 text-ink-black text-sm">
            Área principal de conteúdo do dashboard M&Ai com Sidebar retrátil e TopBar contextual.
          </div>
        </div>
      </div>
    );
  },
};
