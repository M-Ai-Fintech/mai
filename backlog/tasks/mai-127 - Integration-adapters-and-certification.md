---
id: MAI-127
title: Integration adapters and certification
status: To Do
assignee: []
created_date: '2026-07-30 09:29'
updated_date: '2026-07-31 20:14'
labels:
  - backend
  - architecture
  - wave-12
  - mai-85-initiative
  - integration
  - security
  - infrastructure
  - api
milestone: m-12
dependencies:
  - MAI-107
  - MAI-112
  - MAI-118
  - MAI-120
  - MAI-122
  - MAI-123
  - MAI-148
documentation:
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/decisions/proposed-tenancy-authorization/doc-27 -
    Proposed-ADR-Tenancy-and-Authorization-Model.md
  - >-
    backlog/docs/decisions/proposed-events-outbox-inbox-jobs/doc-31 -
    Proposed-ADR-Events-Outbox-Inbox-and-Jobs.md
  - >-
    backlog/docs/decisions/proposed-agent-human-authority/doc-34 -
    Proposed-ADR-Agent-Execution-and-Human-Authority.md
  - >-
    backlog/docs/decisions/proposed-documents-vdr-object-storage/doc-35 -
    Proposed-ADR-Documents-VDR-and-Object-Storage.md
priority: high
ordinal: 113000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P24

Objective
Implement and configure approved IdP, object store, VDR, AI, embedding, inference, conversion/OCR, communication and webhook adapters with capability/health evidence.

Exact scope
Provider adapter ports, credentials boundary, capability discovery, conformance/sandbox/failure/health/residency tests and readiness register.

Explicit exclusions
No production-verified label without environment-specific tests and no unapproved provider.

Approved dependencies
BE-P04, BE-P09, BE-P15, BE-P17, BE-P19, BE-P20; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-27, doc-31, doc-34, doc-35.

Likely files or subsystems
provider adapter packages and integration tests.

Deliverables
Conformance/sandbox suites, readiness register and operator docs.

Acceptance and verification strategy
Each enabled adapter passes conformance, sandbox/failure/health/residency tests and readiness evidence; unsupported capability is denied.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Provider-by-provider rollout/credential rotation; rollback adapter/capability flag.

Complexity, parallelization and reviews
Extra-large complexity; Wave 12 adapters may parallelize internally. Recommended model: gpt-5.6-sol, High reasoning for security; gpt-5.6-terra, High reasoning for mechanical adapters. Credentials and infrastructure reviews required.

Deferred implementation inputs and approval gates
Concrete providers, credentials, data-residency decisions and production readiness evidence are mandatory gates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each enabled adapter passes conformance, sandbox/failure/health/residency tests and readiness evidence; unsupported capability is denied.
- [ ] #2 Scope, exclusions, required ADRs, approval gates and review requirements are reflected in implementation evidence.
- [ ] #3 No unauthorized backend/frontend/Figma redesign or production-provider certification is introduced.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Re-read doc-24, required ADRs and real task dependencies.
2. Obtain listed review/approval gates before irreversible or provider-facing work.
3. Implement only the exact bounded scope with named fakes and focused tests.
4. Execute task-specific and canonical verification, record migration/rollout/rollback evidence, then hand off.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Deferred candidate VDR providers:

- iDeals;
- Intralinks.

Current classification:

- not an MVP launch requirement;
- not configured;
- not certified;
- no production-readiness claim;
- provider-specific commercial access, credentials, official documentation, approved sandbox, and support boundaries remain unresolved.

A new provider-specific certification task may be created later when an approved commercial or customer requirement exists.

Local fixture and test-adapter boundary

1. Local filesystem VDR directories, local database rows, seed records, deterministic documents, and in-memory adapters may remain as explicit test fixtures.

2. A local fixture or test adapter is not:
   - a configured provider;
   - a real VDR integration;
   - a real KYB integration;
   - a certified environment;
   - production evidence;
   - proof of provider availability.

3. Fixture adapters must be selected explicitly through test configuration, dependency injection, or a clearly named development boundary.

4. Failure of a configured real provider must not silently select a fixture adapter.

5. Responses produced by fixtures must be labelled as fixture, fake, synthetic, test, or unavailable as appropriate.

6. Fixture-backed tests may prove internal contracts and deterministic behavior, but cannot satisfy MAI-127’s provider-certification criteria.

7. Real provider readiness requires:
   - approved provider documentation;
   - approved environment;
   - credentials;
   - authenticated connectivity;
   - real read/write behavior where applicable;
   - pagination;
   - permission behavior;
   - rate-limit behavior;
   - error behavior;
   - data-handling assessment;
   - environment-specific evidence.

8. Papermark or any selected MVP provider remains subject to MAI-127’s real certification requirements.

9. Deferred candidate providers remain unconfigured and uncertified until a separate approved requirement exists.

10. MAI-151 owns deterministic fast-preflight behavior.

Papermark MVP VDR certification profile

1. Papermark is the sole currently selected MVP VDR candidate.

2. Candidate selection does not mean configured, certified, production-ready, or enabled.

3. Papermark remains disabled outside explicitly configured environments.

4. Certification records the exact:
   - Papermark version or commit;
   - license and permitted deployment model;
   - API version and endpoint set;
   - environment;
   - region;
   - Connector Account;
   - authentication mechanism;
   - storage topology;
   - supported capabilities;
   - unsupported capabilities;
   - known limitations;
   - upgrade and rollback procedure.

5. The authenticated lifecycle suite covers, when supported:
   - account or session authentication;
   - data-room selection or creation;
   - folder creation and listing;
   - document upload;
   - pagination;
   - document listing;
   - metadata retrieval;
   - binary download;
   - permission behavior;
   - cleanup of test fixtures.

6. Failure and operational tests cover:
   - invalid credentials;
   - expired credentials;
   - unavailable provider;
   - missing room;
   - missing folder;
   - missing document;
   - forbidden access;
   - rate limits;
   - malformed responses;
   - timeout;
   - retry behavior;
   - health and capability discovery.

7. Data-handling certification covers:
   - tenant isolation;
   - workspace and Deal isolation;
   - classification;
   - residency;
   - retention;
   - deletion;
   - legal holds;
   - backup and recovery expectations;
   - logging and secret redaction.

8. No fixture, mocked fetch, hardcoded payload, local file, or in-memory result can be presented as successful Papermark certification.

9. Failure of configured Papermark must not silently select a fixture provider.

10. A local self-hosted Papermark instance may be used as an approved non-production certification environment.

11. Local certification is not sufficient production-readiness evidence.

12. Production readiness requires environment-specific security, infrastructure, recovery, operational, and residency evidence.

13. Unsupported capability returns an explicit denied or unavailable result.

14. iDeals and Intralinks remain deferred candidate providers and are not MVP dependencies.
<!-- SECTION:NOTES:END -->
