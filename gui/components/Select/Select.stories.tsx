import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Select } from "./Select";
const meta = {
  title: "Form/Select",
  component: Select,
  args: {
    "aria-label": "Review stage",
    children: (
      <>
        <option value="">Choose stage</option>
        <option>Review</option>
        <option>Approved</option>
      </>
    ),
  },
} satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Selected: Story = { args: { defaultValue: "Review" } };
export const Error: Story = { args: { "aria-invalid": true } };
export const Disabled: Story = { args: { disabled: true } };
export const ReadOnly: Story = { args: { readOnly: true } };
