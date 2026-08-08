# Local deployment and startup

1. Run `deno task local:prepare`, then load `infra/local/.env` into the current
   shell without echoing it.
2. Validate the local contract with `deno task infra:validate`.
3. Start PostgreSQL and local object storage with the Compose command in
   `infra/README.md`, waiting for health checks. The storage initializer is a
   completed dependency; do not bypass it or claim readiness before the bucket
   exists.
4. Run `deno task db:migrate`. API and worker startup must not apply migrations.
5. Start `api-local` and `worker-local` from the same built image with
   `--profile worker --build --wait`.
6. Confirm `/health/live` and `/health/ready` for both processes, then run
   `deno task infra:smoke`.
7. Record image identifier, migration JSON event, smoke JSON event (including
   the local outbox sink receipt and storage digest), and the operator timestamp.
   Do not record local secret values.

There is no staging or production procedure in this runbook. GCP migration is
deferred to MAI-81.
