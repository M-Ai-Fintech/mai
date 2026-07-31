---
id: MAI-148
title: >-
  Provision and validate the MAI modular-monolith deployment and operations
  foundation
status: To Do
assignee: []
created_date: '2026-07-31 05:51'
labels:
  - backend
  - architecture
  - infrastructure
  - cloud
  - deployment
  - operations
  - security
  - observability
  - persistence
  - testing
  - mai-85-initiative
milestone: m-12
dependencies:
  - MAI-106
priority: high
ordinal: 134000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the outdated deployment topology described by MAI-33 and MAI-36 with an infrastructure task aligned to the approved MAI modular-monolith architecture.

The deployment topology must follow actual executable and operational boundaries. It must not create independent “Core API”, “Agents”, and “Engines” microservices merely because those technical categories existed in the prototype.

The platform persistence, transactional outbox, inbox, and durable-job mechanisms implemented under MAI-106 remain the authoritative consistency foundation.

An external event broker may be introduced only behind the approved event transport boundary. It must not become necessary for transaction correctness.

This task owns:
- approved cloud-provider and deployment-topology decision;
- infrastructure as code;
- runtime packaging;
- environment separation;
- application and worker deployment;
- network and private connectivity;
- managed PostgreSQL deployment;
- object storage;
- IAM and workload identity;
- secrets management;
- encryption and key-management controls;
- observability;
- backup and restoration;
- deployment and rollback automation;
- operational runbooks;
- infrastructure smoke and recovery tests;
- cost and capacity controls.

This task does not own:
- bounded-context implementation;
- business database migrations;
- provider adapter implementation;
- AI, VDR, OCR, email, or identity-provider certification;
- historical data migration;
- frontend redesign;
- production promotion;
- final release authorization.

Provider-specific certification remains under MAI-127.

Business-data migration and prototype retirement remain under MAI-129.

The final security and operational production-candidate decision remains under MAI-131.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The selected cloud provider, regions, account/project structure, and deployment topology are explicitly approved and recorded.
- [ ] #2 The topology deploys the modular monolith and only those worker or job processes justified by runtime, scaling, isolation, or failure-boundary requirements.
- [ ] #3 The topology does not create arbitrary Core, Agent, or Engine microservices merely to reproduce the prototype structure.
- [ ] #4 Infrastructure as code reproducibly provisions the approved development, staging, and production environment boundaries.
- [ ] #5 Infrastructure state uses an approved remote backend, access control, locking or concurrency protection, backup, and recovery procedure.
- [ ] #6 Runtime services and jobs define: ownership; command or entry point; health and readiness behavior; CPU and memory limits; timeout; concurrency; minimum and maximum scaling; shutdown and drain behavior.
- [ ] #7 Managed PostgreSQL uses private or otherwise explicitly approved connectivity, approved availability settings, automated backups, point-in-time recovery, and a tested restoration procedure.
- [ ] #8 The availability topology, replicas, failover behavior, RPO, and RTO are derived from approved requirements rather than enabled by assumption.
- [ ] #9 Object storage defines: data classifications; tenant and environment boundaries; versioning; lifecycle; retention; legal-hold compatibility; deletion behavior; approved encryption controls.
- [ ] #10 Secrets use the approved secrets manager or equivalent. No long-lived cloud-service credential is committed to the repository or required in CI.
- [ ] #11 CI and deployment automation use workload identity federation or equivalent short-lived credentials.
- [ ] #12 IAM follows least privilege and contains no production Owner, Editor, or equivalent broad grant without an explicit approved exception.
- [ ] #13 Public ingress, private connectivity, network egress, administrative access, and service-to-service access are explicit and minimized.
- [ ] #14 Transactional outbox, inbox, and durable jobs remain correct and recoverable without requiring a cloud message broker.
- [ ] #15 Any cloud event or message transport is implemented behind the approved event interface and has explicit retry, dead-letter, idempotency, and operational semantics.
- [ ] #16 Schema migrations execute through a controlled pre-traffic or compatibility-safe deployment step and are not owned by the deployment runtime itself.
- [ ] #17 Staging smoke tests cover: application health; worker health; database connectivity; object-storage connectivity; secret resolution; durable-job execution; outbox dispatch; restart recovery.
- [ ] #18 Deployment rollback is tested without deleting authoritative database, outbox, inbox, job, audit, evidence, or object-storage records.
- [ ] #19 Logs, metrics, traces, correlation IDs, dashboards, alerts, and audit access are defined for application, worker, database, storage, and deployment operations.
- [ ] #20 Sensitive fields and secrets are redacted from logs, traces, deployment output, and infrastructure state where applicable.
- [ ] #21 Budget controls, cost attribution, capacity thresholds, and unexpected spend alerts are configured.
- [ ] #22 Backup and restoration evidence includes at least one executed restoration test in a non-production environment.
- [ ] #23 Operational runbooks cover: deployment; rollback; database migration coordination; backup; restoration; incident response; credential rotation; failed-job recovery; capacity escalation.
- [ ] #24 No provider, environment, control, or deployment is described as production-ready without executed environment-specific evidence.
- [ ] #25 Infrastructure-focused verification and the canonical repository verification gate pass.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation Notes:
- The target is a modular monolith, not a group of technical microservices.
- Durable database-backed jobs and outbox/inbox mechanisms are authoritative.
- Cloud messaging is optional transport, not transaction truth.
- Production promotion is controlled and is not automatic on every push to master.
- Read replicas, automatic failover, CMEK, and VPC Service Controls require explicit threat-model, availability, regulatory, and cost justification.
- Business-data cutover remains under MAI-129.
- Provider certification remains under MAI-127.
- Final production-candidate approval remains under MAI-131.
- Supersedes MAI-33.
- Supersedes MAI-36.
- Becomes a dependency of MAI-127.
- Becomes a dependency of MAI-129.
- Becomes a dependency of MAI-131.

MAI-148 may execute in parallel with bounded-context domain work after MAI-106, subject to exclusive ownership of infrastructure and deployment paths.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Every acceptance criterion is checked with current evidence.
- [ ] #2 The approved infrastructure topology is represented in version-controlled infrastructure as code.
- [ ] #3 A real staging deployment has passed the required smoke and restart recovery tests.
- [ ] #4 Backup restoration and rollback have been executed successfully in a non-production environment.
- [ ] #5 IAM, secrets, ingress, egress, storage, encryption, and database controls have current review evidence.
- [ ] #6 MAI-127, MAI-129, and MAI-131 depend on MAI-148.
- [ ] #7 Infrastructure documentation and operational runbooks are current.
- [ ] #8 No prototype service topology or local Pub/Sub implementation is treated as production authority.
- [ ] #9 No business-domain, provider-certification, migration, frontend, or final release scope was absorbed into MAI-148.
- [ ] #10 The canonical repository verification gate passes.
<!-- DOD:END -->
