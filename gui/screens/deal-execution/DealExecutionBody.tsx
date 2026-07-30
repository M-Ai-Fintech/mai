"use client";
import { type ReactNode, type RefObject, useRef, useState } from "react";
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
  | "destructive";
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
  { resolution, state = "default" }: {
    resolution: ReadyRouteResolution;
    state?: ExecutionState;
  },
) {
  const family = resolution.route.id.slice("deal.".length) as ExecutionFamily;
  if (!families.includes(family)) return null;
  if (!resolution.permissions.includes("deal")) return <Restricted />;
  return (
    <ExecutionPage
      family={family}
      state={state}
      dealId={resolution.routeParameters.dealId}
    />
  );
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
  { family, state, dealId }: {
    family: ExecutionFamily;
    state: ExecutionState;
    dealId: string;
  },
) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const replacement = ["loading", "empty", "unavailable", "error", "restricted"]
    .includes(state);
  return (
    <section
      className={styles.page}
      data-screen-family={`deal-${family}`}
      data-fixture-only="true"
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            Deal execution · {family === "negotiation"
              ? "Figma 239:3"
              : family === "workspace"
              ? "Figma 239:551"
              : "Shared-pattern derivation · Figma 239:921"}
          </p>
          <h1>{titles[family]}</h1>
          <p>Deal {dealId} · local demonstration</p>
        </div>
        <StatusIndicator
          role={state === "error" || state === "blocked"
            ? "warning"
            : "information"}
        >
          {state}
        </StatusIndicator>
      </header>
      <p className={styles.disclosure}>{fixtureDisclosure}</p>
      {replacement ? <State state={state} /> : (
        <Family
          family={family}
          onInspect={() => setDrawerOpen(true)}
          onConfirm={() => setDialogOpen(true)}
          trigger={trigger}
        />
      )}
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
          Approval, external communication, signature, access, release, archive,
          and deletion remain separate human decisions with audit records.
        </p>
      </Dialog>
    </section>
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
      <div className={styles.grid}>
        <Card
          title={`Proposal ${negotiation.proposalId} · ${negotiation.roundId}`}
        >
          <p>
            {negotiation.transactionSide === "buy-side"
              ? "Buy-side position"
              : "Sell-side position"} · {negotiation.lifecycle}
          </p>
          <ul>
            {negotiation.normalizedTerms.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
          <p>
            Source{" "}
            {negotiation.source.version}; differences-only comparison available.
          </p>
        </Card>
        <Card title="Internal mandate and concession">
          <p>{negotiation.internalMandate}</p>
          <p>{negotiation.concession} · {negotiation.economicConsequence}</p>
          <InlineNotice
            role="warning"
            title="No external communication before approval"
          >
            Counterproposal draft is not sent; communication is{" "}
            {negotiation.communication}.
          </InlineNotice>
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
