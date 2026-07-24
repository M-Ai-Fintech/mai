---
id: doc-7
title: M&A Domain Model
type: specification
created_date: '2026-07-24 15:35'
updated_date: '2026-07-24 15:51'
tags:
  - domain
  - ma
  - canonical
---
# M&A Domain Model

- **Authority ID:** DOMAIN-001
- **Owner:** Product and Domain Architecture
- **Authority:** Canonical business-language domain model
- **Freshness:** Current for business concepts and executable schemas documented by MAI-84
- **Language:** English
- **Update trigger:** Core business concepts, lifecycle phases, domain relationships, valuation vocabulary, or human decision boundaries change.

The PostgreSQL schema, API contracts, and Zod schemas are authoritative for persistence and transport shapes.

## Core concepts

- **Transaction (deal):** The central M&A process. It has a title, code, type, strategy, status, target valuation, currency, and phase history.
- **Business:** A company or organization, represented with identity, CNPJ where available, sector, and origin country.
- **Transaction business role:** A relationship that places a business in a transaction with a named role such as buyer, seller, or target.
- **Advisor:** A person or firm associated with a transaction, classified by advisor type and side.
- **Financial structure:** A transaction’s composition of cash, equity, earn-out, and escrow percentages with a total valuation.
- **Phase and phase history:** A defined lifecycle phase, its status, timing, comments, and structured operational data.
- **Flow checkpoint:** An event/workflow recovery record associated with a transaction, agent, topic, and state.
- **VDR document:** A provider-normalized document metadata record; its text chunks can be stored in a deal-scoped retrieval silo.

## Lifecycle

The intended business lifecycle is sourcing/KYB, due diligence, matching/valuation, negotiation, and legal closing. The system’s agent workflow supports those phases, but `phase`, `phase_status`, and active product routes—not a diagram alone—define what is currently executable.

A transaction can associate multiple businesses and advisors. A business may have distinct roles in different transactions. Financial structure records model proposed deal consideration; they are not legal execution instruments by themselves.

## Decision-support boundaries

Prediction, portfolio optimization, valuation ranges, and negotiation scenarios support human judgment. They do not establish binding valuation, legal advice, credit approval, or an autonomous closing decision. Closing artifacts require an explicit human approval boundary.

## Valuation vocabulary

Use the following terms consistently:

- **Equity value:** Value attributable to equity holders.
- **Enterprise value:** Equity value plus debt-like claims less applicable cash adjustments; exact adjustments depend on the deal model.
- **EBITDA:** A performance metric that needs normalization and documented adjustments.
- **Valuation range:** A floor/mid/ceiling or other explicitly parameterized range, rather than an implied single authoritative price.
- **Earn-out and escrow:** Consideration/protection mechanisms whose economics and legal terms must be separately specified.

Document assumptions, source dates, currency, and jurisdiction with any valuation output. Reference colocated financial and legal agent knowledge for jurisdiction-specific guidance; it is not duplicated here.
