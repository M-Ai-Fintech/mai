"use client";
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { classNames } from "../internal/classNames";
import styles from "./TextField.module.css";
export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: ReactNode;
  trailingAction?: ReactNode;
}
/** Provides a native input with optional decorative affordances. @example <TextField aria-label="Company name" /> */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    { className, leadingIcon, readOnly, trailingAction, ...props },
    ref,
  ) {
    const invalid = props["aria-invalid"] === true;
    return (
      <span
        className={classNames(
          styles.shell,
          invalid && styles.invalid,
          readOnly && styles.readOnly,
          className,
        )}
      >
        {leadingIcon ? <span aria-hidden="true">{leadingIcon}</span> : null}
        <input
          ref={ref}
          readOnly={readOnly}
          className={styles.input}
          {...props}
        />
        {trailingAction
          ? <span className={styles.action}>{trailingAction}</span>
          : null}
      </span>
    );
  },
);
