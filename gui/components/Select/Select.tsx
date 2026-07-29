"use client";

import {
  forwardRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

import { classNames } from "../internal/classNames";
import { InternalIcon } from "../internal/icons";

import styles from "./Select.module.css";

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "readOnly"> {
  placeholder?: string;
  children: ReactNode;
  readOnly?: boolean;
}

/**
 * Selects one value with native semantics and a non-editable read-only mode.
 *
 * @example <Select aria-label="Stage"><option>Review</option></Select>
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      children,
      className,
      onKeyDown,
      onMouseDown,
      placeholder,
      readOnly = false,
      ...props
    },
    ref,
  ) {
    const invalid = props["aria-invalid"] === true;
    const preventReadOnlyPointer = (event: MouseEvent<HTMLSelectElement>) => {
      if (readOnly) event.preventDefault();
      onMouseDown?.(event);
    };
    const preventReadOnlyKeys = (event: KeyboardEvent<HTMLSelectElement>) => {
      if (readOnly && changesSelection(event.key)) event.preventDefault();
      onKeyDown?.(event);
    };
    return (
      <span
        className={classNames(
          styles.shell,
          invalid && styles.invalid,
          props.disabled && styles.disabled,
          readOnly && styles.readOnly,
          className,
        )}
      >
        <select
          ref={ref}
          aria-readonly={readOnly || undefined}
          className={styles.select}
          onKeyDown={preventReadOnlyKeys}
          onMouseDown={preventReadOnlyPointer}
          {...props}
        >
          {placeholder
            ? <option value="" disabled>{placeholder}</option>
            : null}
          {children}
        </select>
        <InternalIcon name="chevron-down" className={styles.icon} />
      </span>
    );
  },
);

function changesSelection(key: string): boolean {
  return ["ArrowDown", "ArrowUp", "End", "Enter", "Home", " "].includes(key);
}
