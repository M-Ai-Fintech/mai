import Link from 'next/link';

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="p-8">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">Deal Overview: {id}</h1>
            <span className="px-3 py-1 bg-teal-accent/20 text-teal-400 text-xs rounded-full font-semibold border border-teal-accent/30">
              Active
            </span>
          </div>
          <p className="text-slate-400">Detalhes da transação e informações do Target.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-dark-surface border border-dark-border rounded-md hover:bg-slate-800 transition-colors">
            Request VDR Sync
          </button>
          <button className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-500 transition-colors">
            Move Phase
          </button>
        </div>
      </header>

      <div className="mb-6 flex gap-4 border-b border-dark-border pb-4">
        <Link href={`/deals/${id}`} className="text-teal-400 font-semibold border-b-2 border-teal-400 pb-4 -mb-[17px]">
          Overview / Sourcing
        </Link>
        <Link href={`/deals/${id}/engines`} className="text-slate-400 hover:text-slate-200 pb-4">
          Due Diligence & Engines
        </Link>
        <Link href={`/deals/${id}/chat`} className="text-slate-400 hover:text-slate-200 pb-4">
          RAG Orchestrator
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-dark-surface p-6 rounded-lg border border-dark-border">
          <h2 className="text-xl font-semibold mb-4 text-teal-accent">Target Company Info (KYB)</h2>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between border-b border-dark-border pb-2">
              <span className="text-slate-400">Company Name</span>
              <span className="font-medium">TechCorp Solutions</span>
            </div>
            <div className="flex justify-between border-b border-dark-border pb-2">
              <span className="text-slate-400">Registration Number</span>
              <span className="font-medium">12.345.678/0001-99</span>
            </div>
            <div className="flex justify-between border-b border-dark-border pb-2">
              <span className="text-slate-400">Target Valuation</span>
              <span className="font-medium text-cyan-400">$150,000,000</span>
            </div>
          </div>
        </div>
        
        <div className="bg-dark-surface p-6 rounded-lg border border-dark-border">
          <h2 className="text-xl font-semibold mb-4 text-cyan-accent">Phase History Timeline</h2>
          <div className="relative pl-4 border-l-2 border-dark-border space-y-6">
            <div className="relative">
              <div className="absolute -left-[21px] top-1 w-3 h-3 bg-teal-accent rounded-full"></div>
              <p className="text-sm font-semibold">Sourcing & KYB</p>
              <p className="text-xs text-slate-400">Jul 10, 2026 - CLI Agent verified Serpro data.</p>
            </div>
            <div className="relative opacity-50">
              <div className="absolute -left-[21px] top-1 w-3 h-3 bg-slate-600 rounded-full"></div>
              <p className="text-sm font-semibold">Due Diligence (Engines)</p>
              <p className="text-xs text-slate-400">Pending Execution.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
