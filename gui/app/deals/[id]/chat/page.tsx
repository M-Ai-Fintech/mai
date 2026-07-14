"use client";

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { ApiClient } from '@/lib/api-client';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Olá! Sou o BrokerOrchestratorAgent. Analisei os últimos documentos do VDR e o histórico de preferências. Como posso ajudar nas negociações deste Deal?'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deal, setDeal] = useState<any>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch deal metadata on mount
  useEffect(() => {
    ApiClient.getDealById(id)
      .then(data => {
        setDeal(data);
      })
      .catch(err => {
        console.error("Failed to load deal info:", err);
      });
  }, [id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    let assistantResponse = "";

    // Add empty assistant message that will be populated
    setMessages(prev => [...prev, { role: 'assistant', text: "Pensando..." }]);

    const closeStream = ApiClient.chatStream(
      id,
      userMessage,
      (msg) => {
        setIsLoading(false);
        let parsedText = "";
        try {
          const parsed = JSON.parse(msg);
          parsedText = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
        } catch {
          parsedText = msg;
        }

        assistantResponse = parsedText;
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
            updated[updated.length - 1].text = assistantResponse;
          }
          return updated;
        });
      },
      (err) => {
        setIsLoading(false);
        console.error("SSE Error:", err);
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
            updated[updated.length - 1].text = `Erro na comunicação com o agente: ${err?.message || "Conexão perdida"}`;
          }
          return updated;
        });
      }
    );
  };

  return (
    <div className="p-8 h-screen flex flex-col">
      <header className="mb-6 shrink-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-signal-orange"></span>
          <p className="text-xs font-bold text-slate-gray uppercase tracking-wider">M&A WORKFLOW AGENT</p>
        </div>
        <h1 className="text-4xl font-medium text-ink-black tracking-tight">Broker Orchestrator Chat</h1>
        <p className="text-slate-gray mt-1 text-sm">
          RAG Contextual e interação com agentes para o deal: <span className="text-light-signal-orange font-semibold">{deal?.title || id}</span> ({deal?.code || "Loading..."})
        </p>
      </header>

      <div className="mb-6 flex gap-6 border-b border-dark-border pb-4 shrink-0">
        <Link href={`/deals/${id}`} className="text-slate-gray hover:text-ink-black font-semibold pb-4">
          Overview / Sourcing
        </Link>
        <Link href={`/deals/${id}/engines`} className="text-slate-gray hover:text-ink-black font-semibold pb-4">
          Due Diligence & Engines
        </Link>
        <Link href={`/deals/${id}/chat`} className="text-ink-black font-bold border-b-2 border-ink-black pb-4 -mb-[17px] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-signal-orange"></span>
          RAG Orchestrator
        </Link>
      </div>

      <div className="flex-1 min-h-0 flex gap-6">
        <div className="flex-1 flex flex-col bg-lifted-cream border border-dark-border rounded-[40px] overflow-hidden shadow-[0_24px_48px_rgba(0,0,0,0.04)]">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex gap-3.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${msg.role === 'user' ? 'bg-ink-black text-canvas-cream' : 'bg-light-signal-orange text-white'}`}>
                  {msg.role === 'user' ? 'USER' : 'BO'}
                </div>
                <div className={`rounded-[20px] p-4 text-sm text-ink-black max-w-[80%] border ${msg.role === 'user' ? 'bg-canvas-cream border-dark-border' : 'bg-white border-dark-border whitespace-pre-line'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input Panel */}
          <form onSubmit={handleSendMessage} className="p-5 border-t border-dark-border bg-canvas-cream/50">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                disabled={isLoading}
                placeholder={isLoading ? "Aguardando resposta do Broker Orchestrator..." : "Digite uma pergunta ou instrução de negociação..."}
                className="flex-1 bg-white border border-dark-border rounded-full px-5 py-3 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="px-6 py-3 bg-ink-black hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 rounded-full text-sm font-semibold text-canvas-cream transition-all shrink-0 cursor-pointer"
              >
                {isLoading ? "Processando" : "Enviar"}
              </button>
            </div>
          </form>
        </div>

        {/* Side Panel: Context info */}
        <div className="w-80 shrink-0 bg-lifted-cream border border-dark-border rounded-[40px] p-6 flex flex-col justify-between shadow-[0_24px_48px_rgba(0,0,0,0.04)]">
          <div>
            <h3 className="font-semibold text-ink-black mb-4 border-b border-dark-border pb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-orange"></span>
              Contexto do Deal
            </h3>
            <div className="space-y-4 text-sm text-slate-gray">
              <div>
                <p className="text-xs font-bold text-slate-gray uppercase tracking-wider mb-2">Agentes Ativos</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-3 py-1 bg-canvas-cream rounded-full border border-dark-border text-xs text-ink-black font-semibold">BrokerOrchestrator</span>
                  <span className="px-3 py-1 bg-canvas-cream rounded-full border border-dark-border text-xs text-slate-gray">FinancialRisk</span>
                  <span className="px-3 py-1 bg-canvas-cream rounded-full border border-dark-border text-xs text-slate-gray">LegalDueDiligence</span>
                  <span className="px-3 py-1 bg-canvas-cream rounded-full border border-dark-border text-xs text-slate-gray">Negotiation</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-gray uppercase tracking-wider mt-5 mb-2">Referências do VDR</p>
                <ul className="mt-2 space-y-2 text-xs">
                  <li className="flex items-center gap-2 font-medium text-ink-black">
                    <span className="w-2 h-2 rounded-full bg-light-signal-orange"></span> contrato_social.pdf
                  </li>
                  <li className="flex items-center gap-2 font-medium text-ink-black">
                    <span className="w-2 h-2 rounded-full bg-light-signal-orange"></span> demonstrativo_financeiro.xlsx
                  </li>
                  <li className="flex items-center gap-2 font-medium text-ink-black">
                    <span className="w-2 h-2 rounded-full bg-light-signal-orange"></span> kyb_report.json
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="text-center p-2.5 bg-canvas-cream border border-dark-border rounded-full flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] uppercase font-bold text-ink-black tracking-wider">VDR Conectado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
