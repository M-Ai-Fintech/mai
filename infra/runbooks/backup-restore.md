# Local backup and isolated restoration

1. Load the local environment without printing it and ensure `.local/storage`
   contains the configured local storage data.
2. Run `deno task infra:backup`. It creates a whole PostgreSQL custom-format
   dump, a deterministic object-storage tar archive, and a JSON manifest with
   byte counts and SHA-256 checksums.
3. Create an isolated local database and empty storage directory for the proof.
   Set `RESTORE_DATABASE_URL`, `RESTORE_STORAGE_DIR`, and `BACKUP_DIR` without
   exposing credentials.
4. Run `deno task infra:restore`. The command refuses active targets, verifies
   both artifact checksums, restores PostgreSQL and storage, and checks the
   migration ledger plus durable platform tables.
5. Record the manifest, isolated target names, row/object checks, and elapsed
   restore time. Never commit the generated backup directory.
