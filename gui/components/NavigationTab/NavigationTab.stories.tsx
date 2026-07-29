import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { NavigationTab } from "./NavigationTab";

const tabs = [
  { id: "summary", label: "Summary", count: 2, panel: "Summary content" },
  {
    id: "analysis",
    label: "Analysis with a long label",
    panel: "Analysis content",
  },
  { id: "restricted", label: "Restricted", panel: "No access", disabled: true },
];

const meta = {
  title: "Navigation/Tab",
  component: NavigationTab,
  args: { tabs },
} satisfies Meta<typeof NavigationTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const KeyboardNavigation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const summary = canvas.getByRole("tab", { name: /Summary/ });
    await userEvent.click(summary);
    await userEvent.keyboard("{ArrowRight}");
    const analysis = canvas.getByRole("tab", { name: /Analysis/ });
    await expect(analysis).toHaveFocus();
    await expect(analysis).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{End}");
    await expect(analysis).toHaveFocus();
    await userEvent.keyboard("{Home}");
    await expect(summary).toHaveFocus();
  },
};
export const Controlled: Story = { args: { selectedId: "analysis" } };
export const Overflow: Story = {
  args: {
    tabs: [
      ...tabs,
      { id: "history", label: "Long historical comparison", panel: "History" },
    ],
  },
};
