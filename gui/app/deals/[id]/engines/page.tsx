import Link from 'next/link';

export default async function EnginesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Engines & Due Diligence</h1>
        <p className="text-slate-400 mt-2">Motores preditivos e otimização para o deal {id}</p>
      </header>

      <div className="mb-6 flex gap-4 border-b border-dark-border pb-4">
        <Link href={`/deals/${id}`} className="text-slate-400 hover:text-slate-200 pb-4">
          Overview / Sourcing
        </Link>
        <Link href={`/deals/${id}/engines`} className="text-teal-400 font-semibold border-b-2 border-teal-400 pb-4 -mb-[17px]">
          Due Diligence & Engines
        </Link>
        <Link href={`/deals/${id}/chat`} className="text-slate-400 hover:text-slate-200 pb-4">
          RAG Orchestrator
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-dark-surface p-6 rounded-lg border border-dark-border flex flex-col">
          <h2 className="text-xl font-semibold mb-2 text-yellow-400">ONNX Financial Risk Engine</h2>
          <p className="text-sm text-slate-400 mb-6">Executa o modelo preditivo WASM em C++/Rust exportado pelo Google Colab.</p>
          
          <div className="space-y-4 mb-6 flex-1">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">EBITDA Margin</label>
              <input type="range" className="w-full accent-yellow-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Debt to Equity Ratio</label>
              <input type="range" className="w-full accent-yellow-400" />
            </div>
          </div>
          <button className="w-full py-3 bg-yellow-600/20 text-yellow-400 border border-yellow-600/50 rounded-md font-semibold hover:bg-yellow-600/30 transition-colors">
            Run Prediction
          </button>
        </div>

        <div className="bg-dark-surface p-6 rounded-lg border border-dark-border flex flex-col">
          <h2 className="text-xl font-semibold mb-2 text-cyan-accent">MILP Valuation Optimizer</h2>
          <p className="text-sm text-slate-400 mb-6">Otimizador de portfólio e valuation usando restrições lineares (Highs).</p>
          
          <div className="space-y-4 mb-6 flex-1">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Max Capital Allocation</label>
              <input type="number" defaultValue={50000000} className="w-full bg-slate-900 border border-dark-border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Target ROI (%)</label>
              <input type="number" defaultValue={15} className="w-full bg-slate-900 border border-dark-border rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <button className="w-full py-3 bg-cyan-600/20 text-cyan-400 border border-cyan-600/50 rounded-md font-semibold hover:bg-cyan-600/30 transition-colors">
            Run Optimization
          </button>
        </div>
      </div>
      
      <div className="mt-8 bg-black/40 border border-dark-border rounded-lg p-4 font-mono text-xs text-slate-400 h-48 overflow-y-auto">
        <div className="text-teal-400 mb-2">// Engine Console Output</div>
        <div>{`> Ready to execute engines for deal: ${id}...`}</div>
      </div>
    </div>
  );
}
