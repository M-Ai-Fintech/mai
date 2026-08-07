import { assertExactBasis } from "./basis.ts";
import type {
  CommandDependencies,
  CommandResult,
  RequestDecisionCommand,
} from "./contracts.ts";
import {
  appendEffect,
  assertActorMatchesContext,
  assertExpectedVersion,
  claim,
  complete,
  loadRequest,
  replayLoaded,
} from "./command_support.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import { type DecisionRequest, decisionRequestToRequested } from "./model.ts";
import type { DecisionRequestId } from "./ids.ts";

export async function requestDecisionInTransaction(
  dependencies: CommandDependencies,
  transaction: TransactionHandle,
  input: RequestDecisionCommand,
): Promise<CommandResult<DecisionRequest>> {
  const result = await claim(
    dependencies,
    transaction,
    input,
    "request_decision",
    input.requestId,
    input.basis,
  );
  if (result.status === "replayed") {
    return replayLoaded(
      result.resultReference,
      (id) =>
        dependencies.config.repository.findDecisionRequest(
          transaction,
          input.scope,
          id as DecisionRequestId,
        ),
    );
  }
  const request = await loadRequest(
    dependencies,
    transaction,
    input.scope,
    input.requestId,
    true,
  );
  assertActorMatchesContext(request.requester, input.context);
  assertExpectedVersion(
    request.version,
    input.expectedRequestVersion,
    request.id,
  );
  assertExactBasis(request.basis, input.basis, request.id);
  const updated = decisionRequestToRequested(
    request,
    dependencies.clock.now(),
  );
  await dependencies.config.repository.updateDecisionRequest(
    transaction,
    updated,
    input.expectedRequestVersion,
  );
  await appendEffect(
    dependencies,
    transaction,
    input,
    updated,
    "decision_requested",
    input.basis,
    undefined,
    request.requester,
  );
  await complete(
    dependencies,
    transaction,
    result,
    `decision_request:${updated.id}`,
  );
  return { status: "accepted", value: updated };
}
