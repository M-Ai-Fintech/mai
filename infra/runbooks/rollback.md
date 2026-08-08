# Local prior-image rollback

1. Stop ingress and drain API requests and workers with Compose; keep
   PostgreSQL and local storage running.
2. Set `LOCAL_PRIOR_IMAGE` to the previously built compatible application
   image and run `deno task infra:rollback`.
3. The command verifies the image exists, recreates only API/worker containers,
   waits for API readiness, and compares migration, job, outbox, and inbox
   counts before and after. It never deletes or rewrites authoritative data.
4. If the prior image cannot run against the current schema, record the exact
   compatibility failure, restore the current image, and correct the deployment
   compatibility procedure before claiming rollback evidence.
