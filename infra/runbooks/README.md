# MVP local operator runbooks

These runbooks describe executable local/containerized procedures only. They
must not be used as GCP, staging, production, provider-certification, or
Papermark evidence.

- [Deployment](deployment.md)
- [Migration coordination](migration-coordination.md)
- [Rollback](rollback.md)
- [Backup and restoration](backup-restore.md)
- [Incident response](incident-response.md)
- [Credential rotation](credential-rotation.md)
- [Failed-job recovery](failed-job-recovery.md)
- [Capacity escalation](capacity-escalation.md)

Run the contract and executable smoke checks with `deno task infra:validate`
and `deno task infra:smoke` after starting the local Compose topology.

Future GCP migration is MAI-81. Adapter behavior and certification remain
MAI-61 ownership; neither may be inferred from local evidence.
