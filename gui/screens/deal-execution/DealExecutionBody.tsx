"use client";
import { type ReactNode, type RefObject, useRef, useState } from "react";
import type { AdapterReadModel, AdapterResult } from "@/lib/adapters/contracts";
import {
  Button,
  DataTable,
  Dialog,
  Drawer,
  EvidenceReference,
  InlineNotice,
  StatusIndicator,
} from "@/components";
import type { ReadyRouteResolution } from "@/lib/shell/route-context";
import {
  screenStateForAdapter,
  type ScreenDataSource,
} from "../screen-contracts";
import {
  audit,
  closing,
  deliverable,
  fixtureDisclosure,
  governance,
  mission,
  negotiation,
  participant,
} from "./fixtures";
import styles from "./DealExecutionBody.module.css";
export type ExecutionFamily =
  | "negotiation"
  | "closing"
  | "workspace"
  | "activity"
  | "team"
  | "deliverables"
  | "settings";
export type ExecutionState =
  | "default"
  | "loading"
  | "empty"
  | "restricted"
  | "unavailable"
  | "error"
  | "long-content"
  | "approval-pending"
  | "blocked"
  | "failed"
  | "completed"
  | "destructive"
  | "partial-failure"
  | "sensitive"
  | "stale";
const families: readonly ExecutionFamily[] = [
  "negotiation",
  "closing",
  "workspace",
  "activity",
  "team",
  "deliverables",
  "settings",
];
const titles: Record<ExecutionFamily, string> = {
  negotiation: "Negotiation Room",
  closing: "Closing Control Room",
  workspace: "Agentic Workspace",
  activity: "Deal Activity & Audit",
  team: "Deal Team & Access",
  deliverables: "Deliverables & Exports",
  settings: "Deal Settings & Archive",
};
/** Renders a MAI-101 family only after MAI-98 has resolved deal permission and identity. */
export function DealExecutionBody(
  {
    resolution,
    state = "default",
    dataSource,
    adapter,
  }: {
    resolution: ReadyRouteResolution;
    state?: ExecutionState;
    dataSource: ScreenDataSource;
    adapter?: AdapterResult<AdapterReadModel>;
  },
) {
  const family = resolution.route.id.slice("deal.".length) as ExecutionFamily;
  if (!families.includes(family)) return null;
  if (!resolution.permissions.includes("deal")) return <Restricted />;
  const resolvedState = dataSource === "v1"
    ? executionStateForAdapter(adapter)
    : state;
  return (
    <ExecutionPage
      family={family}
      state={resolvedState}
      dealId={resolution.routeParameters.dealId}
      dataSource={dataSource}
      adapter={adapter}
    />
  );
}

function executionStateForAdapter(
  adapter: AdapterResult<AdapterReadModel> | undefined,
): ExecutionState {
  return screenStateForAdapter(adapter);
}
function Restricted() {
  return (
    <section className={styles.page}>
      <InlineNotice role="restricted" title="Deal access is required">
        Participant names, proposal values, documents, and accessible labels are
        not constructed before permission resolves.
      </InlineNotice>
    </section>
  );
}
function ExecutionPage(
  { family, state, dealId, dataSource, adapter }: {
    family: ExecutionFamily;
    state: ExecutionState;
    dealId: string;
    dataSource: ScreenDataSource;
    adapter?: AdapterResult<AdapterReadModel>;
  },
) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const replacement = dataSource === "v1"
    ? state !== "default" && state !== "stale"
    : ["loading", "empty", "unavailable", "error", "restricted"].includes(state);
  return (
    <section
      className={styles.page}
      data-screen-family={`deal-${family}`}
      data-fixture-only={dataSource === "fixture" ? "true" : undefined}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {dataSource === "fixture"
              ? `Deal execution · ${family === "negotiation"
                ? "Figma 239:3"
                : family === "workspace"
                ? "Figma 239:551"
                : "Shared-pattern derivation · Figma 239:921"}`
              : "Deal execution · v1 adapter"}
          </p>
          <h1>{titles[family]}</h1>
          <p>Deal {dealId} · {dataSource === "fixture" ? "local demonstration" : "authoritative read model"}</p>
        </div>
        <StatusIndicator
          role={state === "error" || state === "blocked"
            ? "warning"
            : "information"}
        >
          {state}
        </StatusIndicator>
      </header>
      <p className={styles.disclosure}>
        {dataSource === "fixture"
          ? fixtureDisclosure
          : "Authoritative v1 data only — no fixture fallback is enabled."}
      </p>
      {replacement
        ? dataSource === "fixture"
          ? <State state={state} />
          : <LiveAdapterState state={state} />
        : dataSource === "v1"
        ? <LiveAdapterContent family={family} data={adapterData(adapter)} />
        : (
        <Family
          family={family}
          onInspect={() => setDrawerOpen(true)}
          onConfirm={() => setDialogOpen(true)}
          trigger={trigger}
        />
      )}
      {dataSource === "fixture"
        ? (
          <>
            <Drawer
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
              returnFocusRef={trigger}
              title="Evidence and authority"
              description="Citation is fixture evidence; review is human-owned."
            >
              <EvidenceReference
                availability="current"
                metadata={{
                  source: audit.evidence[0].id,
                  location: audit.evidence[0].citation,
                  documentVersion: audit.evidence[0].version,
                  freshness: "stale",
                }}
              />
              <p>Audit {audit.eventId} · {audit.reconstructionPermission}</p>
            </Drawer>
            <Dialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              returnFocusRef={trigger}
              title="Human authority required"
              description="This local control records no production side effect."
              variant="destructive"
              confirmationAction={{
                label: "Record local confirmation",
                onConfirm: () => setDialogOpen(false),
              }}
            >
              <p>
                Approval, external communication, signature, access, release,
                archive, and deletion remain separate human decisions with audit
                records.
              </p>
            </Dialog>
          </>
        )
        : null}
    </section>
  );
}

function adapterData(
  adapter: AdapterResult<AdapterReadModel> | undefined,
): AdapterReadModel | undefined {
  return adapter !== undefined && "data" in adapter
    ? adapter.data
    : undefined;
}

function LiveAdapterState({ state }: { state: ExecutionState }) {
  return (
    <InlineNotice
      role={state === "restricted" ? "restricted" : "warning"}
      title={`${state} v1 adapter state`}
    >
      The authoritative adapter did not provide a current renderable read
      model. No fixture data is shown as a fallback.
    </InlineNotice>
  );
}

function LiveAdapterContent(
  { family, data }: { family: ExecutionFamily; data?: AdapterReadModel },
) {
  const items = data?.items ?? [];
  return (
    <div className={styles.grid} data-adapter-read-model={family}>
      <Card title={`${titles[family]} · v1 read model`}>
        {items.length === 0
          ? <InlineNotice role="information" title="No current items">The v1 read model is empty.</InlineNotice>
          : <Table rows={items.map((item) => [item.id, item.title, item.status, item.summary])} />}
      </Card>
      <Card title="Projection metadata">
        <p>{data?.selectedItemId ?? "No item selected"}</p>
        <p>Commands remain separate from this read model and require explicit authority.</p>
      </Card>
    </div>
  );
}
function State({ state }: { state: ExecutionState }) {
  return (
    <section
      className={styles.card}
      aria-busy={state === "loading" || undefined}
    >
      <h2>
        {state === "loading"
          ? "Loading local fixture state"
          : `${state} demonstration state`}
      </h2>
      <p>
        Availability, authorization, freshness, approval, execution, external
        side effect, irreversible transition, and adapter failure are distinct.
      </p>
    </section>
  );
}
function Family(
  { family, onInspect, onConfirm, trigger }: {
    family: ExecutionFamily;
    onInspect: () => void;
    onConfirm: () => void;
    trigger: RefObject<HTMLButtonElement | null>;
  },
) {
  const action = (
    <div className={styles.actions}>
      <Button ref={trigger} hierarchy="secondary" onClick={onInspect}>
        Inspect evidence
      </Button>
      <Button
        hierarchy={family === "settings" ? "destructive" : "primary"}
        onClick={onConfirm}
      >
        Request human authority
      </Button>
    </div>
  );
  if (family === "negotiation") {
    return (
      <div className={styles.negotiationLayout}>
        <Card title="Proposal and round registry">
          <p>
            Round 4 · {negotiation.counterparty} ·{" "}
            {negotiation.transactionSide === "buy-side"
              ? "Buy-side position"
              : "Sell-side position"} · Awaiting approval
          </p>
          <ul className={styles.registryList}>
            <li>
              <strong>Round 4</strong>
              <span>Current · DOC-148/v4</span>
            </li>
            <li>
              <strong>Round 3</strong>
              <span>Superseded · DOC-148/v3</span>
            </li>
            <li>
              <strong>Project Atlas alternative</strong>
              <span>Open ask · source review</span>
            </li>
            <li>
              <strong>Restricted internal counter</strong>
              <span>Internal only</span>
            </li>
          </ul>
        </Card>
        <Card title="Normalized terms and economics">
          <p>Current Round 4 · {negotiation.counterparty}</p>
          <StatusIndicator role="warning">Awaiting approval</StatusIndicator>
          <Button onClick={onConfirm}>
            Submit counterproposal for approval
          </Button>
          <p>Immutable external source: DOC-148 · Term Sheet v4 · p. 2–7.</p>
          <label className={styles.control}>
            <input type="checkbox" defaultChecked /> Differences only
          </label>
          <dl className={styles.metrics}>
            <div>
              <dt>Risk-adjusted value</dt>
              <dd>R$ 474 mi</dd>
            </div>
            <div>
              <dt>Cash at closing</dt>
              <dd>R$ 420 mi</dd>
            </div>
            <div>
              <dt>Contingent value</dt>
              <dd>R$ 54 mi</dd>
            </div>
            <div>
              <dt>Execution confidence</dt>
              <dd>Medium</dd>
            </div>
          </dl>
          <p>Concession ledger: {negotiation.concession}</p>
          <p>Open asks: escrow step-down and exclusivity confirmation.</p>
          <EvidenceReference
            availability="current"
            metadata={{
              source: negotiation.source.id,
              location: negotiation.source.citation,
              documentVersion: negotiation.source.version,
              freshness: "current",
            }}
          />
        </Card>
        <Card title="Restricted authority context">
          <p>{negotiation.internalMandate}</p>
          <p>
            Mandate constraints: approval route requires Vice President review.
          </p>
          <p>Proposed counteroffer: escrow may reduce after counsel review.</p>
          <p>
            BATNA and alternatives: Project Atlas remains an unapproved
            alternative.
          </p>
          <InlineNotice
            role="warning"
            title="No external communication before approval"
          >
            AI may draft and analyze. It cannot approve, send, or communicate
            externally.
          </InlineNotice>
          <p>
            Approval route: Deal Lead → Vice President → human confirmation.
          </p>
          {action}
        </Card>
      </div>
    );
  }
  if (family === "closing") {
    return (
      <div className={styles.grid}>
        <Card title={`Condition ${closing.conditionId}`}>
          <p>
            {closing.checklistItem} · {closing.state} · owner{" "}
            {closing.responsibleAuthority}
          </p>
          <p>
            Signature {closing.signature}; readiness{" "}
            {closing.readinessApproval}.
          </p>
          <p>{closing.postSignBoundary}</p>
        </Card>
        <Card title="Irreversible closing confirmation">
          <p>
            Waiver, signature, and post-sign permission are separate.
            Cancellation and rollback remain available only while reversible.
          </p>
          {action}
        </Card>
      </div>
    );
  }
  if (family === "workspace") {
    return (
      <div className={styles.grid}>
        <Card title={`${mission.missionId} · ${mission.runId}`}>
          <p>{mission.objective} · {mission.state}</p>
          <ol>{mission.plan.map((step) => <li key={step}>{step}</li>)}</ol>
          <p>
            {mission.engine} · {mission.sideEffect} · artifact{" "}
            {mission.artifactId}
          </p>
        </Card>
        <Card title="Work trace and approval">
          <p>
            Read authorized evidence → reversible draft → human-authorized state
            change.
          </p>
          <p>{mission.evidence[0].citation} · approval {mission.approval}</p>
          {action}
        </Card>
      </div>
    );
  }
  if (family === "activity") {
    return (
      <Card title="Immutable audit registry">
        <Table
          rows={[[
            audit.eventId,
            audit.actor,
            audit.authority,
            audit.consequence,
          ], [
            "AUD-906",
            "System fixture",
            "Local adapter",
            "No edit or delete affordance",
          ]]}
        />
        {action}
      </Card>
    );
  }
  if (family === "team") {
    return (
      <div className={styles.grid}>
        <Card title={`Participant ${participant.participantId}`}>
          <p>
            {participant.classification} visibility · {participant.role} ·{" "}
            {participant.scope}
          </p>
          <p>
            {participant.state} · {participant.duration} · invitation{" "}
            {participant.invitation}
          </p>
          <p>
            Grant, revoke, and offboarding require approval and audit{" "}
            {participant.auditReference}.
          </p>
        </Card>
        <Card title="Offboarding impact preview">
          <p>
            Revocation is reversible only where policy permits; identities stay
            absent before permission resolution.
          </p>
          {action}
        </Card>
      </div>
    );
  }
  if (family === "deliverables") {
    return (
      <div className={styles.grid}>
        <Card title={`${deliverable.deliverableId} · ${deliverable.versionId}`}>
          <p>
            {deliverable.state} · {deliverable.audience} ·{" "}
            {deliverable.redaction}
          </p>
          <p>{deliverable.sourceInputs.join(" · ")}</p>
          <p>
            Released output remains immutable; stale source blocks unreleased
            release.
          </p>
        </Card>
        <Card title="Export and external distribution">
          <p>
            Approval {deliverable.approval}; export{" "}
            {deliverable.exportAuthorization}; distribution{" "}
            {deliverable.distribution}.
          </p>
          {action}
        </Card>
      </div>
    );
  }
  return (
    <div className={styles.grid}>
      <Card title="Policy and lifecycle">
        <p>
          {governance.lifecycle} · {governance.policy} · {governance.retention}
        </p>
        <p>{governance.ndaBoundary}</p>
      </Card>
      <Card title="Archive and deletion request">
        <p>
          {governance.request} requires{" "}
          {governance.authority}; participant impact:{" "}
          {governance.participantImpact}.
        </p>
        <p>Archive is not deletion. Audit {governance.auditReference}.</p>
        {action}
      </Card>
    </div>
  );
}
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.card}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function Table({ rows }: { rows: readonly (readonly string[])[] }) {
  return (
    <div className={styles.tableScroller}>
      <DataTable className={styles.table} columnCount={4}>
        <caption>Immutable audit events</caption>
        <thead>
          <tr>
            <th scope="col">Event</th>
            <th scope="col">Actor</th>
            <th scope="col">Authority</th>
            <th scope="col">Consequence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((value) => <td key={value}>{value}</td>)}
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
}
