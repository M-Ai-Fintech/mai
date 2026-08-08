# Local credential rotation

1. Identify the local `.env` key and its consumers without copying the value
   into logs, tickets, or command output.
2. Generate a replacement local-only value, update the ignored environment file,
   and recreate only the dependent containers.
3. Verify API/worker readiness, database connectivity, and storage readiness.
4. Confirm structured diagnostics contain only key names or `[REDACTED]` and
   then remove the old value from the local environment.

Cloud secret managers, workload identity, and production credential rotation
are deferred to MAI-81. Papermark credentials are outside MAI-22.
