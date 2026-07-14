# M&A Low-Touch Middleware Web GUI (Milestone MVP_6)

Este diretório contém o Web Dashboard do M&Ai construído com **Next.js 16 (App Router)**, **React 19** e **Tailwind CSS v4**, adotando a estética do **Mastercard Editorial Design System** combinada ao rigor de densidade financeira do benchmark **[Dealroom.net](https://dealroom.net/)**.

Ele é a interface web oficial da aplicação, substituindo a CLI para interação visual com os agentes ADK, VDR e motores analíticos.

---

## 🎨 Documentação de Design & Prototipagem Stitch-First

- **Design System ("O QUÊ")**: [`DESIGN.md`](file:///home/luis/mai/gui/DESIGN.md) — Especificação técnica dos tokens visuais, paleta de cores (Canvas Cream, Ink Black, Signal Orange), tipografia (Sofia Sans) e escala de radii.
- **Design Guidelines ("COMO E QUANDO")**: [`DESIGN_GUIDELINES.md`](file:///home/luis/mai/gui/DESIGN_GUIDELINES.md) — Diretrizes prescritivas de layout, acessibilidade (WCAG 2.1 AA), alinhamento à esquerda por padrão, regras de radii de 8px para containers/tabelas e matriz de Do's & Don'ts.
- **Design Tokens**: `tokens/design-tokens.css` — Variáveis CSS customizadas integradas ao Tailwind CSS v4.
- **Fluxo Inegociável Stitch-First**: Todo componente e tela foi previamente prototipado e aprovado no **Stitch MCP** (Projeto `1310231555884111730` / Asset `assets/6617072512575356605`) antes da codificação em React.

---

## 📚 Componentes & Documentação Isolada (Storybook 10 + MDX)

Cada componente reside em `components/{ComponentName}/` contendo a implementação TypeScript (`.tsx`), histórias do Storybook (`.stories.tsx`) e documentação padronizada (`.mdx` baseada no template em [`components/_template/ComponentTemplate.mdx`](file:///home/luis/mai/gui/components/_template/ComponentTemplate.mdx)).

### Como Executar o Storybook:
```bash
cd gui
npm run storybook
```
Acesse [http://localhost:6006](http://localhost:6006) para interagir com a biblioteca de componentes.

---

## 🖥️ Estrutura Completa de Rotas (Next.js App Router)

- `/`: **Dashboard Principal Multi-View** (Kanban/Board, Tabela, Timeline), filtros por fase e busca, e ancoragem de widgets generativos.
- `/clients`: **Telas CRUD de Entidades** (Listagem e cadastro de clientes Buyers/Sellers).
- `/deals/[id]`: **Visão 360° da Transação** e status de Due Diligence / Sourcing.
- `/deals/[id]/chat`: **Workspace Agêntico RAG** (streaming SSE com o BrokerOrchestratorAgent).
- `/deals/[id]/engines`: **Painel de Motores Analíticos** (Predição de Risco ONNX, Otimização MILP e Algoritmo Genético de Term Sheets).
- `/generative-ui`: **Generative UI Studio** (Síntese de interfaces dinâmicas em tempo de execução via JSON DSL / Component Schema gerados por agentes).
- `/settings`: Configurações globais e preferências do usuário.

---

## ⚡ Inicialização do Servidor de Desenvolvimento

```bash
cd gui
npm install
npm run dev
```
Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

## 📦 Build de Produção

```bash
cd gui
npm run build
npm run start
```

## 🔐 Variáveis de Ambiente (`.env.local`)

```env
NEXT_PUBLIC_CORE_API_URL=http://localhost:8000
```

