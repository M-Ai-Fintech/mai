import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./Input";

const meta: Meta<typeof Input> = {
  title: "Components/Forms/Input",
  component: Input,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "pill"],
    },
    hasError: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const DefaultInput: Story = {
  args: {
    variant: "default",
    placeholder: "Enter target company name...",
  },
};

export const SearchPill: Story = {
  args: {
    variant: "pill",
    placeholder: "Search M&A transactions...",
  },
};

export const WithError: Story = {
  args: {
    variant: "default",
    value: "invalid_data",
    hasError: true,
  },
};
