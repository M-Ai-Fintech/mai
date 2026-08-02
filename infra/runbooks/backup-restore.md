# Backup and restoration

1. Verify automated PostgreSQL backups, point-in-time recovery, object versioning,
   encryption-key recovery, and secrets-manager recovery are enabled in the
   approved environment. Never print secret values or backup credentials.
2. Restore PostgreSQL and object metadata/objects into an isolated non-production
   environment. Include `platform.outbox`, `platform.inbox`, `platform.jobs`,
   audit, evidence, and idempotency records in the protected set.
3. Reconcile object checksums, environment/tenant/workspace/deal boundaries,
   legal holds, and authoritative row counts before reopening traffic.
4. Run `deno task infra:smoke`, the focused persistence/outbox/inbox/job tests,
   and the environment-specific application checks.
5. Record backup identifier, restore point, target environment, checksum and
   isolation results, commands, operator, timestamp, and any derived indexes
   rebuilt after transaction truth was restored.

An unexecuted local or provider-neutral procedure is not restoration evidence.
