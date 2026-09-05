"use client";

import { useRef, useState } from "react";
import { Drawer, IconButton } from "@/components";
import type { ShellNavigationEntry } from "@/lib/shell/route-context";
import { ShellNavigation } from "./ShellNavigation";

export function MobileNavigation({
  entries,
  label,
}: {
  entries: readonly ShellNavigationEntry[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <IconButton
        ref={triggerRef}
        className="xl:hidden"
        label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">☰</span>
      </IconButton>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Navigation"
        description={`${label}. Capability states reflect executable readiness.`}
        returnFocusRef={triggerRef}
      >
        <ShellNavigation entries={entries} label={label} />
      </Drawer>
    </>
  );
}
