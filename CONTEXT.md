# MAI Domain Context

A centralized reference for the ubiquitous language used in the MAI M&A middleware.

## Core Concepts

**Deal**:
The overarching process of a merger or acquisition between a Buyer and a Target.
_Avoid_: Transaction, Operação, Negócio

## Risk & Due Diligence

**Risk Severity**:
Standardized lowercase string union representing the severity of a risk: `low`, `medium`, `high`, `critical`.
_Avoid_: Title Case variants (Low, Medium, etc.), numerical scores for severity.

## Deal Structuring & Negotiation

**Negotiation Proposal**:
The mathematical state of an offer during the negotiation phase, focusing on variables like cash, equity, earn-out, and utilities.
_Avoid_: Term Sheet (when referring to the in-progress negotiation)

**Binding Term Sheet**:
The finalized pre-contract document that includes the agreed deal terms plus legal boilerplate (e.g., exclusivity, governing law).
_Avoid_: Term Sheet (when unqualified), LOI (Letter of Intent)

## Due Diligence Deliverables

**Target Dossier**:
The comprehensive artifact and deliverable aggregating all knowledge about a target company. Contains VDR documents, business decisions, and the Company Culture profile.
_Avoid_: Information Memorandum, Deal Memorandum, KYB Report (when referring to the entire aggregate)

## Legal & Dispute Resolution

**Arbitration Chamber**:
A standardized entity elected for dispute resolution. Canonical values: `CAM-CCBC`, `CAM-B3`, `CCI`, `Judicial-Court`.
_Avoid_: Freeform strings, `B3` (without CAM prefix)

## Classification & Taxonomies

**Domain Area**:
A unified taxonomy used to categorize Risks, Contingencies, and Conditions Precedent (CPs). Canonical lowercase values: `corporate`, `financial`, `tax`, `labor`, `civil`, `regulatory`, `environmental`, `operational`, `tech`, `commercial`.
_Avoid_: Creating separate disjoint category lists for different agents (e.g. one list for CPs, another for Risks).
