import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { FoundationStatus } from "./FoundationStatus";

const meta = {
  title: "Foundation/Status",
  component: FoundationStatus,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof FoundationStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NeutralFoundation: Story = {};
