import { expect, userEvent, waitFor, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppShell } from "./AppShell";
import { ShellState } from "./ShellState";
import type { RouteResolution } from "@/lib/shell/route-context";
import { matchRoute, type Permission } from "@/lib/shell/route-registry";

function fixture(
  parts: string[],
  organization = "Demo Advisory",
  dealName = "Demo transaction",
  counts = { tasks: 3, approvals: 1, notifications: 2 },
  permissions?: readonly Permission[],
): Extract<RouteResolution, { kind: "ready" }> {
  const route = matchRoute(parts);
  if (!route) throw new Error(`Missing fixture route: ${parts.join("/")}`);
  const external = route.shellMode === "external";
  const routeParameters = Object.fromEntries(route.pattern.flatMap((segment, index) =>
    segment.startsWith(":") ? [[segment.slice(1), parts[index] ?? ""]] : [],
  ));
  return {
    kind: "ready",
    route,
    routeParameters,
    permissions: permissions ?? (external ? ["external"] : ["workspace", "deal", "administration"]),
    organization: external ? undefined : { id: "fixture-org", name: organization },
    deal: route.shellMode === "deal"
      ? { id: routeParameters.dealId ?? "demo-deal", name: dealName, phase: "Diligence" }
      : undefined,
    counts: external ? undefined : counts,
  };
}

const meta = {
  title: "Shell/AppShell",
  component: AppShell,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "Fixture-only shell demonstrations. Figma v0.3 nodes 41:16, 43:10, 44:20, 44:41, 44:62, and 44:85 are the approved global/deal shell authority. Administration and external-participant modes reuse that approved shell grammar with the narrower MAI-98 access contracts; no dedicated Figma variants were found. MAI-99 screen bodies remain absent.",
      },
    },
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GlobalDesktop: Story = {
  args: { resolution: fixture(["home"]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const breadcrumb = canvas.getByRole("navigation", { name: "Breadcrumb" });
    await expect(within(breadcrumb).getByText("Home")).toHaveAttribute("aria-current", "page");
    const utilityEntries = within(canvas.getByRole("navigation", { name: "Fixture shell entry points" }));
    await expect(utilityEntries.getByRole("link", { name: "Search" })).toHaveAttribute("href", "/search");
    await expect(utilityEntries.getByRole("link", { name: "Tasks 3" })).toHaveAttribute("href", "/tasks");
    await expect(utilityEntries.getByRole("link", { name: "Approvals 1" })).toHaveAttribute("href", "/approvals");
    await expect(utilityEntries.getByRole("link", { name: "Notifications 2" })).toHaveAttribute("href", "/notifications");
    await expect(canvas.getByRole("main")).toBeVisible();
  },
};

export const DealDesktop: Story = {
  args: { resolution: fixture(["deals", "demo-deal", "documents"]) },
  play: async ({ canvasElement }) => {
    const breadcrumb = within(canvasElement).getByRole("navigation", { name: "Breadcrumb" });
    const scoped = within(breadcrumb);
    await expect(scoped.getByRole("link", { name: "Demo Advisory" })).toHaveAttribute("href", "/home");
    await expect(scoped.getByRole("link", { name: "Demo transaction" })).toHaveAttribute("href", "/deals/demo-deal/overview");
    await expect(scoped.getByText("Documents")).toHaveAttribute("aria-current", "page");
  },
};

export const DealMobile: Story = {
  args: { resolution: fixture(["deals", "demo-deal", "documents"]) },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

export const AdministrationDesktop: Story = {
  args: { resolution: fixture(["settings", "roles"]) },
};

export const ExternalParticipant: Story = {
  args: { resolution: fixture(["portal", "project", "fixture-workspace"]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("navigation", { name: "Fixture shell entry points" })).not.toBeInTheDocument();
    await expect(canvas.queryByText(/Tasks \d/)).not.toBeInTheDocument();
    await expect(canvas.queryByText(/Approvals \d/)).not.toBeInTheDocument();
    await expect(canvas.queryByText(/Notifications \d/)).not.toBeInTheDocument();
  },
};

export const RestrictedAdministrationNavigation: Story = {
  args: {
    resolution: fixture(
      ["home"],
      "Demo Advisory",
      "Demo transaction",
      { tasks: 3, approvals: 1, notifications: 2 },
      ["workspace", "deal"],
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const restricted = canvas
      .getAllByText("Restricted")
      .map((label) => label.closest('[aria-disabled="true"]'))
      .find((item) => item?.textContent?.includes("Administration"));
    await expect(restricted).toBeDefined();
    await expect(restricted).toHaveTextContent("Administration");
    await expect(restricted).not.toHaveAttribute("href");
  },
};

export const LongNamesAndCountOverflow: Story = {
  args: {
    resolution: fixture(
      ["deals", "demo-deal", "documents"],
      "A deliberately long fixture advisory organization name for overflow review",
      "A deliberately long fixture transaction name for breadcrumb overflow review",
      { tasks: 9999, approvals: 9999, notifications: 9999 },
    ),
  },
};

export const MobileDrawerKeyboard: Story = {
  args: { resolution: fixture(["deals", "demo-deal", "overview"]) },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: "Open navigation" });
    await userEvent.click(trigger);
    await expect(within(document.body).getByRole("dialog")).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(within(document.body).queryByRole("dialog")).toBeNull());
    await expect(trigger).toHaveFocus();
  },
};

export const RestrictedState: Story = {
  args: { resolution: fixture(["home"]) },
  render: () => <ShellState result={{ kind: "restricted" }} />,
};

export const InvalidContext: Story = {
  args: { resolution: fixture(["home"]) },
  render: () => <ShellState result={{ kind: "invalid-context", reason: "Fixture malformed route identifier." }} />,
};

export const UnavailableState: Story = {
  args: { resolution: fixture(["home"]) },
  render: () => <ShellState result={{ kind: "unavailable" }} />,
};

export const NotFoundState: Story = {
  args: { resolution: fixture(["home"]) },
  render: () => <ShellState result={{ kind: "not-found" }} />,
};
