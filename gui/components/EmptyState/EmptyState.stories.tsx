import type { Meta, StoryObj } from "@storybook/react";
import { EmptyState } from "./EmptyState";

const meta: Meta<typeof EmptyState> = {
  title: "Components/Feedback/EmptyState",
  component: EmptyState,
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    title: "No Transactions Found",
    description:
      "There are no deals registered in this pipeline phase or with the selected filters.",
    actionLabel: "+ Create M&A Transaction",
    onAction: () => alert("Create Deal"),
  },
};
