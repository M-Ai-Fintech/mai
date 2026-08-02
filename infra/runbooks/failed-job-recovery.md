# Failed-job recovery

1. Inspect the tenant-scoped job, attempt history, lease owner, sanitized
   failure, input versions, correlation ID, and audit event.
2. Confirm the current lease is fenced before any external effect. A stale
   worker must not complete, retry, cancel, or renew a job.
3. Requeue only through the durable job repository and preserve every prior
   attempt. Dead-lettered work requires an operator decision and a new audited
   attempt; it is never hidden by deleting rows.
4. Recheck input versions, authorization scope, idempotency key, cancellation,
   timeout, and provider-side duplicate protections before execution.
5. Verify outbox/inbox consequences and record the operator action and result.
