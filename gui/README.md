# M&A Low-Touch Middleware GUI

Este diretório contém o Web Dashboard construído com Next.js 16, React 19 e Tailwind CSS v4, adotando a linguagem visual do **Mastercard Editorial Design System**.
Ele foi projetado para ser a interface primária e substituto oficial da CLI para interação com o middleware de M&A.

## 🎨 Documentação de Design

- **Design System ("O QUÊ")**: [DESIGN.md](file:///home/luis/mai/gui/DESIGN.md) — Especificação técnica dos tokens visuais, paleta de cores, tipografia (Sofia Sans) e radii.
- **Design Guidelines ("COMO E QUANDO")**: [DESIGN_GUIDELINES.md](file:///home/luis/mai/gui/DESIGN_GUIDELINES.md) — Regras de aplicação, composição de layout, diretrizes de acessibilidade (WCAG 2.1 AA) e matriz de Do's & Don'ts.
- **Design Tokens**: `tokens/design-tokens.css` — Contrato de código de CSS Custom Properties e estática Tailwind.

## Inicialização

Para rodar o ambiente de desenvolvimento local:

```bash
cd gui
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) com o seu navegador para ver o resultado.

## Construção para Produção

Para compilar o projeto para produção:

```bash
cd gui
npm run build
npm run start
```

## Estrutura de Rotas e Módulos (Pareados com a CLI)

- `/`: Dashboard principal e pipeline de transações (Kanban)
- `/deals/[id]`: Visão geral e KYB
- `/deals/[id]/engines`: Motores computacionais (ONNX para Risco e MILP para Valuation)
- `/deals/[id]/chat`: Interface de chat (RAG Orchestrator)
- `/settings`: Configurações globais e memória de cultura/negociação

## Tipagem (Compatibilidade)
No futuro, os tipos do back-end (`Transaction`, `CompanyFinancialProfile`, `TargetRawInput`) poderão ser compartilhados diretamente ou sincronizados no subdiretório de `types`. Por enquanto, as respostas das rotas em `app/api/...` foram mockadas respeitando a estrutura acordada nos wireframes.

## Environment Variables

Create a `.env.local` file with the following variables:

```env
NEXT_PUBLIC_CORE_API_URL=http://localhost:8000
```

