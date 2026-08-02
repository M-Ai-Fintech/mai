# Rollback

1. Stop new ingress and drain API requests and workers. Keep the database and
   object-storage services available.
2. Select the last verified application image and deploy it through the same
   approved provider adapter. Do not reverse authoritative schema or data as a
   first rollback action.
3. Preserve PostgreSQL, outbox, inbox, jobs, attempts, audit, evidence, and
   object-storage versions. Requeue or fence work through the durable job
   protocol; never delete records to hide a failed rollout.
4. Check liveness, readiness, database connectivity, outbox dispatch, and job
   recovery. Compare the restored record set with the pre-deployment ledger.
5. Record the cause, image digests, retained data, operator, timestamp, and
   follow-up owner. Any migration reversal requires a separately approved,
   compatibility-safe procedure.
