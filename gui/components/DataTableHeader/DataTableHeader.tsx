import { forwardRef, type MouseEvent, type ThHTMLAttributes } from "react";
import { classNames } from "../internal/classNames";
import styles from "./DataTableHeader.module.css";

export type DataTableSortDirection = "ascending" | "descending" | "none";
export interface DataTableHeaderProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sortDirection?: DataTableSortDirection;
  onSort?: (event: MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Renders a native table header, optionally with a keyboard-operable sort button.
 *
 * @example <DataTableHeader sortDirection="ascending" onSort={sortByName}>Name</DataTableHeader>
 */
export const DataTableHeader = forwardRef<HTMLTableCellElement, DataTableHeaderProps>(
  function DataTableHeader({ children, className, onSort, sortDirection, ...props }, ref) {
    const sortable = Boolean(onSort);
    return (
      <th
        ref={ref}
        className={classNames(styles.header, className)}
        scope="col"
        aria-sort={sortable ? sortDirection ?? "none" : undefined}
        {...props}
      >
        {sortable ? <button className={styles.sortButton} type="button" onClick={onSort}>{children}</button> : children}
      </th>
    );
  },
);
