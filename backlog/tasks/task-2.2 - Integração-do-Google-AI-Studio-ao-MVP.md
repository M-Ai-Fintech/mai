---
id: TASK-2.2
title: Integração do Google AI Studio ao MVP
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-08 02:28'
labels:
  - agent
  - ai
  - mvp
milestone: m-6
dependencies: []
parent_task_id: TASK-2
priority: high
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Esta tarefa envolve a configuração robusta da integração do Google AI Studio no ponto de entrada central de agentes do MVP monolito em Deno (src/agent/index.ts). A integração deve garantir que todos os 7 agentes agênticos especializados carreguem as credenciais de API corretas a partir do ambiente de execução, suportando variáveis de ambiente flexíveis (GOOGLE_GENERATIVE_AI_API_KEY, GOOGLE_API_KEY, GEMINI_API_KEY) para compatibilidade e resiliência local. Além disso, deve unificar a inicialização do provedor @ai-sdk/google (Mastra Core) no ecossistema e estruturar fallbacks amigáveis ou mensagens de erro limpas quando as chaves de API não forem fornecidas, evitando o vazamento de stack traces e prevenindo falhas de inicialização silenciosas.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Substituir inicializações rígidas por uma inicialização unificada e segura do provedor Google AI Studio (utilizando @ai-sdk/google via Mastra) no ponto de entrada src/agent/index.ts e sincronizar com todos os subagentes.
- [ ] #2 Garantir suporte completo a múltiplas variáveis de ambiente (priorizando GOOGLE_GENERATIVE_AI_API_KEY, com fallback para GOOGLE_API_KEY e GEMINI_API_KEY) para validação no momento do boot dos agentes.
- [ ] #3 Implementar mensagens de erro claras e amigáveis ao usuário caso nenhuma chave de API válida seja encontrada nas variáveis de ambiente, prevenindo falhas com stack traces confusos.
- [ ] #4 Permitir testes locais ou execução de dry-run/fallback com mock quando as chaves de API estiverem intencionalmente ausentes em ferramentas secundárias (como o grounding de busca).
- [ ] #5 Verificar que todos os 7 agentes da suite agêntica do MVP monolito herdam e usam a configuração de provedor unificada de forma integrada, com cobertura básica de testes unitários confirmando a inicialização segura.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Etapa 1: Análise e Unificação do Provedor
- Analisar a estrutura atual de inicialização do @ai-sdk/google em src/agent/agents/*/index.ts.
- Padronizar a criação da instância do provedor Google SDK de modo que ela leia de forma centralizada e resiliente as variáveis de ambiente (GOOGLE_GENERATIVE_AI_API_KEY, GOOGLE_API_KEY ou GEMINI_API_KEY).
- Modificar os arquivos individuais de agentes para importarem o modelo configurado centralmente ou utilizarem a mesma parametrização centralizada.

### Etapa 2: Robustez de Validação de Chaves de API
- Ajustar a validação das variáveis no ponto de entrada src/agent/index.ts e expor um utilitário de checagem.
- Caso as chaves de API não estejam configuradas no início da execução da CLI (por exemplo, no boot da interface ou comandos do agent), exibir um aviso amigável ao operador orientando como definir a variável de ambiente (como export GEMINI_API_KEY="...").

### Etapa 3: Integração e Testes
- Atualizar a suíte de testes em tests/agents/config.spec.ts para verificar se os agentes inicializam corretamente e lançam exceções adequadas quando a API Key está ausente.
- Executar os testes locais (deno task test) e verificar o funcionamento de ponta a ponta através da CLI do MVP.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 A inicialização centralizada do provedor de modelos do Google AI Studio foi implementada e testada no Deno.
- [ ] #2 O ponto de entrada de agentes (src/agent/index.ts) não apresenta erros de digitação, erros de compilação TS ou dependências quebradas no runtime.
- [ ] #3 Todas as variáveis de ambiente (GOOGLE_GENERATIVE_AI_API_KEY, GOOGLE_API_KEY, GEMINI_API_KEY) são mapeadas de forma robusta e validadas antes da chamada aos agentes.
- [ ] #4 A suíte de testes (deno task test) executa sem falhas e valida a correta leitura/inicialização das chaves e agentes.
- [ ] #5 A documentação do projeto (incluindo README.md ou guias de setup) foi verificada para garantir que as instruções de configuração de ambiente estão alinhadas.
<!-- DOD:END -->
