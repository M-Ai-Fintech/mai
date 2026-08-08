# Local failed-job recovery

1. Inspect the tenant-scoped job, immutable attempt records, lease owner,
   sanitized failure, input references, and correlation ID.
2. Confirm lease fencing before any effect. A stale worker must not complete,
   retry, cancel, or renew the job.
3. Requeue only through the durable-job repository; preserve every prior
   attempt. Never delete rows or replace a failure with a fixture result.
4. Recheck input versions, cancellation, timeout, idempotency, and explicit job
   ownership before restarting the worker.
5. Verify related outbox/inbox state and record the redacted operator result.
