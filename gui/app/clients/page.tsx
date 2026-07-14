"use client";

import { useState } from "react";
import { Card } from "@/components/Card/Card";
import { Button } from "@/components/Button/Button";
import { Badge } from "@/components/Badge/Badge";

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

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
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
          <input
            type="text"
            placeholder="Buscar por cliente, setor ou e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-canvas-cream border border-dust-taupe rounded-full px-4 py-2 text-sm text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black"
          />
        </div>
        <div className="text-xs font-bold text-slate-gray uppercase">
          Total de Clientes: {filteredClients.length}
        </div>
      </div>

      {/* High Contrast White Table (8px radius) */}
      <Card variant="default" padding="none">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-dust-taupe bg-canvas-cream/50 text-slate-gray text-xs font-bold uppercase tracking-wider">
              <th className="p-4">Razão Social / Nome</th>
              <th className="p-4">Perfil</th>
              <th className="p-4">Setor de Atuação</th>
              <th className="p-4">Contatos</th>
              <th className="p-4">Deals Ativos</th>
              <th className="p-4">Status KYB</th>
              <th className="p-4">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dust-taupe/40 text-sm">
            {filteredClients.map((client) => (
              <tr key={client.id} className="hover:bg-lifted-cream transition-colors">
                <td className="p-4 font-semibold text-ink-black">{client.name}</td>
                <td className="p-4">
                  <Badge variant={client.type === "Buyer" ? "dark" : "outline"}>
                    {client.type}
                  </Badge>
                </td>
                <td className="p-4 text-slate-gray">{client.sector}</td>
                <td className="p-4 text-xs text-slate-gray">{client.contactEmail}</td>
                <td className="p-4 font-bold text-ink-black">{client.activeDealsCount} deals</td>
                <td className="p-4">
                  <Badge variant={client.status === "Active" ? "default" : "orange"}>
                    {client.status}
                  </Badge>
                </td>
                <td className="p-4">
                  <Button variant="secondary" size="sm">
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-ink-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <Card variant="default" padding="lg" className="w-full max-w-md shadow-level-3">
            <h3 className="text-xl font-medium text-ink-black mb-5">
              Cadastrar Novo Cliente
            </h3>

            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-1">
                  Nome / Razão Social
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Nexus Capital Group"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full bg-canvas-cream border border-dust-taupe rounded-lg px-4 py-2.5 text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-1">
                    Tipo de Perfil
                  </label>
                  <select
                    value={newClient.type}
                    onChange={(e) =>
                      setNewClient({ ...newClient, type: e.target.value as "Buyer" | "Seller" })
                    }
                    className="w-full bg-canvas-cream border border-dust-taupe rounded-lg px-4 py-2.5 text-ink-black text-sm"
                  >
                    <option value="Buyer">Comprador (Buyer)</option>
                    <option value="Seller">Vendedor (Seller)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-1">
                    Setor
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Fintech"
                    value={newClient.sector}
                    onChange={(e) => setNewClient({ ...newClient, sector: e.target.value })}
                    className="w-full bg-canvas-cream border border-dust-taupe rounded-lg px-4 py-2.5 text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-1">
                  E-mail de Contato
                </label>
                <input
                  type="email"
                  required
                  placeholder="contato@empresa.com"
                  value={newClient.contactEmail}
                  onChange={(e) => setNewClient({ ...newClient, contactEmail: e.target.value })}
                  className="w-full bg-canvas-cream border border-dust-taupe rounded-lg px-4 py-2.5 text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-dust-taupe">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  Salvar Cliente
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
