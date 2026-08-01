# Incident response

1. Open an incident record with correlation ID, environment, first observed
   time, affected process, tenant-safe scope, and current deployment digest.
2. Check health/readiness, database availability, job leases/backlog,
   outbox/inbox failures, storage errors, secret resolution, network paths,
   and recent deployment or migration evidence.
3. Use the least disruptive mitigation: pause ingress, drain a worker, stop a
   dispatcher, or roll back the application image. Do not disable audit,
   retention, authorization, or tenant isolation to restore throughput.
4. Redact secrets, access tokens, document contents, and sensitive fields from
   logs and incident output. Preserve relevant audit and job-attempt evidence.
5. Close with impact, timeline, recovery proof, data-integrity checks, root
   cause, owner-approved follow-ups, and the exact commands that were run.
