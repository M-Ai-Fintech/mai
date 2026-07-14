import type { Meta, StoryObj } from "@storybook/react";
import { Modal } from "./Modal";
import { Button } from "../Button/Button";

const meta: Meta<typeof Modal> = {
  title: "Components/Composites/Modal",
  component: Modal,
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Default: Story = {
  args: {
    isOpen: true,
    title: "Confirmar Proposta Financeira",
    subtitle: "Deal TC-2026 — Acquisition Target",
    children: (
      <p>
        Deseja submeter a proposta otimizada pelo algoritmo genético contendo R$ 15.000.000,00 em Cash e 20% em Equity ao NegotiationAgent?
      </p>
    ),
    footer: (
      <>
        <Button variant="secondary" size="sm">Cancelar</Button>
        <Button variant="primary" size="sm">Submeter Proposta</Button>
      </>
    ),
  },
};
