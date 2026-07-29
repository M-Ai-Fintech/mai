"use client";
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";
import { classNames } from "../internal/classNames";
import styles from "./IconButton.module.css";
export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  label: string;
}
/** Renders a target-sized icon-only button with an explicit accessible name. @example <IconButton label="Close"><CloseIcon /></IconButton> */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { children, className, label, type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        className={classNames(styles.button, className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);
