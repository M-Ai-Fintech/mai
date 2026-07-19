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
    const body = canvasElement.ownerDocument.body;
    const dialog = await within(body).findByRole("dialog");
    await expect(dialog).toBeInTheDocument();
    
    // Check if close button works
    const closeBtn = await within(dialog).findByRole("button", { name: /Close modal/i });
    await userEvent.click(closeBtn);
    await expect(args.onClose).toHaveBeenCalled();

    // Check Escape key
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledTimes(2);

    // To hit unmount coverage we might need a story that doesn't render it open, but we'll try this first.
  },
};

export const ClosedModal: Story = {
  args: {
    isOpen: false,
    title: "Closed Modal",
    children: "This shouldn't be visible.",
  },
  play: async ({ canvasElement }) => {
    const body = canvasElement.ownerDocument.body;
    const dialog = body.querySelector('[role="dialog"]');
    await expect(dialog).toBeNull();
  },
};
