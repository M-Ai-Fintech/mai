# Local capacity troubleshooting

1. Inspect container CPU/memory, API latency, PostgreSQL connections, storage
   growth, outbox lag, job backlog, retry/dead-letter counts, and process logs.
2. Identify whether pressure belongs to API, worker, PostgreSQL, storage, or an
   unavailable dependency; keep the modular-monolith boundary.
3. Apply reversible local controls first: drain, restart, bounded worker poll,
   or concurrency changes. Do not delete volumes or increase limits blindly.
4. Record measurements, the command used, the observed effect, and the
   rollback command. Cloud budgets, replicas, and capacity alerts are deferred
   to MAI-81.
