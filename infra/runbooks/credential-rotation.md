# Credential rotation

1. Identify the secret reference, owning service, consumers, expiry, and
   rotation window without copying the secret value into a ticket or log.
2. Create the replacement in the approved secret manager. CI and deployment
   use workload identity federation or another short-lived credential path;
   no long-lived cloud credential is committed or required in CI.
3. Deploy the reference update, verify API/worker readiness and the smallest
   dependent smoke path, then revoke the old credential.
4. Confirm logs, traces, infrastructure state, and deployment output contain
   only the reference or a redacted marker.
5. Record secret version references, operator, timestamps, and validation
   results. Provider-specific rotation semantics belong to the provider owner.
