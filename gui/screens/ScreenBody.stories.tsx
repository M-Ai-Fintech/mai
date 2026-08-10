import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ScreenBody } from "./ScreenBody";

const fixture = (
  id: string,
  shellMode: "global" | "administration" | "external" = "global",
) =>
  ({
    route: {
      id,
      label: id.replaceAll(".", " "),
      shellMode,
      availability: "available",
      implementationStatus: "screen-body",
    },
    routeParameters: {},
    permissions: shellMode === "external"
      ? ["external"]
      : shellMode === "administration"
      ? ["administration"]
      : ["workspace"],
    organization: { id: "fixture-org", name: "Demo Advisory" },
    counts: { tasks: 3, approvals: 1, notifications: 2 },
  }) as never;
const meta = {
  title: "Screens/MAI-99 families",
  component: ScreenBody,
  args: { dataSource: "fixture" as const },
  parameters: {
    docs: {
      description: {
        component:
          "Fixture-only bodies. Figma file otMJE31OKIxdXogV4RNbGQ, approved v0.3 frame matrix: 193, 198, 199, and 200 responsive nodes.",
      },
    },
  },
} satisfies Meta<typeof ScreenBody>;
export default meta;
type Story = StoryObj<typeof meta>;
export const CommandCenter: Story = {
  args: { resolution: fixture("global.home") },
};
export const DealsPortfolio: Story = {
  args: { resolution: fixture("global.deals") },
};
export const NewDealSetup: Story = {
  args: { resolution: fixture("global.new-deal") },
};
export const TasksAndApprovals: Story = {
  args: { resolution: fixture("global.tasks") },
};
export const Notifications: Story = {
  args: { resolution: fixture("global.notifications") },
};
export const GlobalSearch: Story = {
  args: { resolution: fixture("global.search") },
};
export const Organizations: Story = {
  args: { resolution: fixture("global.organizations") },
};
export const OrganizationDetail: Story = {
  args: { resolution: fixture("global.organization-detail") },
};
export const TeamWorkspace: Story = {
  args: { resolution: fixture("global.team") },
};
export const Settings: Story = {
  args: { resolution: fixture("administration.profile", "administration") },
};
export const ExternalParticipant: Story = {
  args: { resolution: fixture("external.workspace", "external") },
};
export const Loading: Story = {
  args: { resolution: fixture("global.deals"), state: "loading" },
};
export const EmptySearch: Story = {
  args: { resolution: fixture("global.search"), state: "empty" },
};
export const RestrictedOrganizationHistory: Story = {
  args: {
    resolution: fixture("global.organization-detail"),
    state: "restricted",
  },
};
export const SettingsSensitive: Story = {
  args: {
    resolution: fixture("administration.security", "administration"),
    state: "sensitive",
  },
};
export const TeamSensitive: Story = {
  args: {
    resolution: fixture("global.team"),
    state: "sensitive",
  },
};
export const ExternalUnavailable: Story = {
  args: {
    resolution: fixture("external.workspace", "external"),
    state: "unavailable",
  },
};
