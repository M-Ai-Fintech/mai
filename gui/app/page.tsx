export default function DashboardPage() {
  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-slate-400 mt-2">Visão geral do pipeline de M&A</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-dark-surface p-6 rounded-lg border border-dark-border">
          <h3 className="text-slate-400 text-sm font-semibold mb-2">Total Deals</h3>
          <p className="text-3xl font-bold text-teal-accent">12</p>
        </div>
        <div className="bg-dark-surface p-6 rounded-lg border border-dark-border">
          <h3 className="text-slate-400 text-sm font-semibold mb-2">Volume Total (USD)</h3>
          <p className="text-3xl font-bold text-cyan-accent">$1.2B</p>
        </div>
        <div className="bg-dark-surface p-6 rounded-lg border border-dark-border">
          <h3 className="text-slate-400 text-sm font-semibold mb-2">Risco Médio Predito</h3>
          <p className="text-3xl font-bold text-yellow-500">Médio (Z-Score: 2.1)</p>
        </div>
      </div>

      <div className="bg-dark-surface rounded-lg border border-dark-border p-6">
        <h2 className="text-xl font-semibold mb-4 border-b border-dark-border pb-4">Deals Ativos (Kanban Mock)</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {['Sourcing & KYB', 'Due Diligence', 'Negotiation', 'Closed'].map((phase) => (
            <div key={phase} className="bg-slate-800/50 p-4 rounded-md min-h-[300px]">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">{phase}</h3>
              {phase === 'Sourcing & KYB' && (
                <div className="bg-dark-surface p-3 rounded border border-dark-border mb-3 hover:border-teal-accent cursor-pointer transition-colors">
                  <div className="font-semibold text-teal-400">TechCorp Acquisition</div>
                  <div className="text-xs text-slate-400 mt-1">Status: Pending KYB</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
