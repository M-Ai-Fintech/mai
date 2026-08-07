# Review and pull request

Turn the verified local change into a focused, human-reviewable pull request when remote mutation is authorized.

## Local review

1. Invoke `$model-selection` for review.
2. Compare the final diff with:
   - the task description and approved plan;
   - acceptance criteria and DoD;
   - implementation and verification notes;
   - repository instructions.
3. Review for:
   - correctness and regression risk;
   - missing consumers or stale identifiers;
   - security, privacy, financial, and legal implications;
   - generated artifacts and accidental files;
   - documentation and migration requirements;
   - unrelated worktree changes.
4. Confirm `git diff --check` and relevant tests still pass after final edits.

## Commits

- Commit only when the owner requested it or the authorized workflow requires it.
- Keep commits focused by independent concern.
- Include the task ID in the repository's established commit format.
- Never stage unrelated user changes.
- Do not rewrite or squash existing history without explicit authorization.

## Remote actions

Push and create or update a PR only when the owner authorized remote mutation.

1. Confirm GitHub authentication and the correct remote.
2. Read the repository PR template.
3. Push the task branch without force.
4. Create or update a PR containing:
   - task ID and task link;
   - outcome and implementation summary;
   - exact verification;
   - risks and affected areas;
   - migration, deployment, environment, or manual steps;
   - screenshots or artifacts when relevant.
5. Request human review from the owner or designated reviewer.
6. Monitor required checks when the user requested end-to-end delivery.
7. Address selected review feedback in traceable focused changes.

The agent does not approve or merge its own PR. It does not deploy or force-push without separate explicit authorization.

## Linear record

Use `Linear issue update` to:

- add the PR URL through `addReferences`;
- append commit IDs, review status, checks, and remaining human action to notes;
- update the complete modified-file list;
- keep the task In Progress while required review or checks remain.

## Completion gate

This phase is complete when:

- the local diff is reviewed and verified;
- commits contain only task scope;
- a human-reviewable PR exists when authorized;
- PR content includes task, tests, risks, and manual steps;
- required checks are passing or blockers are recorded;
- human review has been requested;
- Linear links the PR and records remaining action.

If remote mutation is not authorized, record the precise local state and handoff needed to create the PR.
