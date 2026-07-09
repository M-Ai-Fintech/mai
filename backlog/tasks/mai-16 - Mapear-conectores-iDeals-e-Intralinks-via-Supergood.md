---
id: MAI-16
title: Mapear conectores iDeals e Intralinks via Supergood
status: Done
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-09 17:36'
labels:
  - core
  - vdr
  - poc
milestone: m-2
dependencies: []
parent_task_id: MAI-13
priority: low
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Desenvolver as classes adaptadoras de VDR IDealsVDRProvider e IntralinksVDRProvider sob o diretório src/core/vdr/providers/ (ou módulo integrado supergood), estendendo a classe base BaseVDRProvider (projetada em MAI-15). Estes conectores devem gerenciar a comunicação com os VDRs corporativos iDeals e Intralinks roteando as requisições HTTP por meio do proxy reverso do Supergood (Supergood.ai). A integração deve mapear a estrutura de diretórios e arquivos das respectivas APIs legadas e traduzir seus metadados proprietários para os schemas padronizados do middleware (como VDRDocument e VDRFolder). Além disso, as classes devem lidar de forma robusta com autenticação por token ou credenciais e paginação.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Implementar a classe IDealsVDRProvider estendendo BaseVDRProvider para realizar a listagem de arquivos/diretórios e download de documentos do iDeals através do proxy do Supergood.
- [x] #2 Implementar a classe IntralinksVDRProvider estendendo BaseVDRProvider para realizar a listagem de arquivos/diretórios e download de documentos do Intralinks através do proxy do Supergood.
- [x] #3 Implementar mapeamento e tradução automática dos schemas de resposta originais do iDeals e Intralinks para a interface padronizada VDRDocument e VDRFolder usando Zod.
- [x] #4 Garantir suporte completo a tratamento de erros específicos (ex: autenticação expirada, rate limit da API) reportando erros amigáveis ao middleware.
- [x] #5 Incluir cobertura completa de testes unitários para ambos os provedores usando fixtures JSON de respostas reais/mockadas do Supergood e mockando as chamadas HTTP em tests/vdr_connectors.spec.ts.
<!-- AC:END -->



## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Configuração e Mapeamento de Schemas: Mapear os endpoints de iDeals e Intralinks no proxy do Supergood. Definir os Zod schemas correspondentes às respostas originais de cada provedor em src/core/vdr/types.ts.
2. Desenvolvimento do Conector iDeals: Criar src/core/vdr/providers/ideals.ts estendendo BaseVDRProvider. Implementar métodos de listagem recursiva e download de binários injetando cabeçalhos específicos da API do iDeals traduzidos pelo proxy do Supergood.
3. Desenvolvimento do Conector Intralinks: Criar src/core/vdr/providers/intralinks.ts estendendo BaseVDRProvider. Implementar os mesmos métodos para Intralinks mapeando o conceito de Exchanges e Document Index.
4. Implementação de Fixtures e Testes Unitários: Criar arquivos de fixtures JSON em tests/fixtures/ representando as respostas de iDeals e Intralinks. Escrever testes em tests/vdr_connectors.spec.ts cobrindo o fluxo feliz de mapeamento de metadados, download de binários, além de fluxos de erro (erros 4xx/5xx).
5. Integração na Camada RAG: Habilitar o carregamento dinâmico dos novos conectores na inicialização de silos em src/agent/rag_layer.ts.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Ambos os provedores (IDealsVDRProvider e IntralinksVDRProvider) implementados com tipagem estrita no TypeScript/Deno.
- [x] #2 Credenciais e tokens de acesso (como SUPERGOOD_API_KEY) obtidos estritamente a partir de variáveis de ambiente no runtime, sem qualquer dado sensível hardcoded no código ou nos testes.
- [x] #3 Testes unitários cobrindo ao menos 85% da lógica de transformação e tratamento de erros dos novos conectores, executando com sucesso via deno test.
- [x] #4 Código-fonte documentado com JSDoc descrevendo a estrutura de rotas mapeadas via Supergood e as particularidades de cada provedor.
<!-- DOD:END -->
