import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { routeRegistry } from "@/lib/shell/route-registry";
import type { ReadyRouteResolution } from "@/lib/shell/route-context";
import { DealExecutionBody } from "./DealExecutionBody";
import { AppShell } from "@/app/_shell/AppShell";
function resolution(routeId: string): ReadyRouteResolution {
  const route = routeRegistry.find((item) => item.id === routeId);
  if (!route) throw new Error(`Missing ${routeId}`);
  return {
    kind: "ready",
    route,
    routeParameters: { dealId: "horizon-01" },
    permissions: ["workspace", "deal"],
    organization: { id: "atlas", name: "Atlas" },
    deal: { id: "horizon-01", name: "Project Horizon", phase: "Negotiation" },
  };
}
const meta = {
  title: "Screens/Deal execution",
  component: DealExecutionBody,
  args: { dataSource: "fixture" as const },
  parameters: {
    docs: {
      description: {
        component:
          "Local fixtures. Negotiation desktop authority: Figma otMJE31OKIxdXogV4RNbGQ node 239:3. Agentic Workspace desktop authority: node 239:551. Closing, Activity, Team, Deliverables, and Settings are shared-pattern derivations from governed board node 239:921, not standalone Figma pixel compositions. Responsive stories cover implementation behavior only.",
      },
    },
  },
} satisfies Meta<typeof DealExecutionBody>;
export default meta;
type Story = StoryObj<typeof meta>;
export const NegotiationDesktop: Story = {
  args: { resolution: resolution("deal.negotiation") },
  render: ({ resolution }) => <AppShell resolution={resolution} dataSource="fixture" />,
};
export const AgenticDesktop: Story = {
  args: { resolution: resolution("deal.workspace") },
};
export const ClosingApproval: Story = {
  args: { resolution: resolution("deal.closing"), state: "approval-pending" },
};
export const ActivityAudit: Story = {
  args: { resolution: resolution("deal.activity") },
};
export const TeamRestricted: Story = {
  args: { resolution: resolution("deal.team"), state: "restricted" },
};
export const DeliverablesFailure: Story = {
  args: { resolution: resolution("deal.deliverables"), state: "error" },
};
export const SettingsDestructive: Story = {
  args: { resolution: resolution("deal.settings"), state: "destructive" },
};
export const ResponsiveTablet: Story = {
  args: { resolution: resolution("deal.negotiation") },
  parameters: { viewport: { defaultViewport: "tablet" } },
};
export const ResponsiveMobile: Story = {
  args: { resolution: resolution("deal.workspace") },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
