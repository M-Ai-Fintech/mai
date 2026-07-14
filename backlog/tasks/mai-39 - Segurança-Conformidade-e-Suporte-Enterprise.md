---
id: MAI-39
title: 'Segurança, Conformidade e Suporte Enterprise'
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:26'
updated_date: '2026-07-14 04:55'
labels:
  - enterprise
  - security
milestone: m-8
dependencies: []
priority: low
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Épico centralizador das lógicas fiduciárias corporativas e conformidades de TI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 SSO implementado com suporte a SAML 2.0 e OIDC, integrado ao provider corporativo do cliente
- [ ] #2 RBAC configurado com papéis granulares (Admin, Broker, Viewer, Auditor) e least-privilege aplicado em todas as rotas
- [ ] #3 Audit Log imutável registra todas as ações sensíveis (acesso a VDR, aprovação de termos, geração de documentos) com timestamp e user-id
- [ ] #4 Conformidade LGPD/GDPR validada: consentimento explícito, direito ao esquecimento e política de retenção de dados documentados
- [ ] #5 VPC Service Controls habilitado no ambiente GCP, bloqueando exfiltração de dados fora do perímetro configurado
- [ ] #6 CMEK ativo para todos os dados em repouso: embeddings, PDFs e snapshots do Postgres criptografados com chave gerenciada pelo cliente
- [ ] #7 Monitoramento operacional via Cloud Logging/Stackdriver com alertas configurados para anomalias de autenticação e falhas de autorização
- [ ] #8 Relatório de conformidade exportável em PDF gerado pelo sistema a partir dos Audit Logs
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. **MAI-40 – SSO/OIDC/SAML**: Integrar passport-saml e openid-client no middleware; configurar callback routes e session JWT.
2. **MAI-41 – RBAC**: Definir matriz de papéis (Admin, Broker, Viewer, Auditor); implementar middleware de autorização em todas as rotas críticas.
3. **MAI-42 – Audit Log**: Criar tabela imutável no Postgres (append-only via trigger); logar evento, user-id, IP, timestamp e payload hash em cada ação sensível.
4. **MAI-43 – Conformidade LGPD/GDPR**: Mapear fluxos de dados pessoais; implementar endpoints de consentimento, exportação e exclusão; documentar política de retenção.
5. **MAI-44 – Infra GCP (VPC + CMEK + Logging)**: Configurar VPC Service Controls no perímetro GCP; habilitar CMEK via Cloud KMS para Cloud Storage e Postgres; ativar exportação de logs para Cloud Logging/Stackdriver com alertas de anomalia.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Este épico é pré-requisito para qualquer cliente enterprise que exija conformidade regulatória ou auditoria externa. Prioridade deve ser elevada para 'high' antes do início da fase de vendas B2B. A subtarefa MAI-44 depende da infraestrutura GCP estar provisionada (Milestone m-8). Subtarefas 13.1–13.4 podem ser desenvolvidas em paralelo no monolito Deno antes da migração GCP.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Revisão de segurança interna (security review) realizada e todas as findings críticas e altas resolvidas
- [ ] #2 Ambiente de staging passa em teste de penetração (pentest) básico sem vulnerabilidades críticas abertas
- [ ] #3 Documentação de controles de segurança atualizada no VDR interno (RBAC matrix, data flow diagram, política de retenção)
- [ ] #4 Subtarefas MAI-40 a MAI-44 concluídas e integradas end-to-end sem regressões
- [ ] #5 Pipeline CI/CD valida permissões RBAC e integridade dos Audit Logs em cada deploy
- [ ] #6 Checklist LGPD/GDPR preenchido e aprovado pelo responsável legal do projeto
<!-- DOD:END -->
