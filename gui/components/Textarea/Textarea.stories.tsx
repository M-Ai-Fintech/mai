import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "./Textarea";

const meta: Meta<typeof Textarea> = {
  title: "Components/Forms/Textarea",
  component: Textarea,
  argTypes: {
    hasError: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: {
    placeholder: "Describe the corporate culture and buyer guidelines...",
    rows: 4,
  },
};
