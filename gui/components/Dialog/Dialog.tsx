"use client";

import {
  type MutableRefObject,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import { Button } from "../Button/Button";
import { IconButton } from "../IconButton/IconButton";
import { classNames } from "../internal/classNames";
import { containTabFocus, focusInitialElement } from "../internal/focus";
import { useComponentId } from "../internal/ids";
import { InternalIcon } from "../internal/icons";
import styles from "./Dialog.module.css";

export type DialogVariant = "standard" | "confirmation" | "destructive";

export interface DialogConfirmationAction {
  label: string;
  onConfirm: () => void;
  loading?: boolean;
}

export interface DialogProps {
  children: ReactNode;
  description?: ReactNode;
  initialFocusRef?: MutableRefObject<HTMLElement | null>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  returnFocusRef?: MutableRefObject<HTMLElement | null>;
  title: ReactNode;
  variant?: DialogVariant;
  confirmationAction?: DialogConfirmationAction;
  closeOnEscape?: boolean;
  className?: string;
}

/**
 * Renders a controlled native modal with labelled content and reliable focus return.
 *
 * @example <Dialog open={open} onOpenChange={setOpen} title="Delete review">...</Dialog>
 */
export function Dialog({
  children,
  className,
  closeOnEscape = true,
  confirmationAction,
  description,
  initialFocusRef,
  onOpenChange,
  open,
  returnFocusRef,
  title,
  variant = "standard",
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const titleId = useComponentId(undefined, "dialog-title");
  const descriptionId = useComponentId(undefined, "dialog-description");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    wasOpenRef.current = open;
    if (open) openDialog(dialog, previousFocusRef, initialFocusRef);
    else closeDialog(dialog, previousFocusRef, returnFocusRef);
  }, [initialFocusRef, open, returnFocusRef]);

  function requestClose(): void {
    onOpenChange(false);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={classNames(styles.dialog, styles[variant], className)}
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
            <h2 id={titleId} className={styles.title}>{title}</h2>
            {description && <p id={descriptionId} className={styles.description}>{description}</p>}
          </div>
          <IconButton label="Close dialog" onClick={requestClose}>
            <InternalIcon name="close" />
          </IconButton>
        </header>
        <div className={styles.content}>{children}</div>
        {confirmationAction && (
          <footer className={styles.footer}>
            <Button hierarchy="secondary" onClick={requestClose}>Cancel</Button>
            <Button
              hierarchy={variant === "destructive" ? "destructive" : "primary"}
              loading={confirmationAction.loading}
              onClick={confirmationAction.onConfirm}
            >
              {confirmationAction.label}
            </Button>
          </footer>
        )}
      </section>
    </dialog>
  );
}

function openDialog(
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

function closeDialog(
  dialog: HTMLDialogElement,
  previousFocusRef: MutableRefObject<HTMLElement | null>,
  returnFocusRef?: MutableRefObject<HTMLElement | null>,
): void {
  if (!dialog.open) return;
  dialog.close();
  const focusTarget = returnFocusRef?.current ?? previousFocusRef.current;
  focusTarget?.focus();
}
