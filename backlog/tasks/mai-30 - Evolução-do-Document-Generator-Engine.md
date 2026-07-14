---
id: MAI-30
title: Evolução do Document Generator Engine
status: Done
assignee:
  - Luís Silva
created_date: '2026-07-08 02:26'
updated_date: '2026-07-10 13:45'
labels:
  - engine
  - document
milestone: m-3
dependencies: []
priority: low
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Épico focado na geração e formatação avançada de minutas e contratos legais.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 O sistema é capaz de gerar um SPA Term Sheet completo em PDF, incluindo cláusulas de representações, garantias e condições precedentes
- [ ] #2 O sistema é capaz de gerar NDA, MOU e LOI em PDF com dados dinâmicos injetados via Handlebars a partir do contexto da transação
- [ ] #3 A compilação LaTeX de minutas complexas (>10 páginas) conclui em menos de 30 segundos e produz PDF/A válido
- [ ] #4 O LegalClosingAgent exibe preview estruturado em Markdown na CLI antes de acionar a geração do binário PDF
- [ ] #5 Os documentos gerados passam na validação de esquema Zod definida nos workflows antes de serem persistidos no VDR
- [ ] #6 O motor suporta internacionalização básica: templates em pt-BR e en-US selecionáveis por parâmetro de contexto
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
**Fase 1 – Fundação (MAI-20 LaTeX)**
Configurar pipeline de compilação LaTeX no runtime Deno via FFI/subprocess. Definir estrutura de diretório de templates (src/engines/document/templates/latex/). Implementar wrapper de compilação com timeout e tratamento de erros de compilação.

**Fase 2 – Templates Dinâmicos (MAI-21 PDF/Handlebars)**
Criar templates Handlebars para NDA, MOU, LOI e SPA Term Sheet em src/engines/document/templates/hbs/. Implementar motor de injeção de dados: mapear campos do contexto de transação (dealId, parties, valuationRange, closingDate) para variáveis de template. Integrar pdf-lib para montagem final dos blocos gerados.

**Fase 3 – Integração com LegalClosingAgent (MAI-22)**
Conectar o motor ao LegalClosingAgent via interface DocumentGeneratorEngine. Implementar fluxo: aprovação de termos → preview Markdown na CLI → confirmação → geração do binário → upload ao VDR via Pub/Sub. Adicionar validação Zod de payload antes da geração.

**Fase 4 – Testes, Documentação e Validação Jurídica**
Escrever testes de integração para cada tipo de documento. Obter validação de stakeholder jurídico. Atualizar documentação em docs/engines/document-generator.md.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
**Decisões de Arquitetura:**
- A geração LaTeX é preferível ao Handlebars puro para documentos com formatação jurídica complexa (numeração de cláusulas, referências cruzadas, rodapés legais). Usar LaTeX como caminho primário para SPA Term Sheets e Handlebars/pdf-lib para NDAs e MOUs mais simples.
- O upload ao VDR após geração deve ocorrer via evento Pub/Sub (não chamada direta) para manter o desacoplamento do monolito e facilitar migração futura para Cloud Run.
- Binários PDF não devem ser armazenados em disco local além do cache temporário de compilação; persistir apenas no VDR (Cloud Storage futuro).

**Riscos:**
- Dependência de instalação local do compilador LaTeX (pdflatex/xelatex) no ambiente Deno; considerar imagem Docker dedicada ou execução via subprocess com PATH explícito.
- Templates jurídicos requerem revisão por advogado a cada atualização; criar processo de versionamento de templates no repositório com aprovação obrigatória via PR.

**Referências:**
- Subtasks: MAI-20 (LaTeX), MAI-21 (PDF dinâmico), MAI-22 (refinamento)
- LegalClosingAgent: src/agent/agents/legal_closing.ts
- Motor de documentos: src/engines/document/
- Integração VDR: src/agent/context/ via Pub/Sub
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Todos os subtasks dependentes (MAI-20, MAI-21, MAI-22) estão com status Done
- [ ] #2 Testes de integração cobrem geração de cada tipo de documento (NDA, MOU, LOI, SPA Term Sheet) com dados mockados
- [ ] #3 Nenhum erro de compilação TypeScript (strict mode) ou lint no módulo src/engines/document/
- [ ] #4 Code review aprovado por ao menos um revisor do core team com foco em segurança dos dados do VDR
- [ ] #5 Documentação de uso do motor atualizada em docs/engines/document-generator.md, incluindo exemplos de payload
- [ ] #6 PDFs gerados validados manualmente por stakeholder jurídico para cada template de documento
- [ ] #7 Métricas de performance (tempo de geração por tipo de documento) registradas e dentro dos SLAs definidos nos AC
<!-- DOD:END -->
