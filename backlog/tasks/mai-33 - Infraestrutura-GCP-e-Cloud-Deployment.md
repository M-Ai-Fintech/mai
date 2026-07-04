---
id: MAI-33
title: Infraestrutura GCP e Cloud Deployment
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:26'
updated_date: '2026-07-09 04:43'
labels:
  - cloud
  - infrastructure
milestone: m-6
dependencies: []
priority: low
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Épico de infraestrutura em nuvem na Google Cloud Platform.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Todos os serviços (Core API, Agentes ADK, Engines) implantados como Cloud Run services com health-checks e autoscaling configurados
- [ ] #2 VPC Shared com peering validado entre Cloud Run, Cloud SQL e Cloud Storage; sem exposição pública desnecessária
- [ ] #3 Pub/Sub: todos os tópicos e assinaturas migrados do simulador local para o Google Cloud Pub/Sub com dead-letter configurado
- [ ] #4 Cloud SQL (Postgres) provisionado com réplicas de leitura e failover automático; migração de dados validada via smoke test
- [ ] #5 Cloud Storage: buckets para VDRs, pesos ONNX e PDFs criados com CMEK e versionamento habilitados
- [ ] #6 IAM: service accounts com least-privilege definidas para cada serviço; nenhum papel de Editor/Owner concedido em produção
- [ ] #7 CMEK configurado para Cloud SQL, Cloud Storage e logs sensíveis com chaves gerenciadas pelo time de M&A
- [ ] #8 VPC Service Controls delimitando o perímetro de segurança entre Cloud Run, Vertex AI (futuro) e Cloud Storage
- [ ] #9 Monitoramento e alertas configurados no Cloud Monitoring com dashboards de latência, erro e uso de CPU/memória
- [ ] #10 Pipeline CI/CD (Cloud Build ou GitHub Actions) realizando deploy automático ao Cloud Run em push para branch main
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
**Fase 1 – Provisionamento Base (Semana 1-2)**
1. Criar projeto GCP e habilitar APIs: Cloud Run, Cloud SQL, Cloud Storage, Pub/Sub, Cloud Build, Secret Manager, KMS.
2. Definir estrutura Terraform: módulos separados para rede (VPC), IAM, banco de dados, storage e serviços.
3. Provisionar VPC Shared com sub-redes privadas para Cloud Run e Cloud SQL; configurar Cloud NAT para saída controlada.
4. Criar service accounts com roles mínimas (least-privilege) para Core API, ADK Agents e Engines.

**Fase 2 – Banco de Dados e Storage (Semana 2-3)**
5. Provisionar Cloud SQL Postgres com réplica de leitura e failover; configurar Cloud SQL Auth Proxy nos serviços.
6. Executar script de migração de dados do Postgres local para Cloud SQL e validar integridade.
7. Criar buckets no Cloud Storage (VDRs, ONNX, PDFs) com CMEK (Cloud KMS), versionamento e lifecycle policies.

**Fase 3 – Pub/Sub e Cloud Run (Semana 3-4)**
8. Criar tópicos e assinaturas Pub/Sub substituindo o simulador local; configurar dead-letter topics e ACK deadlines.
9. Containerizar cada serviço Deno com Dockerfile mínimo e publicar imagens no Artifact Registry.
10. Fazer deploy dos Cloud Run services (Core API, Agentes, Engines) com variáveis de ambiente via Secret Manager.
11. Configurar VPC Connector para Cloud Run acessar Cloud SQL e recursos internos sem IP público.

**Fase 4 – Segurança e Observabilidade (Semana 4)**
12. Habilitar VPC Service Controls e criar perímetro de acesso delimitando Cloud Run, Cloud SQL e Cloud Storage.
13. Configurar Cloud Monitoring: dashboards de latência p95, taxa de erro e uso de recursos; alertas com canais Slack/email.
14. Configurar Cloud Logging com log sinks para BigQuery (auditoria de longo prazo).
15. Revisão de segurança: executar Security Command Center e IAM Recommender; corrigir findings críticos.

**Fase 5 – CI/CD e Finalização (Semana 5)**
16. Configurar pipeline CI/CD (Cloud Build ou GitHub Actions) com estágios: lint → test → build → deploy staging → smoke test → promote prod.
17. Executar smoke tests completos em staging; validar todos os AC.
18. Atualizar documentação, diagrama de arquitetura e runbook operacional.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
**Dependências críticas:**
- Este épico é pré-requisito para a migração para Vertex AI (Fase Futura) — a VPC e os service accounts criados aqui serão reutilizados.
- O simulador local de Pub/Sub (arquivo `src/agent/actions.ts`) deve ser desativado somente após validação completa em staging.
- Segredos (GEMINI_API_KEY, credenciais DB) devem migrar para Secret Manager antes do primeiro deploy em Cloud Run.

**Decisões de design:**
- Optar por Cloud Run jobs (não services) para os Engines de longa duração (predição ONNX, geração PDF) para evitar timeout de 3600s.
- Usar Workload Identity Federation no CI/CD em vez de exportar service account keys para o repositório.
- Vertex AI não é provisionado nesta fase; o endpoint de inferência permanece via Google AI Studio (GEMINI_API_KEY) até milestone de produção.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Toda a infraestrutura declarada em Terraform (IaC); state armazenado em Cloud Storage com locking via Cloud SQL ou GCS
- [ ] #2 Smoke tests automatizados passando em ambiente GCP staging: health-check de cada Cloud Run service retorna HTTP 200
- [ ] #3 Testes de conectividade Pub/Sub: mensagem publicada e consumida end-to-end sem perda em ambiente staging
- [ ] #4 Revisão de segurança concluída: IAM Recommender sem sugestões críticas; CMEK e VPC Service Controls validados pelo time de segurança
- [ ] #5 Cloud SQL: backup automático diário configurado e restore testado com sucesso em ambiente de homologação
- [ ] #6 Documentação de arquitetura GCP atualizada (diagrama Mermaid no AGENTS.md) refletindo todos os serviços provisionados
- [ ] #7 Runbook de operações (deploy, rollback, escalonamento) revisado e disponível no repositório
<!-- DOD:END -->
