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
};
