# Migration coordination

1. Confirm the target manifest is approved and the migration owner, change
   window, compatibility strategy, backup point, and rollback decision are
   recorded. Runtime startup must not apply migrations.
2. Review schema changes against PostgreSQL transaction truth, outbox, inbox,
   jobs, audit, evidence, object metadata, and idempotency records. Prefer
   additive and compatibility-safe changes before traffic moves.
3. Take or verify the approved restore point, pause conflicting deployment
   actions, and run the separate migration runner with its least-privilege
   migration role. Do not reuse API or worker runtime credentials.
4. Validate migration status, authoritative row counts, constraints, indexes,
   tenant/workspace/deal boundaries, and rollback compatibility before opening
   traffic. Record the exact migration identifier and output without secrets.
5. If validation fails, stop traffic and use the approved application rollback
   while retaining authoritative records. Reverse a schema change only through
   a separately reviewed compatibility-safe procedure.
