Context

Wave G contains Linear issues MAI-39, MAI-41, MAI-42, MAI-43, and MAI-44. Run only after all five implementation PRs are owner-approved and merged. Linear issue state and merged GitHub source are authoritative.

Objective

Close Wave G only after proving valuation authority, restricted matching/shortlist behavior, closing controls, deliverable release authorization, and governance/retention/legal-hold behavior are coherent on merged master.

Relevant scope / architecture

Review exact merged code and issue evidence across Valuation, Matching & Conflicts, Closing, Deliverables & Distribution, and Deal Governance. Verify shared authorization, audit/outbox, stale/invalidation, migrations, human-only transitions, and cross-context integration without repairing feature code.

Parallel read-only reviewers may be used only when separable and materially faster; each receives a concrete `/goal`. The finisher is the sole Linear/Graphify/master closure writer.

Known risks or constraints

Do not waive financial, security, legal-hold, release, irreversible-transition, or required PostgreSQL failures. Do not implement fixes here. A non-passing task blocks its Done transition and wave closure.

Expected verification

Run focused finance/security/legal/recovery/integration checks and canonical `DENO_ENV=test deno task verify`. Reconcile every issue AC, merged PR evidence, migration integrity, and open P0/P1 findings.

When all gates pass, run exactly one `graphify update .`, `git diff --check`, mark MAI-39/41/42/43/44 Done in Linear, remove only merged branches/worktrees, commit `docs: close delivery wave G`, push master, and confirm clean synchronized master. On failure, record blockers and do not close the wave.

Allowed state transitions

The finisher may mark the five Wave G issues Done and push the Wave G closure commit only after every gate passes. It may not repair feature code or start Wave H implementation.

/goal
