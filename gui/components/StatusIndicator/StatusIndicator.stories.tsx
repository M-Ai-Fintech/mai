import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StatusIndicator } from "./StatusIndicator";
const meta = {
  title: "Status/Indicator",
  component: StatusIndicator,
  args: { role: "information", children: "Information" },
} satisfies Meta<typeof StatusIndicator>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Information: Story = {};
export const Roles: Story = {
  render: () => (
    <div>
      {([
        "neutral",
        "information",
        "success",
        "warning",
        "critical",
        "incomplete",
        "restricted",
        "stale",
        "superseded",
      ] as const).map((role) => (
        <StatusIndicator key={role} role={role}>
          {role} status with long explanatory text
        </StatusIndicator>
      ))}
    </div>
  ),
};
export const Compact: Story = { args: { size: "compact" } };
