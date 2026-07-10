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
        <h1 className="text-3xl font-bold text-foreground">Broker Orchestrator Chat</h1>
        <p className="text-slate-400 mt-2">
          RAG Contextual e interação com agentes para o deal: <span className="text-teal-400 font-semibold">{deal?.title || id}</span> ({deal?.code || "Loading..."})
        </p>
      </header>

      <div className="mb-6 flex gap-4 border-b border-dark-border pb-4 shrink-0">
        <Link href={`/deals/${id}`} className="text-slate-400 hover:text-slate-200 pb-4">
          Overview / Sourcing
        </Link>
        <Link href={`/deals/${id}/engines`} className="text-slate-400 hover:text-slate-200 pb-4">
          Due Diligence & Engines
        </Link>
        <Link href={`/deals/${id}/chat`} className="text-teal-400 font-semibold border-b-2 border-teal-400 pb-4 -mb-[17px]">
          RAG Orchestrator
        </Link>
      </div>

      <div className="flex-1 min-h-0 flex gap-6">
        <div className="flex-1 flex flex-col bg-dark-surface border border-dark-border rounded-lg overflow-hidden">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${msg.role === 'user' ? 'bg-teal-600 text-white' : 'bg-slate-700 text-teal-400'}`}>
                  {msg.role === 'user' ? 'USER' : 'BO'}
                </div>
                <div className={`rounded-lg p-3 text-sm text-slate-200 max-w-[80%] border ${msg.role === 'user' ? 'bg-cyan-900/40 border-cyan-800' : 'bg-slate-800 border-slate-700 whitespace-pre-line'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input Panel */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-dark-border bg-slate-900/50">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                disabled={isLoading}
                placeholder={isLoading ? "Aguardando resposta do Broker Orchestrator..." : "Digite uma pergunta ou instrução de negociação..."}
                className="flex-1 bg-slate-900 border border-dark-border rounded-md px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-400 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-md text-sm font-semibold transition-colors shrink-0"
              >
                {isLoading ? "Processando" : "Enviar"}
              </button>
            </div>
          </form>
        </div>

        {/* Side Panel: Context info */}
        <div className="w-80 shrink-0 bg-dark-surface border border-dark-border rounded-lg p-4 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-teal-accent mb-4 border-b border-dark-border pb-2">Deal Context</h3>
            <div className="space-y-4 text-sm text-slate-300">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Active Agents</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-xs text-teal-400">BrokerOrchestrator</span>
                  <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-xs">FinancialRisk</span>
                  <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-xs">LegalDueDiligence</span>
                  <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-xs">Negotiation</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mt-4">VDR References</p>
                <ul className="mt-2 space-y-1">
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-500"></span> contrato_social.pdf</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-500"></span> demonstrativo_financeiro.xlsx</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-500"></span> kyb_report.json</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="text-center p-2 bg-teal-950/20 border border-teal-900/50 rounded-md">
            <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wide">VDR Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
