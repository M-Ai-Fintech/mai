import { MVP_SEED_IDS, MvpStore } from "../../../src/api/mvp_store.ts";
import { AssignmentSide } from "../../../src/api/contracts.ts";
import { assertEquals, assertNotEquals } from "@std/assert";
import { expectStoreError } from "../support/store.ts";

Deno.test("MvpStore lists team members and replaces deal assignments with version checks", () => {
  const store = new MvpStore();
  const team = store.listTeamMembers({ search: "ana", active: true });
  assertEquals(team.meta.total, 1);
  assertEquals(team.data[0].id, MVP_SEED_IDS.advisorAna);

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
  expectStoreError(
    () => store.putTeamAssignments(MVP_SEED_IDS.dealAtlas, 1, []),
    "RESOURCE_VERSION_CONFLICT",
    409,
  );

  const freshStore = new MvpStore();
  expectStoreError(
    () =>
      freshStore.putTeamAssignments(MVP_SEED_IDS.dealAtlas, 1, [
        {
          teamMemberId: MVP_SEED_IDS.advisorAna,
          assignmentRole: "financial_risk",
          side: AssignmentSide.Buyer,
          isLead: true,
        },
        {
          teamMemberId: MVP_SEED_IDS.advisorBruno,
          assignmentRole: "legal_due_diligence",
          side: AssignmentSide.Target,
          isLead: true,
        },
      ]),
    "TEAM_ASSIGNMENT_INVALID",
    422,
  );
});

Deno.test("MvpStore persists idempotent chat append and assistant streaming lifecycle", () => {
  const store = new MvpStore();
  const thread = store.createChatThread(
    MVP_SEED_IDS.dealAtlas,
    "Atlas risk review",
    "FinancialRiskAgent",
  );
  assertEquals("messageCount" in thread, false);
  const input = {
    agentId: "FinancialRiskAgent" as const,
    message: "Summarize the leverage risk",
    clientMessageId: "client-message-1",
  };
  const user = store.appendUserMessage(
    MVP_SEED_IDS.dealAtlas,
    thread.id,
    input,
  );
  const duplicate = store.appendUserMessage(
    MVP_SEED_IDS.dealAtlas,
    thread.id,
    input,
  );
  assertEquals(duplicate.id, user.id);

  const assistant = store.startAssistantMessage(
    thread.id,
    "FinancialRiskAgent",
  );
  store.appendAssistantDelta(thread.id, assistant.id, "Moderate ");
  store.appendAssistantDelta(thread.id, assistant.id, "risk.");
  const completed = store.completeAssistantMessage(thread.id, assistant.id, [{
    id: "citation-1",
    label: "FY25 statements",
    documentId: "document-1",
    excerpt: null,
    page: null,
  }]);

  assertEquals(completed.status, "completed");
  assertEquals(completed.content, "Moderate risk.");
  assertEquals(completed.citations.length, 1);
  const messages = store.listChatMessages(thread.id, undefined, 1);
  assertEquals(messages.data.length, 1);
  assertEquals(messages.meta.nextCursor, user.id);
  assertEquals(
    store.listChatMessages(thread.id, messages.meta.nextCursor!, 10).data[0].id,
    assistant.id,
  );
  assertNotEquals(
    store.listChatThreads(MVP_SEED_IDS.dealAtlas)[0].updatedAt,
    thread.updatedAt,
  );

  const failedAssistant = store.startAssistantMessage(
    thread.id,
    "FinancialRiskAgent",
  );
  const failed = store.failAssistantMessage(
    thread.id,
    failedAssistant.id,
    "Engine unavailable",
  );
  assertEquals(failed.status, "failed");
  assertEquals(failed.error, "Engine unavailable");
});
