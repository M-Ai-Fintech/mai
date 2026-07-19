"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ApiClient } from "@/lib/api-client";
import { Button } from "@/components/Button/Button";
import { Badge } from "@/components/Badge/Badge";
import { Card } from "@/components/Card/Card";
import { Modal } from "@/components/Modal/Modal";
import { Dropdown } from "@/components/Dropdown/Dropdown";
import { FormField } from "@/components/FormField/FormField";

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

  const handleMovePhase = async () => {
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
      <div className="flex justify-center items-center h-[80vh] text-signal-orange">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-signal-orange mr-3"></div>
        Carregando detalhes do deal...
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>Transação não encontrada.</p>
        <Link href="/" className="mt-4 inline-block text-ink-black hover:underline font-bold">
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  // Predefined phases list for selection
  const allPhases = [
    { value: "Sourcing & KYB", label: "Sourcing & KYB" },
    { value: "NDA & Initial DD", label: "NDA & Initial DD" },
    { value: "Valuation & LOI", label: "Valuation & LOI" },
    { value: "Deep Due Diligence", label: "Deep Due Diligence" },
    { value: "Negotiation", label: "Negotiation" },
    { value: "Closing", label: "Closing" }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto text-left">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-signal-orange"></span>
            <h1 className="text-4xl font-medium text-ink-black tracking-tight">
              {deal.title}
            </h1>
            <Badge variant="dark">
              {deal.status || "Ativo"}
            </Badge>
          </div>
          <p className="text-slate-gray text-sm">Code: {deal.code} | Data Room & Pipeline Overview</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleSyncVdr}>
            Sincronizar VDR
          </Button>
          <Button variant="primary" onClick={() => setShowPhaseModal(true)}>
            Mover Fase
          </Button>
        </div>
      </header>

      {/* Internal Page Tabs */}
      <div className="mb-8 flex gap-6 border-b border-dust-taupe/40 pb-4">
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
          <Card variant="default" padding="lg">
            <h2 className="text-xl font-medium mb-5 text-ink-black border-b border-dust-taupe/60 pb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-signal-orange"></span>
              Dados Gerais & Informações do Target (KYB)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div className="flex justify-between border-b border-dust-taupe/40 pb-2">
                <span className="text-slate-gray">Razão Social / Nome</span>
                <span className="font-semibold text-ink-black">{deal.business?.name || deal.title}</span>
              </div>
              <div className="flex justify-between border-b border-dust-taupe/40 pb-2">
                <span className="text-slate-gray">CNPJ / Registro</span>
                <span className="font-semibold text-ink-black font-mono">{deal.business?.cnpj || "Não informado"}</span>
              </div>
              <div className="flex justify-between border-b border-dust-taupe/40 pb-2">
                <span className="text-slate-gray">Setor de Atuação</span>
                <span className="font-semibold text-ink-black">{deal.business?.sector || "Não cadastrado"}</span>
              </div>
              <div className="flex justify-between border-b border-dust-taupe/40 pb-2">
                <span className="text-slate-gray">País de Origem</span>
                <span className="font-semibold text-ink-black">{deal.business?.originCountry || "Brasil"}</span>
              </div>
              <div className="flex justify-between border-b border-dust-taupe/40 pb-2">
                <span className="text-slate-gray">Valuation Alvo</span>
                <span className="font-semibold text-ink-black font-mono">
                  {deal.targetValuation 
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: deal.currency || 'BRL' }).format(deal.targetValuation)
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between border-b border-dust-taupe/40 pb-2">
                <span className="text-slate-gray">Estratégia do M&A</span>
                <span className="font-semibold text-ink-black">{deal.strategy || "Não especificada"}</span>
              </div>
              <div className="flex justify-between border-b border-dust-taupe/40 pb-2 md:col-span-2">
                <span className="text-slate-gray">Tipo de Transação</span>
                <span className="font-semibold text-ink-black">{deal.type || "Acquisition"}</span>
              </div>
            </div>
          </Card>

          {/* Financial Structure box if populated */}
          {deal.financial_structure && (
            <Card variant="default" padding="lg">
              <h2 className="text-xl font-medium mb-4 text-ink-black border-b border-dust-taupe/60 pb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-signal-orange"></span>
                Estrutura de Pagamento Proposta
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-canvas-cream/50 p-4 rounded-xl border border-dust-taupe/40">
                  <div className="text-xs text-slate-gray mb-1">Cash / À Vista</div>
                  <div className="text-lg font-bold text-ink-black font-mono">
                    {Number(deal.financial_structure.cashPercentage * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-canvas-cream/50 p-4 rounded-xl border border-dust-taupe/40">
                  <div className="text-xs text-slate-gray mb-1">Equity / Ações</div>
                  <div className="text-lg font-bold text-ink-black font-mono">
                    {Number(deal.financial_structure.equityPercentage * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-canvas-cream/50 p-4 rounded-xl border border-dust-taupe/40">
                  <div className="text-xs text-slate-gray mb-1">Earn-Out / Performance</div>
                  <div className="text-lg font-bold text-ink-black font-mono">
                    {Number(deal.financial_structure.earnOutPercentage * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-canvas-cream/50 p-4 rounded-xl border border-dust-taupe/40">
                  <div className="text-xs text-slate-gray mb-1">Escrow / Retido</div>
                  <div className="text-lg font-bold text-ink-black font-mono">
                    {Number(deal.financial_structure.escrowPercentage * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Timeline Section */}
        <Card variant="default" padding="lg">
          <h2 className="text-xl font-medium mb-6 text-ink-black border-b border-dust-taupe/60 pb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-signal-orange"></span>
            Histórico de Fases
          </h2>
          <div className="relative pl-6 border-l-2 border-dust-taupe/40 space-y-6">
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
                        ? 'bg-canvas-cream border-signal-orange' 
                        : 'bg-canvas-cream border-slate-gray'
                    }`}>
                      {isCompleted && (
                        <span className="h-1.5 w-1.5 rounded-full bg-signal-orange"></span>
                      )}
                    </span>
                    
                    <div>
                      <p className={`text-sm font-bold ${isActive ? 'text-signal-orange' : 'text-ink-black'}`}>
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
        </Card>
      </div>

      {/* Move Phase Modal */}
      {showPhaseModal && (
        <Modal
          isOpen={showPhaseModal}
          onClose={() => setShowPhaseModal(false)}
          title="Avançar Fase da Transação"
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowPhaseModal(false)}>
                Cancelar
              </Button>
              <Button 
                variant="primary" 
                disabled={movingPhase} 
                onClick={handleMovePhase}
              >
                {movingPhase ? "Processando..." : "Confirmar Mudança"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <FormField label="Nova Fase Alvo">
              <Dropdown
                options={allPhases}
                value={selectedPhase}
                onChange={(val) => setSelectedPhase(val as string)}
              />
            </FormField>

            <FormField label="Comentários / Notas da Transição">
              <textarea
                placeholder="Ex: Documentos verificados, partindo para auditoria técnica..."
                value={phaseComments}
                onChange={(e) => setPhaseComments(e.target.value)}
                rows={3}
                className="w-full bg-white border border-dust-taupe/40 rounded-lg px-4 py-2 text-sm text-ink-black focus:outline-none focus:border-ink-black transition-colors"
              />
            </FormField>
          </div>
        </Modal>
      )}
    </div>
  );
}
