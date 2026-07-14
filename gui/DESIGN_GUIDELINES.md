# Design Guidelines & Padrões de Aplicação (Mastercard Editorial System)

> **Importante**: Este documento estabelece o **"COMO E QUANDO"** — as regras prescritivas de aplicação, layout, composição e comportamento para os desenvolvedores e para a engine de **UI Generativa** (MAI-57). Ele complementa o [Design System (gui/DESIGN.md)](file:///home/luis/mai/gui/DESIGN.md), que define a especificação técnica formal dos ativos e tokens visuais (o **"O QUÊ"**).

---

## 1. Princípios de Composição e Layout (Inspiração Mastercard + Benchmark Dealroom.net)

### 1.1 Editorial Canvas, Maior Contraste & Referência Dealroom.net
- **Benchmark Visual & Produto**: O produto final visa a densidade e sofisticação de plataformas M&A líderes como o **[Dealroom.net](https://dealroom.net/)**, combinando gestão de pipeline financeira com elegância editorial.
- **Superfície Base & Contraste Elevado**: O fundo base é **Canvas Cream** (`#F3F0EE`). Para elevar o contraste com cartões brancos (`#FFFFFF`), utilize bordas sutis de alta definição (`1px solid rgba(20,20,19,0.08)`) e sombras de nível 1/2 para separação clara.
- **Alinhamento à Esquerda (Left-Aligned por Padrão)**: Mantenha todo texto, títulos, rótulos e listas alinhados à esquerda por padrão (leitura natural). O alinhamento centralizado deve ser usado com extema parcimônia (apenas em avatares e badges isolados).

### 1.2 Regras de Formas e Radii
- **Containers e Cards Geral**: Diferente dos elementos pílula, containers gerais e cards funcionais de dados usam **radii pequenos** (6px a 12px) para preservar a densidade de informação financeira estilo Dealroom.
- **Exceções Pílula/Circulares**: Radii grandes/pílula (`20px`, `999px`, `50%`) são reservados exclusivamente para:
  - Botões primários (`20px`)
  - Floating Nav Pill (`999px`)
  - Chips/Tags e Badges (`999px`)
  - Retratos e Satellite Micro-CTAs (`50%`)

### 1.3 Uso da Cor Laranja (Signal Orange) & Mídias
- **Ícones em Superfície Laranja**: Sempre que um card, badge ou container possuir fundo laranja (`Signal Orange` ou `Light Signal Orange`), o ícone interno e o texto OBRIGATORIAMENTE devem ser em **Branco puro** (`#FFFFFF`) para alto contraste.
- **Imagens**: Utilize exclusivamente imagens gratuitas do **Unsplash** (ex: `https://images.unsplash.com/...`) para fotografias de executivos, empresas e assets visuais.

---

## 2. Acessibilidade Universal (WCAG 2.1 AA)

Toda interface gerada por desenvolvedores ou por UI Generativa DEVE respeitar os critérios de acessibilidade:

### 2.1 Contraste de Cores
- **Texto Normal (<24px)**: Contraste mínimo de **4.5:1** contra o fundo. Texto principal em `Ink Black` (`#141413`) sobre `Canvas Cream` (`#F3F0EE`) garante 13.2:1.
- **Texto Grande (≥24px ou ≥18px Bold)**: Contraste mínimo de **3.0:1**.
- **Elementos Interativos & Ícones**: Contraste mínimo de **3.0:1** com a superfície adjacente.

### 2.2 Alvos de Toque (Touch Targets)
- Nenhum elemento clicável/interativo deve possuir área de toque inferior a **44×44px** em qualquer breakpoint.
- Botões da nav flutuante e satellite CTAs devem ter dimensão efetiva de **48px a 60px**.

### 2.3 Foco Visível & Leitores de Tela (ARIA)
- Todo elemento interativo deve exibir um anel de foco bem definido ao navegar via teclado (`focus-visible:ring-2 focus-visible:ring-ink-black`).
- Botões que utilizam apenas ícones (ex: Satellite CTA circular ou busca) OBRIGATORIAMENTE exigem atributo `aria-label` descritivo.

---

## 3. Comportamento Responsivo por Breakpoint

| Breakpoint | Faixa de Largura | Comportamento e Adaptação de Layout |
|---|---|---|
| **Mobile** | $\le 767\text{px}$ | Navbar colapsa para formato compacto (Logo + Hamburger + Busca); retração de 2 para 1 coluna; H1 reduz de 64px para 40px; remoção de linhas orbitais decorativas. |
| **Tablet** | $768\text{px} \dots 1023\text{px}$ | Navbar exibe links truncados; retratos de serviços organizam-se em 2 colunas; espaçamento vertical de seções ajusta para 64px. |
| **Desktop** | $1024\text{px} \dots 1439\text{px}$ | Navbar flutuante completa com 5 links principais; disposição assimétrica completa de retratos circulares com linhas orbitais decorativas ativas. |
| **Wide** | $\ge 1440\text{px}$ | Container capado em max-width de 1280px centralizado com margens simétricas; expansão das linhas orbitais decorativas. |

---

## 4. Hierarquia Visual & Uso de Tokens Semânticos

Ao construir componentes em React ou gerar DSL de UI Generativa, consuma exclusivamente os tokens semânticos:

```css
/* Exemplo de aplicação correta de tokens semânticos */
.card-container {
  background-color: var(--color-surface-raised);
  color: var(--color-text-primary);
  border-radius: var(--radius-stadium);
  box-shadow: var(--shadow-level-2);
  padding: var(--spacing-4);
}
```

---

## 5. Matriz de Do's & Don'ts

| Prática | Status | Justificativa / Regra |
|---|---|---|
| Usar Canvas Cream (`#F3F0EE`) como fundo padrão de página | **DO** | Garante o tom editorial aquecido característico da marca. |
| Usar fundo Branco puro (`#FFFFFF`) na página inteira | **DON'T** | Torna a interface estéril e quebra a identidade do sistema. |
| Botões primários com fundo Ink Black (`#141413`) e texto Canvas Cream | **DO** | Proporciona alto contraste e sofisticação tátil. |
| Usar Signal Orange (`#CF4500`) em botões de marketing padrão | **DON'T** | Reservado exclusivamente para consentimento de cookies, aviso legal e privacidade. |
| Formatar a tipografia do corpo com peso 450 (`font-weight: 450`) | **DO** | Peso assinatura do MarkForMC/Sofia Sans que traz suavidade à leitura. |
| Usar fontes serifadas ou fontes de terceiros não autorizadas | **DON'T** | O sistema é estritamente de fonte única (Sofia Sans / MarkForMC). |
| Aplicar border-radius de 20px em botões e 40px em containers hero | **DO** | Respeita a escala intencional de curvas extremas do sistema. |
| Usar cantos arredondados padrão de 8px ou 12px | **DON'T** | Border-radii intermediários parecem genéricos e desalinhados. |
| Acoplar Satellite CTAs circulares em imagens de perfil | **DO** | Cria o elemento visual icônico de satélite em órbita. |
| Utilizar sombras duras e escuras (`drop-shadow` forte) | **DON'T** | As sombras devem ser difusas, leves e atmosféricas (Level 1 ou 2). |
| Aplicar uppercase e tracking em rótulos Eyebrow (14px +4% tracking) | **DO** | Destaca a categoria da seção de forma elegante. |
| Usar caixa alta (uppercase) em títulos H1, H2 ou parágrafos | **DON'T** | Provoca poluição visual e quebra o tom editorial. |

---

## 6. Convenções de Código e Nomenclatura

- **Componentes React**: PascalCase (`Button.tsx`, `NavigationPill.tsx`, `ServiceCard.tsx`).
- **Arquivos de Estilo / Tokens**: kebab-case (`design-tokens.css`, `globals.css`).
- **Interfaces de Props**: Nome do componente + `Props` (ex: `interface ButtonProps`).
- **Storybook**: Localizado junto ao componente (`Button.stories.tsx` e `Button.mdx`).

---

## 7. Diretrizes para Engenharia de Prompt em UI Generativa (MAI-57)

Quando os Agentes de IA forem instruídos a sintetizar esquemas de interface (JSON DSL) para o usuário final, a seguinte diretiva deve ser injetada no contexto do modelo:

> *"Sintetize a interface utilizando estritamente a biblioteca de componentes registrada (MAI-53). Todo fundo de tela deve ser `--color-canvas-cream`. O container principal deve usar radii de 40px (`--radius-stadium`) ou pills de 999px. Botões de ação primária devem ser no tom Ink Black com texto cream. Mantenha os alvos de toque em no mínimo 44px e aplique a tipografia em hierarquia rigorosa H1/H2/Eyebrow."*
