"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { classNames } from "../internal/classNames";
import { InternalIcon } from "../internal/icons";
import styles from "./Button.module.css";

export type ButtonHierarchy = "primary" | "secondary" | "tertiary" | "destructive";
export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> { hierarchy?: ButtonHierarchy; loading?: boolean; leadingIcon?: ReactNode; trailingIcon?: ReactNode; disabled?: boolean; }

/**
 * Performs a named action with native button semantics and duplicate-activation protection.
 *
 * @example <Button loading>Save review</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ children, className, disabled = false, hierarchy = "primary", leadingIcon, loading = false, onClick, trailingIcon, type = "button", ...props }, ref) {
  const unavailable = disabled || loading;
  return <button ref={ref} type={type} className={classNames(styles.button, styles[hierarchy], className)} disabled={unavailable} aria-busy={loading || undefined} onClick={unavailable ? undefined : onClick} {...props}>
    {loading ? <InternalIcon name="spinner" className={styles.spinner} /> : leadingIcon}
    <span>{children}</span>{!loading && trailingIcon}
  </button>;
});
