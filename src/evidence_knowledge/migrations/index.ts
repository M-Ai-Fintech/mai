import type { ContextMigration } from "../../platform/persistence/v1.ts";
import { evidenceKnowledgeMigration } from "./evidence_knowledge_0001.ts";
import { evidenceKnowledgeMigration0002 } from "./evidence_knowledge_0002.ts";

export const evidenceKnowledgeMigrations: readonly ContextMigration[] = Object
  .freeze([
    evidenceKnowledgeMigration,
    evidenceKnowledgeMigration0002,
  ]);
