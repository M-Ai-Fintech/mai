import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Divider } from "./Divider";

const meta: Meta<typeof Divider> = {
  title: "Components/Atomic/Divider",
  component: Divider,
  argTypes: {
    variant: {
      control: "radio",
      options: ["solid", "dashed"],
    },
    spacing: {
      control: "radio",
      options: ["sm", "md", "lg"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Divider>;

export const Solid: Story = {
  args: {
    variant: "solid",
    spacing: "md",
  },
};

export const Dashed: Story = {
  args: {
    variant: "dashed",
    spacing: "md",
  },
};

export const DefaultDivider: Story = {
  args: {},
};
