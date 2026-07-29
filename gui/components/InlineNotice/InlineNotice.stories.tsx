import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { InlineNotice } from "./InlineNotice";

const meta = {
  title: "Feedback/InlineNotice",
  component: InlineNotice,
  args: {
    role: "information",
    title: "Information",
    children: "Context that can wrap at constrained widths.",
  },
} satisfies Meta<typeof InlineNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Information: Story = {};
export const Roles: Story = {
  render: () => (
    <>
      {([
        "information",
        "success",
        "warning",
        "critical",
        "incomplete",
        "restricted",
      ] as const)
        .map((role) => (
          <InlineNotice key={role} role={role} title={role}>
            Long notice content verifies wrapping without hiding required
            information.
          </InlineNotice>
        ))}
    </>
  ),
};
export const Critical: Story = {
  args: { role: "critical", title: "Action required" },
};
export const Dismissible: Story = {
  args: { dismissLabel: "Dismiss notice" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Dismiss notice" }),
    );
    await expect(canvas.queryByText("Information")).toBeNull();
  },
};
