import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Icon, IconName } from "./Icon";

const meta: Meta<typeof Icon> = {
  title: "Components/Atomics/Icon",
  component: Icon,
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg", "xl"],
    },
    color: { control: "color" },
  },
};

export default meta;
type Story = StoryObj<typeof Icon>;

const allIconNames: IconName[] = [
  "search",
  "filter",
  "chevronDown",
  "chevronRight",
  "chevronUp",
  "check",
  "close",
  "alert",
  "info",
  "user",
  "settings",
  "lock",
  "fileText",
  "arrowRight",
  "globe",
  "flagBR",
  "flagES",
  "flagUS",
];

export const Default: Story = {
  args: {
    name: "search",
    size: "md",
    color: "#141413",
  },
};

export const AllIconsGrid: Story = {
  render: () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 p-4">
      {allIconNames.map((name) => (
        <div
          key={name}
          className="flex flex-col items-center justify-center p-4 border border-dust-taupe/40 rounded-xl bg-white shadow-sm hover:border-signal-orange transition-all"
        >
          <Icon name={name} size="lg" className="mb-2 text-ink-black" />
          <span className="text-xs font-mono text-slate-gray">{name}</span>
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6 p-4 border border-dust-taupe/40 rounded-xl bg-white">
      <div className="flex flex-col items-center gap-1">
        <Icon name="search" size="sm" />
        <span className="text-xs text-slate-gray">sm (16px)</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Icon name="search" size="md" />
        <span className="text-xs text-slate-gray">md (20px)</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Icon name="search" size="lg" />
        <span className="text-xs text-slate-gray">lg (24px)</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Icon name="search" size="xl" />
        <span className="text-xs text-slate-gray">xl (32px)</span>
      </div>
    </div>
  ),
};

export const CustomSizeAndUnknown: Story = {
  render: () => (
    <div className="flex gap-4 p-4">
      <Icon name="search" size={48} />
      <Icon name={"unknown" as any} size={"unknown" as any} />
    </div>
  ),
};

export const FullCoverageIcon: Story = {
  args: { name: "search", className: "extra", color: "red" }
};
