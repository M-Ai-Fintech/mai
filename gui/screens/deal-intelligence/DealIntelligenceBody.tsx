"use client";

import { useRef, useState } from "react";
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
import { executeDemoReadiness } from "@/lib/adapters/demo-readiness/commands";
import { stateForApiError } from "@/lib/adapters/states";
import { APIError } from "@/lib/api-client/errors";
import {
  type ScreenDataSource,
  screenStateForAdapter,
} from "../screen-contracts";
import {
  candidates,
  fixtureDisclosure,
  horizonAssumption,
  horizonDecision,
  horizonEvidence,
  horizonFact,
  horizonFinding,
  horizonScenario,
} from "./fixtures";
import styles from "./DealIntelligenceBody.module.css";

export type DealFamily =
  | "overview"
  | "dossier"
  | "documents"
  | "diligence"
  | "valuation"
  | "matching";
export type DealState =
  | "default"
  | "loading"
  | "empty"
  | "restricted"
  | "unavailable"
  | "stale"
  | "error"
  | "partial-failure"
  | "sensitive"
  | "invalidated"
  | "recorded"
  | "long-content";

const titles: Record<DealFamily, string> = {
  overview: "Deal Overview",
  dossier: "Target Dossier",
  documents: "Documents & VDR",
  diligence: "Diligence Decision Room",
  valuation: "Valuation Lab",
  matching: "Matching & Counterparty Universe",
};

const familyNames: readonly DealFamily[] = [
  "overview",
  "dossier",
  "documents",
  "diligence",
  "valuation",
  "matching",
];

/** Renders one MAI-100 body only after MAI-98 has resolved route permissions and deal context. */
export function DealIntelligenceBody({
  resolution,
  state = "default",
  dataSource,
  adapter,
}: {
  resolution: ReadyRouteResolution;
  state?: DealState;
  dataSource: ScreenDataSource;
  adapter?: AdapterResult<AdapterReadModel>;
}) {
  const family = resolution.route.id.slice("deal.".length) as DealFamily;
  if (!isDealFamily(family)) return null;
  if (!resolution.permissions.includes("deal")) return <Restricted />;

  const resolvedState = dataSource === "v1"
    ? dealStateForAdapter(adapter)
    : state;
  const replacesBody = dataSource === "v1"
    ? resolvedState !== "default" && resolvedState !== "stale"
    : resolvedState === "loading" || resolvedState === "restricted" ||
      resolvedState === "error";
  const dealName = resolution.deal?.name ?? "Deal context";
  const dealPhase = resolution.deal?.phase ?? "Review";
  return (
    <section
      className={styles.page}
      data-screen-family={`deal-${family}`}
      data-fixture-only={dataSource === "fixture" ? "true" : undefined}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Deal intelligence · Figma v0.3</p>
          <h1>{titles[family]}</h1>
          <p className={styles.contextLine}>
            {dealName} · {dealPhase} · deal {resolution.routeParameters.dealId}
          </p>
        </div>
        <StatusIndicator
          role={resolvedState === "stale" || resolvedState === "invalidated"
            ? "warning"
            : "information"}
        >
          {dataSource === "fixture"
            ? resolvedState === "default"
              ? "Local demonstration"
              : resolvedState
            : "v1 adapter"}
        </StatusIndicator>
      </header>

      <p className={styles.disclosure}>
        {dataSource === "fixture"
          ? fixtureDisclosure
          : "Authoritative v1 data only — no fixture fallback is enabled."}
      </p>

      {dataSource === "v1" && replacesBody
        ? <LiveAdapterStatePanel state={resolvedState} />
        : null}
      {dataSource === "fixture" && resolvedState !== "default"
        ? <StatePanel state={resolvedState} />
        : null}
      {dataSource === "v1" && resolvedState === "stale"
        ? <StaleAdapterWarning />
        : null}
      {!replacesBody && (dataSource === "v1"
        ? (
          <LiveAdapterContent
            family={family}
            data={adapterData(adapter)}
            dealId={resolution.routeParameters.dealId}
          />
        )
        : <Family family={family} state={resolvedState} />)}
    </section>
  );
}

function dealStateForAdapter(
  adapter: AdapterResult<AdapterReadModel> | undefined,
): DealState {
  const state = screenStateForAdapter(adapter);
  if (state === "default" || state === "loading" || state === "empty") {
    return state;
  }
  if (state === "restricted" || state === "unavailable" || state === "stale") {
    return state;
  }
  return "partial-failure";
}

function adapterData(
  adapter: AdapterResult<AdapterReadModel> | undefined,
): AdapterReadModel | undefined {
  return adapter !== undefined && "data" in adapter ? adapter.data : undefined;
}

function LiveAdapterStatePanel({ state }: { state: DealState }) {
  return (
    <InlineNotice
      role={state === "restricted" ? "restricted" : "warning"}
      title={`${state} v1 adapter state`}
    >
      The authoritative adapter did not provide a current renderable read model.
      No fixture data is shown as a fallback.
    </InlineNotice>
  );
}

function StaleAdapterWarning() {
  return (
    <InlineNotice role="warning" title="Data requires freshness review">
      This v1 projection is stale and is not current authoritative content.
      Refresh before relying on it.
    </InlineNotice>
  );
}

function LiveAdapterContent(
  { family, data, dealId }: {
    family: DealFamily;
    data?: AdapterReadModel;
    dealId: string;
  },
) {
  const items = data?.items ?? [];
  return (
    <div className={styles.workspace} data-adapter-read-model={family}>
      <section className={styles.primaryColumn}>
        <Card title={`${titles[family]} · v1 read model`}>
          {items.length === 0
            ? (
              <InlineNotice role="information" title="No current items">
                The v1 read model is empty.
              </InlineNotice>
            )
            : (
              <OperationalRows
                rows={items.map((
                  item,
                ) => [item.title, item.summary, item.status, item.id])}
              />
            )}
        </Card>
      </section>
      <aside className={styles.contextRail} aria-label="v1 adapter context">
        <Card title="Projection metadata">
          <p>{data?.selectedItemId ?? "No item selected"}</p>
          <p className={styles.meta}>
            Permissions, freshness, and source version remain adapter-owned.
          </p>
        </Card>
        {family === "diligence" ? <LiveHumanReview dealId={dealId} /> : null}
      </aside>
    </div>
  );
}

type HumanReviewState =
  | { readonly kind: "idle" | "submitting" }
  | { readonly kind: "recorded"; readonly recordId: string }
  | { readonly kind: "restricted" | "unavailable" | "failed" };

function LiveHumanReview({ dealId }: { dealId: string }) {
  const [review, setReview] = useState<HumanReviewState>({ kind: "idle" });
  const recordReview = async (): Promise<void> => {
    setReview({ kind: "submitting" });
    try {
      const receipt = await executeDemoReadiness({
        idempotencyKey: "idem_investor-demo-execute",
        correlationId: `cor_${crypto.randomUUID().replaceAll("-", "")}`,
        headers: { "X-Deal-Id": dealId },
      });
      setReview({
        kind: "recorded",
        recordId: receipt.authority.humanDecisionRecordId,
      });
    } catch (error: unknown) {
      setReview({ kind: humanReviewFailure(error) });
    }
  };
  return (
    <Card title="Human review command">
      <p>
        This persisted command requires the authenticated banker session. AI
        remains a read/proposal boundary.
      </p>
      <LiveHumanReviewStatus review={review} />
      <Button
        loading={review.kind === "submitting"}
        onClick={() => void recordReview()}
      >
        Record authorized human review
      </Button>
    </Card>
  );
}

/** Maps protected and dependency failures without falling back to fixtures. */
export function humanReviewFailure(
  error: unknown,
): "restricted" | "unavailable" | "failed" {
  if (!(error instanceof APIError)) return "failed";
  const state = stateForApiError(error);
  if (state === "restricted" || error.kind === "not_found") {
    return "restricted";
  }
  return state === "unavailable" ? "unavailable" : "failed";
}

function LiveHumanReviewStatus({ review }: { review: HumanReviewState }) {
  if (review.kind === "recorded") {
    return (
      <StatusIndicator role="success">
        Persisted · {review.recordId}
      </StatusIndicator>
    );
  }
  if (review.kind === "restricted") {
    return (
      <StatusIndicator role="restricted">Access denied safely</StatusIndicator>
    );
  }
  if (review.kind === "unavailable") {
    return (
      <StatusIndicator role="warning">Dependency unavailable</StatusIndicator>
    );
  }
  if (review.kind === "failed") {
    return (
      <StatusIndicator role="warning">Command failed safely</StatusIndicator>
    );
  }
  return (
    <StatusIndicator role="information">Human action required</StatusIndicator>
  );
}

function isDealFamily(value: string): value is DealFamily {
  return familyNames.includes(value as DealFamily);
}

function Restricted() {
  return (
    <section className={styles.page}>
      <InlineNotice role="restricted" title="Deal access is required">
        Restricted names, values, document identities, candidate identities, and
        accessible labels are absent until permission resolves.
      </InlineNotice>
    </section>
  );
}

function StatePanel({ state }: { state: DealState }) {
  if (state === "loading") {
    return (
      <section className={`${styles.card} ${styles.state}`} aria-busy="true">
        <h2>Loading regional demonstration data</h2>
        <p>
          Operational regions resolve independently; protected metadata is not
          rendered while loading.
        </p>
      </section>
    );
  }
  if (state === "restricted") return <Restricted />;
  if (state === "error") {
    return (
      <InlineNotice role="warning" title="Recoverable local adapter failure">
        Retry the local demonstration adapter. No stale fixture is presented as
        current.
      </InlineNotice>
    );
  }
  if (state === "recorded") {
    return (
      <InlineNotice role="information" title="Human decision recorded">
        Audit record {horizonDecision.auditRecordId} links{" "}
        {horizonFinding.findingId}, {horizonEvidence.documentVersionId}, and
        {" "}
        {horizonScenario.calculationId}. It is fixture evidence, not persisted.
      </InlineNotice>
    );
  }
  if (state === "invalidated") {
    return (
      <InlineNotice role="warning" title="Finding invalidated">
        {horizonEvidence.documentVersionId} changed, so {horizonFact.factId},
        {" "}
        {horizonFinding.findingId}, and {horizonScenario.scenarioId}{" "}
        require a new human review.
      </InlineNotice>
    );
  }
  if (state === "long-content") {
    return (
      <InlineNotice role="information" title="Long-content coverage">
        Operational tables and evidence rails remain readable through controlled
        wrapping and local horizontal scrolling.
      </InlineNotice>
    );
  }
  return (
    <InlineNotice role="warning" title="Review required">
      Document version {horizonEvidence.documentVersionId}{" "}
      changed; linked outputs require human review.
    </InlineNotice>
  );
}

function Family({ family, state }: { family: DealFamily; state: DealState }) {
  if (family === "overview") return <Overview />;
  if (family === "dossier") return <Dossier />;
  if (family === "documents") return <Documents />;
  if (family === "diligence") {
    return <Diligence initialRecorded={state === "recorded"} />;
  }
  if (family === "valuation") return <Valuation />;
  return <Matching />;
}

function Overview() {
  return (
    <div className={styles.workspace}>
      <div className={styles.primaryColumn}>
        <Card title="Required decisions and blockers">
          <OperationalRows
            rows={[
              [
                "Approve valuation range",
                "Vice President",
                "Approval pending",
                horizonFinding.findingId,
              ],
              [
                "Review changed debt evidence",
                "Deal team",
                "Blocked",
                horizonEvidence.documentVersionId,
              ],
            ]}
          />
        </Card>
        <Card title="Material-change timeline">
          <ol className={styles.timeline}>
            <li>
              {horizonEvidence.documentVersionId} changed → {horizonFact.factId}
              {" "}
              becomes stale.
            </li>
            <li>
              {horizonFinding.findingId} requires review →{" "}
              {horizonScenario.scenarioId} becomes provisional.
            </li>
            <li>A human may record a new decision with a new audit record.</li>
          </ol>
        </Card>
        <Card title="Workstream status">
          <TableScroller>
            <DataTable className={styles.table} columnCount={4}>
              <caption>Deal workstream status</caption>
              <thead>
                <tr>
                  <th scope="col">Workstream</th>
                  <th scope="col">Owner</th>
                  <th scope="col">State</th>
                  <th scope="col">Next action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Financial diligence</td>
                  <td>Deal team</td>
                  <td>Review required</td>
                  <td>Inspect {horizonEvidence.documentVersionId}</td>
                </tr>
                <tr>
                  <td>Valuation</td>
                  <td>Vice President</td>
                  <td>Provisional</td>
                  <td>Review {horizonScenario.scenarioId}</td>
                </tr>
                <tr>
                  <td>Counterparty universe</td>
                  <td>Deal lead</td>
                  <td>Shortlist pending</td>
                  <td>Resolve conflict review</td>
                </tr>
              </tbody>
            </DataTable>
          </TableScroller>
        </Card>
      </div>
      <aside className={styles.contextRail} aria-label="Deal overview context">
        <Card title="Valuation summary">
          <p className={styles.value}>R$ 428–462m</p>
          <p>
            Provisional · {horizonScenario.calculationId}{" "}
            · not an AI-selected price.
          </p>
        </Card>
        <Card title="Evidence readiness">
          <p className={styles.value}>1 stale source</p>
          <p>
            {horizonEvidence.documentVersionId}{" "}
            requires Dossier, Diligence, and Valuation review.
          </p>
        </Card>
        <Card title="Upcoming milestones">
          <DefinitionRows
            rows={[["31 Jul", "Diligence decision"], [
              "02 Aug",
              "Valuation approval",
            ], ["05 Aug", "Shortlist authority"]]}
          />
        </Card>
        <Card title="Deal team and activity">
          <p>Ana Costa · Vice President</p>
          <p className={styles.meta}>
            Last meaningful change: {horizonEvidence.documentVersionId}{" "}
            superseded.
          </p>
        </Card>
      </aside>
    </div>
  );
}

function Dossier() {
  return (
    <div className={styles.threePane}>
      <nav className={styles.sidePanel} aria-label="Dossier sections">
        <h2>Dossier sections</h2>
        {[
          "Profile",
          "Ownership",
          "Business model",
          "Markets",
          "Financial profile",
          "Management",
          "Open questions",
        ].map((label) => (
          <a
            className={styles.navLink}
            href={`#${label.toLowerCase().replaceAll(" ", "-")}`}
            key={label}
          >
            {label}
          </a>
        ))}
        <p className={styles.meta}>
          Fact, interpretation, assumption, and open question remain distinct.
        </p>
      </nav>
      <section className={styles.centerPanel} aria-labelledby="facts-heading">
        <h2 id="facts-heading">Fact workspace</h2>
        <div id="financial-profile" className={styles.stack}>
          <Card title={`Approved fact · ${horizonFact.factId}`}>
            <p className={styles.value}>
              {horizonFact.value} {horizonFact.unit}
            </p>
            <p>
              {horizonFact.state} · approved by {horizonFact.approvingAuthority}
              {" "}
              · version {horizonFact.version}
            </p>
          </Card>
          <Card
            title={`Interpretation / assumption · ${horizonAssumption.interpretationId}`}
          >
            <p>{horizonAssumption.statement}</p>
            <p className={styles.meta}>
              {horizonAssumption.author} · {horizonAssumption.rationale}{" "}
              · used by {horizonAssumption.downstreamUsage}
            </p>
          </Card>
          <Card title="Open question">
            <p>
              Confirm whether replacement evidence supports the normalized
              EBITDA adjustment. Restricted legal evidence remains absent.
            </p>
          </Card>
        </div>
      </section>
      <aside className={styles.sidePanel} aria-label="Evidence inspector">
        <h2>Evidence inspector</h2>
        <EvidenceReference
          availability="superseded"
          metadata={{
            source: horizonEvidence.documentId,
            location: horizonEvidence.location,
            documentVersion: horizonEvidence.documentVersionId,
            freshness: horizonEvidence.freshness,
          }}
        />
        <DefinitionRows
          rows={[
            ["Evidence ID", horizonEvidence.evidenceId],
            ["Processing", horizonEvidence.processingState],
            ["Access", horizonEvidence.access],
            [
              "Downstream",
              `${horizonFinding.findingId} · ${horizonScenario.scenarioId}`,
            ],
          ]}
        />
      </aside>
    </div>
  );
}

const documents = [
  [
    "Audited financial statements",
    "DOC-120/v18",
    "Financial",
    "Ready · stale",
    "Deal team",
  ],
  ["Debt schedule", "DOC-124/v19", "Financial", "Processing", "Deal team"],
  ["Customer concentration", "DOC-131/v7", "Commercial", "Ready", "Deal team"],
  ["Management presentation", "DOC-142/v4", "Management", "Ready", "Deal team"],
  [
    "Material contracts register",
    "DOC-156/v2",
    "Legal",
    "Restricted",
    "Restricted",
  ],
] as const;

function Documents() {
  const [open, setOpen] = useState(false);
  const rowTrigger = useRef<HTMLButtonElement>(null);
  const inspectorTrigger = useRef<HTMLButtonElement>(null);
  const [returnFocusTarget, setReturnFocusTarget] = useState<
    "row" | "inspector"
  >("row");
  const openEvidence = (target: "row" | "inspector") => {
    setReturnFocusTarget(target);
    setOpen(true);
  };
  return (
    <>
      <InlineNotice role="information" title="Simulated source boundary">
        Source connection and synchronization are designed but not implemented.
        Requests, uploads, retries, and configuration remain local demonstration
        actions.
      </InlineNotice>
      <div className={styles.documentsWorkspace}>
        <aside className={styles.sidePanel} aria-label="Sources and folders">
          <h2>Sources and folders</h2>
          <StatusIndicator role="warning">Version changed</StatusIndicator>
          <DefinitionRows
            rows={[["Source", "Horizon VDR fixture"], [
              "Connection",
              "Simulation only",
            ], ["Sync", "Not connected"]]}
          />
          <h3>Folders</h3>
          {[
            "Financial · 12",
            "Commercial · 8",
            "Legal · restricted",
            "Tax · 4",
            "Management · 6",
          ].map((label) => (
            <a href="#document-registry" className={styles.navLink} key={label}>
              {label}
            </a>
          ))}
          <Button hierarchy="secondary">
            Prepare missing-document request
          </Button>
        </aside>
        <section
          id="document-registry"
          className={styles.registryPanel}
          aria-labelledby="registry-heading"
        >
          <h2 id="registry-heading">Document registry</h2>
          <p className={styles.meta}>
            Document ID, immutable version, classification, processing,
            freshness, and access remain explicit.
          </p>
          <TableScroller>
            <DataTable className={styles.table} columnCount={6}>
              <caption>
                Controlled horizontally scrollable local document registry
              </caption>
              <thead>
                <tr>
                  <th scope="col">Document</th>
                  <th scope="col">Version</th>
                  <th scope="col">Category</th>
                  <th scope="col">Processing</th>
                  <th scope="col">Access</th>
                  <th scope="col">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((
                  [name, version, category, processing, access],
                  index,
                ) => (
                  <tr key={version}>
                    <td>{name}</td>
                    <td>{version}</td>
                    <td>{category}</td>
                    <td>{processing}</td>
                    <td>{access}</td>
                    <td>
                      {index === 0
                        ? (
                          <button
                            ref={rowTrigger}
                            className={styles.actionButton}
                            onClick={() => openEvidence("row")}
                          >
                            Inspect {horizonEvidence.evidenceId}
                          </button>
                        )
                        : "Not selected"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </TableScroller>
        </section>
        <aside
          className={styles.sidePanel}
          aria-label="Selected document inspector"
        >
          <h2>Selected document</h2>
          <p className={styles.label}>Audited financial statements</p>
          <DefinitionRows
            rows={[
              ["Document", horizonEvidence.documentId],
              ["Version", horizonEvidence.documentVersionId],
              ["Location", horizonEvidence.location],
              ["Freshness", horizonEvidence.freshness],
              ["Finding", horizonFinding.findingId],
            ]}
          />
          <Button
            ref={inspectorTrigger}
            hierarchy="secondary"
            onClick={() => openEvidence("inspector")}
          >
            Open exact source
          </Button>
        </aside>
      </div>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        returnFocusRef={returnFocusTarget === "row"
          ? rowTrigger
          : inspectorTrigger}
        title="Exact evidence"
        description="Local fixture evidence inspection"
      >
        <EvidenceReference
          availability="superseded"
          metadata={{
            source: horizonEvidence.documentId,
            location: horizonEvidence.location,
            documentVersion: horizonEvidence.documentVersionId,
            freshness: horizonEvidence.freshness,
          }}
        />
        <p>
          Access classification: available. This inspection is not a live VDR
          connection.
        </p>
      </Drawer>
    </>
  );
}

function Diligence({ initialRecorded }: { initialRecorded: boolean }) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [recorded, setRecorded] = useState(initialRecorded);
  const evidenceTrigger = useRef<HTMLButtonElement>(null);
  const approvalTrigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <div className={styles.workspace}>
        <section
          className={styles.primaryColumn}
          aria-labelledby="finding-queue-heading"
        >
          <Card title="Finding queue">
            <OperationalRows
              rows={[
                [
                  horizonFinding.findingId,
                  horizonFinding.category,
                  horizonFinding.severity,
                  horizonFinding.state,
                ],
                ["FND-021", "Working capital", "moderate", "review-ready"],
                ["FND-027", "Tax exposure", "restricted", "evidence withheld"],
              ]}
            />
          </Card>
          <Card title={`Selected finding · ${horizonFinding.findingId}`}>
            <p>{horizonFinding.coverageMeaning}</p>
            <p>{horizonFinding.transactionImpact}</p>
            <div className={styles.actions}>
              <Button
                ref={evidenceTrigger}
                hierarchy="secondary"
                onClick={() => setEvidenceOpen(true)}
              >
                Open exact evidence
              </Button>
              <Button
                ref={approvalTrigger}
                onClick={() => setApprovalOpen(true)}
              >
                Open approval
              </Button>
            </div>
          </Card>
          <Card title="Deterministic impact">
            <DefinitionRows
              rows={[
                ["Evidence", horizonEvidence.documentVersionId],
                ["Fact", `${horizonFact.factId} · ${horizonFact.state}`],
                ["Calculation", horizonScenario.calculationId],
                [
                  "Scenario",
                  `${horizonScenario.scenarioId} · ${horizonScenario.approvalState}`,
                ],
              ]}
            />
            <p className={styles.meta}>Calculation is not approval.</p>
          </Card>
        </section>
        <aside
          className={styles.contextRail}
          aria-label="Decision authority and audit context"
        >
          <Card title="Human decision">
            <p>
              Approval requires explicit action by{" "}
              {horizonDecision.authority}; AI cannot approve, reject, or record
              a decision autonomously.
            </p>
            {recorded
              ? (
                <StatusIndicator role="success">
                  Recorded · {horizonDecision.auditRecordId}
                </StatusIndicator>
              )
              : (
                <StatusIndicator role="warning">
                  Approval pending
                </StatusIndicator>
              )}
          </Card>
          <Card title="Evidence state">
            <DefinitionRows
              rows={[
                ["Document", horizonEvidence.documentVersionId],
                ["Freshness", horizonEvidence.freshness],
                ["Coverage", "Evidence coverage, not truth"],
                ["Access", horizonEvidence.access],
              ]}
            />
          </Card>
          <Card title="Audit boundary">
            <p>
              {horizonDecision.auditRecordId}{" "}
              is a fixture record. No production decision or audit persistence
              is claimed.
            </p>
          </Card>
        </aside>
      </div>
      <Drawer
        open={evidenceOpen}
        onOpenChange={setEvidenceOpen}
        returnFocusRef={evidenceTrigger}
        title="Evidence inspector"
        context={horizonFinding.findingId}
      >
        <p>
          Evidence coverage: source is stale, so this finding is review-required
          rather than true by confidence alone.
        </p>
        <EvidenceReference
          availability="superseded"
          metadata={{
            source: horizonEvidence.documentId,
            location: horizonEvidence.location,
            documentVersion: horizonEvidence.documentVersionId,
            freshness: horizonEvidence.freshness,
          }}
        />
      </Drawer>
      <Dialog
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        returnFocusRef={approvalTrigger}
        title="Record a human decision"
        description="This local demonstration action is not persisted."
        confirmationAction={{
          label: "Approve as Vice President",
          onConfirm: () => {
            setRecorded(true);
            setApprovalOpen(false);
          },
        }}
      >
        <p>
          Review Finding → Evidence → deterministic impact before confirming.
        </p>
        <div className={styles.actions}>
          <Button hierarchy="secondary" onClick={() => setApprovalOpen(false)}>
            Reject
          </Button>
          <Button hierarchy="secondary" onClick={() => setApprovalOpen(false)}>
            Request review
          </Button>
        </div>
      </Dialog>
    </>
  );
}

function Valuation() {
  return (
    <div className={styles.workspace}>
      <section
        className={styles.primaryColumn}
        aria-labelledby="valuation-analysis-heading"
      >
        <h2
          id="valuation-analysis-heading"
          className={styles.visuallyIntegratedHeading}
        >
          Analytical workspace
        </h2>
        <Card title="Scenario comparison">
          <p className={styles.label}>
            {horizonScenario.scenarioId} · {horizonScenario.version} ·{" "}
            {horizonScenario.approvalState}
          </p>
          <OperationalRows
            rows={horizonScenario.methodOutputs.map((
              output,
            ) => [
              output.split(" ")[0],
              output.slice(output.indexOf(" ") + 1),
              horizonScenario.calculationId,
              "Provisional",
            ])}
          />
        </Card>
        <div className={styles.grid}>
          <Card title="Financial bridge">
            <DefinitionRows
              rows={[
                ["Normalized EBITDA", "R$ 96.4m"],
                ["Net debt", "−R$ 42m"],
                [
                  "Finding adjustment",
                  `${horizonFinding.findingId} · review required`,
                ],
              ]}
            />
          </Card>
          <Card title="Sensitivity">
            <p>{horizonScenario.sensitivity}</p>
            <p className={styles.meta}>
              WACC and terminal-growth assumptions are human-entered.
            </p>
          </Card>
          <Card title="Trading comps">
            <p>
              8 peers · median 9.1× EBITDA · deterministic local calculation.
            </p>
          </Card>
          <Card title="Precedent transactions">
            <p>
              5 transactions · median 8.7× EBITDA · deterministic local
              calculation.
            </p>
          </Card>
        </div>
      </section>
      <aside
        className={styles.contextRail}
        aria-label="Valuation authority and provenance"
      >
        <Card title="Authority and provenance">
          <DefinitionRows
            rows={[
              ["Evidence", horizonEvidence.documentVersionId],
              ["Approved fact", horizonFact.factId],
              ["Assumption", horizonAssumption.interpretationId],
              ["Calculation", horizonScenario.calculationId],
            ]}
          />
        </Card>
        <Card title="Assumption register">
          <p>{horizonAssumption.statement}</p>
          <p className={styles.meta}>
            {horizonAssumption.author} · {horizonAssumption.reviewState}
          </p>
        </Card>
        <Card title="Approval panel">
          <p>
            Restricted or stale inputs block VP approval. Calculation{" "}
            {horizonScenario.calculationId}{" "}
            is deterministic local demonstration provenance.
          </p>
          <StatusIndicator role="warning">Approval blocked</StatusIndicator>
          <p className={styles.meta}>No AI-selected price.</p>
        </Card>
      </aside>
    </div>
  );
}

function Matching() {
  const selected = candidates[0];
  return (
    <div className={styles.threePane}>
      <aside className={styles.sidePanel} aria-label="Counterparty criteria">
        <h2>Criteria and filters</h2>
        <DefinitionRows
          rows={[
            ["Transaction side", "Sell-side"],
            ["Sector", "Consumer"],
            ["Geography", "Brazil and LatAm"],
            ["Capacity", "≥ R$ 500m"],
            ["Safety", "Conflict exclusions enabled"],
          ]}
        />
        <p className={styles.meta}>
          Criteria are user-entered and are not a human shortlist decision.
        </p>
      </aside>
      <section
        className={styles.centerPanel}
        aria-labelledby="candidate-registry-heading"
      >
        <h2 id="candidate-registry-heading">Ranked candidate registry</h2>
        <TableScroller>
          <DataTable className={styles.table} columnCount={5}>
            <caption>Ranked local counterparty universe</caption>
            <thead>
              <tr>
                <th scope="col">Candidate</th>
                <th scope="col">Sourced capacity</th>
                <th scope="col">Inferred fit</th>
                <th scope="col">Recommendation</th>
                <th scope="col">Authority</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr key={candidate.candidateId}>
                  <td>
                    {candidate.candidateId === "CP-002"
                      ? "Restricted candidate"
                      : candidate.candidateId}
                  </td>
                  <td>
                    {candidate.candidateId === "CP-002"
                      ? "Withheld"
                      : candidate.sourcedAttributes}
                  </td>
                  <td>{candidate.inferredFit}</td>
                  <td>{candidate.modelRecommendation}</td>
                  <td>{candidate.outreachAuthority}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </TableScroller>
        <InlineNotice role="warning" title="Shortlist authority required">
          Shortlist approval does not authorize outreach. Conflict review and
          separate human outreach authority remain required.
        </InlineNotice>
      </section>
      <aside
        className={styles.sidePanel}
        aria-label="Selected candidate inspector"
      >
        <h2>Candidate inspector</h2>
        <p className={styles.label}>{selected.candidateId}</p>
        <DefinitionRows
          rows={[
            ["Sourced capacity", selected.sourcedAttributes],
            ["Inferred fit", selected.inferredFit],
            ["Model recommendation", selected.modelRecommendation],
            ["Conflict", selected.conflictStatus],
            ["Shortlist", selected.shortlistDecision],
            ["Outreach", selected.outreachAuthority],
          ]}
        />
        <p className={styles.meta}>
          Model recommendation is provisional support only; a human decision is
          required.
        </p>
      </aside>
    </div>
  );
}

function OperationalRows({ rows }: { rows: readonly (readonly string[])[] }) {
  return (
    <div className={styles.operationalRows}>
      {rows.map((row) => (
        <div className={styles.operationalRow} key={row.join("|")}>
          {row.map((cell, index) => (
            <span
              className={index === 0 ? styles.rowLead : styles.meta}
              key={`${cell}-${index}`}
            >
              {cell}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function DefinitionRows(
  { rows }: { rows: readonly (readonly [string, string])[] },
) {
  return (
    <dl className={styles.definitionRows}>
      {rows.map(([term, value]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TableScroller({ children }: { children: React.ReactNode }) {
  return <div className={styles.tableScroller}>{children}</div>;
}

function Card(
  { children, title }: { children: React.ReactNode; title: string },
) {
  return (
    <section className={styles.card}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
