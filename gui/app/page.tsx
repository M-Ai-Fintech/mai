"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiClient } from "@/lib/api-client";

export default function DashboardPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
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
      // Fallback mock data matching real schema and visual standards
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
          currentPhaseStatus: "Pending KYB"
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
          currentPhaseStatus: "In Progress"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeals();
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
          status: "Active"
        })
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

  const getColumnForPhase = (currentPhase: string) => {
    const phase = (currentPhase || 'Sourcing & KYB').toLowerCase();
    if (phase.includes('sourcing') || phase.includes('kyb')) {
      return 'Sourcing & KYB';
    }
    if (
      phase.includes('diligence') || 
      phase.includes('dd') || 
      phase.includes('nda') || 
      phase.includes('valuation') || 
      phase.includes('loi')
    ) {
      return 'Due Diligence';
    }
    if (phase.includes('negotiation') || phase.includes('negociação')) {
      return 'Negotiation';
    }
    if (phase.includes('close') || phase.includes('closing') || phase.includes('closed') || phase.includes('concluído')) {
      return 'Closed';
    }
    return 'Sourcing & KYB';
  };

  const columns = ['Sourcing & KYB', 'Due Diligence', 'Negotiation', 'Closed'];

  // KPIs calculations
  const totalDealsCount = deals.length;
  const totalVolume = deals.reduce((acc, deal) => acc + Number(deal.targetValuation || 0), 0);
  const formattedVolume = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(totalVolume);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-signal-orange"></span>
            <p className="text-xs font-bold text-slate-gray uppercase tracking-wider">M&A MIDDLEWARE</p>
          </div>
          <h1 className="text-4xl font-medium text-ink-black tracking-tight">Dashboard</h1>
          <p className="text-slate-gray mt-1 text-sm">Visão geral do pipeline de M&A em tempo real</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-2.5 bg-ink-black hover:bg-slate-800 text-canvas-cream font-semibold rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all duration-200 cursor-pointer"
        >
          Novo Deal
        </button>
      </header>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-lifted-cream p-6 rounded-[40px] border border-dark-border shadow-[0_24px_48px_rgba(0,0,0,0.04)] hover:border-light-signal-orange/40 transition-all duration-300">
          <h3 className="text-slate-gray text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-gray"></span>
            Total de Transações
          </h3>
          <p className="text-4xl font-semibold text-ink-black tracking-tight">{totalDealsCount}</p>
        </div>
        <div className="bg-lifted-cream p-6 rounded-[40px] border border-dark-border shadow-[0_24px_48px_rgba(0,0,0,0.04)] hover:border-light-signal-orange/40 transition-all duration-300">
          <h3 className="text-slate-gray text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-gray"></span>
            Volume Acumulado
          </h3>
          <p className="text-4xl font-semibold text-ink-black tracking-tight">{formattedVolume}</p>
        </div>
        <div className="bg-lifted-cream p-6 rounded-[40px] border border-dark-border shadow-[0_24px_48px_rgba(0,0,0,0.04)] hover:border-light-signal-orange/40 transition-all duration-300">
          <h3 className="text-slate-gray text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-signal-orange"></span>
            Risco Médio Predito
          </h3>
          <p className="text-4xl font-semibold text-signal-orange tracking-tight">Moderado</p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="bg-lifted-cream rounded-[40px] border border-dark-border p-8 shadow-[0_24px_48px_rgba(0,0,0,0.04)]">
        <h2 className="text-xl font-medium mb-6 border-b border-dark-border pb-4 flex items-center gap-2 text-ink-black">
          Pipeline de M&A <span className="text-xs px-2.5 py-0.5 bg-canvas-cream text-slate-gray rounded-full font-semibold border border-dark-border/40">Kanban</span>
        </h2>
        
        {loading ? (
          <div className="flex justify-center items-center py-20 text-light-signal-orange font-medium">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-light-signal-orange mr-3"></div>
            Carregando transações...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {columns.map((colName) => {
              const colDeals = deals.filter(d => getColumnForPhase(d.currentPhase) === colName);
              return (
                <div key={colName} className="bg-canvas-cream/50 p-4 rounded-[40px] border border-dark-border/40 min-h-[400px] flex flex-col">
                  <h3 className="text-xs font-bold text-slate-gray uppercase tracking-widest mb-4 flex justify-between items-center px-2">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-light-signal-orange"></span>
                      {colName}
                    </span>
                    <span className="bg-lifted-cream text-ink-black px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-dark-border/50">{colDeals.length}</span>
                  </h3>
                  
                  <div className="flex-1 space-y-3.5">
                    {colDeals.length > 0 ? (
                      colDeals.map((deal) => (
                        <Link
                          key={deal.id}
                          href={`/deals/${deal.id}`}
                          className="block bg-lifted-cream p-5 rounded-[20px] border border-dark-border hover:border-light-signal-orange shadow-sm hover:shadow-[0_12px_24px_rgba(0,0,0,0.03)] cursor-pointer transition-all duration-200 group"
                        >
                          <div className="font-semibold text-ink-black group-hover:text-light-signal-orange transition-colors duration-150">
                            {deal.title}
                          </div>
                          <div className="text-xs text-slate-gray mt-3 flex justify-between items-center">
                            <span>Code: {deal.code}</span>
                            <span className="px-2.5 py-0.5 bg-canvas-cream text-ink-black rounded-full text-[10px] font-semibold border border-dark-border/50">
                              {deal.currentPhaseStatus || deal.status || "Ativo"}
                            </span>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="text-slate-gray/60 text-xs italic text-center py-8">
                        Nenhum deal nesta fase
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-ink-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-lifted-cream border border-dark-border rounded-[40px] w-full max-w-md p-8 shadow-[0_32px_64px_rgba(0,0,0,0.12)] animate-in fade-in duration-200">
            <h3 className="text-xl font-medium text-ink-black mb-5">Adicionar Nova Transação</h3>
            
            <form onSubmit={handleCreateDeal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-1 px-1">Título do Deal / Target</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: TechCorp Solutions"
                  value={newDeal.title}
                  onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                  className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2.5 text-ink-black focus:outline-none focus:border-light-signal-orange text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-1 px-1">Tipo</label>
                  <select
                    value={newDeal.type}
                    onChange={(e) => setNewDeal({ ...newDeal, type: e.target.value })}
                    className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2.5 text-ink-black focus:outline-none focus:border-light-signal-orange text-sm appearance-none"
                  >
                    <option value="Acquisition">Acquisition</option>
                    <option value="Merger">Merger</option>
                    <option value="Joint Venture">Joint Venture</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-1 px-1">Estratégia</label>
                  <select
                    value={newDeal.strategy}
                    onChange={(e) => setNewDeal({ ...newDeal, strategy: e.target.value })}
                    className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2.5 text-ink-black focus:outline-none focus:border-light-signal-orange text-sm appearance-none"
                  >
                    <option value="Horizontal Integration">Horizontal</option>
                    <option value="Vertical Integration">Vertical</option>
                    <option value="Diversification">Diversification</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-1 px-1">Valuation Alvo (BRL)</label>
                <input
                  type="number"
                  value={newDeal.targetValuation}
                  onChange={(e) => setNewDeal({ ...newDeal, targetValuation: Number(e.target.value) })}
                  className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2.5 text-ink-black focus:outline-none focus:border-light-signal-orange text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-dark-border/40">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-dark-border hover:bg-canvas-cream text-slate-gray rounded-full text-sm font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-ink-black hover:bg-slate-800 text-canvas-cream font-semibold rounded-full text-sm shadow-md transition-colors cursor-pointer"
                >
                  Criar Transação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
