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
        <h3 className="text-lg font-medium text-white mb-1">Compliance Action Required</h3>
        <p className="text-sm text-white/90">Pending KYB document validation</p>
      </div>
    ),
  },
};

export const RaisedCard: Story = {
  args: {
    variant: "raised",
    padding: "sm",
    children: <div>Raised small card</div>,
  },
};

export const DefaultCard: Story = {
  render: () => <Card>Default Card</Card>,
};

export const WithoutProps: Story = {
  args: {
    children: "No Props Passed",
  }
};

export const DarkCard: Story = {
  args: {
    variant: "dark",
    padding: "none",
    children: <div>Dark no padding</div>,
  },
};

export const PortraitCard: Story = {
  args: {
    variant: "portrait",
    padding: "lg",
    children: <div>Portrait lg</div>,
  },
};
