import type { Meta, StoryObj } from "@storybook/nextjs-vite";
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
    "aria-label": "Target company name input",
  },
};

export const SearchPill: Story = {
  args: {
    variant: "pill",
    placeholder: "Search M&A transactions...",
    "aria-label": "Search transactions",
  },
};

export const WithError: Story = {
  args: {
    variant: "default",
    value: "invalid_data",
    hasError: true,
    "aria-label": "Invalid data input",
  },
};

export const WithIcon: Story = {
  args: {
    icon: <span>🔍</span>,
    placeholder: "Search with icon...",
  },
};
