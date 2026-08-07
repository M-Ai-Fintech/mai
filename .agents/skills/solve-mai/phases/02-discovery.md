# Discovery and planning

Use repository evidence to define the smallest coherent solution, then obtain and record approval before implementation.

## Workflow

1. Invoke `$model-selection` for discovery and planning.
2. Query the existing knowledge graph before broad source browsing:
   - `graphify query "<task outcome or failure question>"`;
   - `graphify explain "<concept>"` for one subsystem;
   - `graphify path "<entry>" "<effect>"` for a dependency chain.
3. If Graphify is sparse or stale, say so and supplement it with focused `rg`, source, tests, and governed documentation. Do not invent graph relationships.
4. Read only the files required to understand:
   - the entry point;
   - domain or service logic;
   - persistence and external integrations;
   - output or user-visible behavior;
   - existing tests and similar working paths.
5. Compare the task outcome with current behavior. Identify invariants that the change must preserve.
6. Choose the smallest implementation boundary. Separate required scope from useful follow-ups.
7. Draft a plan containing:
   - root problem or desired outcome;
   - implementation slices and likely files;
   - regression tests;
   - focused and broader verification;
   - documentation changes;
   - risks, migrations, environment needs, and human checkpoints.
8. Present the plan to the owner. A request to solve the identified review threads counts as approval of that stated scope, but material deviations still require a new approval loop.
9. Record the approved plan with `Linear issue update with the approved plan`. Use `addReferences` and `addDocumentation` for sources needed by a replacement agent.
10. Create or switch to an isolated task branch following repository convention, such as `chore/MAI-86-agent-skills`. Preserve unrelated changes.

## Plan maintenance

- Use `Linear issue description append` for additive detail that does not change the approved outcome.
- Use `Linear issue description or plan metadata` when the implementation path changes materially.
- If discovered work falls outside acceptance criteria, stop and ask whether to expand the task or create a follow-up.
- Never silently convert a blocker or follow-up into required current scope.

## Completion gate

Discovery is complete only when:

- Graphify or an explicit fallback scopes the relevant code and documentation;
- the intended behavior and current behavior are understood;
- the plan is minimal, testable, and risk-aware;
- the owner approved the plan;
- the plan is stored through Linear issue and document tools;
- an isolated task branch exists.

No implementation begins before this gate passes.
