import { forwardRef, type HTMLAttributes } from "react";
import { classNames } from "../internal/classNames";
import styles from "./DataTableRow.module.css";

export type DataTableRowState =
  | "default"
  | "selected"
  | "unavailable"
  | "loading";
export interface DataTableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  state?: DataTableRowState;
  unavailableMessage?: string;
}

/**
 * Provides semantic row state while retaining the native `tr` composition boundary.
 *
 * @example <DataTableRow state="selected"><DataTableCell>Northstar</DataTableCell></DataTableRow>
 */
export const DataTableRow = forwardRef<HTMLTableRowElement, DataTableRowProps>(
  function DataTableRow(
    {
      children,
      className,
      state = "default",
      unavailableMessage = "Unavailable",
      ...props
    },
    ref,
  ) {
    const availability = state === "unavailable" ? unavailableMessage : undefined;
    return (
      <tr
        ref={ref}
        className={classNames(styles.row, styles[state], className)}
        aria-busy={state === "loading" || undefined}
        aria-label={availability}
        {...props}
      >
        {children}
      </tr>
    );
  },
);
