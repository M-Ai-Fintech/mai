---
id: MAI-9
title: Criar loop de Continuous Learning com captação vetorial
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:25'
updated_date: '2026-07-22 05:28'
labels:
  - agent
  - database
  - poc
  - revalidation
milestone: m-13
dependencies: []
parent_task_id: MAI-8
priority: medium
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementar um loop de aprendizado contínuo (Continuous Learning) no ecossistema de M&A do middleware M&Ai. O loop deve interceptar interações com o usuário broker (feedbacks explícitos, avaliações de relatórios ou correções diretas de parâmetros como WACC, múltiplos e contingências), gerar embeddings vetoriais locais em tempo real (via TransformersEngine.generateEmbedding com o modelo Xenova/all-MiniLM-L6-v2) e persisti-los no DatabaseMemoryService (nas tabelas user_preferences e company_culture_memory). Em consultas futuras, o sistema deve recuperar semanticamente esses aprendizados por similaridade vetorial (utilizando a distância de cosseno do PostgreSQL/pgvector), injetando-os dinamicamente no prompt de sistema dos agentes especializados. O fluxo deve respeitar as regras fiduciárias do projeto, garantindo que o Conhecimento de Domínio (domain_knowledge - leis e normas) sobreponha preferências inválidas e emita alertas de compliance ([COMPLIANCE_CONFLICT]) em caso de divergências.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 O BrokerOrchestratorAgent ou o serviço BrokerOrchestratorService deve interceptar correções e feedbacks estruturados do usuário, invocando o TransformersEngine para gerar embeddings reais (vetor de 384 dimensões) sem travar a interface da CLI.
- [ ] #2 Persistir os registros de feedback e preferências no banco PostgreSQL via DatabaseMemoryService, salvando-os nas tabelas user_preferences e company_culture_memory com o correspondente vetor de embedding.
- [ ] #3 Implementar a busca por similaridade vetorial via searchSimilarKnowledge ou método correspondente no DatabaseMemoryService para obter o histórico de preferências e feedbacks relevantes para a operação ativa.
- [ ] #4 Implementar injeção dinâmica de prompts: antes de encaminhar tarefas aos subagentes (FinancialRiskAgent, LegalDueDiligenceAgent, etc.), o orquestrador deve concatenar as preferências e feedbacks vetoriais recuperados no template de sistema, respeitando o prompt de injeção dinâmica.
- [ ] #5 Aplicar o protocolo de conflito de conformidade: se um feedback ou preferência recuperada do usuário tentar desviar ou conflitar com regras do domain_knowledge (ex: omitir split payment da LC 214/2025 ou omitir provisão de contingências), o sistema deve emitir um alerta [COMPLIANCE_CONFLICT] e forçar o fluxo Human-in-the-Loop (HITL) no CLI.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Modelagem de Dados e Armazenamento (Database Memory):
   - Validar a estrutura atual das tabelas user_preferences, company_culture_memory e domain_knowledge e garantir compatibilidade de armazenamento dos embeddings gerados localmente (384 dimensões) ou preparar o campo para o futuro pg_vector(1536).
   - Adicionar ou otimizar a função de cálculo de similaridade de cosseno direto no banco de dados via query SQL (embedding <=> $1).

2. Captação Vetorial e Pipeline de Embeddings (Transformers Engine):
   - Integrar a chamada a TransformersEngine.generateEmbedding(text) no momento em que o broker envia um comando de correção.
   - Extrair a preferência estruturada usando chamada estruturada do Gemini/Zod para classificar a entrada e mapeá-la ao destino correto (JSONB preferences ou culture_data).

3. Mecanismo de Recuperação Semântica e Prompt Injection:
   - No pipeline do BrokerOrchestratorService, implementar a chamada assíncrona que obtém as preferências/feedbacks vetoriais mais similares à consulta atual antes de qualquer delegação.
   - Atualizar a interpolação de templates dos prompts de sistema para injetar dinamicamente as variáveis {{USER_PREFERENCES_CONTEXT}} e {{DOMAIN_KNOWLEDGE_CONTEXT}}.

4. Verificação de Conformidade e HITL (Compliance Conflict):
   - Criar uma rotina de validação semântica/comparativa (ou regra estruturada) que verifica se a preferência de override entra em choque com o conhecimento de domínio legal ou tributário.
   - Emitir o log de aviso formatado e adicionar a flag de bloqueio para o LegalClosingAgent caso haja conflitos ativos não aprovados por um auditor humano.

5. Testes Unitários, de Integração e Smoke Tests:
   - Adicionar uma suíte de testes no Deno para testar o loop de Continuous Learning completo (ingestão de feedback -> vetorização -> busca por similaridade -> injeção -> detecção de conformidade).
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Auditoria Técnica
created: 2026-07-09 19:22
---
[REVISÃO CRÍTICA] 1. Falha grave de persistência: O código salva feedbacks em um arquivo estático (./data/human_feedback.json) usando `Deno.writeTextFile`, contrariando o AC#2 que exige uso do DatabaseMemoryService no PostgreSQL. 2. Os embeddings prometidos não são gerados e salvos (AC#1 não atendido). 3. A checagem de conformidade (Compliance Conflict) exigida no AC#5 não foi implementada.
---

author: @Antigravity
created: 2026-07-09 20:32
---
Revisão crítica resolvida: Integrado a tabela user_preferences com pgvector real e implementado compliance e fallback.
---

author: @codex
created: 2026-07-22 05:28
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: Continuous-learning tests currently fail through the Broker model mismatch; user/deal identity remains defaulted and company culture is still treated as memory contrary to the Target Dossier decision. Reopen for governed persistence and retrieval.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 O fluxo de feedback e aprendizado contínuo está completamente implementado e integrado à interface CLI.
- [ ] #2 Testes de integração cobrem a geração de embeddings locais, persistência no banco Postgres e recuperação por similaridade de cosseno (com validação de retorno consistente caso a base vetorial esteja offline).
- [ ] #3 O mecanismo de detecção e alerta de conflito de compliance ([COMPLIANCE_CONFLICT]) foi verificado via teste automatizado.
- [ ] #4 O código foi devidamente documentado (especialmente os métodos do DatabaseMemoryService e as novas interações de roteamento/prompting) e está livre de lints ou erros de compilação em Deno.
- [ ] #5 A edição da tarefa foi feita estritamente através dos comandos CLI backlog task edit sem modificação manual direta nos arquivos markdown.
<!-- DOD:END -->
