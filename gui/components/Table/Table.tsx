import React from "react";
import { Button } from "../Button/Button";

// Main Table Container
export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children?: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ children = null, className = "", ...props }) => {
  return (
    <div className="w-full overflow-x-auto border border-dust-taupe/60 rounded-lg bg-white shadow-level-1 text-left">
      <table className={`w-full text-left border-collapse text-sm ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
};

// Table Head
export interface TableHeadProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const TableHead: React.FC<TableHeadProps> = ({ children, className = "", ...props }) => {
  return (
    <thead className={`bg-canvas-cream/60 border-b border-dust-taupe/60 text-slate-gray text-xs font-bold uppercase tracking-wider ${className}`} {...props}>
      {children}
    </thead>
  );
};

// Table Row
export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  isHeader?: boolean;
}

export const TableRow: React.FC<TableRowProps> = ({
  children,
  isHeader = false,
  className = "",
  ...props
}) => {
  const rowStyles = isHeader
    ? ""
    : "odd:bg-canvas-cream/20 even:bg-white border-b border-dust-taupe/40 hover:bg-lifted-cream transition-colors cursor-pointer";

  return (
    <tr className={`${rowStyles} ${className}`} {...props}>
      {children}
    </tr>
  );
};

// Table Cell
export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  isHeader?: boolean;
  maxWidthClassName?: string;
}

export const TableCell: React.FC<TableCellProps> = ({
  children,
  isHeader = false,
  maxWidthClassName = "max-w-[220px]",
  className = "",
  ...props
}) => {
  const Component = isHeader ? "th" : "td";
  const cellPadding = isHeader ? "p-3.5" : "p-4";

  return (
    <Component
      className={`${cellPadding} ${maxWidthClassName} truncate text-ellipsis whitespace-nowrap overflow-hidden font-normal ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

// Table Pagination Footer
export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
}) => {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-t border-dust-taupe/60 bg-canvas-cream/30 text-xs text-slate-gray font-medium text-left">
      <div className="flex items-center gap-3">
        <span>Show</span>
        <select
          aria-label="Items per page"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="bg-white border border-dust-taupe rounded-md px-2.5 py-1 text-xs text-ink-black font-semibold focus:outline-none focus:ring-1 focus:ring-ink-black cursor-pointer"
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option} items per page
            </option>
          ))}
        </select>
        <span>
          Showing <strong className="text-ink-black">{startItem}-{endItem}</strong> of <strong className="text-ink-black">{totalItems}</strong>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        <span className="px-2 font-semibold text-ink-black">
          Page {currentPage} of {totalPages || 1}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
