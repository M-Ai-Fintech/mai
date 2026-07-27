import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge } from "./Badge";

const meta: Meta<typeof Badge> = {
  title: "Components/Atomic/Badge",
  component: Badge,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "orange", "dark", "outline"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const DefaultBadge: Story = {
  render: () => <Badge>Default</Badge>,
};

export const WithoutProps: Story = {
  args: {
    children: "No Props Passed",
  },
};

export const Default: Story = {
  args: {
    variant: "default",
    children: "• SOURCING",
  },
};

export const SignalOrange: Story = {
  args: {
    variant: "orange",
    children: "• KYB ALERT",
  },
};

export const DarkBadge: Story = {
  args: {
    variant: "dark",
    children: "• PRIVATE",
  },
};

export const OutlineBadge: Story = {
  args: {
    variant: "outline",
    children: "• PENDING",
  },
};

export const WithIconBadge: Story = {
  args: {
    variant: "default",
    icon: <span>🚀</span>,
    children: "LAUNCH",
  },
};
