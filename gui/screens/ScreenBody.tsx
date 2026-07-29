import Link from "next/link";
import {
  Button,
  InlineNotice,
  StatusIndicator,
  Surface,
  TextField,
} from "@/components";
import type { ReadyRouteResolution } from "@/lib/shell/route-context";
import type { Permission } from "@/lib/shell/route-registry";
import { externalFixture, fixtureFor } from "./fixtures";
import type { ScreenFamily, ScreenState } from "./screen-contracts";
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

function familyFor(resolution: ReadyRouteResolution): RouteScreen {
  if (resolution.route.id.startsWith("administration.")) {
    return { family: "settings", permission: "administration" };
  }
  if (resolution.route.id.startsWith("external.")) {
    return { family: "external-participant", permission: "external" };
  }
  return routeScreens[resolution.route.id] ??
    { family: "command-center", permission: "workspace" };
}

function stateFor(resolution: ReadyRouteResolution): ScreenState {
  return resolution.route.availability === "unavailable"
    ? "unavailable"
    : "default";
}

/** Resolves one MAI-99 screen body from MAI-98's already-resolved route context. */
export function ScreenBody(
  { resolution, state: stateOverride }: {
    resolution: ReadyRouteResolution;
    state?: ScreenState;
  },
) {
  const screen = familyFor(resolution);
  const state = stateOverride ?? stateFor(resolution);
  const fixture = screen.family === "external-participant"
    ? externalFixture(state)
    : fixtureFor(screen.family, screen.permission, state);
  return (
    <section
      className={styles.page}
      aria-labelledby="screen-title"
      data-screen-family={fixture.family}
      data-fixture-only="true"
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {fixture.family.replaceAll("-", " ")}
          </p>
          <h1 id="screen-title">{resolution.route.label}</h1>
        </div>
        <StatusIndicator role="incomplete">Fixture-only</StatusIndicator>
      </header>
      <p className={styles.disclosure}>{fixture.disclosure}</p>
      <FamilyContent
        family={fixture.family}
        state={fixture.state}
        routeId={resolution.route.id}
      />
    </section>
  );
}

function FamilyContent(
  { family, state, routeId }: {
    family: ScreenFamily;
    state: ScreenState;
    routeId: string;
  },
) {
  if (state !== "default") return <StatePanel family={family} state={state} />;
  if (family === "external-participant") return <ExternalContent />;
  if (family === "settings") return <SettingsContent />;
  if (family === "new-deal-setup") return <NewDealContent />;
  if (family === "deals-portfolio" || family === "organizations") {
    return <PortfolioContent family={family} />;
  }
  if (family === "global-search") return <SearchContent />;
  if (family === "tasks-approvals" || family === "notification-center") {
    return <WorkContent family={family} routeId={routeId} />;
  }
  return <Cards family={family} />;
}

function StatePanel(
  { family, state }: {
    family: ScreenFamily;
    state: Exclude<ScreenState, "default">;
  },
) {
  if (state === "loading") {
    return (
      <Surface className={styles.item} aria-busy="true">
        <h2>Loading local demonstration data</h2>
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </Surface>
    );
  }
  if (state === "empty") {
    return (
      <InlineNotice
        role="information"
        title="No matching local demonstration data"
      >
        Change the filter or return when a fixture is available.
      </InlineNotice>
    );
  }
  if (state === "partial-failure") {
    return (
      <InlineNotice
        role="warning"
        title="Some local demonstration data could not be prepared"
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

function Cards({ family }: { family: ScreenFamily }) {
  const title = family === "command-center"
    ? "Required work"
    : family === "team-workspace"
    ? "Role and capacity"
    : "Organization identity";
  return (
    <>
      <div className={styles.cards}>
        <Surface className={styles.item}>
          <h2>{title}</h2>
          <p className={styles.meta}>
            Project Horizon · local demonstration context
          </p>
          <StatusIndicator role="warning">Review required</StatusIndicator>
        </Surface>
        <Surface className={styles.item}>
          <h2>Restricted history</h2>
          <p className={styles.meta}>
            Details are intentionally not disclosed before access resolution.
          </p>
          <StatusIndicator role="restricted">Restricted</StatusIndicator>
        </Surface>
      </div>
    </>
  );
}
function PortfolioContent(
  { family }: { family: "deals-portfolio" | "organizations" },
) {
  const label = family === "deals-portfolio" ? "Deals" : "Organizations";
  return (
    <>
      <div className={styles.actions}>
        <TextField
          aria-label={`Filter ${label}`}
          placeholder={`Filter ${label.toLowerCase()}`}
        />
        <Button hierarchy="secondary">Filter status</Button>
      </div>
      <div tabIndex={0}>
        <table className={styles.table}>
          <caption>{label} local demonstration list</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Status</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Project Horizon</td>
              <td>
                <StatusIndicator role="warning">Review due</StatusIndicator>
              </td>
              <td>
                <Link
                  href={family === "deals-portfolio"
                    ? "/deals/demo-deal/overview"
                    : "/organizations/fixture-org"}
                >
                  Open permitted context
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
function WorkContent(
  { family, routeId }: {
    family: "tasks-approvals" | "notification-center";
    routeId: string;
  },
) {
  const notification = family === "notification-center";
  return (
    <div className={styles.cards}>
      <Surface className={styles.item}>
        <h2>
          {notification
            ? "Approval requires attention"
            : "Approve diligence scope"}
        </h2>
        <p className={styles.meta}>
          {notification
            ? "Unread notification — reading it does not complete work."
            : "Approval · due today · permitted deal context."}
        </p>
        <Link href="/deals/demo-deal/diligence">
          Open exact permitted context
        </Link>
      </Surface>
      <Surface className={styles.item}>
        <h2>
          {notification
            ? "Synchronization partially failed"
            : "Restricted assignment"}
        </h2>
        <StatusIndicator role={notification ? "warning" : "restricted"}>
          {notification ? "Partial failure" : "Restricted"}
        </StatusIndicator>
        <p className={styles.meta}>Route: {routeId}</p>
      </Surface>
    </div>
  );
}
function SearchContent() {
  return (
    <>
      <TextField
        aria-label="Search accessible workspace"
        placeholder="Search deals, organizations, evidence or decisions"
      />
      <div className={styles.cards}>
        <Surface className={styles.item}>
          <h2>Deals</h2>
          <p>Project Horizon · accessible result</p>
          <Link href="/deals/demo-deal/overview">Open result</Link>
        </Surface>
        <Surface className={styles.item}>
          <h2>Restricted results</h2>
          <p>Some matches cannot be disclosed in name, count, or preview.</p>
          <StatusIndicator role="restricted">Restricted</StatusIndicator>
        </Surface>
      </div>
    </>
  );
}
function NewDealContent() {
  return (
    <form className={styles.cards}>
      <Surface className={styles.item}>
        <h2>New deal setup</h2>
        <label htmlFor="deal-name">Working name</label>
        <TextField
          id="deal-name"
          aria-invalid="true"
          aria-describedby="deal-name-error"
          placeholder="Required"
        />
        <p id="deal-name-error">Enter a working name before continuing.</p>
        <StatusIndicator role="information">
          Draft only — not persisted
        </StatusIndicator>
        <div className={styles.actions}>
          <Button>Continue setup</Button>
          <Button hierarchy="destructive">Discard draft</Button>
        </div>
      </Surface>
    </form>
  );
}
function SettingsContent() {
  return (
    <div className={styles.cards}>
      <Surface className={styles.item}>
        <h2>Policy-controlled settings</h2>
        <p>
          Changes are local proposals only and do not alter credentials,
          integrations, billing, retention, or policy.
        </p>
        <StatusIndicator role="critical">Policy locked</StatusIndicator>
      </Surface>
      <Surface className={styles.item}>
        <h2>Integration secret</h2>
        <p aria-label="Secret value masked">••••••••</p>
        <StatusIndicator role="restricted">Secret masked</StatusIndicator>
      </Surface>
    </div>
  );
}
function ExternalContent() {
  const fixture = externalFixture();
  return (
    <div className={styles.cards}>
      <Surface className={styles.item}>
        <h2>{fixture.role}</h2>
        <p>{fixture.accessScope}</p>
        <p className={styles.meta}>Access expires {fixture.expiry}</p>
        <Button>Submit response</Button>
        <StatusIndicator role="warning">
          Submitted responses are fixture-only
        </StatusIndicator>
      </Surface>
      <Surface className={styles.item}>
        <h2>Access boundary</h2>
        <p>
          No internal organization metadata, deal counts, findings, strategy, or
          Copilot capability is available here.
        </p>
        <StatusIndicator role="restricted">Restricted scope</StatusIndicator>
      </Surface>
    </div>
  );
}

export { familyFor as resolveScreenFamily };
