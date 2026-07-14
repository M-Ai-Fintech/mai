import type { Meta, StoryObj } from "@storybook/react";
import { Spinner } from "./Spinner";

const meta: Meta<typeof Spinner> = {
  title: "Components/Atomic/Spinner",
  component: Spinner,
  argTypes: {
    size: {
      control: "radio",
      options: ["sm", "md", "lg"],
    },
    variant: {
      control: "select",
      options: ["orange", "dark", "cream"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const SignalOrange: Story = {
  args: {
    size: "md",
    variant: "orange",
  },
};

export const InkBlack: Story = {
  args: {
    size: "md",
    variant: "dark",
  },
};
