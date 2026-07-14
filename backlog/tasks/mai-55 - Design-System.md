---
id: MAI-55
title: Configuração e Codificação do Design System Mastercard
status: Done
assignee:
  - '@Luís Silva'
created_date: '2026-07-14 05:33'
updated_date: '2026-07-14 15:41'
labels:
  - GUI
  - design-system
  - stitch
  - foundation
milestone: m-6
dependencies: []
references:
  - gui/DESIGN.md
priority: high
ordinal: 56000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Definir e consolidar o Design System Mastercard no projeto, atuando exclusivamente como o 'O QUÊ' — a fonte de verdade visual absoluta e especificação formal do sistema. Esta task cobre a especificação formal de todos os componentes de UI, paleta de cores completa (códigos HEX/HSL e papéis visuais), escala tipográfica (tamanhos, pesos, entrelinha, fallbacks como Sofia Sans/Google Fonts), sistema de elevação/sombras (Levels 0-3) e cantos arredondados (radii). Inclui o carregamento e ativação do Design System de gui/DESIGN.md no Stitch MCP via create_design_system_from_design_md, garantindo que o Stitch reconheça o Design System como a fonte unificada de assets e elementos visuais para geração de protótipos.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Design System carregado com sucesso no Stitch MCP via create_design_system_from_design_md usando gui/DESIGN.md
- [x] #2 Paleta de cores completa (Canvas Cream, Ink Black, Signal Orange, etc.) validada visualmente nos protótipos Stitch
- [x] #3 Tipografia configurada com Sofia Sans (Google Fonts) respeitando a hierarquia de pesos: 450 (body), 500 (headlines), 700 (eyebrow)
- [x] #4 Escala de border-radius do Design System (20px, 40px, 50%, 999px) corretamente aplicada nos componentes Stitch
- [x] #5 Sistema de sombras (Level 0-3) e profundidade documentado e testável nos protótipos
<!-- AC:END -->



## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Revisar gui/DESIGN.md garantindo a especificação formal completa do 'O QUÊ' (hex/hsl, escala tipográfica, radii, sombras e especificações formais de componentes). 2. Importar e configurar a fonte Sofia Sans (Google Fonts) no gui/app/layout.tsx como fallback de MarkForMC. 3. Conectar ao Stitch MCP e criar o projeto base (create_project). 4. Realizar upload do gui/DESIGN.md (upload_design_md) e ativar o Design System (create_design_system_from_design_md). 5. Gerar uma tela de validação visual no Stitch para confirmar a fidelidade das especificações visuais e dos assets. 6. Validar a conformidade com o PO.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Projeto Stitch criado e Design System carregado sem erros
- [x] #2 Pelo menos um protótipo de teste gerado no Stitch utilizando o DS carregado para validação visual
- [x] #3 Sofia Sans importada e configurada no gui/app/layout.tsx via next/font/google
- [x] #4 Documento gui/DESIGN.md revisado e versionado como fonte de verdade oficial
<!-- DOD:END -->
