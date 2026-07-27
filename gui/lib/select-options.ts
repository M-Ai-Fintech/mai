import type { DropdownOption } from "@/components/Dropdown/Dropdown";
import type { TeamMember } from "@/lib/api-client";

export function buildUnassignedAdvisorOptions(
  teamMembers: TeamMember[],
): DropdownOption[] {
  return [
    { value: "", label: "Unassigned" },
    ...teamMembers.map((member) => ({
      value: member.id,
      label: member.displayName,
    })),
  ];
}
