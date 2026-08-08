# Local migration coordination

1. Confirm `DATABASE_URL` points to the local PostgreSQL target and that the
   API and worker are stopped or not receiving traffic.
2. Run `deno task db:migrate`. The command applies the complete registered
   catalog under the PostgreSQL advisory lock and records checksums in the
   migration ledger.
3. Rerun the command to prove already-applied migrations are idempotent. A
   checksum mismatch or invalid dependency is a hard failure; never edit an
   applied migration.
4. Record the JSON event with registered count and ledger before/after counts.
5. Start traffic only after the migration command succeeds and readiness is
   healthy.

The API and worker never own schema migration execution.
