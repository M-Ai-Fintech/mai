import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { CountrySelector, COUNTRIES } from "./CountrySelector";

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
};

export const LightSurfacePill: Story = {
  render: () => {
    const [selected, setSelected] = useState<any>("ES");

    return (
      <div className="p-8 bg-canvas-cream border border-dust-taupe/40 rounded-xl flex items-center justify-between">
        <span className="text-ink-black text-xs font-medium">
          Selecione o idioma & jurisdição fiduciária do VDR:
        </span>
        <CountrySelector
          selectedCountry={selected}
          onChange={(opt) => setSelected(opt.code)}
          variant="light"
        />
      </div>
    );
  },
};
