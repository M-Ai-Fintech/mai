import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Surface } from "./Surface";
const meta = {
  title: "Foundation/Surface",
  component: Surface,
  args: { children: "A semantic content surface." },
} satisfies Meta<typeof Surface>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Lifted: Story = {};
export const Variants: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--mai-space-component-sm)" }}>
      {([
        "canvas",
        "lifted",
        "analytical",
        "inset",
        "restricted",
        "readOnly",
      ] as const).map((tone) => (
        <Surface key={tone} tone={tone}>{tone} surface</Surface>
      ))}
    </div>
  ),
};
