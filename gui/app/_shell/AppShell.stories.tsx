import { expect, userEvent, waitFor, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppShell } from "./AppShell";
import { ShellState } from "./ShellState";
import type { RouteResolution } from "@/lib/shell/route-context";
import { matchRoute } from "@/lib/shell/route-registry";

function fixture(parts: string[], organization = "Demo Advisory", dealName = "Demo transaction", counts = { tasks: 3, approvals: 1, notifications: 2 }): Extract<RouteResolution, { kind: "ready" }> { const route = matchRoute(parts); if (!route) throw new Error(`Missing fixture route: ${parts.join("/")}`); const external = route.shellMode === "external"; return { kind: "ready", route, organization: external ? undefined : { id: "fixture-org", name: organization }, deal: route.shellMode === "deal" ? { id: "demo-deal", name: dealName, phase: "Diligence" } : undefined, counts: external ? undefined : counts }; }
const meta = { title: "Shell/AppShell", component: AppShell, parameters: { layout: "fullscreen", docs: { description: { component: "Fixture-only shell demonstrations. Figma v0.3 nodes 41:16, 43:10, and 44:85 remain the visual authority; MAI-99 screen bodies are intentionally absent." } } } } satisfies Meta<typeof AppShell>;
export default meta; type Story = StoryObj<typeof meta>;
export const GlobalDesktop: Story = { args: { resolution: fixture(["home"]) } };
export const DealDesktop: Story = { args: { resolution: fixture(["deals", "demo-deal", "overview"]) } };
export const DealMobile: Story = { args: { resolution: fixture(["deals", "demo-deal", "documents"]) }, parameters: { viewport: { defaultViewport: "mobile1" } } };
export const AdministrationDesktop: Story = { args: { resolution: fixture(["settings", "roles"]) } };
export const ExternalParticipant: Story = { args: { resolution: fixture(["portal", "project", "fixture-workspace"]) } };
export const LongNamesAndCountOverflow: Story = { args: { resolution: fixture(["deals", "demo-deal", "documents"], "A deliberately long fixture advisory organization name for overflow review", "A deliberately long fixture transaction name for breadcrumb overflow review", { tasks: 9999, approvals: 9999, notifications: 9999 }) } };
export const MobileDrawerKeyboard: Story = { args: { resolution: fixture(["deals", "demo-deal", "overview"]) }, parameters: { viewport: { defaultViewport: "mobile1" } }, play: async ({ canvasElement }) => { const canvas = within(canvasElement); const trigger = canvas.getByRole("button", { name: "Open navigation" }); await userEvent.click(trigger); await expect(within(document.body).getByRole("dialog")).toBeVisible(); await userEvent.keyboard("{Escape}"); await waitFor(() => expect(within(document.body).queryByRole("dialog")).toBeNull()); await expect(trigger).toHaveFocus(); } };
export const RestrictedState: Story = { render: () => <ShellState result={{ kind: "restricted" }} /> };
export const InvalidContext: Story = { render: () => <ShellState result={{ kind: "invalid-context", reason: "Fixture malformed route identifier." }} /> };
export const UnavailableState: Story = { render: () => <ShellState result={{ kind: "unavailable" }} /> };
