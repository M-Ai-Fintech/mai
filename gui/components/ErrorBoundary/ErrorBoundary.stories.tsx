import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { Button } from "../Button/Button";

const meta: Meta<typeof ErrorBoundary> = {
  title: "Components/Feedback/ErrorBoundary",
  component: ErrorBoundary,
};

export default meta;
type Story = StoryObj<typeof ErrorBoundary>;

const BuggyComponent = () => {
  throw new Error("Erro simulado: Falha ao conectar ao barramento Pub/Sub da Core API.");
};

export const FallbackPreview: Story = {
  render: () => {
    const [hasBug, setHasBug] = useState(false);

    return (
      <div className="p-8 max-w-xl mx-auto space-y-4">
        <Button variant="secondary" onClick={() => setHasBug(!hasBug)}>
          {hasBug ? "Restaurar Módulo" : "Simular Exceção"}
        </Button>

        <ErrorBoundary onReset={() => setHasBug(false)}>
          {hasBug ? (
            <BuggyComponent />
          ) : (
            <div className="p-6 bg-white border border-dust-taupe/40 rounded-xl text-ink-black text-sm">
              Módulo M&Ai em execução normal sem exceções.
            </div>
          )}
        </ErrorBoundary>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const { within, userEvent } = await import("@storybook/test");
    const canvas = within(canvasElement);
    const button = await canvas.findByRole("button", { name: /Simular Exceção/i });
    await userEvent.click(button);
    
    const details = await canvas.findByText(/Technical Error Details/i);
    await userEvent.click(details);
    
    // Toggle details off
    await userEvent.click(details);
    
    const tryAgain = await canvas.findByRole("button", { name: /Try Again/i });
    await userEvent.click(tryAgain);
  }
};

export const CustomFallback: Story = {
  render: () => {
    return (
      <ErrorBoundary fallback={<div data-testid="custom-error">Custom Error Triggered</div>}>
        <BuggyComponent />
      </ErrorBoundary>
    );
  }
};
