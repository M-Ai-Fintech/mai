"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { ApiClient } from "@/lib/api-client";
import { Card } from "@/components/Card/Card";
import { Button } from "@/components/Button/Button";
import { Badge } from "@/components/Badge/Badge";

interface Message {
  role: "user" | "assistant";
  text: string;
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Olá! Sou o BrokerOrchestratorAgent. Analisei os últimos documentos do VDR e o histórico de preferências. Como posso ajudar nas negociações deste Deal?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [deal, setDeal] = useState<any>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ApiClient.getDealById(id)
      .then((data) => {
        setDeal(data);
      })
      .catch((err) => {
        console.error("Failed to load deal info:", err);
      });
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsLoading(true);

    setMessages((prev) => [...prev, { role: "assistant", text: "Processando análise do VDR..." }]);

    ApiClient.chatStream(
      id,
      userMessage,
      (msg) => {
        setIsLoading(false);
        let parsedText = "";
        try {
          const parsed = JSON.parse(msg);
          parsedText = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
        } catch {
          parsedText = msg;
        }

        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
            updated[updated.length - 1].text = parsedText;
          }
          return updated;
        });
      },
      (err) => {
        setIsLoading(false);
        console.error("SSE Error:", err);
        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
            updated[updated.length - 1].text = `Erro na comunicação com o agente: ${err?.message || "Conexão perdida"}`;
          }
          return updated;
        });
      }
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-screen flex flex-col text-left">
      <header className="mb-6 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-signal-orange"></span>
          <p className="text-xs font-bold text-slate-gray uppercase tracking-wider">
            WORKFLOW AGÊNTICO DE M&A
          </p>
        </div>
        <h1 className="text-3xl font-medium text-ink-black tracking-tight">
          Broker Orchestrator Chat
        </h1>
        <p className="text-slate-gray mt-1 text-sm">
          Interação contextual RAG para o deal:{" "}
          <span className="text-ink-black font-semibold">
            {deal?.title || id}
          </span>{" "}
          ({deal?.code || "Carregando..."})
        </p>
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b border-dust-taupe pb-3 shrink-0">
        <Link href={`/deals/${id}`} className="text-slate-gray hover:text-ink-black font-semibold text-sm">
          Overview / Sourcing
        </Link>
        <Link href={`/deals/${id}/engines`} className="text-slate-gray hover:text-ink-black font-semibold text-sm">
          Due Diligence & Engines
        </Link>
        <Link href={`/deals/${id}/chat`} className="text-ink-black font-bold text-sm border-b-2 border-ink-black pb-3 -mb-[13px] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-signal-orange"></span>
          RAG Orchestrator
        </Link>
      </div>

      <div className="flex-1 min-h-0 flex gap-6">
        {/* Main Chat Window Card (High Contrast White 8px Radius Card) */}
        <Card variant="default" padding="none" className="flex-1 flex flex-col min-h-0">
          {/* Chat Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                    msg.role === "user"
                      ? "bg-ink-black text-canvas-cream"
                      : "bg-signal-orange text-white"
                  }`}
                >
                  {msg.role === "user" ? "YOU" : "BO"}
                </div>
                <div
                  className={`rounded-lg p-4 text-sm max-w-[80%] border ${
                    msg.role === "user"
                      ? "bg-canvas-cream text-ink-black border-dust-taupe"
                      : "bg-white text-ink-black border-dust-taupe whitespace-pre-line shadow-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Form Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 border-t border-dust-taupe bg-canvas-cream/50 flex gap-3"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              placeholder={
                isLoading
                  ? "Aguardando resposta do Broker Orchestrator..."
                  : "Digite uma pergunta ou instrução de negociação..."
              }
              className="flex-1 bg-white border border-dust-taupe rounded-full px-4 py-2.5 text-sm text-ink-black focus:outline-none focus:ring-2 focus:ring-ink-black disabled:opacity-50"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || !inputValue.trim()}
            >
              {isLoading ? "Processando" : "Enviar"}
            </Button>
          </form>
        </Card>

        {/* Sidebar Context Card */}
        <Card variant="default" padding="md" className="w-80 shrink-0 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-ink-black mb-4 border-b border-dust-taupe pb-2 text-sm">
              Contexto do Deal
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-gray uppercase tracking-wider mb-2">
                  Agentes Ativos
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="dark">BrokerOrchestrator</Badge>
                  <Badge variant="default">FinancialRisk</Badge>
                  <Badge variant="default">LegalDD</Badge>
                  <Badge variant="default">Negotiation</Badge>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-gray uppercase tracking-wider mb-2">
                  Referências do VDR
                </p>
                <ul className="space-y-1.5 text-xs text-ink-black font-medium">
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-signal-orange"></span>{" "}
                    contrato_social.pdf
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-signal-orange"></span>{" "}
                    balanco_2025.xlsx
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-signal-orange"></span>{" "}
                    kyb_report.json
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <Badge variant="orange" className="justify-center py-2 mt-4">
            • VDR CONECTADO & SINCRONIZADO
          </Badge>
        </Card>
      </div>
    </div>
  );
}
