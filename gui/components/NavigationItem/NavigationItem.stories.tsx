import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NavigationItem } from "./NavigationItem";
const meta = { title: "Navigation/Item", component: NavigationItem, args: { kind: "link", href: "#reports", children: "Reports" } } satisfies Meta<typeof NavigationItem>;
export default meta; type Story = StoryObj<typeof meta>;
export const Default: Story = {}; export const ActiveWithCount: Story = { args: { active: true, count: 12 } }; export const Restricted: Story = { args: { restricted: true, children: "Restricted reports" } };
