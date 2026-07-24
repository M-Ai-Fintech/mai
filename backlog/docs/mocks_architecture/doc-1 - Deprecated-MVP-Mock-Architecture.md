---
id: doc-1
title: 'Deprecated: MVP Mock Architecture'
type: other
created_date: '2026-07-09 14:59'
updated_date: '2026-07-24 15:42'
tags:
  - deprecated
  - legacy
  - reference
---
# Deprecated: MVP Mock Architecture

- Authority ID: LEGACY-MOCKS-001
- Status: Non-authoritative historical reference
- Language: English
- Freshness: Legacy
- Replaced by: `architecture/vdr-and-integrations/doc-6 - VDR-and-Integration-Architecture.md` and `architecture/data-and-memory/doc-4 - Data-and-Memory-Architecture.md`

This record is retained only for historical context. Current VDR integration and data/memory behavior are governed by the canonical architecture documents above.

Historical note preserved: the MVP used a local `./vdr_rooms/{dealId}` scan with graceful fallback, and `DatabaseMemoryService` merged local business records with a registry-check simulation. Treat this as former mock behavior, not a current contract.
