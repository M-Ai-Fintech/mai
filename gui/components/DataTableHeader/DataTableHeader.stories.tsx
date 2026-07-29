import { fn } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { DataTableHeader } from "./DataTableHeader";
const meta = { title: "Data/TableHeader", component: DataTableHeader, args: { children: "Company" } } satisfies Meta<typeof DataTableHeader>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { render: (args) => <table><thead><tr><DataTableHeader {...args} /></tr></thead></table> };
export const Sorted: Story = { args: { sortDirection: "ascending", onSort: fn() }, render: (args) => <table><thead><tr><DataTableHeader {...args} /></tr></thead></table>, play: async ({ args, canvasElement }) => { const canvas = within(canvasElement); const button = canvas.getByRole("button", { name: "Company" }); await userEvent.click(button); await expect(args.onSort).toHaveBeenCalledTimes(1); } };
