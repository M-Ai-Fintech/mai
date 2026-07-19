"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiClient } from "@/lib/api-client";
import { Card } from "@/components/Card/Card";
import { Button } from "@/components/Button/Button";
import { Badge } from "@/components/Badge/Badge";
import { Table, TableHead, TableRow, TableCell } from "@/components/Table/Table";
import { Tabs } from "@/components/Tabs/Tabs";
import { Dropdown } from "@/components/Dropdown/Dropdown";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { FormField } from "@/components/FormField/FormField";
import { GenerativeUIRenderer, GenerativeUISchema } from "@/lib/generative-ui-engine";

export default function DashboardPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "table" | "timeline">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [isEditLayoutMode, setIsEditLayoutMode] = useState(false);

  const [anchoredWidgets, setAnchoredWidgets] = useState<GenerativeUISchema[]>([]);

  const [newDeal, setNewDeal] = useState({
    title: "",
    type: "Acquisition",
    strategy: "Horizontal Integration",
    targetValuation: 10000000,
  });

  const loadDeals = async () => {
    try {
      const data = await ApiClient.getDeals();
      setDeals(data);
    } catch (err) {
      console.error("Failed to load deals, utilizing fallback:", err);
      setDeals([
        {
          id: "sample-deal",
          title: "TechCorp Acquisition",
          code: "TC-2026",
          targetValuation: 150000000,
          currency: "BRL",
          status: "Active",
          type: "Acquisition",
          strategy: "Horizontal Integration",
          currentPhase: "Sourcing & KYB",
          currentPhaseStatus: "Pending KYB",
          updatedAt: "2026-07-14",
        },
        {
          id: "alpha-deal",
          title: "Alpha Tech S.A.",
          code: "AT-2026",
          targetValuation: 45000000,
          currency: "BRL",
          status: "Active",
          type: "Acquisition",
          strategy: "Horizontal Integration",
          currentPhase: "Deep Due Diligence",
          currentPhaseStatus: "In Progress",
          updatedAt: "2026-07-12",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeals();
    try {
      const saved = JSON.parse(localStorage.getItem("mai_anchored_widgets") || "[]");
      setAnchoredWidgets(saved);
    } catch {
      setAnchoredWidgets([]);
    }
  }, []);

  const handleCreateDeal = async () => {
    if (!newDeal.title.trim()) return;

    try {
      const BASE_URL = process.env.NEXT_PUBLIC_CORE_API_URL || "http://localhost:8000";
      const res = await fetch(`${BASE_URL}/api/deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newDeal,
          code: "DEAL_" + Math.random().toString(36).substring(2, 7).toUpperCase(),
          status: "Active",
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setNewDeal({
          title: "",
          type: "Acquisition",
          strategy: "Horizontal Integration",
          targetValuation: 10000000,
        });
        await loadDeals();
      } else {
        alert("Falha ao criar deal");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao criar transação");
    }
  };

  const removeAnchoredWidget = (index: number) => {
    const updated = anchoredWidgets.filter((_, i) => i !== index);
    setAnchoredWidgets(updated);
    localStorage.setItem("mai_anchored_widgets", JSON.stringify(updated));
  };

  const getColumnForPhase = (currentPhase: string) => {
    const phase = (currentPhase || "Sourcing & KYB").toLowerCase();
    if (phase.includes("sourcing") || phase.includes("kyb")) return "Sourcing & KYB";
    if (phase.includes("diligence") || phase.includes("dd") || phase.includes("nda") || phase.includes("valuation") || phase.includes("loi")) return "Due Diligence";
    if (phase.includes("negotiation") || phase.includes("negociação")) return "Negotiation";
    if (phase.includes("close") || phase.includes("closing") || phase.includes("closed") || phase.includes("concluído")) return "Closed";
    return "Sourcing & KYB";
  };

  const columns = ["Sourcing & KYB", "Due Diligence", "Negotiation", "Closed"];

  const filteredDeals = deals.filter((deal) => {
    const matchesSearch =
      deal.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPhase =
      selectedPhaseFilter === "all" ||
      getColumnForPhase(deal.currentPhase) === selectedPhaseFilter;
    return matchesSearch && matchesPhase;
  });

  const totalDealsCount = filteredDeals.length;
  const totalVolume = filteredDeals.reduce(
    (acc, deal) => acc + Number(deal.targetValuation || 0),
    0
  );
  const formattedVolume = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(totalVolume);

  return (
    <div className="p-8 max-w-7xl mx-auto text-left">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-signal-orange"></span>
            <p className="text-xs font-bold text-slate-gray uppercase tracking-wider">
              DASHBOARD DINÂMICO
            </p>
          </div>
          <h1 className="text-3xl font-medium text-ink-black tracking-tight">
            Workspace de Transações
          </h1>
          <p className="text-slate-gray mt-1 text-sm">
            Grid reorganizável com suporte a ancoragem de componentes (Generative UI)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={isEditLayoutMode ? "consent" : "secondary"}
            size="sm"
            onClick={() => setIsEditLayoutMode(!isEditLayoutMode)}
          >
            {isEditLayoutMode ? "✓ Concluir Edição" : "⚙ Customizar Layout"}
          </Button>

          {isEditLayoutMode && (
            <Button variant="secondary" size="sm" onClick={() => { setAnchoredWidgets([]); localStorage.removeItem("mai_anchored_widgets"); setIsEditLayoutMode(false); }}>
              Resetar Padrão
            </Button>
          )}

          <Button variant="primary" onClick={() => setShowModal(true)}>
            + Novo Deal
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card variant="default">
          <Badge variant="default" className="mb-2">• CARTEIRA ATIVA</Badge>
          <p className="text-xs text-slate-gray uppercase font-semibold">Total de Transações</p>
          <p className="text-3xl font-bold text-ink-black mt-1">{totalDealsCount}</p>
        </Card>

        <Card variant="default">
          <Badge variant="default" className="mb-2">• PIPELINE VOLUME</Badge>
          <p className="text-xs text-slate-gray uppercase font-semibold">Volume Acumulado</p>
          <p className="text-3xl font-bold text-ink-black mt-1">{formattedVolume}</p>
        </Card>

        <Card variant="orange">
          <Badge variant="dark" className="mb-2">• AVALIAÇÃO DE RISCO</Badge>
          <p className="text-xs text-white/90 uppercase font-semibold">Status do Agente ONNX</p>
          <p className="text-3xl font-bold text-white mt-1">Moderado</p>
        </Card>
      </div>

      {anchoredWidgets.length > 0 && (
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-ink-black flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-signal-orange"></span>
              Widgets Sintetizados Ancorados (Generative UI)
            </h2>
            <Link href="/generative-ui">
              <Button variant="secondary" size="sm">+ Sintetizar Novo Widget</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {anchoredWidgets.map((schema, index) => (
              <Card key={index} variant="default" padding="md" className="relative">
                {isEditLayoutMode && (
                  <button
                    onClick={() => removeAnchoredWidget(index)}
                    className="absolute top-3 right-3 text-xs bg-signal-orange text-white rounded-full px-2 py-0.5 font-bold cursor-pointer hover:bg-red-700"
                  >
                    Desancorar ✕
                  </button>
                )}
                <GenerativeUIRenderer schema={schema} />
              </Card>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-4 rounded-lg border border-ink-black/10 shadow-level-1">
        <div className="relative min-w-[280px]">
          <Input 
            placeholder="Buscar por nome ou código..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto min-w-[200px]">
          <Dropdown
            options={[
              { value: "all", label: "Todas as Fases" },
              { value: "Sourcing & KYB", label: "Sourcing & KYB" },
              { value: "Due Diligence", label: "Due Diligence" },
              { value: "Negotiation", label: "Negotiation" },
              { value: "Closed", label: "Closed" }
            ]}
            value={selectedPhaseFilter}
            onChange={(val) => setSelectedPhaseFilter(val as string)}
          />
        </div>

        <div>
          <Tabs 
            activeTab={view}
            onChange={(id) => setView(id as "kanban"|"table"|"timeline")}
            tabs={[
              { id: "kanban", label: "Kanban" },
              { id: "table", label: "Tabela" },
              { id: "timeline", label: "Timeline" }
            ]}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-slate-gray font-medium">
          Carregando transações M&A...
        </div>
      ) : (
        <>
          {view === "kanban" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {columns.map((colName) => {
                const colDeals = filteredDeals.filter(
                  (d) => getColumnForPhase(d.currentPhase) === colName
                );
                return (
                  <div key={colName} className="bg-canvas-cream/60 p-4 rounded-lg border border-ink-black/10 min-h-[420px] flex flex-col">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-dust-taupe">
                      <h3 className="text-xs font-bold text-slate-gray uppercase tracking-wider">{colName}</h3>
                      <Badge variant="dark">{colDeals.length}</Badge>
                    </div>
                    <div className="flex-1 space-y-3">
                      {colDeals.length > 0 ? (
                        colDeals.map((deal) => (
                          <Link key={deal.id} href={`/deals/${deal.id}`}>
                            <Card variant="default" padding="sm" className="hover:border-ink-black transition-all cursor-pointer mb-3">
                              <div className="font-semibold text-ink-black text-sm mb-1">{deal.title}</div>
                              <p className="text-xs text-slate-gray mb-3">Code: {deal.code}</p>
                              <div className="flex justify-between items-center pt-2 border-t border-dust-taupe/30">
                                <span className="text-xs font-bold text-ink-black">R$ {(deal.targetValuation / 1000000).toFixed(1)}M</span>
                                <Badge variant="default">{deal.currentPhaseStatus || "Ativo"}</Badge>
                              </div>
                            </Card>
                          </Link>
                        ))
                      ) : (
                        <div className="text-slate-gray/60 text-xs italic py-10 text-center">Nenhum deal nesta fase</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === "table" && (
            <Table>
              <TableHead>
                <TableRow isHeader>
                  <TableCell isHeader>Transação / Código</TableCell>
                  <TableCell isHeader>Tipo & Estratégia</TableCell>
                  <TableCell isHeader>Valuation Alvo</TableCell>
                  <TableCell isHeader>Fase Atual</TableCell>
                  <TableCell isHeader>Ação</TableCell>
                </TableRow>
              </TableHead>
              <tbody>
                {filteredDeals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell>
                      <div className="font-semibold text-ink-black">{deal.title}</div>
                      <div className="text-xs text-slate-gray">{deal.code}</div>
                    </TableCell>
                    <TableCell className="text-slate-gray">
                      {deal.type} • {deal.strategy}
                    </TableCell>
                    <TableCell className="font-bold text-ink-black">
                      R$ {(deal.targetValuation / 1000000).toFixed(1)}M
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{deal.currentPhase}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/deals/${deal.id}`}>
                        <Button variant="secondary" size="sm">Detalhes</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}

          {view === "timeline" && (
            <Card variant="default" padding="lg" className="space-y-6">
              <h3 className="text-lg font-medium text-ink-black border-b border-dust-taupe/30 pb-3">Cronograma de Transações M&A</h3>
              {filteredDeals.map((deal) => (
                <div key={deal.id} className="flex gap-4 items-start border-l-2 border-signal-orange pl-4 py-2">
                  <div>
                    <Badge variant="orange" className="mb-1">{deal.currentPhase}</Badge>
                    <h4 className="text-base font-semibold text-ink-black">{deal.title}</h4>
                    <p className="text-xs text-slate-gray">Valuation: R$ {(deal.targetValuation / 1000000).toFixed(1)}M — Última atualização: {deal.updatedAt || "Hoje"}</p>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      {showModal && (
        <Modal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)}
          title="Nova Transação M&A"
          subtitle="Cadastre um novo target de aquisição"
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleCreateDeal}>Criar Deal</Button>
            </>
          }
        >
          <div className="space-y-4">
            <FormField label="Título do Deal / Target" required>
              <Input 
                placeholder="Ex: TechCorp Solutions"
                value={newDeal.title}
                onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
              />
            </FormField>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Tipo">
                <Dropdown 
                  options={[
                    { value: "Acquisition", label: "Acquisition" },
                    { value: "Merger", label: "Merger" },
                    { value: "Joint Venture", label: "Joint Venture" }
                  ]}
                  value={newDeal.type}
                  onChange={(val) => setNewDeal({ ...newDeal, type: val as string })}
                />
              </FormField>
              <FormField label="Estratégia">
                <Dropdown 
                  options={[
                    { value: "Horizontal Integration", label: "Horizontal Integration" },
                    { value: "Vertical Integration", label: "Vertical Integration" },
                    { value: "Diversification", label: "Diversification" }
                  ]}
                  value={newDeal.strategy}
                  onChange={(val) => setNewDeal({ ...newDeal, strategy: val as string })}
                />
              </FormField>
            </div>

            <FormField label="Valuation Alvo Estimado">
              <Input 
                type="number"
                value={newDeal.targetValuation}
                onChange={(e) => setNewDeal({ ...newDeal, targetValuation: Number(e.target.value) })}
              />
            </FormField>
          </div>
        </Modal>
      )}
    </div>
  );
}
