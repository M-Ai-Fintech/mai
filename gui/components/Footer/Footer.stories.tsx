import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import React, { useState } from "react";
import { Footer } from "./Footer";
import type { CountryCode } from "../CountrySelector/CountrySelector";

const meta: Meta<typeof Footer> = {
  title: "Components/Composites/Footer",
  component: Footer,
};

export default meta;
type Story = StoryObj<typeof Footer>;

export const CompleteFooter: Story = {
  render: () => {
    const [country, setCountry] = useState<CountryCode>("BR");

    return (
      <Footer
        currentCountry={country}
        onCountryChange={(c) => setCountry(c.code)}
      />
    );
  },
};

export const DefaultFooter: Story = {
  args: {},
};
