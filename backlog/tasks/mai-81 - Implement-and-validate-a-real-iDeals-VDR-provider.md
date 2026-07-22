---
id: MAI-81
title: Implement and validate a real iDeals VDR provider
status: To Do
assignee: []
created_date: '2026-07-22 05:24'
labels:
  - vdr
  - ideals
  - enterprise
  - integration
milestone: m-15
dependencies: []
priority: low
ordinal: 73000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Post-MVP integration for iDeals. Replace the current fetch-mocked mapping shell with an authenticated provider validated against an official sandbox, approved proxy, or documented test environment. This task is intentionally outside the MVP, where Papermark is the sole supported VDR.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Authentication and endpoint contracts are based on current official iDeals integration documentation or an approved integration proxy
- [ ] #2 The provider supports the agreed VDR lifecycle operations with stable internal contracts
- [ ] #3 Contract and sandbox tests cover pagination, permissions, downloads, rate limits, authentication failure, and provider errors
- [ ] #4 Provider-specific fields are translated without leaking iDeals terminology into the canonical VDR domain model
- [ ] #5 Operational setup, credentials, limitations, and support boundary are documented
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests pass against an approved non-mocked integration environment
- [ ] #2 The provider remains disabled unless explicitly configured
- [ ] #3 Papermark MVP behavior is unaffected
<!-- DOD:END -->
