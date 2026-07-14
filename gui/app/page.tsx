"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiClient } from "@/lib/api-client";
import { Card } from "@/components/Card/Card";
import { Button } from "@/components/Button/Button";
import { Badge } from "@/components/Badge/Badge";
import { GenerativeUIRenderer, GenerativeUISchema } from "@/lib/generative-ui-engine";

export default function DashboardPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "table" | "timeline">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [isEditLayoutMode, setIsEditLayoutMode] = useState(false);

  // Dynamic Anchored Generative UI Widgets (MAI-60 + MAI-57)
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

    // Load anchored generative widgets from localStorage (MAI-60 + MAI-57)
    try {
      const saved = JSON.parse(localStorage.getItem("mai_anchored_widgets") || "[]");
      setAnchoredWidgets(saved);
    } catch {
      setAnchoredWidgets([]);
    }
  }, []);

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const resetDashboardLayout = () => {
    setAnchoredWidgets([]);
    localStorage.removeItem("mai_anchored_widgets");
    setIsEditLayoutMode(false);
  };

  const getColumnForPhase = (currentPhase: string) => {
    const phase = (currentPhase || "Sourcing & KYB").toLowerCase();
    if (phase.includes("sourcing") || phase.includes("kyb")) {
      return "Sourcing & KYB";
    }
    if (
      phase.includes("diligence") ||
      phase.includes("dd") ||
      phase.includes("nda") ||
      phase.includes("valuation") ||
      phase.includes("loi")
    ) {
      return "Due Diligence";
    }
    if (phase.includes("negotiation") || phase.includes("negociação")) {
      return "Negotiation";
    }
    if (
      phase.includes("close") ||
      phase.includes("closing") ||
      phase.includes("closed") ||
      phase.includes("concluído")
    ) {
      return "Closed";
    }
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
      {/* Header with Layout Mode Controls */}
      <header className="mb-8 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-signal-orange"></span>
            <p className="text-xs font-bold text-slate-gray uppercase tracking-wider">
              DASHBOARD DINÂMICO & CUSTOMIZÁVEL (MAI-60 + DEALROOM BENCHMARK)
            </p>
          </div>
          <h1 className="text-3xl font-medium text-ink-black tracking-tight">
            Workspace de Transações
          </h1>
          <p className="text-slate-gray mt-1 text-sm">
            Grid reorganizável com suporte a ancoragem de componentes sintetizados em runtime (Generative UI)
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
            <Button variant="secondary" size="sm" onClick={resetDashboardLayout}>
              Resetar Padrão
            </Button>
          )}

          <Button variant="primary" onClick={() => setShowModal(true)}>
            + Novo Deal
          </Button>
        </div>
      </header>

      {/* KPI Cards Grid - High Contrast White 8px Radius Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card variant="default">
          <Badge variant="default" className="mb-2">
            • CARTEIRA ATIVA
          </Badge>
          <p className="text-xs text-slate-gray uppercase font-semibold">
            Total de Transações
          </p>
          <p className="text-3xl font-bold text-ink-black mt-1">
            {totalDealsCount}
          </p>
        </Card>

        <Card variant="default">
          <Badge variant="default" className="mb-2">
            • PIPELINE VOLUME
          </Badge>
          <p className="text-xs text-slate-gray uppercase font-semibold">
            Volume Acumulado
          </p>
          <p className="text-3xl font-bold text-ink-black mt-1">
            {formattedVolume}
          </p>
        </Card>

        <Card variant="orange">
          <Badge variant="orange" className="mb-2">
            • AVALIAÇÃO DE RISCO
          </Badge>
          <p className="text-xs text-white/90 uppercase font-semibold">
            Status do Agente ONNX
          </p>
          <p className="text-3xl font-bold text-white mt-1">Moderado</p>
        </Card>
      </div>

      {/* ANCHORED GENERATIVE UI WIDGETS SECTION (MAI-60 + MAI-57) */}
      {anchoredWidgets.length > 0 && (
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-ink-black flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-signal-orange"></span>
              Widgets Sintetizados Ancorados (Generative UI)
            </h2>
            <Link href="/generative-ui">
              <Button variant="secondary" size="sm">
                + Sintetizar Novo Widget
              </Button>
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

      {/* Controls & View Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-4 rounded-lg border border-ink-black/10 shadow-level-1">
        <div className="relative min-w-[280px]">
          <input
            type="text"
            placeholder="Buscar por nome ou código..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-canvas-cream border border-dust-taupe rounded-full px-4 py-2 text-sm text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setSelectedPhaseFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedPhaseFilter === "all"
                ? "bg-ink-black text-canvas-cream"
                : "bg-canvas-cream text-slate-gray hover:text-ink-black"
            }`}
          >
            Todas as Fases
          </button>
          {columns.map((col) => (
            <button
              key={col}
              onClick={() => setSelectedPhaseFilter(col)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                selectedPhaseFilter === col
                  ? "bg-ink-black text-canvas-cream"
                  : "bg-canvas-cream text-slate-gray hover:text-ink-black"
              }`}
            >
              {col}
            </button>
          ))}
        </div>

        <div className="inline-flex bg-canvas-cream p-1 rounded-full border border-dust-taupe">
          <button
            onClick={() => setView("kanban")}
            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
              view === "kanban"
                ? "bg-white text-ink-black shadow-sm"
                : "text-slate-gray hover:text-ink-black"
            }`}
          >
            Kanban
          </button>
          <button
            onClick={() => setView("table")}
            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
              view === "table"
                ? "bg-white text-ink-black shadow-sm"
                : "text-slate-gray hover:text-ink-black"
            }`}
          >
            Tabela
          </button>
          <button
            onClick={() => setView("timeline")}
            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
              view === "timeline"
                ? "bg-white text-ink-black shadow-sm"
                : "text-slate-gray hover:text-ink-black"
            }`}
          >
            Timeline
          </button>
        </div>
      </div>

      {/* Main Content Render Area */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-slate-gray font-medium">
          Carregando transações M&A...
        </div>
      ) : (
        <>
          {/* VIEW 1: KANBAN BOARD */}
          {view === "kanban" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {columns.map((colName) => {
                const colDeals = filteredDeals.filter(
                  (d) => getColumnForPhase(d.currentPhase) === colName
                );
                return (
                  <div
                    key={colName}
                    className="bg-canvas-cream/60 p-4 rounded-lg border border-ink-black/10 min-h-[420px] flex flex-col"
                  >
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-dust-taupe">
                      <h3 className="text-xs font-bold text-slate-gray uppercase tracking-wider">
                        {colName}
                      </h3>
                      <Badge variant="dark">{colDeals.length}</Badge>
                    </div>

                    <div className="flex-1 space-y-3">
                      {colDeals.length > 0 ? (
                        colDeals.map((deal) => (
                          <Link key={deal.id} href={`/deals/${deal.id}`}>
                            <Card
                              variant="default"
                              padding="sm"
                              className="hover:border-ink-black transition-all cursor-pointer mb-3"
                            >
                              <div className="font-semibold text-ink-black text-sm mb-1">
                                {deal.title}
                              </div>
                              <p className="text-xs text-slate-gray mb-3">
                                Code: {deal.code}
                              </p>
                              <div className="flex justify-between items-center pt-2 border-t border-dust-taupe/30">
                                <span className="text-xs font-bold text-ink-black">
                                  R${" "}
                                  {(deal.targetValuation / 1000000).toFixed(1)}M
                                </span>
                                <Badge variant="default">
                                  {deal.currentPhaseStatus || "Ativo"}
                                </Badge>
                              </div>
                            </Card>
                          </Link>
                        ))
                      ) : (
                        <div className="text-slate-gray/60 text-xs italic py-10 text-center">
                          Nenhum deal nesta fase
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 2: TABLE VIEW */}
          {view === "table" && (
            <Card variant="default" padding="none">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-dust-taupe bg-canvas-cream/50 text-slate-gray text-xs font-bold uppercase tracking-wider">
                    <th className="p-4">Transação / Código</th>
                    <th className="p-4">Tipo & Estratégia</th>
                    <th className="p-4">Valuation Alvo</th>
                    <th className="p-4">Fase Atual</th>
                    <th className="p-4">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dust-taupe/40 text-sm">
                  {filteredDeals.map((deal) => (
                    <tr key={deal.id} className="hover:bg-lifted-cream transition-colors">
                      <td className="p-4 font-semibold text-ink-black">
                        <div>{deal.title}</div>
                        <div className="text-xs text-slate-gray font-normal">{deal.code}</div>
                      </td>
                      <td className="p-4 text-slate-gray">
                        {deal.type} • {deal.strategy}
                      </td>
                      <td className="p-4 font-bold text-ink-black">
                        R$ {(deal.targetValuation / 1000000).toFixed(1)}M
                      </td>
                      <td className="p-4">
                        <Badge variant="default">{deal.currentPhase}</Badge>
                      </td>
                      <td className="p-4">
                        <Link href={`/deals/${deal.id}`}>
                          <Button variant="secondary" size="sm">
                            Detalhes
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* VIEW 3: TIMELINE VIEW */}
          {view === "timeline" && (
            <Card variant="default" padding="lg" className="space-y-6">
              <h3 className="text-lg font-medium text-ink-black border-b pb-3">
                Cronograma de Transações M&A
              </h3>
              {filteredDeals.map((deal) => (
                <div key={deal.id} className="flex gap-4 items-start border-l-2 border-signal-orange pl-4 py-2">
                  <div>
                    <Badge variant="orange" className="mb-1">
                      {deal.currentPhase}
                    </Badge>
                    <h4 className="text-base font-semibold text-ink-black">{deal.title}</h4>
                    <p className="text-xs text-slate-gray">
                      Valuation Estimado: R$ {(deal.targetValuation / 1000000).toFixed(1)}M — Última atualização em {deal.updatedAt || "Hoje"}
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-ink-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <Card variant="default" padding="lg" className="w-full max-w-md shadow-level-3">
            <h3 className="text-xl font-medium text-ink-black mb-5">
              Adicionar Nova Transação
            </h3>

            <form onSubmit={handleCreateDeal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-1">
                  Título do Deal / Target
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: TechCorp Solutions"
                  value={newDeal.title}
                  onChange={(e) =>
                    setNewDeal({ ...newDeal, title: e.target.value })
                  }
                  className="w-full bg-canvas-cream border border-dust-taupe rounded-lg px-4 py-2.5 text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-1">
                    Tipo
                  </label>
                  <select
                    value={newDeal.type}
                    onChange={(e) =>
                      setNewDeal({ ...newDeal, type: e.target.value })
                    }
                    className="w-full bg-canvas-cream border border-dust-taupe rounded-lg px-4 py-2.5 text-ink-black text-sm"
                  >
                    <option value="Acquisition">Acquisition</option>
                    <option value="Merger">Merger</option>
                    <option value="Joint Venture">Joint Venture</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-1">
                    Estratégia
                  </label>
                  <select
                    value={newDeal.strategy}
                    onChange={(e) =>
                      setNewDeal({ ...newDeal, strategy: e.target.value })
                    }
                    className="w-full bg-canvas-cream border border-dust-taupe rounded-lg px-4 py-2.5 text-ink-black text-sm"
                  >
                    <option value="Horizontal Integration">Horizontal</option>
                    <option value="Vertical Integration">Vertical</option>
                    <option value="Diversification">Diversification</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-1">
                  Valuation Alvo (BRL)
                </label>
                <input
                  type="number"
                  value={newDeal.targetValuation}
                  onChange={(e) =>
                    setNewDeal({
                      ...newDeal,
                      targetValuation: Number(e.target.value),
                    })
                  }
                  className="w-full bg-canvas-cream border border-dust-taupe rounded-lg px-4 py-2.5 text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-dust-taupe">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  Criar Transação
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
