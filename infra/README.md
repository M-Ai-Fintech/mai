# MVP local operations foundation

This directory is the executable local/containerized contract for the MAI
modular monolith. It is not GCP, staging, production, or provider-certification
evidence. The active manifest is the local-only compatibility manifest at
`infra/environments/development.json`; its `environment` value is `local`.

The deployable topology is intentionally small:

- `api-local`: the modular-monolith HTTP process;
- `worker-local`: the durable-job worker, restricted to the explicit
  `operations.healthcheck` local job type;
- `postgres-local`: PostgreSQL truth for transactions, outbox, inbox, jobs, and
  the migration ledger;
- `storage-local`: the explicitly configured MinIO local storage boundary.

No external broker or Core/Agent/Engine microservice is required.

## Reproduce the local environment

```bash
deno task local:prepare
set -a; . infra/local/.env; set +a
docker compose --env-file infra/local/.env -f infra/local/docker-compose.yml \
  up -d --wait postgres-local storage-local
deno task infra:validate
deno task db:migrate
docker compose --env-file infra/local/.env -f infra/local/docker-compose.yml \
  --profile worker up -d --build --wait api-local worker-local
deno task infra:smoke
```

`local:prepare` creates an ignored environment file with local-only random
credentials for PostgreSQL and MinIO independently, writes it as `0600` where
supported, and includes `DATABASE_URL` plus the local API, worker, and storage
boundaries. Do not print or commit it. `storage-init-local` is a completed
dependency of API and worker startup and creates the authenticated bucket before
readiness. Migration is a separate pre-traffic command and is never run by API
or worker startup.

For a clean checkout with no generated local files, run the exact executable
proof (it fails rather than consuming an existing local environment):

```bash
deno task infra:bootstrap
```

The local object-storage contract proves authenticated bucket existence, a
bounded write/read and SHA-256 equality, persistence across a storage restart,
and explicit failure when the configured dependency is unavailable. MinIO
versioning, lifecycle, retention, legal hold, and approval-controlled deletion
are not configured or claimed by this MVP; those capabilities remain deferred.

## Recovery evidence

```bash
deno task infra:backup
# Set RESTORE_DATABASE_URL and RESTORE_STORAGE_DIR to isolated targets.
deno task infra:restore
# Set LOCAL_PRIOR_IMAGE to a previously built compatible image.
deno task infra:rollback
```

The backup command writes only under `.local/`, which is ignored. It uses an
authenticated object-level MinIO mirror rather than copying a live storage
engine directory, records artifact checksums and a sanitized authoritative
manifest, and restores only into isolated database and storage targets. Restore
refuses active targets and compares migration IDs/checksums, job/outbox/inbox,
audit/evidence sentinels, and object keys/content hashes. Rollback retains
database and storage records, compares the same manifest, restores the current
image after the exercise, and never reverses applied migrations.

## Deferred boundary

The future provider is fixed to GCP, but all GCP architecture, accounts,
networking, IAM, budgets, cloud RPO/RTO, staging, and production evidence belong
to MAI-81. Provider adapters and certification, including Papermark, belong to
MAI-61 and are not implemented here.
