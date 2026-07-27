import type { EngineRun } from "@/lib/api-client";
import { Accordion } from "@/components/Accordion/Accordion";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Icon } from "@/components/Icon/Icon";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import type {
  FinancialRiskSummary,
  StreamCitation,
} from "./agentic-workspace-types";

interface AgenticInsightsPanelProps {
  documents: Array<{ id: string; name: string; mimeType: string }>;
  selectedDocumentId: string | null;
  selectedCitation: StreamCitation | null;
  financialRisk: FinancialRiskSummary;
  matchRun: EngineRun | undefined;
  valuation: string;
  onDocumentSelect: (documentId: string | null) => void;
  onRunFinancialRisk: () => void;
}

export function AgenticInsightsPanel(props: AgenticInsightsPanelProps) {
  return (
    <aside className="space-y-5 overflow-y-auto">
      <FinancialRiskCard
        financialRisk={props.financialRisk}
        onRunFinancialRisk={props.onRunFinancialRisk}
      />
      <DealMatchCard matchRun={props.matchRun} valuation={props.valuation} />
      <VdrDocumentsCard {...props} />
    </aside>
  );
}

function FinancialRiskCard(
  { financialRisk, onRunFinancialRisk }: {
    financialRisk: FinancialRiskSummary;
    onRunFinancialRisk: () => void;
  },
) {
  if (financialRisk.running) return <FinancialRiskRunning />;
  if (financialRisk.failure) {
    return (
      <FinancialRiskFailure
        failure={financialRisk.failure}
        onRunFinancialRisk={onRunFinancialRisk}
      />
    );
  }
  if (financialRisk.run?.status === "completed") {
    return <FinancialRiskResult financialRisk={financialRisk} />;
  }
  return <FinancialRiskEmpty onRunFinancialRisk={onRunFinancialRisk} />;
}

function FinancialRiskRunning() {
  return (
    <Card variant="raised">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold">Financial risk</p>
        <Button size="sm" variant="secondary" disabled>Run analysis</Button>
      </div>
      <div
        aria-label="Financial risk analysis running"
        className="mt-4 space-y-2"
      >
        <Skeleton variant="rectangular" height={72} />
        <Skeleton width="70%" />
      </div>
    </Card>
  );
}

function FinancialRiskFailure(
  { failure, onRunFinancialRisk }: {
    failure: string;
    onRunFinancialRisk: () => void;
  },
) {
  return (
    <Card variant="raised">
      <Icon name="alert" size="lg" className="text-signal-orange" />
      <h3 className="mt-3 font-bold">Financial risk failed</h3>
      <p role="alert" className="mt-2 text-sm text-slate-gray">{failure}</p>
      <RetryFinancialRiskButton onRunFinancialRisk={onRunFinancialRisk} />
    </Card>
  );
}

function RetryFinancialRiskButton(
  { onRunFinancialRisk }: { onRunFinancialRisk: () => void },
) {
  return (
    <Button
      className="mt-4"
      size="sm"
      variant="primary"
      onClick={onRunFinancialRisk}
    >
      Retry
    </Button>
  );
}

function FinancialRiskResult(
  { financialRisk }: { financialRisk: FinancialRiskSummary },
) {
  return (
    <Card variant="raised">
      <FinancialRiskScoreHeader score={financialRisk.score} />
      <FinancialRiskCompletedAt run={financialRisk.run} />
      <FinancialRiskDetails run={financialRisk.run} />
    </Card>
  );
}

function FinancialRiskScoreHeader({ score }: { score: string }) {
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-gray">
        Financial risk score
      </p>
      <div className="mt-4 flex items-end justify-between">
        <FinancialRiskScore score={score} />
        <Badge variant="orange">Moderate risk</Badge>
      </div>
    </>
  );
}

function FinancialRiskScore({ score }: { score: string }) {
  return (
    <strong className="text-4xl">
      {score}
      <span className="text-base text-slate-gray">/ 5.0</span>
    </strong>
  );
}

function FinancialRiskDetails({ run }: { run: EngineRun | undefined }) {
  return (
    <div className="mt-4">
      <Accordion variant="bordered" items={[financialRiskDetailsItem(run)]} />
    </div>
  );
}

function financialRiskDetailsItem(run: EngineRun | undefined) {
  return {
    id: run?.id ?? "financial-risk",
    title: "Analysis details",
    subtitle: "Deal-derived engine output",
    content: <EngineRunResult result={run?.result} />,
  };
}

function FinancialRiskCompletedAt({ run }: { run: EngineRun | undefined }) {
  if (!run?.completedAt) return null;
  const completedAt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" })
    .format(new Date(run.completedAt));
  return <p className="mt-4 text-xs text-slate-gray">Completed {completedAt}
  </p>;
}

function EngineRunResult({ result }: { result: unknown }) {
  return (
    <pre className="whitespace-pre-wrap text-xs">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}

function FinancialRiskEmpty(
  { onRunFinancialRisk }: { onRunFinancialRisk: () => void },
) {
  return (
    <Card variant="raised">
      <EmptyState
        title="No financial risk run"
        description="Run a deal-scoped analysis to populate this card."
        actionLabel="Run analysis"
        onAction={onRunFinancialRisk}
      />
    </Card>
  );
}

function DealMatchCard(
  { matchRun, valuation }: {
    matchRun: EngineRun | undefined;
    valuation: string;
  },
) {
  return (
    <Card variant="raised">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-gray">
        Deal match score
      </p>
      <p className="mt-3 text-2xl font-bold">
        {matchRun ? valuation : "Not calculated"}
      </p>
      <p className="mt-1 text-xs text-slate-gray">
        Portfolio optimization range
      </p>
    </Card>
  );
}

function VdrDocumentsCard(props: AgenticInsightsPanelProps) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold">VDR documents ingested</h3>
        <Badge variant="default">{props.documents.length}</Badge>
      </div>
      {props.documents.length
        ? <VdrDocumentAccordion {...props} />
        : (
          <EmptyState
            title="No VDR documents"
            description="Upload source documents before requesting cited analysis."
          />
        )}
    </Card>
  );
}

function VdrDocumentAccordion(props: AgenticInsightsPanelProps) {
  return (
    <Accordion
      key={props.selectedDocumentId ?? "vdr-closed"}
      items={props.documents.map((document) => ({
        id: document.id,
        title: document.name,
        subtitle: document.mimeType,
        badge: "VDR",
        content: <VdrDocumentContent documentId={document.id} {...props} />,
      }))}
      variant="bordered"
      defaultOpenIds={props.selectedDocumentId
        ? [props.selectedDocumentId]
        : []}
    />
  );
}

function VdrDocumentContent(
  props: AgenticInsightsPanelProps & { documentId: string },
) {
  return (
    <div className="space-y-3">
      <p>Confidential source metadata. Content remains inside the VDR.</p>
      <SelectedCitation
        documentId={props.documentId}
        citation={props.selectedCitation}
      />
      <Button
        size="sm"
        variant="secondary"
        onClick={() => props.onDocumentSelect(props.documentId)}
      >
        View citation
      </Button>
    </div>
  );
}

function SelectedCitation(
  { documentId, citation }: {
    documentId: string;
    citation: StreamCitation | null;
  },
) {
  if (citation?.documentId !== documentId) return null;
  return (
    <div className="border-t border-dust-taupe pt-3">
      <p className="font-bold">
        {citation.label}
        {citation.page ? ` · page ${citation.page}` : ""}
      </p>
      {citation.excerpt && (
        <p className="mt-1 text-slate-gray">{citation.excerpt}</p>
      )}
    </div>
  );
}
