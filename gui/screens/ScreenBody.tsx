import Link from "next/link";
import {
  Button,
  InlineNotice,
  StatusIndicator,
  Surface,
  TextField,
} from "@/components";
import type { StatusIndicatorRole } from "@/components/StatusIndicator/StatusIndicator";
import type { ReadyRouteResolution } from "@/lib/shell/route-context";
import type { Permission } from "@/lib/shell/route-registry";
import { externalFixture, fixtureFor } from "./fixtures";
import type { AdapterReadModel, AdapterResult } from "@/lib/adapters/contracts";
import {
  screenStateForAdapter,
  type ScreenDataSource,
  type ScreenFamily,
  type ScreenState,
} from "./screen-contracts";
import styles from "./ScreenBody.module.css";

type RouteScreen = {
  family: ScreenFamily;
  state?: ScreenState;
  permission: Permission;
};

const routeScreens: Readonly<Record<string, RouteScreen>> = {
  "global.home": { family: "command-center", permission: "workspace" },
  "global.deals": { family: "deals-portfolio", permission: "workspace" },
  "global.new-deal": { family: "new-deal-setup", permission: "workspace" },
  "global.tasks": { family: "tasks-approvals", permission: "workspace" },
  "global.approvals": { family: "tasks-approvals", permission: "workspace" },
  "global.notifications": {
    family: "notification-center",
    permission: "workspace",
  },
  "global.search": { family: "global-search", permission: "workspace" },
  "global.organizations": { family: "organizations", permission: "workspace" },
  "global.organization-detail": {
    family: "organization-detail",
    permission: "workspace",
  },
  "global.team": { family: "team-workspace", permission: "workspace" },
};

function familyFor(resolution: ReadyRouteResolution): RouteScreen | undefined {
  if (resolution.route.implementationStatus !== "screen-body") return undefined;
  if (resolution.route.id.startsWith("administration.")) {
    return { family: "settings", permission: "administration" };
  }
  if (resolution.route.id.startsWith("external.")) {
    return { family: "external-participant", permission: "external" };
  }
  return routeScreens[resolution.route.id];
}

function stateFor(resolution: ReadyRouteResolution): ScreenState {
  return resolution.route.availability === "unavailable"
    ? "unavailable"
    : "default";
}

function roleForStatus(status: string): StatusIndicatorRole {
  const normalized = status.toLowerCase();
  if (normalized.includes("restrict")) return "restricted";
  if (normalized.includes("block") || normalized.includes("error")) {
    return "critical";
  }
  if (normalized.includes("review") || normalized.includes("stale")) {
    return "warning";
  }
  if (normalized.includes("ready") || normalized.includes("complete")) {
    return "success";
  }
  return "information";
}

type WorkItem = {
  readonly title: string;
  readonly meta: string;
  readonly status: string;
  readonly role: StatusIndicatorRole;
};

type FamilyDefinition = {
  readonly eyebrow: string;
  readonly title: string;
  readonly action?: string;
  readonly items: readonly [WorkItem, WorkItem, WorkItem, WorkItem];
  readonly inspector: {
    readonly title: string;
    readonly copy: string;
    readonly status: string;
    readonly role: StatusIndicatorRole;
    readonly href?: string;
    readonly hrefLabel?: string;
  };
};

const familyDefinitions: Readonly<
  Record<Exclude<ScreenFamily, "deals-portfolio">, FamilyDefinition>
> = {
  "command-center": {
    eyebrow: "Command Center",
    title: "Required work",
    items: [
      {
        title: "Approve diligence scope",
        meta: "Project Horizon · due 15:00",
        status: "Approval",
        role: "critical",
      },
      {
        title: "Buyer list changes",
        meta: "Project Copper · conflict review",
        status: "Review",
        role: "warning",
      },
      {
        title: "Valuation range",
        meta: "Project Summit · ready",
        status: "Ready",
        role: "success",
      },
      {
        title: "Missing evidence",
        meta: "Project Aurora · blocked",
        status: "Blocked",
        role: "incomplete",
      },
    ],
    inspector: {
      title: "Approve diligence scope",
      copy:
        "Evidence, authority, consequence and exact destination stay visible before a decision.",
      status: "Permission checked",
      role: "success",
      href: "/deals/demo-deal/diligence",
      hrefLabel: "Open exact context",
    },
  },
  "new-deal-setup": {
    eyebrow: "New Deal Setup",
    title: "Create a controlled transaction workspace",
    action: "Save draft",
    items: [
      {
        title: "Mandate basics",
        meta: "Working name, transaction side and jurisdiction",
        status: "Current",
        role: "information",
      },
      {
        title: "Organizations",
        meta: "Target, buyer and seller identities",
        status: "Review",
        role: "warning",
      },
      {
        title: "Team and authority",
        meta: "Approval roles must be assigned",
        status: "Blocked",
        role: "incomplete",
      },
      {
        title: "Source connection",
        meta: "Controlled document source is optional",
        status: "Optional",
        role: "neutral",
      },
    ],
    inspector: {
      title: "Selected draft",
      copy:
        "Nothing is persisted. Permissions are resolved before organizations, users or sources are attached.",
      status: "Permission checked",
      role: "success",
    },
  },
  "tasks-approvals": {
    eyebrow: "Tasks & Approvals",
    title: "Tasks & Approvals workspace",
    items: [
      {
        title: "Approve diligence scope",
        meta: "Project Horizon · evidence attached",
        status: "Approval",
        role: "critical",
      },
      {
        title: "Review returned submission",
        meta: "External counsel · changes requested",
        status: "Review",
        role: "warning",
      },
      {
        title: "Assign valuation check",
        meta: "Team queue · unassigned",
        status: "Open",
        role: "information",
      },
      {
        title: "Completed decision",
        meta: "Audit record immutable",
        status: "Done",
        role: "success",
      },
    ],
    inspector: {
      title: "Approve diligence scope",
      copy:
        "Evidence, authority, consequence, history and exact destination are shown here.",
      status: "Permission checked",
      role: "success",
      href: "/deals/demo-deal/diligence",
      hrefLabel: "Open decision context",
    },
  },
  "notification-center": {
    eyebrow: "Notification Center",
    title: "Notification Center workspace",
    action: "Mark read",
    items: [
      {
        title: "Mention in IC memo",
        meta: "Project Horizon · 18 min ago",
        status: "Unread",
        role: "information",
      },
      {
        title: "Document sync complete",
        meta: "Project Horizon · 4 min ago",
        status: "System",
        role: "neutral",
      },
      {
        title: "Approval decided",
        meta: "Result details require deal access",
        status: "Restricted",
        role: "restricted",
      },
      {
        title: "Access changed",
        meta: "Object identity withheld",
        status: "Redacted",
        role: "restricted",
      },
    ],
    inspector: {
      title: "Mention in IC memo",
      copy:
        "Notifications describe events. Material work remains independently available in Tasks & Approvals.",
      status: "Permission checked",
      role: "success",
    },
  },
  "global-search": {
    eyebrow: "Global Search",
    title: "Search accessible work",
    items: [
      {
        title: "Project Horizon",
        meta: "Accessible transaction result",
        status: "Deal",
        role: "information",
      },
      {
        title: "Finding DD-018",
        meta: "Evidence-linked diligence result",
        status: "Evidence",
        role: "success",
      },
      {
        title: "Restricted result",
        meta: "Name, count and preview withheld",
        status: "Restricted",
        role: "restricted",
      },
      {
        title: "Processing index",
        meta: "Search coverage is incomplete",
        status: "Partial",
        role: "warning",
      },
    ],
    inspector: {
      title: "Project Horizon",
      copy:
        "Search scope, object type, permission state and exact next action remain explicit.",
      status: "Permission checked",
      role: "success",
      href: "/deals/demo-deal/overview",
      hrefLabel: "Open permitted result",
    },
  },
  organizations: {
    eyebrow: "Organizations",
    title: "Organizations workspace",
    action: "New organization",
    items: [
      {
        title: "Northstar Foods",
        meta: "Active client · identity reviewed",
        status: "Active",
        role: "success",
      },
      {
        title: "HelioGrid SA",
        meta: "Possible duplicate · review needed",
        status: "Review",
        role: "warning",
      },
      {
        title: "Vale Verde Holdings",
        meta: "Corporate group · 3 legal entities",
        status: "Verified",
        role: "success",
      },
      {
        title: "Restricted organization",
        meta: "Deal association hidden",
        status: "Restricted",
        role: "restricted",
      },
    ],
    inspector: {
      title: "Northstar Foods",
      copy:
        "Identity, permission, provenance and exact next action are visible without leaking restricted deal facts.",
      status: "Permission checked",
      role: "success",
      href: "/organizations/fixture-org",
      hrefLabel: "Open organization",
    },
  },
  "organization-detail": {
    eyebrow: "Organization Detail",
    title: "Northstar Foods",
    action: "Add to deal",
    items: [
      {
        title: "Identity summary",
        meta: "Registration evidence requires review",
        status: "Needs review",
        role: "warning",
      },
      {
        title: "Corporate group",
        meta: "Parent and subsidiaries are current",
        status: "Current",
        role: "success",
      },
      {
        title: "Contacts",
        meta: "Personal details require permission",
        status: "Restricted",
        role: "restricted",
      },
      {
        title: "Deal history",
        meta: "Only authorized relationships are shown",
        status: "Permissioned",
        role: "information",
      },
    ],
    inspector: {
      title: "Identity review",
      copy:
        "Reusable organization facts remain distinct from deal-specific dossier evidence and interpretations.",
      status: "Permission checked",
      role: "success",
    },
  },
  "team-workspace": {
    eyebrow: "Team Workspace",
    title: "Team Workspace",
    action: "Invite member",
    items: [
      {
        title: "Ana Costa",
        meta: "Vice President · 2 active approvals",
        status: "Available",
        role: "success",
      },
      {
        title: "Rafael Lima",
        meta: "Associate · capacity threshold reached",
        status: "At risk",
        role: "warning",
      },
      {
        title: "Mei Tan",
        meta: "Director · Project Summit",
        status: "Assigned",
        role: "information",
      },
      {
        title: "External counsel",
        meta: "Purpose-bound temporary access",
        status: "Restricted",
        role: "restricted",
      },
    ],
    inspector: {
      title: "Ana Costa",
      copy:
        "Institution role, deal assignments, capacity and approval authority remain separately governed.",
      status: "Permission checked",
      role: "success",
    },
  },
  settings: {
    eyebrow: "Settings Screen Family",
    title: "Settings Screen Family workspace",
    action: "Propose change",
    items: [
      {
        title: "Role policy matrix",
        meta: "VP can propose; IC must approve",
        status: "Approval required",
        role: "warning",
      },
      {
        title: "Integrations",
        meta: "VDR simulated · webhook signing masked",
        status: "Masked",
        role: "restricted",
      },
      {
        title: "Security policy",
        meta: "MFA required · SSO planned, not implemented",
        status: "Effective",
        role: "success",
      },
      {
        title: "Developer access",
        meta: "Sandbox key one-time reveal",
        status: "Sensitive",
        role: "critical",
      },
    ],
    inspector: {
      title: "Configuration version",
      copy: "Draft, proposed, effective and historical states stay distinct.",
      status: "Versioned",
      role: "success",
    },
  },
  "external-participant": {
    eyebrow: "External-Participant Screen Family",
    title: "Requested work",
    action: "Submit response",
    items: [
      {
        title: "Access expires Friday",
        meta: "Sponsor: Ana Costa · Project Horizon",
        status: "Expires soon",
        role: "warning",
      },
      {
        title: "Information request",
        meta: "Financial statements · due tomorrow",
        status: "Open",
        role: "information",
      },
      {
        title: "Submission draft",
        meta: "2 files uploaded · validation pending",
        status: "Draft",
        role: "warning",
      },
      {
        title: "Approval request",
        meta: "Decision receipt available after submit",
        status: "Pending",
        role: "restricted",
      },
    ],
    inspector: {
      title: "External access envelope",
      copy:
        "Sponsor, expiry, allowed object and receipt policy stay visible. Internal findings and strategy remain absent.",
      status: "Purpose-bound",
      role: "success",
    },
  },
};

const deals = [
  [
    "Project Horizon",
    "Northstar Foods",
    "Diligence",
    "Approval due",
    "Ana Costa",
  ],
  ["Project Copper", "HelioGrid", "Matching", "Conflict review", "Rafael Lima"],
  ["Project Summit", "Vale Verde", "Valuation", "Ready", "Mei Tan"],
  ["Restricted deal", "Redacted", "Restricted", "Hidden", "Restricted"],
] as const;

/** Resolves one MAI-99 screen body from MAI-98's already-resolved route context. */
export function ScreenBody(
  {
    resolution,
    state: stateOverride,
    dataSource = "fixture",
    adapter,
  }: {
    resolution: ReadyRouteResolution;
    state?: ScreenState;
    dataSource?: ScreenDataSource;
    adapter?: AdapterResult<AdapterReadModel>;
  },
) {
  const screen = familyFor(resolution);
  if (!screen) return null;
  const state = stateOverride ?? (dataSource === "v1"
    ? screenStateForAdapter(adapter)
    : stateFor(resolution));
  const fixture = dataSource === "fixture"
    ? screen.family === "external-participant"
      ? externalFixture(state)
      : fixtureFor(screen.family, screen.permission, state)
    : undefined;
  const definition = screen.family === "deals-portfolio"
    ? undefined
    : familyDefinitions[screen.family];
  const data = adapter !== undefined && "data" in adapter
    ? adapter.data
    : undefined;
  return (
    <section
      className={styles.page}
      aria-labelledby="screen-title"
      data-screen-family={screen.family}
      data-fixture-only={dataSource === "fixture" ? "true" : undefined}
      data-conformance-layout={state === "default" ? "list-detail" : "state"}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {screen.family === "deals-portfolio"
              ? "Deals Portfolio"
              : definition?.eyebrow}
          </p>
          <h1 id="screen-title">
            {screen.family === "deals-portfolio"
              ? "Accessible transaction registry"
              : definition?.title}
          </h1>
        </div>
        <div className={styles.headerActions}>
          {state === "default" && definition?.action
            ? <Button hierarchy="secondary">{definition.action}</Button>
            : null}
          {state === "default" && screen.family === "deals-portfolio"
            ? <Button hierarchy="secondary">Create deal</Button>
            : null}
          <StatusIndicator role={dataSource === "fixture" ? "incomplete" : "information"}>
            {dataSource === "fixture" ? "Fixture-only" : "v1 adapter"}
          </StatusIndicator>
        </div>
      </header>
      <p className={styles.disclosure}>
        {fixture?.disclosure ??
          "Authoritative v1 data only — no fixture fallback is enabled."}
      </p>
      <FamilyContent
        family={screen.family}
        state={state}
        data={data}
        dataSource={dataSource}
      />
    </section>
  );
}

function FamilyContent(
  { family, state, data, dataSource }: {
    family: ScreenFamily;
    state: ScreenState;
    data?: AdapterReadModel;
    dataSource: ScreenDataSource;
  },
) {
  if (state !== "default" && !(state === "stale" && data)) {
    return <StatePanel family={family} state={state} dataSource={dataSource} />;
  }
  if (family === "deals-portfolio") {
    return <DealsPortfolioContent data={data} dataSource={dataSource} />;
  }
  return <OperationalContent family={family} data={data} dataSource={dataSource} />;
}

function StatePanel(
  { family, state, dataSource }: {
    family: ScreenFamily;
    state: Exclude<ScreenState, "default">;
    dataSource: ScreenDataSource;
  },
) {
  const copy = dataSource === "fixture" ? "local demonstration" : "v1";
  if (state === "loading") {
    return (
      <Surface className={styles.item} aria-busy="true">
        <h2>Loading {copy} data</h2>
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </Surface>
    );
  }
  if (state === "empty") {
    return (
      <InlineNotice
        role="information"
        title={`No matching ${copy} data`}
      >
        Change the filter or return when a fixture is available.
      </InlineNotice>
    );
  }
  if (state === "partial-failure") {
    return (
      <InlineNotice
        role="warning"
        title={`Some ${copy} data could not be prepared`}
      >
        Available work remains separate from this partial failure.
      </InlineNotice>
    );
  }
  if (state === "restricted") {
    return (
      <InlineNotice role="restricted" title="Restricted">
        Names, counts, previews, and accessible names are withheld until
        permission is resolved.
      </InlineNotice>
    );
  }
  if (state === "unavailable") {
    return (
      <InlineNotice role="warning" title="Temporarily unavailable">
        No cached data is presented as current.
      </InlineNotice>
    );
  }
  if (state === "stale") {
    return (
      <InlineNotice role="warning" title="Data requires freshness review">
        The v1 projection is stale. No current claim is made until the source
        version is reviewed.
      </InlineNotice>
    );
  }
  if (dataSource === "v1") {
    return (
      <InlineNotice role="restricted" title="Sensitive data is restricted">
        Sensitive values are withheld until the v1 permission decision is
        available.
      </InlineNotice>
    );
  }
  return (
    <Surface className={styles.item}>
      <h2>
        {family === "settings"
          ? "Policy-controlled action"
          : "Confirm destructive action"}
      </h2>
      <p>This fixture action is not persisted.</p>
      <Button hierarchy="destructive">Confirm fixture-only action</Button>
    </Surface>
  );
}

function OperationalContent(
  { family, data, dataSource }: {
    family: Exclude<ScreenFamily, "deals-portfolio">;
    data?: AdapterReadModel;
    dataSource: ScreenDataSource;
  },
) {
  const definition = familyDefinitions[family];
  const items = dataSource === "v1"
    ? data?.items ?? []
    : definition.items;
  const selected = data?.items.find(
    (item) => item.id === data?.selectedItemId,
  );
  const inspector = dataSource === "v1"
    ? {
      title: selected?.title ?? "Selected context",
      copy: selected?.summary ?? "No item is selected in the v1 read model.",
      status: selected?.status ?? "No current item",
      role: selected ? roleForStatus(selected.status) : "information" as const,
    }
    : definition.inspector;
  return (
    <>
      {family === "global-search"
        ? (
          <div className={styles.searchBar}>
            <TextField
              aria-label="Search accessible workspace"
              placeholder="Search deals, organizations, evidence or decisions"
            />
          </div>
        )
        : null}
      <div className={styles.workspace}>
        <ol
          className={styles.registry}
          aria-label={`${definition.eyebrow} items`}
        >
          {items.map((item, index) => (
            <li key={`${"id" in item ? item.id : item.title}-${index}`}>
              <Surface className={styles.row}>
                <h2>{item.title}</h2>
                <p className={styles.meta}>{"meta" in item ? item.meta : item.summary}</p>
                <StatusIndicator role={"role" in item ? item.role : roleForStatus(item.status)}>
                  {item.status}
                </StatusIndicator>
              </Surface>
            </li>
          ))}
        </ol>
        <aside className={styles.inspector} aria-label="Selected context">
          <Surface className={styles.item}>
            <h2>{inspector.title}</h2>
            <p className={styles.meta}>{inspector.copy}</p>
            <StatusIndicator role={inspector.role}>
              {inspector.status}
            </StatusIndicator>
            {dataSource === "fixture" && definition.inspector.href && definition.inspector.hrefLabel
              ? (
                <Link href={definition.inspector.href}>
                  {definition.inspector.hrefLabel}
                </Link>
              )
              : null}
          </Surface>
        </aside>
      </div>
    </>
  );
}

function DealsPortfolioContent(
  { data, dataSource }: {
    data?: AdapterReadModel;
    dataSource: ScreenDataSource;
  },
) {
  const rows = dataSource === "v1"
    ? (data?.items ?? []).map((item) => [
      item.title,
      item.summary,
      item.status,
      item.status,
      "Permission resolved",
    ])
    : deals;
  return (
    <>
      <div className={styles.filterBar} aria-label="Deal scope and filters">
        <StatusIndicator role="information">Mine</StatusIndicator>
        <StatusIndicator role="neutral">Active</StatusIndicator>
        <StatusIndicator role="neutral">Diligence</StatusIndicator>
        <StatusIndicator role="warning">At risk</StatusIndicator>
        <StatusIndicator role="neutral">Archived</StatusIndicator>
      </div>
      <div className={styles.workspace}>
        <div className={styles.registryTable} tabIndex={0}>
          <table className={styles.table}>
            <caption>Accessible transaction registry</caption>
            <thead>
              <tr>
                <th scope="col">Code name</th>
                <th scope="col">Organization</th>
                <th scope="col">Stage</th>
                <th scope="col">Attention</th>
                <th scope="col">Lead</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((deal) => (
                <tr key={deal[0]}>
                  {deal.map((value, index) => (
                    <td key={`${value}-${index}`}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <ol className={styles.mobileRegistry} aria-label="Deals">
            {rows.map((deal) => (
              <li key={deal[0]}>
                <Surface className={styles.row}>
                  <h2>{deal[0]}</h2>
                  <p className={styles.meta}>{deal[1]} · {deal[2]}</p>
                  <StatusIndicator
                    role={deal[0] === "Restricted deal"
                      ? "restricted"
                      : deal[3] === "Ready"
                      ? "success"
                      : "warning"}
                  >
                    {deal[3]}
                  </StatusIndicator>
                </Surface>
              </li>
            ))}
          </ol>
        </div>
        <aside className={styles.inspector} aria-label="Selected deal preview">
          <Surface className={styles.item}>
            <h2>{data?.items[0]?.title ?? "Selected deal"}</h2>
            <p className={styles.meta}>
              {data?.items[0]?.summary ??
                "Selected deal context remains in the deal workspace."}
            </p>
            <StatusIndicator role={data?.items[0] ? roleForStatus(data.items[0].status) : "restricted"}>
              {data?.items[0]?.status ?? "Restricted values hidden"}
            </StatusIndicator>
            {dataSource === "fixture"
              ? <Link href="/deals/demo-deal/overview">Open deal</Link>
              : null}
          </Surface>
        </aside>
      </div>
    </>
  );
}

export { familyFor as resolveScreenFamily };
