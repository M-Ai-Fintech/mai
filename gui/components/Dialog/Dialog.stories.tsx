import { useRef, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "../Button/Button";
import { Dialog } from "./Dialog";

const meta = {
  title: "Overlay/Dialog",
  component: Dialog,
  args: { open: false, onOpenChange: () => {}, title: "Review evidence", children: "Confirm the selected evidence before continuing." },
} satisfies Meta<typeof Dialog>;
export default meta;
type Story = StoryObj<typeof meta>;

function ControlledDialog({ variant = "standard" }: { variant?: "standard" | "confirmation" | "destructive" }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return <><Button ref={triggerRef} onClick={() => setOpen(true)}>Open dialog</Button><Dialog open={open} onOpenChange={setOpen} returnFocusRef={triggerRef} title="Review evidence" variant={variant} confirmationAction={{ label: "Continue", onConfirm: () => {} }}>Confirm the selected evidence before continuing.</Dialog></>;
}

export const Standard: Story = { render: () => <ControlledDialog /> };
export const Confirmation: Story = { render: () => <ControlledDialog variant="confirmation" /> };
export const DestructiveConfirmation: Story = { render: () => <ControlledDialog variant="destructive" /> };
export const KeyboardDismissal: Story = {
  render: () => <ControlledDialog />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: "Open dialog" });
    await userEvent.click(trigger);
    const dialog = within(document.body).getByRole("dialog");
    await expect(dialog).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(within(document.body).queryByRole("dialog")).toBeNull());
    await expect(trigger).toHaveFocus();
  },
};
