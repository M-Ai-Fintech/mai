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
  --profile init up -d --wait postgres-local storage-local
deno task infra:validate
deno task db:migrate
docker compose --env-file infra/local/.env -f infra/local/docker-compose.yml \
  --profile worker up -d --build --wait api-local worker-local
deno task infra:smoke
```

`local:prepare` creates an ignored environment file with local-only random
credentials. Do not print or commit it. Migration is a separate pre-traffic
command and is never run by API or worker startup.

## Recovery evidence

```bash
deno task infra:backup
# Set RESTORE_DATABASE_URL and RESTORE_STORAGE_DIR to isolated targets.
deno task infra:restore
# Set LOCAL_PRIOR_IMAGE to a previously built compatible image.
deno task infra:rollback
```

The backup command writes only under `.local/`, which is ignored. Restore
refuses the active database or storage path and verifies checksums and the
authoritative platform tables after restoration. Rollback retains database and
storage records and never reverses applied migrations.

## Deferred boundary

The future provider is fixed to GCP, but all GCP architecture, accounts,
networking, IAM, budgets, cloud RPO/RTO, staging, and production evidence belong
to MAI-81. Provider adapters and certification, including Papermark, belong to
MAI-61 and are not implemented here.
