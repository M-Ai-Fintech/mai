# Local backup and isolated restoration

1. Load the local environment without printing it and confirm the configured
   MinIO bucket is healthy. Do not copy `.local/storage` while MinIO is live.
2. Run `deno task infra:backup`. It creates a whole PostgreSQL custom-format
   dump, an authenticated object-level storage mirror/tar archive, and a JSON
   manifest with byte counts, SHA-256 checksums, and sanitized authoritative
   identities/digests.
3. Create an isolated local database and empty storage directory for the proof.
   Set `RESTORE_DATABASE_URL`, `RESTORE_STORAGE_DIR`, and `BACKUP_DIR` without
   exposing credentials.
4. Run `deno task infra:restore`. The command refuses active targets, verifies
   both artifact checksums before restore, restores PostgreSQL and storage, and
   compares migration IDs/checksums, jobs, outbox, inbox, audit/evidence,
   representative domain records, and object keys/content digests against the
   pre-backup manifest.
5. Record the manifest, isolated target names, row/object checks, and elapsed
   restore time. Never commit the generated backup directory.
