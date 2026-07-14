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
    placeholder: "Digite o nome da empresa target...",
  },
};

export const SearchPill: Story = {
  args: {
    variant: "pill",
    placeholder: "Buscar transações M&A...",
  },
};

export const WithError: Story = {
  args: {
    variant: "default",
    value: "dados_invalidos",
    hasError: true,
  },
};
