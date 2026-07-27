import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Skeleton } from "./Skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "Components/Feedback/Skeleton",
  component: Skeleton,
  argTypes: {
    variant: {
      control: "radio",
      options: ["text", "circular", "rectangular"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const CardPlaceholder: Story = {
  render: () => (
    <div className="p-6 border border-dust-taupe/60 rounded-lg bg-white space-y-4 max-w-sm">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={44} height={44} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="50%" />
        </div>
      </div>
      <Skeleton variant="rectangular" height={100} />
    </div>
  ),
};

export const FullPropsCoverage: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Skeleton className="custom-class" style={{ color: "red" }} />
    </div>
  ),
};
