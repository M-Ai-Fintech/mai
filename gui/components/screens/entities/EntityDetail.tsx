"use client";

import { Toast } from "@/components/Toast/Toast";

import { useEntityDetailModel } from "./entity-detail-model";
import type { EntityDetailModel } from "./entity-detail-types";
import {
  EntityArchiveModal,
  EntityArchiveToast,
  EntityConflictModal,
  EntityDetailError,
  EntityDetailGrid,
  EntityDetailHeader,
  EntityDetailLoading,
  EntityEditModal,
} from "./EntityDetailViews";

export function EntityDetail({ entityId }: { entityId: string }) {
  const model = useEntityDetailModel(entityId);
  return <EntityDetailLayout model={model} />;
}

function EntityDetailLayout({ model }: { model: EntityDetailModel }) {
  if (model.loading) return <EntityDetailLoading />;
  if (model.error || !model.headerProps || !model.gridProps) {
    return <EntityDetailError onRetry={model.reload} />;
  }
  return (
    <div className="mx-auto max-w-[2200px] p-8">
      <EntityDetailHeader {...model.headerProps} />
      <EntityDetailGrid {...model.gridProps} />
      <EntityDetailOverlays model={model} />
    </div>
  );
}

function EntityDetailOverlays({ model }: { model: EntityDetailModel }) {
  return (
    <>
      {model.editModalProps && <EntityEditModal {...model.editModalProps} />}
      {model.conflictModalProps && (
        <EntityConflictModal {...model.conflictModalProps} />
      )}
      {model.archiveModalProps && (
        <EntityArchiveModal {...model.archiveModalProps} />
      )}
      <EntityArchiveToast {...model.archiveToastProps} />
      <EntityDetailToast model={model} />
    </>
  );
}

function EntityDetailToast({ model }: { model: EntityDetailModel }) {
  if (!model.toast) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      <Toast {...model.toast} onClose={model.closeToast} />
    </div>
  );
}
