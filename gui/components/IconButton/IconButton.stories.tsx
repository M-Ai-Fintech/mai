import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { InternalIcon } from "../internal/icons";
import { IconButton } from "./IconButton";
const meta = {
  title: "Action/IconButton",
  component: IconButton,
  args: { label: "Close dialog", children: <InternalIcon name="close" /> },
} satisfies Meta<typeof IconButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
