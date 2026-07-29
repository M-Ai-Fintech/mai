import {
  Children,
  forwardRef,
  isValidElement,
  type ReactNode,
  type TableHTMLAttributes,
} from "react";
import { classNames } from "../internal/classNames";
import styles from "./DataTable.module.css";

export type DataTableState = "default" | "loading" | "empty";

export interface DataTableProps extends TableHTMLAttributes<HTMLTableElement> {
  /** Number of visible columns used by the built-in loading and empty rows. */
  columnCount: number;
  emptyMessage?: string;
  loadingMessage?: string;
  state?: DataTableState;
}

/**
 * Provides a semantic, horizontally scrollable table container.
 *
 * @example <DataTable columnCount={2}><thead>...</thead><tbody>...</tbody></DataTable>
 */
export const DataTable = forwardRef<HTMLTableElement, DataTableProps>(
  function DataTable(
    {
      children,
      className,
      columnCount,
      emptyMessage = "No results are available.",
      loadingMessage = "Loading table data.",
      state = "default",
      ...props
    },
    ref,
  ) {
    const statusMessage = state === "loading" ? loadingMessage : emptyMessage;
    const header = findTableHeader(children);
    return (
      <div className={styles.scrollRegion} tabIndex={0}>
        <table
          ref={ref}
          className={classNames(styles.table, className)}
          aria-busy={state === "loading" || undefined}
          {...props}
        >
          {state === "default" ? children : <>{header}<tbody><tr><td className={styles.statusCell} colSpan={columnCount}>{statusMessage}</td></tr></tbody></>}
        </table>
      </div>
    );
  },
);

function findTableHeader(children: ReactNode) {
  return Children.toArray(children).find((child) =>
    isValidElement(child) && child.type === "thead"
  );
}
