---
id: MAI-48
title: 'Redesign Completo da GUI: Fluxo, Telas e Design System'
status: In Progress
assignee:
  - Luís Silva
created_date: '2026-07-14 05:14'
updated_date: '2026-07-14 16:11'
labels:
  - GUI
  - epic
  - design-system
  - stitch
milestone: m-6
dependencies: []
references:
  - gui/DESIGN.md
  - gui/DESIGN_GUIDELINES.md
priority: high
ordinal: 49000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Épico central da milestone m-6 que coordena a reformulação completa da interface gráfica (gui/) do M&Ai. O objetivo é transformar o boilerplate atual em uma aplicação web premium, profissional e orientada a inteligência composable, estruturada em:

1. **Design System Codificado** (MAI-55, MAI-58, MAI-53): Especificação de Design Tokens CSS/Tailwind v4 e construção da Biblioteca de Componentes React reutilizáveis inspirados nos padrões visuais do gui/DESIGN.md.
2. **Design Guidelines** (MAI-56): Regras formais de composição visual, hierarquia, tom da interface, layout responsivo, acessibilidade (WCAG 2.1 AA) e diretrizes de uso (Do's/Don'ts) documentadas em gui/DESIGN_GUIDELINES.md.
3. **Plataforma Agêntica e UI Generativa (Generative UI)** (MAI-52, MAI-57): Arquitetura para síntese de interfaces dinâmicas em tempo de execução (runtime UI synthesis) pelos agentes de IA via JSON DSL / Component Schema. O motor frontend interpreta o schema e compõe visualizações com os componentes do Design System (MAI-53) sob o rigor das Design Guidelines (MAI-56).
4. **Dashboard Dinâmico e Customizável** (MAI-51, MAI-60): Workspace com layout reorganizável via drag-and-drop, permitindo que telas e visões sintetizadas pelo Generative UI sejam ancoradas como novos widgets no grid.

**Princípio Inegociável — Stitch-First**:
Nenhuma implementação de código desta milestone pode ser iniciada sem que o design correspondente tenha sido previamente prototipado no **Stitch MCP**, revisado e aprovado pelo Product Owner. O fluxo obrigatório é:
1. Criar/carregar o Design System no Stitch (via `create_design_system_from_design_md` usando gui/DESIGN.md)
2. Gerar a tela ou componente no Stitch (`generate_screen_from_text`)
3. Iterar variantes se necessário (`generate_variants`)
4. Obter aprovação do PO sobre o protótipo
5. Só então implementar no código (Next.js/React)

**Stack Técnica da GUI**:
- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- Storybook 9+ com addon MDX para documentação de componentes
- Stitch MCP como ferramenta de prototipagem e validação visual
- Generative UI Engine: Parser/Factory React para JSON DSL (Component Schema)
- API Backend: Deno na porta 8000 (comunicação via ApiClient com SSE)

**Referências de Design**: gui/DESIGN.md (Design System - Tokens e Componentes) e gui/DESIGN_GUIDELINES.md (Design Guidelines - Composição e Diretrizes)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Fluxo completo de navegação do usuário (Banker/Advisor) documentado como user flow diagram, cobrindo: login → dashboard → deal detail → chat agêntico → engines → closing
- [x] #2 Storybook configurado e rodando localmente com suporte a MDX, documentando cada componente isoladamente com props, variantes e exemplos de uso
- [x] #3 Design Tokens exportados como variáveis CSS/Tailwind a partir de gui/DESIGN.md (cores, tipografia, espaçamento, border-radius, sombras)
- [x] #4 Biblioteca de componentes reutilizáveis implementada (Buttons, Cards, Inputs, Navigation, Footer, Modals) seguindo fielmente o Design System Mastercard
- [x] #5 Dashboard principal implementado com 3 views alternáveis (Board/Kanban, Table, Timeline) e filtros por fase, cliente e responsável
- [x] #6 Telas CRUD funcionais para as entidades: Usuários, Clientes (Business), Deals (Transactions), Instituição e Tarefas
- [ ] #7 Tela Agêntica implementada com múltiplos chats simultâneos, acesso contextual aos Engines/VDR dentro do chat e geração de artefatos vinculados a tarefas
- [x] #8 Design Guidelines documentadas em gui/DESIGN_GUIDELINES.md cobrindo padrões de uso, acessibilidade, responsividade e Do's/Don'ts
- [ ] #9 Toda tela e componente novo passou pelo fluxo Stitch-First: prototipado → variantes → aprovação PO → implementação
- [ ] #10 Dynamic Dashboard: usuário final pode customizar a disposição de widgets/cards do dashboard arrastando e reorganizando views
- [x] #11 MDX documentation completa para cada componente no Storybook, incluindo props API, código de exemplo e design rationale
- [x] #12 Design System carregado e ativo no Stitch MCP a partir de gui/DESIGN.md, servindo como fonte de verdade para todos os protótipos da milestone
<!-- AC:END -->













## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Fase 0 — Fundação (Design System MAI-55/58 + Design Guidelines MAI-56)
Construção da fundação visual e normativa.
1. Carregar gui/DESIGN.md no Stitch MCP via create_design_system_from_design_md.
2. Design System (MAI-55, MAI-58): Extrair e codificar design tokens (CSS custom properties + Tailwind v4) para cores, tipografia, espaçamento, border-radius e sombras.
3. Design Guidelines (MAI-56): Documentar regras formais em gui/DESIGN_GUIDELINES.md sobre padrões de composição visual, hierarquia, responsividade, acessibilidade (WCAG 2.1 AA) e Do's/Don'ts.
4. Configurar a fonte Sofia Sans (fallback de MarkForMC) via Google Fonts.

## Fase 1 — Infraestrutura de Documentação (MAI-54 Storybook + MAI-59 MDX)
Setup da infraestrutura que acompanhará cada componente.
1. Instalar e configurar Storybook 9+ no diretório gui/ com suporte a Next.js e Tailwind.
2. Configurar addon MDX para documentação inline de componentes e guidelines.
3. Criar estrutura de pastas: gui/components/{ComponentName}/{ComponentName}.tsx + {ComponentName}.stories.tsx + {ComponentName}.mdx.
4. Documentar o template padrão de story + MDX.

## Fase 2 — Fluxo e Arquitetura de Navegação (MAI-49)
Definição estratégica da experiência do usuário.
1. Mapear o fluxo ideal do usuário (Banker/Advisor) como user flow diagram.
2. Definir a hierarquia de rotas do App Router do Next.js.
3. Prototipar o layout base (sidebar + topbar + content area) no Stitch.
4. Obter aprovação do PO sobre o fluxo e a estrutura de navegação.

## Fase 3 — Biblioteca de Componentes do Design System (MAI-53 Componentização)
Construção modular dos blocos de construção da UI.
1. Para cada componente: prototipar no Stitch → gerar variantes → aprovação PO → implementar → criar story MDX.
2. Ordem de implementação: Buttons → Inputs/Forms → Cards → Navigation (Sidebar + TopBar) → Footer → Modals/Dialogs → Tables → Badges/Tags → Charts.
3. Garantir que cada componente obedeça rigidamente aos tokens de MAI-58 e às regras visuais de MAI-56.

## Fase 4 — Telas Principais (MAI-51 Dashboard + MAI-50 CRUD + MAI-52 Agêntica)
Montagem das visões centrais do sistema utilizando os componentes da Fase 3.
1. Dashboard (MAI-51): Views alternáveis (Board, Table, Timeline), filtros e switching de contexto.
2. CRUD Entidades (MAI-50): Formulários de criação/edição, listagens com paginação, detail views.
3. Tela Agêntica (MAI-52): Multi-chat, integração SSE com agentes, engine panels inline e geração de artefatos.
4. Cada tela segue o fluxo Stitch-First obrigatório.

## Fase 5 — Features Avançadas (MAI-57 Design Generativo / Generative UI + MAI-60 Dashboard Dinâmico)
Inteligência visual composable e workspace customizável.
1. Generative UI (MAI-57): Desenvolver o motor de síntese de UI em tempo de execução (runtime UI synthesis) capaz de interpretar esquemas estruturados (JSON DSL / Component Schema) gerados pelos agentes e renderizar componentes de MAI-53 aplicando as regras de MAI-56. Permitir salvar, reutilizar e exportar essas telas.
2. Dashboard Dinâmico (MAI-60): Implementar grid layout customizável com drag-and-drop, suportando a reorganização de widgets padrão e a ancoragem de widgets sintetizados via Generative UI (MAI-57).

## Dependências entre Fases
- Fase 0 → bloqueia todas as outras (tokens, componentes base e guidelines são pré-requisitos universais)
- Fase 1 → roda em paralelo com a Fase 0 para preparar o ambiente de testes dos componentes
- Fase 2 → bloqueia Fases 3-5 (arquitetura de fluxo aprovada é pré-requisito)
- Fase 3 → bloqueia Fase 4 e 5 (componentes codificados são consumidos pelas telas e pelo motor de Generative UI)
- Fase 4 e 5 → compõem o produto final responsivo e composable.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Todas as subtasks (MAI-49 a MAI-60) finalizadas com status Done
- [ ] #2 Design System do Stitch MCP sincronizado com gui/DESIGN.md e utilizado em todos os protótipos
- [ ] #3 Storybook rodando sem erros com npm run storybook, exibindo todos os componentes documentados via MDX
- [ ] #4 Todas as telas implementadas são responsivas (mobile ≤767px, tablet 768-1023px, desktop ≥1024px) conforme breakpoints do DESIGN.md
- [ ] #5 Nenhum componente ou tela foi implementado sem aprovação prévia do PO sobre o protótipo Stitch
- [ ] #6 Zero erros de lint (npm run lint) e zero erros de build (npm run build) no diretório gui/
- [ ] #7 Cada componente possui ao menos uma story no Storybook com documentação MDX incluindo props API e exemplos
- [ ] #8 Integração funcional com a API backend Deno (porta 8000) validada para cada tela que consome dados reais
<!-- DOD:END -->
