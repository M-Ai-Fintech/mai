# MAI-148 operator runbooks

These runbooks are executable checklists for the modular-monolith deployment
contract. They do not select a cloud provider, region, account, topology
capacity, RPO/RTO, or security exception. Those decisions must be approved in
the environment manifest before a provider adapter is added.

- [Deployment](deployment.md)
- [Migration coordination](migration-coordination.md)
- [Rollback](rollback.md)
- [Backup and restoration](backup-restore.md)
- [Incident response](incident-response.md)
- [Credential rotation](credential-rotation.md)
- [Failed-job recovery](failed-job-recovery.md)
- [Capacity escalation](capacity-escalation.md)

Run local contract evidence with:

```bash
deno task infra:validate
deno task infra:smoke
```

Those commands validate the contract and named local fakes. They are not
staging deployment, provider certification, or production-readiness evidence.
