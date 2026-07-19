import { ApiErrorDetail, EngineRun, EngineRunStatus } from "../contracts.ts";
import { getDealState } from "./accessors.ts";
import { MvpStoreError } from "./error.ts";
import { MvpStoreState } from "./state.ts";
import { EngineName, ListQuery, Page, StoredEngineRun } from "./types.ts";
import { clone, pageOf } from "./utils.ts";

export interface EngineRunListQuery extends ListQuery {
  engine?: EngineName;
}

export class EngineRepository {
  constructor(private readonly state: MvpStoreState) {}

  createRun(
    dealId: string,
    engine: EngineName,
    input: Record<string, unknown>,
  ): EngineRun {
    getDealState(this.state, dealId);
    const timestamp = this.state.now();
    const run: StoredEngineRun = {
      id: this.state.id(),
      dealId,
      engine,
      input: clone(input),
      status: EngineRunStatus.Queued,
      result: null,
      error: null,
      createdAt: timestamp,
      completedAt: null,
      updatedAt: timestamp,
    };
    const runs = this.state.engineRuns.get(dealId) ?? [];
    runs.push(run);
    this.state.engineRuns.set(dealId, runs);
    return this.toRun(run);
  }

  updateRun(
    dealId: string,
    runId: string,
    update: {
      status: EngineRunStatus;
      result?: Record<string, unknown>;
      error?: ApiErrorDetail;
    },
  ): EngineRun {
    getDealState(this.state, dealId);
    const run = (this.state.engineRuns.get(dealId) ?? []).find((candidate) =>
      candidate.id === runId
    );
    if (!run) {
      throw new MvpStoreError(
        "ENGINE_RUN_NOT_FOUND",
        "Engine run not found",
        404,
      );
    }
    run.status = update.status;
    run.result = update.result === undefined
      ? run.result
      : clone(update.result);
    run.error = update.error ? clone(update.error) : null;
    run.updatedAt = this.state.now();
    run.completedAt = update.status === EngineRunStatus.Completed ||
        update.status === EngineRunStatus.Failed
      ? run.updatedAt
      : null;
    return this.toRun(run);
  }

  listRuns(
    dealId: string,
    query: EngineRunListQuery = {},
  ): Page<EngineRun> {
    getDealState(this.state, dealId);
    const rows = (this.state.engineRuns.get(dealId) ?? [])
      .filter((run) => !query.engine || run.engine === query.engine)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((run) => this.toRun(run));
    return pageOf(rows, query);
  }

  private toRun(run: StoredEngineRun): EngineRun {
    const { input: _input, updatedAt: _updatedAt, ...contract } = run;
    return clone(contract);
  }
}
