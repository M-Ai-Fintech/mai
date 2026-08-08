# Local prior-image rollback

1. Stop ingress and drain API requests and workers with Compose; keep
   PostgreSQL and local storage running.
2. Set `LOCAL_PRIOR_IMAGE` to the previously built compatible application
   image and run `deno task infra:rollback`.
3. The command verifies the image exists, drains and recreates only API/worker
   containers, waits for API and worker readiness, and compares the complete
   sanitized authoritative manifest (migration IDs/checksums, job/outbox/inbox
   identities/digests, audit/evidence, representative domain records, and
   object keys/content hashes) before and after. It never deletes or rewrites
   authoritative data.
4. The procedure always restores the current image after the exercise. If the
   prior image cannot run against the current schema, record the exact
   compatibility failure and correct the compatibility procedure before claiming
   rollback evidence.
