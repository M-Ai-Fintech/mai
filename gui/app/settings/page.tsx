export default function SettingsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-signal-orange"></span>
          <p className="text-xs font-bold text-slate-gray uppercase tracking-wider">SYSTEM SETTINGS</p>
        </div>
        <h1 className="text-4xl font-medium text-ink-black tracking-tight">Settings & Memória</h1>
        <p className="text-slate-gray mt-1 text-sm">Configurações globais e aprendizado contínuo</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-lifted-cream p-8 rounded-[40px] border border-dark-border shadow-[0_24px_48px_rgba(0,0,0,0.04)]">
          <h2 className="text-xl font-medium mb-5 text-ink-black flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-light-signal-orange"></span>
            Preferências do Usuário
          </h2>
          <form className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-1.5 px-1">Tolerância a Risco Padrão</label>
              <select className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2.5 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange appearance-none">
                <option>Conservador</option>
                <option>Moderado</option>
                <option>Agressivo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-1.5 px-1">Estilo de Negociação Preferido</label>
              <select className="w-full bg-canvas-cream border border-dark-border rounded-full px-4 py-2.5 text-sm text-ink-black focus:outline-none focus:border-light-signal-orange appearance-none">
                <option>Colaborativo</option>
                <option>Competitivo</option>
                <option>Meio-termo</option>
              </select>
            </div>
            <div className="pt-2">
              <button type="button" className="px-6 py-2.5 bg-ink-black hover:bg-slate-800 text-canvas-cream rounded-full text-sm font-semibold transition-colors cursor-pointer">
                Salvar Preferências
              </button>
            </div>
          </form>
        </div>

        <div className="bg-lifted-cream p-8 rounded-[40px] border border-dark-border shadow-[0_24px_48px_rgba(0,0,0,0.04)]">
          <h2 className="text-xl font-medium mb-4 text-ink-black flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-signal-orange"></span>
            Memória & Cultura (Database)
          </h2>
          <p className="text-xs text-slate-gray mb-6 leading-relaxed">Informações retidas pelo Broker Agent ao longo de interações passadas.</p>
          
          <div className="space-y-4">
            <div className="p-4 bg-canvas-cream/50 rounded-[20px] border border-dark-border/40">
              <div className="flex justify-between items-center mb-1 px-1">
                <span className="text-[10px] font-bold text-light-signal-orange uppercase tracking-wider">Domain Knowledge</span>
                <span className="text-[10px] text-slate-gray">Added: Jul 05</span>
              </div>
              <p className="text-sm text-ink-black mt-1 leading-relaxed">Evitar cláusulas de earn-out atreladas à receita bruta em startups SaaS.</p>
            </div>
            <div className="p-4 bg-canvas-cream/50 rounded-[20px] border border-dark-border/40">
              <div className="flex justify-between items-center mb-1 px-1">
                <span className="text-[10px] font-bold text-light-signal-orange uppercase tracking-wider">Company Culture</span>
                <span className="text-[10px] text-slate-gray">Added: Jun 28</span>
              </div>
              <p className="text-sm text-ink-black mt-1 leading-relaxed">Priorizar retenção de talentos chave na diretoria técnica durante o primeiro ano pós-aquisição.</p>
            </div>
          </div>
          
          <div className="mt-6 pt-5 border-t border-dark-border/40">
            <button type="button" className="text-sm text-light-signal-orange hover:text-signal-orange font-bold transition-colors cursor-pointer flex items-center gap-1">
              <span>+ Adicionar Entrada Manual</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
