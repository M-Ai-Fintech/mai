"use client";

import { useState } from "react";
import { Card } from "@/components/Card/Card";
import { Button } from "@/components/Button/Button";
import { Badge } from "@/components/Badge/Badge";
import { Table, TableHead, TableRow, TableCell } from "@/components/Table/Table";
import { Modal } from "@/components/Modal/Modal";
import { Input } from "@/components/Input/Input";
import { Dropdown } from "@/components/Dropdown/Dropdown";
import { FormField } from "@/components/FormField/FormField";

interface ClientEntity {
  id: string;
  name: string;
  type: "Buyer" | "Seller";
  sector: string;
  activeDealsCount: number;
  contactEmail: string;
  status: "Active" | "Pending KYB" | "Inactive";
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientEntity[]>([
    {
      id: "cli-1",
      name: "Global Capital Partners",
      type: "Buyer",
      sector: "Fintech & Financial Services",
      activeDealsCount: 3,
      contactEmail: "dealflow@globalcapital.com",
      status: "Active",
    },
    {
      id: "cli-2",
      name: "Nexus Health Holdings",
      type: "Seller",
      sector: "Healthcare & Biotech",
      activeDealsCount: 1,
      contactEmail: "m-and-a@nexushealth.com",
      status: "Pending KYB",
    },
    {
      id: "cli-3",
      name: "Vanguard Mobility Corp",
      type: "Seller",
      sector: "Logistics & Supply Chain",
      activeDealsCount: 2,
      contactEmail: "investors@vanguardmobility.com",
      status: "Active",
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newClient, setNewClient] = useState<Omit<ClientEntity, "id" | "activeDealsCount">>({
    name: "",
    type: "Buyer",
    sector: "Technology",
    contactEmail: "",
    status: "Active",
  });

  const handleAddClient = () => {
    if (!newClient.name.trim()) return;

    const created: ClientEntity = {
      ...newClient,
      id: "cli-" + (clients.length + 1),
      activeDealsCount: 0,
    };

    setClients([created, ...clients]);
    setShowModal(false);
    setNewClient({
      name: "",
      type: "Buyer",
      sector: "Technology",
      contactEmail: "",
      status: "Active",
    });
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contactEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto text-left">
      {/* Header */}
      <header className="mb-8 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-signal-orange"></span>
            <p className="text-xs font-bold text-slate-gray uppercase tracking-wider">
              M&A ENTITY MANAGEMENT (MAI-50)
            </p>
          </div>
          <h1 className="text-3xl font-medium text-ink-black tracking-tight">
            Gestão de Clientes
          </h1>
          <p className="text-slate-gray mt-1 text-sm">
            Cadastro e relacionamento com empresas Compradoras e Vendedoras
          </p>
        </div>

        <Button variant="primary" onClick={() => setShowModal(true)}>
          + Cadastrar Cliente
        </Button>
      </header>

      {/* Control Bar */}
      <div className="flex items-center justify-between gap-4 mb-6 bg-white p-4 rounded-lg border border-ink-black/10 shadow-level-1">
        <div className="relative min-w-[320px]">
          <Input
            placeholder="Buscar por cliente, setor ou e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-xs font-bold text-slate-gray uppercase">
          Total de Clientes: {filteredClients.length}
        </div>
      </div>

      {/* High Contrast White Table */}
      <Table>
        <TableHead>
          <TableRow isHeader>
            <TableCell isHeader>Razão Social / Nome</TableCell>
            <TableCell isHeader>Perfil</TableCell>
            <TableCell isHeader>Setor de Atuação</TableCell>
            <TableCell isHeader>Contatos</TableCell>
            <TableCell isHeader>Deals Ativos</TableCell>
            <TableCell isHeader>Status KYB</TableCell>
            <TableCell isHeader>Ação</TableCell>
          </TableRow>
        </TableHead>
        <tbody>
          {filteredClients.map((client) => (
            <TableRow key={client.id}>
              <TableCell className="font-semibold text-ink-black">{client.name}</TableCell>
              <TableCell>
                <Badge variant={client.type === "Buyer" ? "dark" : "outline"}>
                  {client.type}
                </Badge>
              </TableCell>
              <TableCell className="text-slate-gray">{client.sector}</TableCell>
              <TableCell className="text-xs text-slate-gray">{client.contactEmail}</TableCell>
              <TableCell className="font-bold text-ink-black">{client.activeDealsCount} deals</TableCell>
              <TableCell>
                <Badge variant={client.status === "Active" ? "default" : "orange"}>
                  {client.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Button variant="secondary" size="sm">
                  Editar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>

      {/* Creation Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Cadastrar Novo Cliente"
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleAddClient}>
                Salvar Cliente
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <FormField label="Nome / Razão Social" required>
              <Input
                placeholder="Ex: Nexus Capital Group"
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Tipo de Perfil">
                <Dropdown
                  options={[
                    { value: "Buyer", label: "Comprador (Buyer)" },
                    { value: "Seller", label: "Vendedor (Seller)" }
                  ]}
                  value={newClient.type}
                  onChange={(val) => setNewClient({ ...newClient, type: val as "Buyer" | "Seller" })}
                />
              </FormField>

              <FormField label="Setor" required>
                <Input
                  placeholder="Ex: Fintech"
                  value={newClient.sector}
                  onChange={(e) => setNewClient({ ...newClient, sector: e.target.value })}
                />
              </FormField>
            </div>

            <FormField label="E-mail de Contato" required>
              <Input
                type="email"
                placeholder="contato@empresa.com"
                value={newClient.contactEmail}
                onChange={(e) => setNewClient({ ...newClient, contactEmail: e.target.value })}
              />
            </FormField>
          </div>
        </Modal>
      )}
    </div>
  );
}
