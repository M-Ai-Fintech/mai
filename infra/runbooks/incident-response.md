# Local incident diagnosis

1. Record a correlation ID, affected local process, image identifier, and first
   observed time without copying secrets or payloads.
2. Check API/worker liveness and readiness, PostgreSQL connectivity, storage
   readiness, migration output, recent restart events, and sanitized job
   attempts.
3. Use the least disruptive reversible action: stop new traffic, drain a
   worker, restart a process, or execute the prior-image rollback runbook.
4. Preserve database, outbox, inbox, job, audit, evidence, domain, and storage data.
   Do not reset volumes to hide a failure.
5. Close with commands, timestamps, redacted diagnostics, integrity checks, and
   follow-up owner decisions.
