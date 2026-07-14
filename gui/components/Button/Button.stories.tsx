import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "Components/Atomic/Button",
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "consent", "satellite", "icon"],
    },
    size: {
      control: "radio",
      options: ["sm", "md", "lg"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const PrimaryInkPill: Story = {
  args: {
    variant: "primary",
    children: "Explorar Deal",
  },
};

export const SecondaryOutlined: Story = {
  args: {
    variant: "secondary",
    children: "Ver Detalhes",
  },
};

export const ConsentSignalOrange: Story = {
  args: {
    variant: "consent",
    children: "Aceitar Termos",
  },
};

export const SatelliteCTA: Story = {
  args: {
    variant: "satellite",
    children: "→",
  },
};
