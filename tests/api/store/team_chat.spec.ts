import { MVP_SEED_IDS, MvpStore } from "../../../src/api/mvp_store.ts";
import { AssignmentSide } from "../../../src/api/contracts.ts";
import { assertEquals, assertNotEquals } from "@std/assert";
import { expectStoreError } from "../support/store.ts";

Deno.test(
  "MvpStore lists team members and replaces deal assignments with version checks",
  verifyTeamAssignments,
);

Deno.test(
  "MvpStore persists idempotent chat append and assistant streaming lifecycle",
  verifyChatLifecycle,
);

function verifyTeamAssignments(): void {
  const store = new MvpStore();
  assertFilteredTeamMember(store);
  assertReplacedTeamAssignment(store);
  assertStaleTeamAssignment(store);
  assertInvalidLeadAssignments();
}

function assertFilteredTeamMember(store: MvpStore): void {
  const team = store.listTeamMembers({ search: "ana", active: true });
  assertEquals(team.meta.total, 1);
  assertEquals(team.data[0].id, MVP_SEED_IDS.advisorAna);
}

function assertReplacedTeamAssignment(store: MvpStore): void {
  const replaced = store.putTeamAssignments(MVP_SEED_IDS.dealAtlas, 1, [{
    teamMemberId: MVP_SEED_IDS.advisorBruno,
    assignmentRole: "legal_due_diligence",
    side: AssignmentSide.Target,
    isLead: true,
  }]);
  assertEquals(replaced.version, 2);
  assertEquals(replaced.data[0].teamMember.displayName, "Bruno Lima");
  assertEquals("teamMemberId" in replaced.data[0], false);

  replaced.data[0].teamMember.displayName = "external mutation";
  assertEquals(
    store.getTeamAssignments(MVP_SEED_IDS.dealAtlas)[0].teamMember.displayName,
    "Bruno Lima",
  );
}

function assertStaleTeamAssignment(store: MvpStore): void {
  expectStoreError(
    () => store.putTeamAssignments(MVP_SEED_IDS.dealAtlas, 1, []),
    "RESOURCE_VERSION_CONFLICT",
    409,
  );
}

function assertInvalidLeadAssignments(): void {
  const freshStore = new MvpStore();
  expectStoreError(
    () =>
      freshStore.putTeamAssignments(
        MVP_SEED_IDS.dealAtlas,
        1,
        conflictingLeadAssignments(),
      ),
    "TEAM_ASSIGNMENT_INVALID",
    422,
  );
}

function conflictingLeadAssignments(): Parameters<
  MvpStore["putTeamAssignments"]
>[2] {
  return [
    leadAssignment(
      MVP_SEED_IDS.advisorAna,
      "financial_risk",
      AssignmentSide.Buyer,
    ),
    leadAssignment(
      MVP_SEED_IDS.advisorBruno,
      "legal_due_diligence",
      AssignmentSide.Target,
    ),
  ];
}

function leadAssignment(
  teamMemberId: string,
  assignmentRole: string,
  side: AssignmentSide,
): Parameters<MvpStore["putTeamAssignments"]>[2][number] {
  return { teamMemberId, assignmentRole, side, isLead: true };
}

function verifyChatLifecycle(): void {
  const store = new MvpStore();
  const thread = store.createChatThread(
    MVP_SEED_IDS.dealAtlas,
    "Atlas risk review",
    "FinancialRiskAgent",
  );
  assertEquals("messageCount" in thread, false);
  const user = appendIdempotentUserMessage(store, thread.id);
  const assistantId = completeAssistantStream(store, thread.id);
  assertChatPagination(store, thread, user.id, assistantId);
  assertFailedAssistant(store, thread.id);
}

const idempotentMessageInput = {
  agentId: "FinancialRiskAgent" as const,
  message: "Summarize the leverage risk",
  clientMessageId: "client-message-1",
};

function appendIdempotentUserMessage(
  store: MvpStore,
  threadId: string,
): ReturnType<MvpStore["appendUserMessage"]> {
  const user = store.appendUserMessage(
    MVP_SEED_IDS.dealAtlas,
    threadId,
    idempotentMessageInput,
  );
  const duplicate = store.appendUserMessage(
    MVP_SEED_IDS.dealAtlas,
    threadId,
    idempotentMessageInput,
  );
  assertEquals(duplicate.id, user.id);
  return user;
}

function completeAssistantStream(store: MvpStore, threadId: string): string {
  const assistant = store.startAssistantMessage(
    threadId,
    "FinancialRiskAgent",
  );
  store.appendAssistantDelta(threadId, assistant.id, "Moderate ");
  store.appendAssistantDelta(threadId, assistant.id, "risk.");
  const completed = store.completeAssistantMessage(threadId, assistant.id, [{
    id: "citation-1",
    label: "FY25 statements",
    documentId: "document-1",
    excerpt: null,
    page: null,
  }]);

  assertEquals(completed.status, "completed");
  assertEquals(completed.content, "Moderate risk.");
  assertEquals(completed.citations.length, 1);
  return assistant.id;
}

function assertChatPagination(
  store: MvpStore,
  thread: ReturnType<MvpStore["createChatThread"]>,
  userId: string,
  assistantId: string,
): void {
  const messages = store.listChatMessages(thread.id, undefined, 1);
  assertEquals(messages.data.length, 1);
  assertEquals(messages.meta.nextCursor, userId);
  assertEquals(
    store.listChatMessages(thread.id, messages.meta.nextCursor!, 10).data[0].id,
    assistantId,
  );
  assertNotEquals(
    store.listChatThreads(MVP_SEED_IDS.dealAtlas)[0].updatedAt,
    thread.updatedAt,
  );
}

function assertFailedAssistant(store: MvpStore, threadId: string): void {
  const failedAssistant = store.startAssistantMessage(
    threadId,
    "FinancialRiskAgent",
  );
  const failed = store.failAssistantMessage(
    threadId,
    failedAssistant.id,
    "Engine unavailable",
  );
  assertEquals(failed.status, "failed");
  assertEquals(failed.error, "Engine unavailable");
}
