import Link from 'next/link';

export function Sidebar() {
  return (
    <div className="w-64 h-screen bg-lifted-cream border-r border-dark-border flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-dark-border flex items-center justify-between">
        <h1 className="text-lg font-bold text-ink-black flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-signal-orange inline-block"></span>
          M&A Middleware
        </h1>
      </div>
      <nav className="flex-1 p-4 flex flex-col gap-1.5">
        <Link 
          href="/" 
          className="px-4 py-2.5 rounded-full text-sm font-medium text-slate-gray hover:bg-canvas-cream hover:text-ink-black transition-all duration-150"
        >
          Dashboard
        </Link>
        <div className="pt-4 pb-1">
          <p className="px-4 text-xs font-bold text-slate-gray uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-light-signal-orange"></span>
            Módulos CLI
          </p>
        </div>
        <Link 
          href="/deals/sample-deal" 
          className="px-4 py-2.5 rounded-full text-sm font-medium text-slate-gray hover:bg-canvas-cream hover:text-ink-black transition-all duration-150"
        >
          Sourcing & KYB
        </Link>
        <Link 
          href="/deals/sample-deal/engines" 
          className="px-4 py-2.5 rounded-full text-sm font-medium text-slate-gray hover:bg-canvas-cream hover:text-ink-black transition-all duration-150"
        >
          Risco & Valuation (Engines)
        </Link>
        <Link 
          href="/deals/sample-deal/chat" 
          className="px-4 py-2.5 rounded-full text-sm font-medium text-slate-gray hover:bg-canvas-cream hover:text-ink-black transition-all duration-150"
        >
          RAG Orchestrator
        </Link>
        <Link 
          href="/settings" 
          className="px-4 py-2.5 rounded-full text-sm font-medium text-slate-gray hover:bg-canvas-cream hover:text-ink-black transition-all duration-150"
        >
          Configurações (Memória)
        </Link>
      </nav>
      <div className="p-4 border-t border-dark-border text-xs text-slate-gray text-center font-medium">
        GUI pareada com CLI
      </div>
    </div>
  );
}
