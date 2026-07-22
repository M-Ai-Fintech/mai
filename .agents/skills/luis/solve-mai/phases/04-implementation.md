# Implementation

1. Invoke `$model-selection` for implementation.
2. Make the smallest coherent change with `apply_patch`; preserve unrelated changes.
3. Add or update tests in the same task. Keep generated files and temporary artifacts out of the patch unless the task requires them.
4. Re-read every modified file and use `rg` to check renamed or removed identifiers.
5. Update Backlog notes when a material fact changes.

Completion: the branch contains only task-scoped changes and executable regression coverage.
