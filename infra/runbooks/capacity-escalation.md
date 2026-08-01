# Capacity escalation

1. Compare CPU, memory, request latency, database connections, storage growth,
   outbox lag, job backlog, retry/dead-letter rate, and budget alerts against
   the approved thresholds.
2. Identify whether pressure belongs to the API process, durable-job worker,
   database, object storage, or an external dependency. Keep the modular
   monolith boundary unless measured scaling or failure evidence supports an
   approved extraction.
3. Apply reversible controls first: drain, rate-limit, bounded concurrency,
   worker lease tuning, queue prioritization, or derived-index throttling.
4. Escalate a capacity change with measurements, requested limits, availability
   impact, cost attribution, RPO/RTO impact, and rollback plan. Never enable
   replicas, failover, CMEK, or network controls by assumption.
5. Record the change and verify health, recovery, data isolation, and budget
   alerts after the change.
