import { expect, fn, userEvent, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./Button";
const meta = {
  title: "Action/Button",
  component: Button,
  args: { children: "Save review" },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Primary: Story = {};
export const Hierarchies: Story = {
  render: () => (
    <div>
      {(["primary", "secondary", "tertiary", "destructive"] as const).map((
        hierarchy,
      ) => <Button key={hierarchy} hierarchy={hierarchy}>{hierarchy}</Button>)}
    </div>
  ),
};
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Activates: Story = {
  args: { onClick: fn() },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole("button");
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};
