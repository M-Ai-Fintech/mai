import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReadyRouteResolution } from "@/lib/shell/route-context";
import { routeRegistry } from "@/lib/shell/route-registry";
import { DealIntelligenceBody, type DealFamily } from "./DealIntelligenceBody";

function fixtureResolution(family: DealFamily): ReadyRouteResolution {
  const route = routeRegistry.find((candidate) => candidate.id === `deal.${family}`);
  if (!route) throw new Error(`Missing deal route ${family}`);
  return { kind: "ready", route, routeParameters: { dealId: "demo-deal" }, permissions: ["workspace", "deal"], organization: { id: "fixture-org", name: "Demo Advisory" }, deal: { id: "demo-deal", name: "Demo transaction", phase: "Review" } };
}
const meta = { title: "Screens/Deal intelligence", component: DealIntelligenceBody, args: { dataSource: "fixture" as const }, parameters: { docs: { description: { component: "Local demonstration fixtures. Desktop authority: Figma file otMJE31OKIxdXogV4RNbGQ, release v0.3; nodes 205:662, 205:767, 205:3738, 52:21, 205:4234, 205:4436. Five-family responsive stories are implementation coverage, not Figma conformance." } } } } satisfies Meta<typeof DealIntelligenceBody>;
export default meta;
type Story = StoryObj<typeof meta>;
export const OverviewDesktop: Story = { args: { resolution: fixtureResolution("overview") } };
export const DossierDesktop: Story = { args: { resolution: fixtureResolution("dossier") } };
export const DocumentsDesktop: Story = { args: { resolution: fixtureResolution("documents") } };
export const DecisionRoomDesktop: Story = { args: { resolution: fixtureResolution("diligence") } };
export const ValuationDesktop: Story = { args: { resolution: fixtureResolution("valuation") } };
export const MatchingDesktop: Story = { args: { resolution: fixtureResolution("matching") } };
export const DecisionRoomInvalidated: Story = { args: { resolution: fixtureResolution("diligence"), state: "invalidated" } };
export const DecisionRoomRecorded: Story = { args: { resolution: fixtureResolution("diligence"), state: "recorded" } };
export const DecisionRoomTabletEvidenceDrawer: Story = { args: { resolution: fixtureResolution("diligence") }, parameters: { viewport: { defaultViewport: "tablet" }, docs: { description: { story: "Approved responsive authority: 58:139 evidence Drawer." } } } };
export const DecisionRoomMobileSequential: Story = { args: { resolution: fixtureResolution("diligence") }, parameters: { viewport: { defaultViewport: "mobile1" }, docs: { description: { story: "Approved responsive authority: 59:115 sequential review and 59:144 full-screen evidence." } } } };
export const ResponsiveImplementationCoverage: Story = { args: { resolution: fixtureResolution("overview") }, parameters: { viewport: { defaultViewport: "tablet" }, docs: { description: { story: "Implementation-only responsive coverage for Overview, Dossier, Documents, Valuation, and Matching; deferred Figma frames are not pixel baselines." } } } };
