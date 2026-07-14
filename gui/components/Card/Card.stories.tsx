import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "./Card";

const meta: Meta<typeof Card> = {
  title: "Components/Composites/Card",
  component: Card,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "raised", "dark", "orange", "portrait"],
    },
    padding: {
      control: "radio",
      options: ["none", "sm", "md", "lg"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const DefaultHighContrast: Story = {
  args: {
    variant: "default",
    children: (
      <div>
        <h3 className="text-lg font-medium text-ink-black mb-1">Deal TechFin M&A</h3>
        <p className="text-sm text-slate-gray">Valuation: $45M — Status: In Due Diligence</p>
      </div>
    ),
  },
};

export const SignalOrangeCard: Story = {
  args: {
    variant: "orange",
    children: (
      <div>
        <h3 className="text-lg font-medium text-white mb-1">Ação de Compliance Requerida</h3>
        <p className="text-sm text-white/90">Pendência de validação de documentos KYB</p>
      </div>
    ),
  },
};
