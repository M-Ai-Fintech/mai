import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import React, { useState } from "react";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";

const meta: Meta<typeof Sidebar> = {
  title: "Components/Composites/Navigation",
  component: Sidebar,
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

export const CompleteNavigationSuite: Story = {
  render: () => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
      <div className="h-[600px] w-full border border-dust-taupe/60 rounded-xl overflow-hidden flex bg-canvas-cream relative">
        <Sidebar
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar
            onToggleMobileMenu={() => setIsMobileOpen(true)}
          />
          <main className="p-6 flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              <h1 className="text-2xl font-bold text-ink-black">
                Main Dashboard
              </h1>
              <p className="text-slate-gray">
                This is a mockup of the responsive layout. Resize the window (or
                use the Storybook responsive tab) to test the hamburger menu
                behavior on viewports &lt; 768px.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-40 rounded-xl bg-white border border-dust-taupe/40 shadow-sm p-4"
                  >
                    <div className="w-1/2 h-4 bg-charcoal/10 rounded mb-4">
                    </div>
                    <div className="w-full h-2 bg-dust-taupe/20 rounded mb-2">
                    </div>
                    <div className="w-3/4 h-2 bg-dust-taupe/20 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    // TopBar interactions
    const topBarSelect = canvasElement.querySelector(
      'select[aria-label="Select POV"]',
    ) as HTMLSelectElement;
    if (topBarSelect) {
      await userEvent.selectOptions(topBarSelect, "Institution");
    }

    // Sidebar interactions
    // Open Mobile Menu to trigger toggle
    const mobileMenuBtn = canvasElement.querySelector(
      'button[aria-label="Open mobile menu"]',
    ) as HTMLButtonElement;
    if (mobileMenuBtn) {
      await userEvent.click(mobileMenuBtn);
    }

    // Click a rendered navigation item to exercise link interaction.
    const dealsLink = within(canvasElement).getByRole("link", {
      name: "Deals",
    });
    await userEvent.click(dealsLink);
  },
};

export const FullCoverageSidebar: StoryObj<typeof Sidebar> = {
  render: () => <Sidebar isCollapsed={true} isMobileOpen={false} />,
};

export const FullCoverageTopBar: StoryObj<typeof TopBar> = {
  render: () => (
    <TopBar currentPov={undefined} breadcrumbs={[{ label: "NoHref" }]} />
  ),
};

export const FullCoverageSidebar2: StoryObj<typeof Sidebar> = {
  render: () => <Sidebar isCollapsed={false} isMobileOpen={true} />,
};
