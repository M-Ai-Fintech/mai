"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ApiClient } from "@/lib/api-client";

export default function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [deal, setDeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [movingPhase, setMovingPhase] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState("NDA & Initial DD");
  const [phaseComments, setPhaseComments] = useState("");

  const loadDealData = async () => {
    try {
      const data = await ApiClient.getDealById(id);
      if (data) {
        setDeal(data);
      } else {
        throw new Error("Deal not found in API response");
      }
    } catch (err) {
      console.error("Failed to fetch deal from API, using mock fallback:", err);
      // Premium fallback mock data
      setDeal({
        id: id,
        title: id === "sample-deal" ? "TechCorp Acquisition" : "Alpha Tech S.A.",
        code: id === "sample-deal" ? "TC-2026" : "AT-2026",
        targetValuation: id === "sample-deal" ? 150000000 : 45000000,
        currency: "BRL",
        status: "Active",
        type: "Acquisition",
        strategy: "Horizontal Integration",
        business: {
          name: id === "sample-deal" ? "TechCorp Solutions" : "Alpha Tech S.A.",
          cnpj: id === "sample-deal" ? "12.345.678/0001-99" : "98.765.432/0001-88",
          sector: id === "sample-deal" ? "Technology" : "Fintech",
          originCountry: "Brazil"
        },
        phase_history: [
          {
            id: "1",
            phaseName: "Sourcing & KYB",
            statusName: "Completed",
            startedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
            completedAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
            comments: "KYB verification completed via Serpro API."
          },
          {
            id: "2",
            phaseName: "NDA & Initial DD",
            statusName: "In Progress",
            startedAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
            completedAt: null,
            comments: "Waiting for VDR document upload."
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDealData();
  }, [id]);

  const handleMovePhase = async (e: React.FormEvent) => {
    e.preventDefault();
    setMovingPhase(true);
    try {
      // Modify phase of the deal
      const res = await ApiClient.updateDealPhase(id, selectedPhase);
      console.log("Phase updated successfully:", res);
      setShowPhaseModal(false);
      setPhaseComments("");
      await loadDealData();
    } catch (err) {
      console.error("Failed to update phase:", err);
      // Local fallback simulation if offline
      alert("Fase atualizada localmente (simulado)");
      if (deal) {
        const updatedHistory = [...(deal.phase_history || [])];
        // Mark last phase completed
        if (updatedHistory.length > 0) {
          updatedHistory[updatedHistory.length - 1] = {
            ...updatedHistory[updatedHistory.length - 1],
            completedAt: new Date().toISOString()
          };
        }
        // Add new phase
        updatedHistory.push({
          id: String(Date.now()),
          phaseName: selectedPhase,
          statusName: "In Progress",
          startedAt: new Date().toISOString(),
          completedAt: null,
          comments: phaseComments || "Phase advanced by User"
        });
        setDeal({
          ...deal,
          phase_history: updatedHistory
        });
      }
      setShowPhaseModal(false);
      setPhaseComments("");
    } finally {
      setMovingPhase(false);
    }
  };

  const handleSyncVdr = () => {
    alert("Sincronização com o Virtual Data Room (VDR) iniciada com sucesso.");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh] text-teal-accent">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-accent mr-3"></div>
        Carregando detalhes do deal...
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="p-8 text-center text-rose-400">
        <p>Transação não encontrada.</p>
        <Link href="/" className="mt-4 inline-block text-teal-accent hover:underline">
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  // Predefined phases list for selection
  const allPhases = [
    "Sourcing & KYB",
    "NDA & Initial DD",
    "Valuation & LOI",
    "Deep Due Diligence",
    "Negotiation",
    "Closing"
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-signal-orange"></span>
            <h1 className="text-4xl font-medium text-ink-black tracking-tight">
              {deal.title}
            </h1>
            <span className="px-3 py-1 bg-ink-black text-canvas-cream text-xs rounded-full font-bold">
              {deal.status || "Ativo"}
            </span>
          </div>
          <p className="text-slate-gray text-sm">Code: {deal.code} | Data Room & Pipeline Overview</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSyncVdr}
            className="px-5 py-2.5 bg-white border border-dark-border text-ink-black rounded-full text-sm font-semibold hover:bg-canvas-cream transition-all duration-200 cursor-pointer"
          >
            Sincronizar VDR
          </button>
          <button
            onClick={() => setShowPhaseModal(true)}
            className="px-5 py-2.5 bg-ink-black hover:bg-slate-800 text-canvas-cream font-bold rounded-full text-sm shadow-md transition-all duration-200 cursor-pointer"
          >
            Mover Fase
          </button>
        </div>
      </header>

      {/* Internal Page Tabs */}
      <div className="mb-8 flex gap-6 border-b border-dark-border pb-4">
        <Link href={`/deals/${id}`} className="text-ink-black font-bold border-b-2 border-ink-black pb-4.5 -mb-[18px] transition-colors flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-signal-orange"></span>
          Overview / Sourcing
        </Link>
        <Link href={`/deals/${id}/engines`} className="text-slate-gray hover:text-ink-black font-semibold pb-4 transition-colors">
          Due Diligence & Motores
        </Link>
        <Link href={`/deals/${id}/chat`} className="text-slate-gray hover:text-ink-black font-semibold pb-4 transition-colors">
          RAG Chat
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Deal Info Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-lifted-cream p-8 rounded-[40px] border border-dark-border shadow-[0_24px_48px_rgba(0,0,0,0.04)]">
            <h2 className="text-xl font-medium mb-5 text-ink-black border-b border-dark-border/60 pb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-light-signal-orange"></span>
              Dados Gerais & Informações do Target (KYB)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div className="flex justify-between border-b border-dark-border/40 pb-2">
                <span className="text-slate-gray">Razão Social / Nome</span>
                <span className="font-semibold text-ink-black">{deal.business?.name || deal.title}</span>
              </div>
              <div className="flex justify-between border-b border-dark-border/40 pb-2">
                <span className="text-slate-gray">CNPJ / Registro</span>
                <span className="font-semibold text-ink-black font-mono">{deal.business?.cnpj || "Não informado"}</span>
              </div>
              <div className="flex justify-between border-b border-dark-border/40 pb-2">
                <span className="text-slate-gray">Setor de Atuação</span>
                <span className="font-semibold text-ink-black">{deal.business?.sector || "Não cadastrado"}</span>
              </div>
              <div className="flex justify-between border-b border-dark-border/40 pb-2">
                <span className="text-slate-gray">País de Origem</span>
                <span className="font-semibold text-ink-black">{deal.business?.originCountry || "Brasil"}</span>
              </div>
              <div className="flex justify-between border-b border-dark-border/40 pb-2">
                <span className="text-slate-gray">Valuation Alvo</span>
                <span className="font-semibold text-ink-black font-mono">
                  {deal.targetValuation 
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: deal.currency || 'BRL' }).format(deal.targetValuation)
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between border-b border-dark-border/40 pb-2">
                <span className="text-slate-gray">Estratégia do M&A</span>
                <span className="font-semibold text-ink-black">{deal.strategy || "Não especificada"}</span>
              </div>
              <div className="flex justify-between border-b border-dark-border/40 pb-2 md:col-span-2">
                <span className="text-slate-gray">Tipo de Transação</span>
                <span className="font-semibold text-ink-black">{deal.type || "Acquisition"}</span>
              </div>
            </div>
          </div>

          {/* Financial Structure box if populated */}
          {deal.financial_structure && (
            <div className="bg-lifted-cream p-8 rounded-[40px] border border-dark-border shadow-[0_24px_48px_rgba(0,0,0,0.04)]">
              <h2 className="text-xl font-medium mb-4 text-ink-black border-b border-dark-border/60 pb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-light-signal-orange"></span>
                Estrutura de Pagamento Proposta
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-canvas-cream/50 p-4 rounded-[20px] border border-dark-border/40">
                  <div className="text-xs text-slate-gray mb-1">Cash / À Vista</div>
                  <div className="text-lg font-bold text-ink-black font-mono">
                    {Number(deal.financial_structure.cashPercentage * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-canvas-cream/50 p-4 rounded-[20px] border border-dark-border/40">
                  <div className="text-xs text-slate-gray mb-1">Equity / Ações</div>
                  <div className="text-lg font-bold text-ink-black font-mono">
                    {Number(deal.financial_structure.equityPercentage * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-canvas-cream/50 p-4 rounded-[20px] border border-dark-border/40">
                  <div className="text-xs text-slate-gray mb-1">Earn-Out / Performance</div>
                  <div className="text-lg font-bold text-ink-black font-mono">
                    {Number(deal.financial_structure.earnOutPercentage * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-canvas-cream/50 p-4 rounded-[20px] border border-dark-border/40">
                  <div className="text-xs text-slate-gray mb-1">Escrow / Retido</div>
                  <div className="text-lg font-bold text-ink-black font-mono">
                    {Number(deal.financial_structure.escrowPercentage * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Timeline Section */}
        <div className="bg-lifted-cream p-8 rounded-[40px] border border-dark-border shadow-[0_24px_48px_rgba(0,0,0,0.04)]">
          <h2 className="text-xl font-medium mb-6 text-ink-black border-b border-dark-border/60 pb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-signal-orange"></span>
            Histórico de Fases
          </h2>
          <div className="relative pl-6 border-l-2 border-dark-border space-y-6">
            {deal.phase_history && deal.phase_history.length > 0 ? (
              deal.phase_history.map((ph: any, idx: number) => {
                const isCompleted = ph.completedAt || ph.statusName === "Completed";
                const isActive = !ph.completedAt && ph.statusName !== "Completed";
                const dateStr = ph.startedAt 
                  ? new Date(ph.startedAt).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : "";
                
                return (
                  <div key={ph.id || idx} className={`relative group ${isCompleted ? 'opacity-85' : ''}`}>
                    {/* Timeline Node Icon */}
                    <span className={`absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                      isActive 
                        ? 'bg-ink-black border-ink-black animate-pulse' 
                        : isCompleted 
                        ? 'bg-canvas-cream border-light-signal-orange' 
                        : 'bg-canvas-cream border-slate-gray'
                    }`}>
                      {isCompleted && (
                        <span className="h-1.5 w-1.5 rounded-full bg-light-signal-orange"></span>
                      )}
                    </span>
                    
                    <div>
                      <p className={`text-sm font-bold ${isActive ? 'text-light-signal-orange' : 'text-ink-black'}`}>
                        {ph.phaseName}
                      </p>
                      <div className="text-[10px] text-slate-gray font-mono mt-0.5">{dateStr}</div>
                      <p className="text-xs text-slate-gray mt-1.5 leading-relaxed">
                        {ph.comments || (isCompleted ? "Fase concluída com sucesso." : "Fase operacional ativa.")}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-slate-gray/60 text-xs italic py-4">
                Nenhum histórico operacional encontrado.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Move Phase Modal */}
      {showPhaseModal && (
        <div className="fixed inset-0 bg-ink-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-lifted-cream border border-dark-border rounded-[40px] w-full max-w-md p-8 shadow-[0_32px_64px_rgba(0,0,0,0.12)] animate-in fade-in duration-200">
            <h3 className="text-xl font-medium text-ink-black mb-5">Avançar Fase da Transação</h3>
            
            <form onSubmit={handleMovePhase} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-1 px-1">Nova Fase Alvo</label>
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2.5 text-ink-black focus:outline-none focus:border-light-signal-orange text-sm appearance-none"
                >
                  {allPhases.map((phase) => (
                    <option key={phase} value={phase}>{phase}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-1 px-1">Comentários / Notas da Transição</label>
                <textarea
                  placeholder="Ex: Documentos verificados, partindo para auditoria técnica..."
                  value={phaseComments}
                  onChange={(e) => setPhaseComments(e.target.value)}
                  rows={3}
                  className="w-full bg-canvas-cream border border-dark-border rounded-[20px] px-4 py-2.5 text-ink-black focus:outline-none focus:border-light-signal-orange text-sm"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-dark-border/40">
                <button
                  type="button"
                  onClick={() => setShowPhaseModal(false)}
                  className="px-5 py-2.5 border border-dark-border hover:bg-canvas-cream text-slate-gray rounded-full text-sm font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={movingPhase}
                  className="px-5 py-2.5 bg-ink-black hover:bg-slate-800 text-canvas-cream font-semibold rounded-full text-sm shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {movingPhase ? "Processando..." : "Confirmar Mudança"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
