import type { Meta, StoryObj } from "@storybook/nextjs-vite"; import { NavigationTab } from "./NavigationTab";
const tabs = [{ id: "summary", label: "Summary", count: 2, panel: "Summary content" }, { id: "analysis", label: "Analysis with a long label", panel: "Analysis content" }, { id: "restricted", label: "Restricted", panel: "No access", disabled: true }];
const meta = { title: "Navigation/Tab", component: NavigationTab, args: { tabs } } satisfies Meta<typeof NavigationTab>; export default meta; type Story = StoryObj<typeof meta>;
export const Default: Story = {}; export const Overflow: Story = { args: { tabs: [...tabs, { id: "history", label: "Long historical comparison", panel: "History" }] } };
