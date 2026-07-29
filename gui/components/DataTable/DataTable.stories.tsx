import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DataTable } from "./DataTable";
const meta = { title: "Data/Table", component: DataTable, args: { columnCount: 2 } } satisfies Meta<typeof DataTable>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { render: (args) => <DataTable {...args}><thead><tr><th>Company</th><th>Value</th></tr></thead><tbody><tr><td>Northstar</td><td>$1.2m</td></tr></tbody></DataTable> };
export const Loading: Story = { args: { state: "loading" } };
export const Empty: Story = { args: { state: "empty", emptyMessage: "No companies match this filter." } };
export const HorizontalOverflow: Story = { render: (args) => <DataTable {...args} columnCount={4}><thead><tr><th>Company name</th><th>Long financial metric</th><th>Evidence reference</th><th>Review action</th></tr></thead><tbody><tr><td>Northstar Holdings International</td><td>$1,250,000.00</td><td>Annual report, page 141, version 2026.04</td><td>Open review</td></tr></tbody></DataTable> };
