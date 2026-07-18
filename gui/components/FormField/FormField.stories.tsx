import type { Meta, StoryObj } from "@storybook/react";
import { FormField } from "./FormField";
import { Input } from "../Input/Input";

const meta: Meta<typeof FormField> = {
  title: "Components/Forms/FormField",
  component: FormField,
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const Standard: Story = {
  args: {
    label: "Client Legal Name",
    required: true,
    hint: "As registered with the IRS / Tax Authority",
    children: <Input placeholder="Ex: TechCorp Capital LLC" />,
  },
};

export const ValidationError: Story = {
  args: {
    label: "Target Valuation (USD)",
    required: true,
    error: "Valuation must be greater than $1,000,000.00",
    children: <Input value="500000" hasError />,
  },
};
