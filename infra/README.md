# MAI-148 infrastructure contract

This directory is the version-controlled, provider-neutral deployment contract
for the MAI modular monolith. The executable validator is
`src/platform/operations/contract.ts`; the JSON environment manifests are its
inputs.

## Topology

The deployable unit contains one application image with two justified process
roles:

- `api`: synchronous HTTP and liveness/readiness endpoints.
- `worker`: durable database-backed jobs using the MAI-106 lease and attempt
  protocol.

The transactional outbox, inbox, and jobs remain PostgreSQL-backed truth. A
cloud broker is disabled in every manifest and cannot be required for
transaction correctness. There are no Core, Agent, or Engine microservices.

## Environment gate

Development uses the local Compose adapter. Staging and production contain the
same complete control contract but remain `pending` until an owner records the
provider, regions, account/project, availability, RPO/RTO, security controls,
and provider adapter. `assertProvisionable` fails closed while any of those
inputs are absent.

The manifests define private connectivity, managed PostgreSQL with automated
backup/PITR requirements, versioned tenant/environment-scoped object keys,
secret-manager references, workload identity federation, least-privilege
network/IAM requirements, observability, cost controls, migration ownership,
and retention-safe rollback.

## Local execution

```bash
deno task infra:validate
deno task infra:smoke
docker compose -f infra/local/docker-compose.yml up --build database api
```

The smoke command uses named local probes and is contract evidence only. The
Compose worker is an opt-in profile because application-specific worker factory
registration remains a downstream domain/runtime integration. No local command
is presented as staging or production evidence.

Operational procedures are in [runbooks](runbooks/README.md). The provider
adapter, real staging smoke, backup restoration, and production promotion are
explicitly deferred until their approval and environment evidence gates pass.
