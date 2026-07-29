import { forwardRef, type TdHTMLAttributes } from "react";
import { classNames } from "../internal/classNames";
import styles from "./DataTableCell.module.css";

export type DataTableCellKind =
  | "text"
  | "status"
  | "financial"
  | "evidence"
  | "rowAction";
export interface DataTableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  kind?: DataTableCellKind;
}

/**
 * Renders a semantic data cell with a content-specific presentation treatment.
 *
 * @example <DataTableCell kind="financial">$1,250,000</DataTableCell>
 */
export const DataTableCell = forwardRef<HTMLTableCellElement, DataTableCellProps>(
  function DataTableCell({ children, className, kind = "text", ...props }, ref) {
    return (
      <td
        ref={ref}
        className={classNames(styles.cell, styles[kind], className)}
        {...props}
      >
        {children}
      </td>
    );
  },
);
