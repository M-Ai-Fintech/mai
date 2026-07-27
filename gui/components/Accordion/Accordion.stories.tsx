import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import React from "react";
import { Accordion } from "./Accordion";

const meta: Meta<typeof Accordion> = {
  title: "Components/Composites/Accordion",
  component: Accordion,
};

export default meta;
type Story = StoryObj<typeof Accordion>;

const sampleItems = [
  {
    id: "1",
    title: "Financial Risk Analysis (Altman Z-Score)",
    subtitle: "Local ONNX / WASM Predictive Engine",
    badge: "COMPLETED",
    content: (
      <p>
        Distress Probability at 0.04 (Solvent). Current Z-Score at 3.45
        indicating excellent cash health and current liquidity.
      </p>
    ),
  },
  {
    id: "2",
    title: "Contractual Audit & Change of Control Clauses",
    subtitle: "Siloed VDR / LegalDD RAG Engine",
    badge: "UNDER ANALYSIS",
    content: (
      <p>
        Located 3 restrictive clauses in senior debt contracts that require 30
        days prior notification before closing.
      </p>
    ),
  },
  {
    id: "3",
    title: "Valuation & Genetic Optimization of Term Sheet",
    subtitle: "Optimization Engine (GA + Constraints)",
    content: (
      <p>
        Generated 3 financial structure options: 1. 100% Cash; 2. 70% Cash + 30%
        Earn-out; 3. Equity Swap with arbitrage lock.
      </p>
    ),
  },
];

export const PlainAccordion: Story = {
  args: {
    variant: "plain",
    items: sampleItems,
    defaultOpenIds: ["1"],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Click un-opened item to open
    const target = canvas.getByText(
      "Valuation & Genetic Optimization of Term Sheet",
    );
    await userEvent.click(target);
  },
};

export const DefaultPropsAccordion: Story = {
  args: {
    items: sampleItems,
  },
};

export const BorderedAccordion: Story = {
  render: () => (
    <div className="max-w-xl p-4">
      <Accordion
        items={sampleItems}
        defaultOpenIds={["1"]}
        variant="bordered"
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const buttons = await canvas.findAllByRole("button");
    await userEvent.click(buttons[0]);
    await userEvent.click(buttons[1]);
    await userEvent.click(buttons[1]);
  },
};

export const MultiExpandAccordion: Story = {
  render: () => (
    <div className="max-w-xl p-4">
      <Accordion
        items={sampleItems}
        allowMultiple
        defaultOpenIds={["1", "2"]}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const buttons = await canvas.findAllByRole("button");
    // Click third accordion to open it
    await userEvent.click(buttons[2]);
    // Click second accordion to close it
    await userEvent.click(buttons[1]);
  },
};
