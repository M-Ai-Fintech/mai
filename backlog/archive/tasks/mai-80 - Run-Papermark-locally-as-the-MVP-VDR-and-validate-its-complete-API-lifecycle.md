---
id: MAI-80
title: Run Papermark locally as the MVP VDR and validate its complete API lifecycle
status: To Do
assignee: []
created_date: '2026-07-22 05:24'
updated_date: '2026-07-31 20:14'
labels:
  - vdr
  - papermark
  - mvp
  - integration
milestone: m-10
dependencies: []
references:
  - 'https://github.com/papermark/papermark'
priority: high
ordinal: 72000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adopt one real VDR for the MVP by running the open-source Papermark application locally and validating the MAI integration against that live instance. Papermark is self-hostable but requires PostgreSQL and blob storage; the task must pin and document the supported upstream version and the exact local dependency topology.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A pinned Papermark version runs reproducibly in the local development environment with documented PostgreSQL, authentication, and blob-storage prerequisites
- [ ] #2 Secrets and local credentials are configured through ignored environment files with safe examples
- [ ] #3 An authenticated integration test creates or selects a data room, creates folders, uploads a document, lists it, reads metadata, downloads it, and cleans up its fixtures
- [ ] #4 MAI's Papermark adapter uses the live local API without mocked fetch responses or hardcoded document payloads
- [ ] #5 The structured VDR agent tool can list and read documents through the Papermark-backed provider
- [ ] #6 Failure cases cover invalid credentials, unavailable Papermark, missing documents, rate limits where applicable, and malformed API responses
- [ ] #7 The supported Papermark license/version, API endpoints, known self-hosting limitations, and upgrade procedure are documented
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Superseded by MAI-127 for Papermark adapter certification and by MAI-148 when self-hosting infrastructure is explicitly selected.

Requirements carried forward:

- pinned Papermark version;
- reproducible approved environment;
- documented PostgreSQL, authentication, and blob-storage prerequisites;
- safe secret configuration;
- authenticated lifecycle tests;
- document upload, list, metadata, download, and cleanup;
- provider failure tests;
- license and API documentation;
- upgrade and rollback procedure;
- prohibition of mock or fallback success.

Architecture changed:

- Papermark is the selected MVP VDR candidate, not automatically certified;
- a locally self-hosted instance is optional non-production certification infrastructure;
- local deployment is not automatically the production topology;
- provider certification belongs to MAI-127;
- approved self-hosting infrastructure belongs to MAI-148;
- document synchronization and immutable versions belong to MAI-112;
- fixtures and mocked fetches cannot satisfy live certification;
- failure cannot silently fall back to local documents;
- production readiness requires environment-specific evidence.

Existing local deployment notes, scripts, adapters, tests, and fixtures remain migration evidence until replacement coverage exists.

Archive does not authorize immediate code or infrastructure deletion.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Live Papermark integration tests pass against a freshly provisioned local instance
- [ ] #2 The same tests demonstrably fail when Papermark is unavailable or credentials are invalid
- [ ] #3 No fallback response can be mistaken for a successful real VDR operation
<!-- DOD:END -->
