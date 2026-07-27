"use client";

import { Toast } from "@/components/Toast/Toast";
import { type CountryCode } from "@/components/CountrySelector/CountrySelector";

import { type EntityRole } from "./entity-state";
import { useEntitiesWorkspaceModel } from "./entities-workspace-model";
import type { EntitiesWorkspaceModel } from "./entities-workspace-types";
import {
  WorkspaceContent,
  WorkspaceFilters,
  WorkspaceHeader,
  WorkspaceRoleTabs,
} from "./EntitiesWorkspaceViews";
import {
  WorkspaceArchiveModal,
  WorkspaceConflictModal,
  WorkspaceEntityFormModal,
} from "./EntitiesWorkspaceModals";

interface EntitiesWorkspaceProps {
  initialRole?: EntityRole;
  initialSearch?: string;
  initialSector?: string;
  initialCountryCode?: CountryCode;
}

export function EntitiesWorkspace(props: EntitiesWorkspaceProps) {
  const model = useEntitiesWorkspaceModel(props);
  return <EntitiesWorkspaceLayout model={model} />;
}

function EntitiesWorkspaceLayout(
  { model }: { model: EntitiesWorkspaceModel },
) {
  return (
    <section className="mx-auto w-full max-w-[2200px] p-8 text-left">
      <WorkspaceHeader {...model.headerProps} />
      <WorkspaceRoleTabs {...model.roleTabsProps} />
      <WorkspaceFilters {...model.filtersProps} />
      <WorkspaceContent {...model.contentProps} />
      <EntitiesWorkspaceOverlays model={model} />
    </section>
  );
}

function EntitiesWorkspaceOverlays(
  { model }: { model: EntitiesWorkspaceModel },
) {
  return (
    <>
      <WorkspaceEntityFormModal {...model.formModalProps} />
      <WorkspaceConflictModal {...model.conflictModalProps} />
      <WorkspaceArchiveModal {...model.archiveModalProps} />
      <EntitiesWorkspaceToast model={model} />
    </>
  );
}

function EntitiesWorkspaceToast({ model }: { model: EntitiesWorkspaceModel }) {
  if (!model.toast) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      <Toast {...model.toast} onClose={model.closeToast} />
    </div>
  );
}
