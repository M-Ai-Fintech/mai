import type { Meta, StoryObj } from "@storybook/nextjs-vite";
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

export const RequiredField: Story = {
  args: {
    label: "Company Name",
    required: true,
    children: (
      <input
        type="text"
        className="w-full text-sm p-3 rounded-xl bg-white border border-dust-taupe/40 focus:outline-none focus:border-ink-black focus:ring-1 focus:ring-ink-black transition-all"
        placeholder="Enter company name"
      />
    ),
  },
};

export const NonElementChildren: Story = {
  args: {
    label: "Plain Text Field",
    children: "This is just text, not a React element",
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

export const DefaultFormField: Story = {
  args: {
    children: <Input placeholder="No label or props" />,
  },
};
