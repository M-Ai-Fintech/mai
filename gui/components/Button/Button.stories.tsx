import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
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
  args: {
    onClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: "primary",
    size: "md",
    children: "Primary Button",
  },
};

export const WithoutProps: Story = {
  args: {
    children: "No Props Passed",
  }
};

export const PrimaryInkPill: Story = {
  args: {
    variant: "primary",
    children: "Explore Deal",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: /Explore Deal/i });
    await expect(button).toBeInTheDocument();
    await userEvent.click(button);
  },
};

export const SecondaryOutlined: Story = {
  args: {
    variant: "secondary",
    children: "View Details",
  },
};

export const ConsentSignalOrange: Story = {
  args: {
    variant: "consent",
    children: "Accept Terms",
  },
};

export const SatelliteCTA: Story = {
  args: {
    variant: "satellite",
    children: "→",
  },
};

export const IconButton: Story = {
  args: {
    variant: "icon",
    icon: <span>🔍</span>,
  },
};

export const ButtonWithIconAndText: Story = {
  args: {
    variant: "primary",
    icon: <span>⚙️</span>,
    children: "Settings",
  },
};
