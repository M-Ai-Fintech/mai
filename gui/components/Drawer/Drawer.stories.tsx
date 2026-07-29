import { useRef, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "../Button/Button";
import { Drawer } from "./Drawer";

const meta = {
  title: "Overlay/Drawer",
  component: Drawer,
  args: { open: false, onOpenChange: () => {}, title: "Evidence details", children: "Source and provenance details remain contained in this independent scroll region." },
} satisfies Meta<typeof Drawer>;
export default meta;
type Story = StoryObj<typeof meta>;

function ControlledDrawer() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return <><Button ref={triggerRef} onClick={() => setOpen(true)}>Open drawer</Button><Drawer open={open} onOpenChange={setOpen} returnFocusRef={triggerRef} context="Review context" title="Evidence details" footer={<Button onClick={() => setOpen(false)}>Done</Button>}>Source and provenance details remain contained in this independent scroll region.</Drawer></>;
}

export const RightDesktop: Story = { render: () => <ControlledDrawer /> };
export const RightTablet: Story = { render: () => <ControlledDrawer />, parameters: { viewport: { defaultViewport: "tablet" } } };
export const FullScreenMobile: Story = { render: () => <ControlledDrawer />, parameters: { viewport: { defaultViewport: "mobile1" } } };
export const KeyboardDismissal: Story = {
  render: () => <ControlledDrawer />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: "Open drawer" });
    await userEvent.click(trigger);
    const drawer = within(document.body).getByRole("dialog");
    await expect(drawer).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(within(document.body).queryByRole("dialog")).toBeNull());
    await expect(trigger).toHaveFocus();
  },
};
