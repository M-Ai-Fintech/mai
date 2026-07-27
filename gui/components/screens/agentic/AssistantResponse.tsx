import {
  Table,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/Table/Table";
import { structureAssistantContent } from "./agentic-workspace-model";

export function AssistantResponse({ content }: { content: string }) {
  const structured = structureAssistantContent(content);
  return (
    <div className="space-y-3 break-words">
      <AssistantHeading heading={structured.heading} />
      <AssistantParagraphs paragraphs={structured.paragraphs} />
      <AssistantBullets bullets={structured.bullets} />
      <AssistantTable table={structured.table} />
    </div>
  );
}

function AssistantHeading({ heading }: { heading: string | null }) {
  if (!heading) return null;
  return <h3 className="text-base font-bold text-ink-black">{heading}</h3>;
}

function AssistantParagraphs({ paragraphs }: { paragraphs: string[] }) {
  return paragraphs.map((paragraph, index) => (
    <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
  ));
}

function AssistantBullets({ bullets }: { bullets: string[] }) {
  if (bullets.length === 0) return null;
  return (
    <ul className="list-disc space-y-1 pl-5">
      {bullets.map((bullet, index) => (
        <li key={`${index}-${bullet.slice(0, 24)}`}>{bullet}</li>
      ))}
    </ul>
  );
}

function AssistantTable(
  { table }: {
    table: ReturnType<typeof structureAssistantContent>["table"];
  },
) {
  if (!table) return null;
  return (
    <Table className="text-xs">
      <AssistantTableHead headers={table.headers} />
      <AssistantTableBody rows={table.rows} />
    </Table>
  );
}

function AssistantTableHead({ headers }: { headers: string[] }) {
  return (
    <TableHead>
      <TableRow isHeader>
        {headers.map((header) => (
          <TableCell key={header} isHeader className="p-2">{header}</TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

function AssistantTableBody({ rows }: { rows: string[][] }) {
  return (
    <tbody>
      {rows.map((row, rowIndex) => (
        <AssistantTableRow key={`${rowIndex}-${row.join("-")}`} row={row} />
      ))}
    </tbody>
  );
}

function AssistantTableRow({ row }: { row: string[] }) {
  return (
    <TableRow>
      {row.map((cell, cellIndex) => (
        <TableCell
          key={`${cellIndex}-${cell}`}
          className="p-2"
          maxWidthClassName="max-w-[180px]"
        >
          {cell}
        </TableCell>
      ))}
    </TableRow>
  );
}
