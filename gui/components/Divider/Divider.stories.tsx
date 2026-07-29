import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Divider } from "./Divider";
const meta = { title: "Foundation/Divider", component: Divider } satisfies Meta<
  typeof Divider
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Decorative: Story = {};
export const StrongVertical: Story = {
  args: { orientation: "vertical", emphasis: "strong" },
  decorators: [
    (Story) => (
      <div style={{ height: "var(--mai-size-control-large)" }}>
        <Story />
      </div>
    ),
  ],
};
