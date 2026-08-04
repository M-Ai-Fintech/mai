import type { ContextMigration } from "../../platform/persistence/v1.ts";
import { evidenceKnowledgeMigration } from "./evidence_knowledge_0001.ts";

export const evidenceKnowledgeMigrations: readonly ContextMigration[] = Object
  .freeze([
    evidenceKnowledgeMigration,
  ]);
