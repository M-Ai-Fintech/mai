"use client";

import {
  type MutableRefObject,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import { IconButton } from "../IconButton/IconButton";
import { classNames } from "../internal/classNames";
import { containTabFocus, focusInitialElement } from "../internal/focus";
import { useComponentId } from "../internal/ids";
import { InternalIcon } from "../internal/icons";
import styles from "./Drawer.module.css";

export interface DrawerProps {
  children: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  initialFocusRef?: MutableRefObject<HTMLElement | null>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  returnFocusRef?: MutableRefObject<HTMLElement | null>;
  title: ReactNode;
  closeOnEscape?: boolean;
  context?: ReactNode;
  className?: string;
}

/**
 * Renders a controlled right-side drawer that becomes a full-screen mobile modal.
 *
 * @example <Drawer open={open} onOpenChange={setOpen} title="Evidence">...</Drawer>
 */
export function Drawer({
  children,
  className,
  closeOnEscape = true,
  context,
  description,
  footer,
  initialFocusRef,
  onOpenChange,
  open,
  returnFocusRef,
  title,
}: DrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const titleId = useComponentId(undefined, "drawer-title");
  const descriptionId = useComponentId(undefined, "drawer-description");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    wasOpenRef.current = open;
    if (open) openDrawer(dialog, previousFocusRef, initialFocusRef);
    else closeDrawer(dialog, previousFocusRef, returnFocusRef);
  }, [initialFocusRef, open, returnFocusRef]);

  function requestClose(): void {
    onOpenChange(false);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={classNames(styles.drawer, className)}
      onCancel={(event) => {
        event.preventDefault();
        if (closeOnEscape) requestClose();
      }}
      onClose={() => {
        if (wasOpenRef.current) requestClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          if (closeOnEscape) requestClose();
          return;
        }
        containTabFocus(event.nativeEvent, event.currentTarget);
      }}
      tabIndex={-1}
    >
      <section className={styles.surface}>
        <header className={styles.header}>
          <div>
            {context && <p className={styles.context}>{context}</p>}
            <h2 id={titleId} className={styles.title}>{title}</h2>
            {description && <p id={descriptionId} className={styles.description}>{description}</p>}
          </div>
          <IconButton label="Close drawer" onClick={requestClose}>
            <InternalIcon name="close" />
          </IconButton>
        </header>
        <div className={styles.content}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </section>
    </dialog>
  );
}

function openDrawer(
  dialog: HTMLDialogElement,
  previousFocusRef: MutableRefObject<HTMLElement | null>,
  initialFocusRef?: MutableRefObject<HTMLElement | null>,
): void {
  if (!dialog.open) {
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    dialog.showModal();
  }
  focusInitialElement(dialog, initialFocusRef?.current);
}

function closeDrawer(
  dialog: HTMLDialogElement,
  previousFocusRef: MutableRefObject<HTMLElement | null>,
  returnFocusRef?: MutableRefObject<HTMLElement | null>,
): void {
  if (!dialog.open) return;
  dialog.close();
  const focusTarget = returnFocusRef?.current ?? previousFocusRef.current;
  focusTarget?.focus();
}
