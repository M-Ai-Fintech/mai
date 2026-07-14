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
    label: "Razão Social do Cliente",
    required: true,
    hint: "Conforme registrado na Receita Federal / SERPRO",
    children: <Input placeholder="Ex: TechCorp Capital Ltda" />,
  },
};

export const ValidationError: Story = {
  args: {
    label: "Valuation Alvo (BRL)",
    required: true,
    error: "Valuation deve ser superior a R$ 1.000.000,00",
    children: <Input value="500000" hasError />,
  },
};
