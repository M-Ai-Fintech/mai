# Deployment

1. Confirm the target manifest is approved and has a provider adapter. Run
   `deno task infra:validate`; do not provision an approval-gated environment.
2. Confirm the image digest, change review, budget, alert routing, secret
   references, private network path, and rollback image are recorded.
3. Run the migration runner as a pre-traffic or compatibility-safe step. The
   API and worker processes never apply schema migrations during startup.
4. Deploy the API and the durable-job worker from the same modular-monolith
   image. Do not create Core, Agent, or Engine services.
5. Wait for `/health/live` and `/health/ready`, then run the environment smoke
   suite: database, object storage, secret resolution, jobs, outbox dispatch,
   and restart recovery.
6. Record image digest, migration result, smoke output, operator, timestamp,
   and remaining warnings. Production promotion remains separately authorized.
