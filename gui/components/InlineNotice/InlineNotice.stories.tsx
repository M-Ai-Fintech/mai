import type { Meta, StoryObj } from "@storybook/nextjs-vite"; import { InlineNotice } from "./InlineNotice";
const meta = { title: "Feedback/InlineNotice", component: InlineNotice, args: { role: "information", title: "Information", children: "Context that can wrap at constrained widths." } } satisfies Meta<typeof InlineNotice>; export default meta; type Story = StoryObj<typeof meta>;
export const Information: Story = {}; export const Critical: Story = { args: { role: "critical", title: "Action required" } }; export const Dismissible: Story = { args: { dismissLabel: "Dismiss notice" } };
