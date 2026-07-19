import type { Meta, StoryObj } from "@storybook/react";
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
    title: "Análise de Risco Financeiro (Altman Z-Score)",
    subtitle: "Motor Preditivo ONNX / WASM local",
    badge: "CONCLUÍDO",
    content: (
      <p>
        Probabilidade de Distress em 0.04 (Solvente). Z-Score atual em 3.45 indicando excelente saúde de caixa e liquidez corrente.
      </p>
    ),
  },
  {
    id: "2",
    title: "Auditoria Contratual & Cláusulas de Change of Control",
    subtitle: "Motor RAG Siloed VDR / LegalDD",
    badge: "EM ANÁLISE",
    content: (
      <p>
        Localizadas 3 cláusulas restritivas nos contratos de dívida sênior que exigem notificação prévia de 30 dias antes do closing.
      </p>
    ),
  },
  {
    id: "3",
    title: "Valuation & Otimização Genética de Term Sheet",
    subtitle: "Optimization Engine (GA + Constraints)",
    content: (
      <p>
        Geradas 3 opções de estrutura financeira: 1. 100% Cash; 2. 70% Cash + 30% Earn-out; 3. Equity Swap com trava de arbitragem.
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
    const { within, userEvent } = await import("@storybook/test");
    const canvas = within(canvasElement);
    // Click un-opened item to open
    const target = canvas.getByText("Valuation & Otimização Genética de Term Sheet");
    await userEvent.click(target);
  }
};

export const DefaultPropsAccordion: Story = {
  args: {
    items: sampleItems,
  }
};

export const BorderedAccordion: Story = {
  render: () => (
    <div className="max-w-xl p-4">
      <Accordion items={sampleItems} defaultOpenIds={["1"]} variant="bordered" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const { within, userEvent, expect } = await import("@storybook/test");
    const canvas = within(canvasElement);
    const buttons = await canvas.findAllByRole("button");
    await userEvent.click(buttons[0]);
    await userEvent.click(buttons[1]);
    await userEvent.click(buttons[1]);
  }
};

export const MultiExpandAccordion: Story = {
  render: () => (
    <div className="max-w-xl p-4">
      <Accordion items={sampleItems} allowMultiple defaultOpenIds={["1", "2"]} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const { within, userEvent, expect } = await import("@storybook/test");
    const canvas = within(canvasElement);
    const buttons = await canvas.findAllByRole("button");
    // Click third accordion to open it
    await userEvent.click(buttons[2]);
    // Click second accordion to close it
    await userEvent.click(buttons[1]);
  }
};
