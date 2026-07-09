---
id: MAI-15
title: Projetar interface Supergood de provedor genérico de VDR
status: Done
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-09 17:30'
labels:
  - core
  - vdr
  - poc
milestone: m-2
dependencies: []
parent_task_id: MAI-13
priority: low
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Estruturar uma interface comum de abstração (provider pattern) integrando a proxy do Supergood para unificar o acesso aos Virtual Data Rooms (VDR) no middleware M&A. A abstração deve permitir que o sistema se comunique de forma agnóstica com diferentes provedores (como Papermark, iDeals e Intralinks), roteando as requisições através do proxy do Supergood para fins de telemetria, logs e resiliência.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Definir a interface TypeScript VDRProvider em src/core/vdr/provider.ts contendo assinaturas para listagem, download, upload e metadados de documentos.
- [x] #2 Implementar a classe BaseVDRProvider que intercepta chamadas de rede e as encapsula de forma a rotear por meio do host de proxy do Supergood, se configurado.
- [x] #3 Validar a estrutura de retorno do VDR (como listas de documentos e metadados) usando Zod schemas, garantindo a conformidade da resposta.
- [x] #4 Suportar um mecanismo de fallback local (mock/local mode) quando a URL do proxy do Supergood não for informada ou as variáveis de ambiente estiverem offline.
- [x] #5 Garantir cobertura de testes unitários para a injeção correta de cabeçalhos do Supergood (ex: x-supergood-api-key, etc.) e as rotas de redirecionamento.
<!-- AC:END -->



## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. **Definição de Tipos e Schemas (Zod)**: Criar `src/core/vdr/types.ts` contendo os Zod schemas e tipos TypeScript correspondentes para `VDRDocument`, `VDRFolder` e a configuração de conexão `SupergoodConfig`.
2. **Design da Interface de Provedor**: Criar a interface `VDRProvider` em `src/core/vdr/provider.ts` com os contratos dos métodos principais (`listDocuments`, `downloadDocument`, `getDocumentMetadata`, `uploadDocument`).
3. **Implementação da Classe Base com Integração Supergood**: Criar a classe abstrata `BaseVDRProvider` em `src/core/vdr/provider.ts`. Desenvolver o método de proxy que formata a URL de requisição apontando para o endpoint do Supergood e injeta os cabeçalhos apropriados (`x-supergood-api-key`, etc.) quando habilitado.
4. **Implementação de Mock Provider para Testes**: Desenvolver o `MockVDRProvider` que estende a classe base e retorna dados sintéticos estruturados sem efetuar requisições reais à rede.
5. **Criação de Testes Unitários**: Escrever testes unitários em `tests/vdr_provider.spec.ts` (usando Deno/TS) para validar a construção de cabeçalhos de proxy do Supergood, o fallback local e o tratamento de erros HTTP.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Garantir 100% de tipagem estrita no módulo, sem o uso inadequado de type casts perigosos ou "any" nas assinaturas públicas.
- [x] #2 Nenhum segredo ou chave de acesso de APIs expostos de forma hardcoded no código ou nos testes.
- [x] #3 Os testes unitários devem cobrir no mínimo 85% das ramificações lógicas da classe BaseVDRProvider e executar com sucesso via Deno test.
- [x] #4 Documentação clara no código (JSDoc) sobre o papel do Supergood e como instanciar e parametrizar um provedor.
<!-- DOD:END -->
