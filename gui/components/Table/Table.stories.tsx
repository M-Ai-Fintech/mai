import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import React, { useState } from "react";
import {
  Table,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
} from "./Table";
import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";

const meta: Meta<typeof Table> = {
  title: "Components/Composites/Table",
  component: Table,
};

export default meta;
type Story = StoryObj<typeof Table>;

interface SampleDeal {
  id: string;
  title: string;
  code: string;
  valuation: string;
  phase: string;
  updated: string;
}

const sampleDeals = [
  {
    id: "1",
    title: "TechCorp Financial Services & Solutions S.A.",
    code: "TC-2026-HQ-VALUATION",
    valuation: "R$ 150.000.000,00",
    phase: "Sourcing & KYB",
    updated: "14/07/2026",
  },
  {
    id: "2",
    title: "Alpha Tech Innovations in Artificial Intelligence and Cloud",
    code: "AT-2026-CLOUD-DEAL",
    valuation: "R$ 45.000.000,00",
    phase: "Due Diligence",
    updated: "12/07/2026",
  },
  {
    id: "3",
    title: "Omega Logistics & Supply Chain Latam",
    code: "OL-2026-SUPPLY-CHAIN",
    valuation: "R$ 80.000.000,00",
    phase: "Negotiation",
    updated: "10/07/2026",
  },
] satisfies SampleDeal[];

const financialHeadings = [
  "Transaction / Target Company Name",
  "Internal Code",
  "Target Valuation",
  "Current Phase",
  "Actions",
];

function DefaultDealRow({ deal }: { deal: SampleDeal }) {
  return (
    <TableRow>
      <TableCell className="font-semibold text-ink-black">
        {deal.title}
      </TableCell>
      <TableCell className="text-slate-gray">{deal.code}</TableCell>
      <TableCell className="font-bold text-ink-black">
        {deal.valuation}
      </TableCell>
      <TableCell>
        <Badge variant="default">{deal.phase}</Badge>
      </TableCell>
    </TableRow>
  );
}

function DefaultTable() {
  return (
    <Table>
      <TableHead>
        <TableRow isHeader>
          {["Target Company", "Code", "Target Valuation", "Phase"].map(
            (label) => <TableCell key={label} isHeader>{label}</TableCell>,
          )}
        </TableRow>
      </TableHead>
      <tbody>
        {sampleDeals.slice(0, 2).map((deal) => (
          <DefaultDealRow key={deal.id} deal={deal} />
        ))}
      </tbody>
    </Table>
  );
}

export const Default: Story = {
  render: () => <DefaultTable />,
};

function FinancialDealRow({ deal }: { deal: SampleDeal }) {
  return (
    <TableRow>
      <TableCell className="font-semibold text-ink-black">
        {deal.title}
      </TableCell>
      <TableCell className="text-slate-gray">{deal.code}</TableCell>
      <TableCell className="font-bold text-ink-black">
        {deal.valuation}
      </TableCell>
      <TableCell>
        <Badge variant="default">{deal.phase}</Badge>
      </TableCell>
      <TableCell>
        <Button variant="secondary" size="sm">View Details</Button>
      </TableCell>
    </TableRow>
  );
}

function FinancialDealsTable() {
  return (
    <Table>
      <TableHead>
        <TableRow isHeader>
          {financialHeadings.map((label) => (
            <TableCell key={label} isHeader>{label}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <tbody>
        {sampleDeals.map((deal) => (
          <FinancialDealRow key={deal.id} deal={deal} />
        ))}
      </tbody>
    </Table>
  );
}

function FinancialTableStory() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  return (
    <div className="space-y-4">
      <FinancialDealsTable />
      <TablePagination
        currentPage={currentPage}
        totalPages={5}
        totalItems={48}
        pageSize={pageSize}
        pageSizeOptions={[10, 25, 50, 100]}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}

export const FinancialTableInteractive: Story = {
  render: () => <FinancialTableStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Change page size
    const select = canvas.getByRole("combobox", { name: "Items per page" });
    await userEvent.selectOptions(select, "25");

    // Click Next Page
    const nextBtn = canvas.getByRole("button", { name: "Next" });
    await userEvent.click(nextBtn);

    // Click Prev Page
    const prevBtn = canvas.getByRole("button", { name: "Previous" });
    await userEvent.click(prevBtn);
  },
};

export const FullCoverageTable: Story = {
  render: () => (
    <>
      <Table className="extra" />
      <TablePagination
        currentPage={0}
        totalPages={0}
        totalItems={0}
        pageSize={0}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        pageSizeOptions={undefined}
      />
    </>
  ),
};

export const FullCoverageTable2: Story = {
  render: () => <Table>{undefined}</Table>,
};
