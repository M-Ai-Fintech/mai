import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { Footer } from "./Footer";

const meta: Meta<typeof Footer> = {
  title: "Components/Composites/Footer",
  component: Footer,
};

export default meta;
type Story = StoryObj<typeof Footer>;

export const CompleteFooter: Story = {
  render: () => {
    const [country, setCountry] = useState<any>("BR");

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
