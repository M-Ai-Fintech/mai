# M&A Low-Touch Middleware GUI

Este diretório contém o boilerplate do Web Dashboard construído com Next.js e Tailwind CSS (Premium Dark/Teal Theme).
Ele foi projetado para ser uma interface gráfica pareada 1:1 com a CLI do middleware de M&A.

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

