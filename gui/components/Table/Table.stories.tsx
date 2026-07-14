import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { Table, TableHead, TableRow, TableCell, TablePagination } from "./Table";
import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";

const meta: Meta<typeof Table> = {
  title: "Components/Composites/Table",
  component: Table,
};

export default meta;
type Story = StoryObj<typeof Table>;

const sampleDeals = [
  { id: "1", title: "TechCorp Financial Services & Solutions S.A.", code: "TC-2026-HQ-VALUATION", valuation: "R$ 150.000.000,00", phase: "Sourcing & KYB", updated: "14/07/2026" },
  { id: "2", title: "Alpha Tech Inovações em Inteligência Artificial e Nuvem", code: "AT-2026-CLOUD-DEAL", valuation: "R$ 45.000.000,00", phase: "Due Diligence", updated: "12/07/2026" },
  { id: "3", title: "Omega Logistics & Supply Chain Latam", code: "OL-2026-SUPPLY-CHAIN", valuation: "R$ 80.000.000,00", phase: "Negotiation", updated: "10/07/2026" },
];

export const FinancialTableInteractive: Story = {
  render: () => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    return (
      <div className="space-y-4">
        <Table>
          <TableHead>
            <TableRow isHeader>
              <TableCell isHeader>Transação / Nome da Empresa Target</TableCell>
              <TableCell isHeader>Código Interno</TableCell>
              <TableCell isHeader>Valuation Alvo</TableCell>
              <TableCell isHeader>Fase Atual</TableCell>
              <TableCell isHeader>Ações</TableCell>
            </TableRow>
          </TableHead>
          <tbody>
            {sampleDeals.map((deal) => (
              <TableRow key={deal.id}>
                <TableCell className="font-semibold text-ink-black">{deal.title}</TableCell>
                <TableCell className="text-slate-gray">{deal.code}</TableCell>
                <TableCell className="font-bold text-ink-black">{deal.valuation}</TableCell>
                <TableCell><Badge variant="default">{deal.phase}</Badge></TableCell>
                <TableCell><Button variant="secondary" size="sm">Ver Detalhes</Button></TableCell>
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
};
