import { Table } from "@cliffy/table";

export type TableCell = string | number;

export function printSectionHeader(title: string): void {
  console.log("\n" + "=".repeat(60));
  console.log(` ${title.toUpperCase()}`);
  console.log("=".repeat(60));
}

export function renderOutputTable(
  headers: string[],
  rows: TableCell[][],
): void {
  new Table()
    .header(headers)
    .body(rows)
    .padding(2)
    .border(true)
    .render();
}

export function describeCommandError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
