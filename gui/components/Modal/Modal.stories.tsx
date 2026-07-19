import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { Modal } from "./Modal";
import { Button } from "../Button/Button";

const meta: Meta<typeof Modal> = {
  title: "Components/Composites/Modal",
  component: Modal,
  args: {
    onClose: fn(),
  },
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
        <Button variant="secondary" size="sm">Cancel</Button>
        <Button variant="primary" size="sm">Submeter Proposta</Button>
      </>
    ),
  },
  play: async ({ canvasElement, args }) => {
    // The Modal uses a React Portal or is rendered at the root usually,
    // but in Storybook it's sometimes bound to the canvasElement root.
    // For a11y & existence checks, we query the document body to find the dialog.
    const body = canvasElement.ownerDocument.body;
    const dialog = await within(body).findByRole("dialog");
    await expect(dialog).toBeInTheDocument();
    
    // Check if close button works
    const closeBtn = await within(dialog).findByRole("button", { name: /✕/ });
    await userEvent.click(closeBtn);
    await expect(args.onClose).toHaveBeenCalled();
  },
};
