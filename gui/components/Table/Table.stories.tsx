import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
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
];

export const Default: Story = {
  render: () => (
    <Table>
      <TableHead>
        <TableRow isHeader>
          <TableCell isHeader>Target Company</TableCell>
          <TableCell isHeader>Code</TableCell>
          <TableCell isHeader>Target Valuation</TableCell>
          <TableCell isHeader>Phase</TableCell>
        </TableRow>
      </TableHead>
      <tbody>
        <TableRow>
          <TableCell className="font-semibold text-ink-black">
            TechCorp Financial Services S.A.
          </TableCell>
          <TableCell className="text-slate-gray">TC-2026</TableCell>
          <TableCell className="font-bold text-ink-black">
            R$ 150.000.000,00
          </TableCell>
          <TableCell>
            <Badge variant="default">Sourcing & KYB</Badge>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-semibold text-ink-black">
            Alpha Tech Innovations in AI and Cloud
          </TableCell>
          <TableCell className="text-slate-gray">AT-2026</TableCell>
          <TableCell className="font-bold text-ink-black">
            R$ 45.000.000,00
          </TableCell>
          <TableCell>
            <Badge variant="default">Due Diligence</Badge>
          </TableCell>
        </TableRow>
      </tbody>
    </Table>
  ),
};

export const FinancialTableInteractive: Story = {
  render: () => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    return (
      <div className="space-y-4">
        <Table>
          <TableHead>
            <TableRow isHeader>
              <TableCell isHeader>Transaction / Target Company Name</TableCell>
              <TableCell isHeader>Internal Code</TableCell>
              <TableCell isHeader>Target Valuation</TableCell>
              <TableCell isHeader>Current Phase</TableCell>
              <TableCell isHeader>Actions</TableCell>
            </TableRow>
          </TableHead>
          <tbody>
            {sampleDeals.map((deal) => (
              <TableRow key={deal.id}>
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
            ))}
          </tbody>
        </Table>

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
  },
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
  render: () => <Table children={undefined} />,
};
