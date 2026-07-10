import Link from 'next/link';

export function Sidebar() {
  return (
    <div className="w-64 h-screen bg-dark-surface border-r border-dark-border flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-dark-border">
        <h1 className="text-xl font-bold text-teal-accent flex items-center gap-2">
          M&A <span className="text-foreground">Middleware</span>
        </h1>
      </div>
      <nav className="flex-1 p-4 flex flex-col gap-2">
        <Link href="/" className="px-4 py-2 rounded-md hover:bg-slate-700 transition-colors text-slate-300 hover:text-white">
          Dashboard
        </Link>
        <div className="pt-4 pb-2">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Módulos CLI</p>
        </div>
        <Link href="/deals/sample-deal" className="px-4 py-2 rounded-md hover:bg-slate-700 transition-colors text-slate-300 hover:text-white">
          Sourcing & KYB
        </Link>
        <Link href="/deals/sample-deal/engines" className="px-4 py-2 rounded-md hover:bg-slate-700 transition-colors text-slate-300 hover:text-white">
          Risco & Valuation (Engines)
        </Link>
        <Link href="/deals/sample-deal/chat" className="px-4 py-2 rounded-md hover:bg-slate-700 transition-colors text-slate-300 hover:text-white">
          RAG Orchestrator
        </Link>
        <Link href="/settings" className="px-4 py-2 rounded-md hover:bg-slate-700 transition-colors text-slate-300 hover:text-white">
          Configurações (Memória)
        </Link>
      </nav>
      <div className="p-4 border-t border-dark-border text-xs text-slate-500 text-center">
        GUI pareada com CLI
      </div>
    </div>
  );
}
