import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "storybook/test";
import React, { useState } from "react";
import { COUNTRIES, CountrySelector } from "./CountrySelector";

const meta: Meta<typeof CountrySelector> = {
  title: "Components/Forms/CountrySelector",
  component: CountrySelector,
  argTypes: {
    variant: {
      control: "radio",
      options: ["dark", "light"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof CountrySelector>;

export const DarkFooterPill: Story = {
  render: () => {
    const [selected, setSelected] = useState<any>("BR");

    return (
      <div className="p-8 bg-ink-black rounded-xl flex items-center justify-between">
        <span className="text-canvas-cream text-xs font-medium">
          M&Ai Fintech © 2026 — Todos os direitos reservados.
        </span>
        <CountrySelector
          selectedCountry={selected}
          onChange={(opt) => setSelected(opt.code)}
          variant="dark"
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: /Current country is/i });

    // Open dropdown
    await userEvent.click(button);

    // Select US
    const usOption = await canvas.findByText("United States");
    await userEvent.click(usOption);

    // Open dropdown again
    await userEvent.click(button);

    // Click outside to close
    await userEvent.click(canvasElement);
  },
};

export const LightSurfacePill: Story = {
  render: () => {
    const [selected, setSelected] = useState<any>("ES");

    return (
      <div className="p-8 bg-canvas-cream border border-dust-taupe/40 rounded-xl flex items-center justify-between">
        <p className="text-sm font-bold text-ink-black mb-3">
          Select the language & fiduciary jurisdiction of the VDR:
        </p>
        <CountrySelector
          selectedCountry={selected}
          onChange={(opt) => setSelected(opt.code)}
          variant="light"
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: /Current country is/i });

    // Open dropdown
    await userEvent.click(button);

    // Select Brasil
    const brOption = await canvas.findByText("Brasil");
    await userEvent.click(brOption);
  },
};

export const InvalidCountry: Story = {
  render: () => {
    return (
      <CountrySelector
        selectedCountry={"XYZ" as any}
      />
    );
  },
};
