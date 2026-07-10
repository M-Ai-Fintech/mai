import Link from 'next/link';

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="p-8 h-screen flex flex-col">
      <header className="mb-6 shrink-0">
        <h1 className="text-3xl font-bold text-foreground">Broker Orchestrator Chat</h1>
        <p className="text-slate-400 mt-2">RAG Contextual e interação com agentes para o deal {id}</p>
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
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center shrink-0">AI</div>
              <div className="bg-slate-800 rounded-lg p-3 text-sm text-slate-200 max-w-[80%] border border-slate-700">
                Olá! Sou o Broker Orchestrator Agent. Analisei os últimos documentos do VDR. Notei uma cláusula de Change of Control no contrato principal. Como deseja proceder com a negociação?
              </div>
            </div>
            <div className="flex gap-3 flex-row-reverse">
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center shrink-0">U</div>
              <div className="bg-cyan-900/50 rounded-lg p-3 text-sm text-slate-200 max-w-[80%] border border-cyan-800">
                Peça ao Legal Agent para rascunhar um waiver e ao Negotiation Agent para preparar 3 alternativas.
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-dark-border bg-slate-900/50">
            <div className="flex gap-2">
              <input type="text" placeholder="Type your message..." className="flex-1 bg-slate-900 border border-dark-border rounded-md px-4 py-2 text-sm focus:outline-none focus:border-teal-accent" />
              <button className="px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-md text-sm font-semibold transition-colors">Send</button>
            </div>
          </div>
        </div>

        <div className="w-80 shrink-0 bg-dark-surface border border-dark-border rounded-lg p-4 flex flex-col">
          <h3 className="font-semibold text-teal-accent mb-4 border-b border-dark-border pb-2">Deal Context</h3>
          <div className="space-y-4 text-sm text-slate-300">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Active Agents</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-xs text-teal-400">Broker</span>
                <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-xs">Legal</span>
                <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-xs">Negotiation</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mt-4">VDR References</p>
              <ul className="mt-2 space-y-1">
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-500"></span> contrato_social.pdf</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-500"></span> termo_de_compromisso.pdf</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
