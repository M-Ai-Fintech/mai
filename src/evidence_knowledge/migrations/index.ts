import type { ContextMigration } from "../../platform/persistence/v1.ts";
import { evidenceKnowledgeMigration } from "./evidence_knowledge_0001.ts";
import { evidenceKnowledgeMigration0002 } from "./evidence_knowledge_0002.ts";
import { evidenceKnowledgeMigration0003 } from "./evidence_knowledge_0003.ts";
import { evidenceKnowledgeMigration0004 } from "./evidence_knowledge_0004.ts";

export const evidenceKnowledgeMigrations: readonly ContextMigration[] = Object
  .freeze([
    evidenceKnowledgeMigration,
    evidenceKnowledgeMigration0002,
    evidenceKnowledgeMigration0003,
    evidenceKnowledgeMigration0004,
  ]);
