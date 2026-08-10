export const adapterFamilies = [
  "application-shell",
  "command-center",
  "deals-portfolio",
  "new-deal-setup",
  "tasks-approvals",
  "notification-center",
  "global-search",
  "organizations",
  "organization-detail",
  "team-workspace",
  "settings-family",
  "external-participant",
  "deal-overview",
  "target-dossier",
  "documents-vdr",
  "diligence-decision-room",
  "valuation-lab",
  "matching-universe",
  "negotiation-room",
  "closing-control-room",
  "agentic-workspace",
  "deal-activity-audit",
  "deal-team-access",
  "deliverables-exports",
  "deal-settings-archive",
] as const;

export type AdapterFamily = (typeof adapterFamilies)[number];
export type AdapterOwner =
  | "shell"
  | "global"
  | "work-management"
  | "organization"
  | "administration"
  | "external"
  | "deal-intelligence"
  | "deal-execution";
export type RouteReadiness =
  | "registered"
  | "not-registered"
  | "operation-missing"
  | "contract-pending";

export interface AdapterDescriptor {
  readonly family: AdapterFamily;
  readonly owner: AdapterOwner;
  readonly route: string;
  readonly readModel: string;
  readonly commands: readonly string[];
  readonly routeReadiness: RouteReadiness;
  readonly states: readonly string[];
}

const descriptor = (
  family: AdapterFamily,
  owner: AdapterOwner,
  route: string,
  readModel: string,
  commands: readonly string[],
  routeReadiness: RouteReadiness,
  states: readonly string[],
): AdapterDescriptor => ({
  family,
  owner,
  route,
  readModel,
  commands,
  routeReadiness,
  states,
});

export const adapterCatalog: readonly AdapterDescriptor[] = [
  descriptor(
    "application-shell",
    "shell",
    "/api/v1/access/shell",
    "GetAuthorizedShell",
    ["SwitchWorkspace", "SelectDealContext"],
    "not-registered",
    [
      "global",
      "deal",
      "administration",
      "external",
      "restricted",
      "mobile-drawer",
      "long-content",
    ],
  ),
  descriptor(
    "command-center",
    "global",
    "/api/v1/work-management/command-center",
    "GetCommandCenter",
    ["DismissPriorityItem"],
    "not-registered",
    ["default", "empty", "unavailable"],
  ),
  descriptor(
    "deals-portfolio",
    "global",
    "/api/v1/deals",
    "SearchAuthorizedDeals",
    ["CreateSavedDealView"],
    "operation-missing",
    ["default", "loading", "empty", "restricted", "long-content"],
  ),
  descriptor(
    "new-deal-setup",
    "global",
    "/api/v1/deals",
    "GetDealCreationOptions",
    ["CreateDeal", "ConfigureDealMandate"],
    "operation-missing",
    ["default", "sensitive"],
  ),
  descriptor(
    "tasks-approvals",
    "work-management",
    "/api/v1/work-management",
    "SearchWorkItems",
    [
      "StartTask",
      "CompleteTask",
      "ReassignTask",
      "SubmitApprovalDecision",
      "WithdrawApprovalRequest",
    ],
    "not-registered",
    ["default", "restricted", "unavailable"],
  ),
  descriptor(
    "notification-center",
    "work-management",
    "/api/v1/notifications",
    "ListNotifications",
    ["MarkNotificationRead", "UpdateSubscription"],
    "not-registered",
    ["default", "empty", "partial-failure"],
  ),
  descriptor(
    "global-search",
    "work-management",
    "/api/v1/search",
    "SearchAuthorizedObjects",
    ["SaveSearch"],
    "not-registered",
    ["default", "loading", "empty", "partial-failure", "restricted"],
  ),
  descriptor(
    "organizations",
    "organization",
    "/api/v1/organizations",
    "SearchOrganizations",
    ["CreateOrganization", "MergeOrganizationRecord"],
    "not-registered",
    ["default", "empty", "restricted"],
  ),
  descriptor(
    "organization-detail",
    "organization",
    "/api/v1/organizations/:organizationId",
    "GetOrganizationDossier",
    ["UpdateOrganization", "AddLegalEntity", "LinkPerson"],
    "not-registered",
    ["default", "restricted", "long-content"],
  ),
  descriptor(
    "team-workspace",
    "administration",
    "/api/v1/identity-access/memberships",
    "GetTeamWorkspace",
    [
      "CreateInvitation",
      "ActivateMembership",
      "SuspendMembership",
      "StartOffboarding",
    ],
    "not-registered",
    ["default", "sensitive", "unavailable"],
  ),
  descriptor(
    "settings-family",
    "administration",
    "/api/v1/identity-access",
    "GetPermissionPolicyMatrix",
    ["CreateRolePolicy", "GrantPermission", "ApplyRestriction", "RevokeGrant"],
    "not-registered",
    ["default", "restricted", "sensitive"],
  ),
  descriptor(
    "external-participant",
    "external",
    "/api/v1/external-access",
    "GetExternalWorkspace",
    ["SubmitExternalResponse", "AcknowledgeReceipt"],
    "not-registered",
    ["default", "restricted", "unavailable", "partial-failure", "sensitive"],
  ),
  descriptor(
    "deal-overview",
    "deal-intelligence",
    "/api/v1/deals/:dealId",
    "GetDealOverview",
    ["UpdateDealConfiguration"],
    "contract-pending",
    ["default", "blocked", "material-change"],
  ),
  descriptor(
    "target-dossier",
    "deal-intelligence",
    "/api/v1/evidence-knowledge/facts/:factId",
    "GetTargetDossier",
    ["ProposeFactVersion", "ApproveFactVersion", "SupersedeFact"],
    "contract-pending",
    ["default", "restricted", "stale"],
  ),
  descriptor(
    "documents-vdr",
    "deal-intelligence",
    "/api/v1/documents",
    "GetDocumentRegister",
    [
      "InitiateDocumentUpload",
      "SynchronizeDocumentSource",
      "AddDocumentVersion",
      "SupersedeDocumentVersion",
      "StartDocumentProcessing",
      "RetryDocumentProcessing",
      "CancelProcessing",
    ],
    "not-registered",
    ["default", "processing", "failure", "restricted"],
  ),
  descriptor(
    "diligence-decision-room",
    "deal-intelligence",
    "/api/v1/evidence-knowledge",
    "GetDiligenceDecisionPackage",
    [
      "ProposeFinding",
      "RecordFindingImpact",
      "ApproveFinding",
      "RecordDiligenceDecision",
    ],
    "not-registered",
    ["default", "invalidated", "approval", "recorded", "evidence-drawer"],
  ),
  descriptor(
    "valuation-lab",
    "deal-intelligence",
    "/api/v1/valuation/scenarios/:scenarioId",
    "GetValuationLab",
    ["CreateValuationScenario", "ComputeValuation", "ApproveValuationScenario"],
    "contract-pending",
    ["default", "provisional", "approved", "stale"],
  ),
  descriptor(
    "matching-universe",
    "deal-intelligence",
    "/api/v1/matching/candidates/:candidateId",
    "GetCounterpartyUniverse",
    [
      "SetMatchingCriteria",
      "RunMatching",
      "RecordConflict",
      "ResolveConflict",
      "RestrictCandidateIdentity",
      "RecordRecommendation",
      "ApproveShortlist",
      "AuthorizeOutreach",
    ],
    "contract-pending",
    ["default", "restricted", "conflict-blocked"],
  ),
  descriptor(
    "negotiation-room",
    "deal-execution",
    "/api/v1/negotiation/rounds/:roundId",
    "GetNegotiationRoom",
    [
      "OpenNegotiationRound",
      "RecordProposal",
      "DraftCounterproposal",
      "NormalizeProposalTerms",
      "UpdateInternalPosition",
      "ApproveCounterproposal",
      "SendApprovedProposal",
      "RetryProposalDelivery",
    ],
    "contract-pending",
    ["buy-side", "sell-side", "restricted", "stale", "approval-pending"],
  ),
  descriptor(
    "closing-control-room",
    "deal-execution",
    "/api/v1/closing/:workspaceId",
    "GetClosingChecklist",
    [
      "SubmitConditionEvidence",
      "SatisfyCondition",
      "RequestWaiver",
      "ApproveWaiver",
      "ApproveClosingReadiness",
      "RecordSignature",
      "AssembleClosingPackage",
      "ConfirmClosing",
    ],
    "contract-pending",
    ["default", "blocked", "readiness-approval", "irreversible-confirmation"],
  ),
  descriptor(
    "agentic-workspace",
    "deal-execution",
    "/api/v1/agent-execution",
    "GetAgentMission",
    [
      "CreateAgentMission",
      "ApproveAgentPlan",
      "StartAgentRun",
      "RetryAgentRun",
      "CancelAgentRun",
    ],
    "not-registered",
    [
      "proposed",
      "running",
      "blocked",
      "failed",
      "approval-pending",
      "completed",
    ],
  ),
  descriptor(
    "deal-activity-audit",
    "deal-execution",
    "/api/v1/deals/:dealId/activity",
    "ReconstructAuditEvent",
    ["RequestAuditExport"],
    "contract-pending",
    ["default", "restricted-export", "stale-consequence"],
  ),
  descriptor(
    "deal-team-access",
    "deal-execution",
    "/api/v1/identity-access/memberships",
    "GetDealTeamWorkspace",
    [
      "CreateInvitation",
      "ActivateMembership",
      "SuspendMembership",
      "StartOffboarding",
    ],
    "not-registered",
    ["default", "invite", "revoke", "offboarding", "restricted"],
  ),
  descriptor(
    "deliverables-exports",
    "deal-execution",
    "/api/v1/deliverables",
    "GetDeliverableWorkspace",
    [
      "CreateDeliverableDraft",
      "ApproveDeliverableVersion",
      "ApplyRedaction",
      "AuthorizeRelease",
      "GenerateExport",
      "DistributeRelease",
      "RetryExport",
      "MarkDeliverableStale",
      "RegenerateDeliverable",
    ],
    "contract-pending",
    ["draft", "approval", "external-release", "stale", "failure"],
  ),
  descriptor(
    "deal-settings-archive",
    "deal-execution",
    "/api/v1/deal-governance",
    "GetDealGovernance",
    [
      "PauseDeal",
      "ResumeDeal",
      "ArchiveDeal",
      "RestoreDeal",
      "RequestDeletion",
    ],
    "contract-pending",
    [
      "active",
      "paused",
      "archived",
      "read-only",
      "deletion-request",
      "restricted",
    ],
  ),
];

export function adapterDescriptorFor(
  family: AdapterFamily,
): AdapterDescriptor {
  const result = adapterCatalog.find((candidate) =>
    candidate.family === family
  );
  if (result === undefined) {
    throw new Error(`Adapter family ${family} is not present in the catalog.`);
  }
  return result;
}

export function isAdapterFamily(value: string): value is AdapterFamily {
  return adapterFamilies.includes(value as AdapterFamily);
}
