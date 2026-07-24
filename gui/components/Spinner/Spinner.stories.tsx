import type { Meta, StoryObj } from "@storybook/nextjs-vite";
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

export const CreamLarge: Story = {
  args: {
    size: "lg",
    variant: "cream",
    className: "custom-spinner",
  },
};

export const SmallOrange: Story = {
  args: {
    size: "sm",
    variant: "orange",
  },
};

export const FullCoverageSpinner: Story = {
  render: () => (
    <div>
      <Spinner size="sm" />
      <Spinner size="lg" color="white" />
    </div>
  ),
};

export const FullCoverageSpinner2: Story = {
  render: () => <Spinner size={undefined} color={undefined} />,
};
