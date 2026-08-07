import { defineMigration } from "../../platform/persistence/v1.ts";

export const diligenceDecisionsMigration0002 = defineMigration({
  owner: "diligence_decisions",
  schema: "diligence_decisions",
  id: "diligence_decisions-0002",
  version: 2,
  forwardNotes:
    "Normalize current decision projections and retain only active or invalidated lifecycle states; supersession remains append-only history.",
  rollbackNotes:
    "Pause Diligence and Decisions readers and writers before reverting the current-projection constraint; never rewrite decision records or history.",
  statements: [
    {
      schema: "diligence_decisions",
      sql: `
        UPDATE diligence_decisions.decision_projections
        SET state = 'active'
        WHERE state = 'superseded';

        ALTER TABLE diligence_decisions.decision_projections
          DROP CONSTRAINT IF EXISTS decision_projections_state_check;

        ALTER TABLE diligence_decisions.decision_projections
          ADD CONSTRAINT decision_projections_current_state_check
          CHECK (state IN ('active', 'invalidated'));
      `,
    },
  ],
});
