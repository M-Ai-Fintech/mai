import type { Meta, StoryObj } from "@storybook/react";
import { Radio } from "./Radio";

const meta: Meta<typeof Radio> = {
  title: "Components/Forms/Radio",
  component: Radio,
};

export default meta;
type Story = StoryObj<typeof Radio>;

export const Default: Story = {
  args: {
    label: "Pagamento 100% à Vista (Cash upfront)",
    name: "payment_structure",
    checked: true,
  },
};
