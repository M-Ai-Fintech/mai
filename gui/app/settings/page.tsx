export default function SettingsPage() {
  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings & Memória</h1>
        <p className="text-slate-400 mt-2">Configurações globais e aprendizado contínuo</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-dark-surface p-6 rounded-lg border border-dark-border">
          <h2 className="text-xl font-semibold mb-4 text-teal-accent">User Preferences</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Default Risk Tolerance</label>
              <select className="w-full bg-slate-900 border border-dark-border rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-accent">
                <option>Conservative</option>
                <option>Moderate</option>
                <option>Aggressive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Preferred Negotiation Style</label>
              <select className="w-full bg-slate-900 border border-dark-border rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-accent">
                <option>Collaborative</option>
                <option>Competitive</option>
                <option>Compromising</option>
              </select>
            </div>
            <button type="button" className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-md text-sm font-semibold transition-colors">
              Save Preferences
            </button>
          </form>
        </div>

        <div className="bg-dark-surface p-6 rounded-lg border border-dark-border">
          <h2 className="text-xl font-semibold mb-4 text-cyan-accent">Memory & Culture (Database)</h2>
          <p className="text-sm text-slate-400 mb-4">Informações retidas pelo Broker Agent ao longo de interações passadas.</p>
          
          <div className="space-y-3">
            <div className="p-3 bg-slate-800 rounded-md border border-slate-700">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-cyan-400 uppercase">Domain Knowledge</span>
                <span className="text-xs text-slate-500">Added: Jul 05</span>
              </div>
              <p className="text-sm text-slate-300">Evitar cláusulas de earn-out atreladas à receita bruta em startups SaaS.</p>
            </div>
            <div className="p-3 bg-slate-800 rounded-md border border-slate-700">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-teal-400 uppercase">Company Culture</span>
                <span className="text-xs text-slate-500">Added: Jun 28</span>
              </div>
              <p className="text-sm text-slate-300">Priorizar retenção de talentos chave na diretoria técnica durante o primeiro ano pós-aquisição.</p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-dark-border">
            <button type="button" className="text-sm text-teal-400 hover:text-teal-300 font-semibold transition-colors">
              + Add Manual Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
