import type { Meta, StoryObj } from "@storybook/react";
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
              <h1 className="text-2xl font-bold text-ink-black">Dashboard Principal</h1>
              <p className="text-slate-gray">
                Este é um mockup do layout responsivo. Redimensione a janela (ou use a aba responsiva do Storybook) para testar o comportamento do menu hambúrguer em telas &lt; 768px.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-40 rounded-xl bg-white border border-dust-taupe/40 shadow-sm p-4">
                    <div className="w-1/2 h-4 bg-charcoal/10 rounded mb-4"></div>
                    <div className="w-full h-2 bg-dust-taupe/20 rounded mb-2"></div>
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
};
