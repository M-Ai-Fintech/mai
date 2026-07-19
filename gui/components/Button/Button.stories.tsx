import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
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

export const PrimaryInkPill: Story = {
  args: {
    variant: "primary",
    children: "Explore Deal",
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: /Explore Deal/i });
    await expect(button).toBeInTheDocument();
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalled();
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
