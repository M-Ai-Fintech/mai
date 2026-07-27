"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card/Card";
import { Button } from "@/components/Button/Button";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { ApiClient, TargetDossier as DossierType } from "@/lib/api-client";
import { Modal } from "@/components/Modal/Modal";
import { FormField } from "@/components/FormField/FormField";
import { Input } from "@/components/Input/Input";
import { Toast } from "@/components/Toast/Toast";
import {
  DOSSIER_TEXT_FIELDS,
  type DossierTextField,
  targetDossierPayload,
} from "./target-dossier-payload";

type DossierToast = {
  title: string;
  message: string;
  variant: "success" | "error";
};

interface TargetDossierModel {
  dossier: DossierType | null;
  form: Partial<DossierType>;
  loading: boolean;
  editing: boolean;
  saving: boolean;
  toast: DossierToast | null;
  openEdit: () => void;
  closeEdit: () => void;
  saveDossier: () => void;
  updateFormField: (field: DossierTextField, value: string) => void;
  closeToast: () => void;
}

interface DossierState {
  dossier: DossierType | null;
  form: Partial<DossierType>;
  loading: boolean;
  editing: boolean;
  saving: boolean;
  toast: DossierToast | null;
  setDossier: (dossier: DossierType) => void;
  setForm: (form: Partial<DossierType>) => void;
  setLoading: (loading: boolean) => void;
  setEditing: (editing: boolean) => void;
  setSaving: (saving: boolean) => void;
  setToast: (toast: DossierToast | null) => void;
}

interface DossierContentState {
  dossier: DossierType | null;
  form: Partial<DossierType>;
  loading: boolean;
  setDossier: (dossier: DossierType) => void;
  setForm: (form: Partial<DossierType>) => void;
  setLoading: (loading: boolean) => void;
}

interface DossierUiState {
  editing: boolean;
  saving: boolean;
  toast: DossierToast | null;
  setEditing: (editing: boolean) => void;
  setSaving: (saving: boolean) => void;
  setToast: (toast: DossierToast | null) => void;
}

interface SaveTargetDossierContext {
  entityId: string;
  state: DossierState;
}

export function TargetDossier({ entityId }: { entityId: string }) {
  return <TargetDossierView {...useTargetDossier(entityId)} />;
}

function useTargetDossier(entityId: string): TargetDossierModel {
  const state = useDossierState();
  const { setDossier, setLoading } = state;
  useEffect(() => {
    loadDossier(entityId, setDossier, setLoading);
  }, [entityId, setDossier, setLoading]);
  return buildDossierModel(entityId, state);
}

function useDossierState(): DossierState {
  return { ...useDossierContentState(), ...useDossierUiState() };
}

function useDossierContentState(): DossierContentState {
  const [dossier, setDossier] = useState<DossierType | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<DossierType>>({});
  return { dossier, form, loading, setDossier, setForm, setLoading };
}

function useDossierUiState(): DossierUiState {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<DossierToast | null>(null);
  return { editing, saving, toast, setEditing, setSaving, setToast };
}

function buildDossierModel(
  entityId: string,
  state: DossierState,
): TargetDossierModel {
  const openEdit = () => {
    if (!state.dossier) return;
    state.setForm(state.dossier);
    state.setEditing(true);
  };

  return {
    ...state,
    openEdit,
    closeEdit: () => state.setEditing(false),
    closeToast: () => state.setToast(null),
    saveDossier: () => saveTargetDossier({ entityId, state }),
    updateFormField: (field, value) =>
      state.setForm({ ...state.form, [field]: value }),
  };
}

function TargetDossierView(model: TargetDossierModel) {
  if (model.loading) return <Skeleton variant="rectangular" height={200} />;
  if (!model.dossier) return <DossierLoadError />;
  return (
    <Card variant="default" className="mt-6 p-6">
      <DossierHeader onEdit={model.openEdit} />
      <DossierSummaryGrid dossier={model.dossier} />
      <DossierEditModal {...model} />
      <DossierToastView toast={model.toast} onClose={model.closeToast} />
    </Card>
  );
}

function loadDossier(
  entityId: string,
  setDossier: (dossier: DossierType) => void,
  setLoading: (loading: boolean) => void,
) {
  ApiClient.getTargetDossier(entityId)
    .then((data) => setDossier(data))
    .catch(() => {})
    .finally(() => setLoading(false));
}

function DossierLoadError() {
  return (
    <Card className="p-4">
      <p>Failed to load dossier.</p>
    </Card>
  );
}

function DossierHeader({ onEdit }: { onEdit: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-xl font-bold">Target Dossier (Sourcing Report)</h2>
      <Button variant="secondary" onClick={onEdit}>Edit</Button>
    </div>
  );
}

function DossierSummaryGrid({ dossier }: { dossier: DossierType }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {DOSSIER_TEXT_FIELDS.map(([field, label]) => (
        <DossierSummaryItem key={field} label={label} value={dossier[field]} />
      ))}
    </div>
  );
}

function DossierSummaryItem(
  { label, value }: { label: string; value?: string },
) {
  return (
    <div>
      <h3 className="font-semibold">{label}</h3>
      <p className="text-sm text-slate-gray">{value || "No data"}</p>
    </div>
  );
}

function DossierEditModal(model: TargetDossierModel) {
  return (
    <Modal
      isOpen={model.editing}
      onClose={model.closeEdit}
      title="Edit Target Dossier"
      size="lg"
      footer={<DossierEditFooter {...model} />}
    >
      <DossierEditFields {...model} />
    </Modal>
  );
}

function DossierEditFooter(model: TargetDossierModel) {
  return (
    <>
      <Button
        variant="secondary"
        onClick={model.closeEdit}
        disabled={model.saving}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={model.saveDossier}
        disabled={model.saving}
      >
        {model.saving ? "Saving..." : "Save"}
      </Button>
    </>
  );
}

function DossierEditFields(model: TargetDossierModel) {
  return (
    <div className="flex flex-col gap-4">
      {DOSSIER_TEXT_FIELDS.map(([field, label]) => (
        <DossierInput key={field} field={field} label={label} model={model} />
      ))}
    </div>
  );
}

function DossierInput(props: {
  field: DossierTextField;
  label: string;
  model: TargetDossierModel;
}) {
  return (
    <FormField label={props.label}>
      <Input
        value={props.model.form[props.field] || ""}
        onChange={(event) =>
          props.model.updateFormField(props.field, event.target.value)}
      />
    </FormField>
  );
}

async function saveTargetDossier(context: SaveTargetDossierContext) {
  if (!context.state.dossier) return;
  context.state.setSaving(true);
  try {
    await persistTargetDossier(
      context.entityId,
      context.state.dossier,
      context.state.form,
      context.state.setDossier,
    );
    context.state.setEditing(false);
    context.state.setToast(savedDossierToast());
  } catch {
    context.state.setToast(failedDossierToast());
  } finally {
    context.state.setSaving(false);
  }
}

async function persistTargetDossier(
  entityId: string,
  dossier: DossierType,
  form: Partial<DossierType>,
  setDossier: (dossier: DossierType) => void,
) {
  const updated = await ApiClient.updateTargetDossier(entityId, {
    ...targetDossierPayload(form),
    version: dossier.version,
  });
  setDossier(updated);
}

function savedDossierToast(): DossierToast {
  return {
    title: "Saved",
    message: "Target Dossier updated successfully.",
    variant: "success",
  };
}

function failedDossierToast(): DossierToast {
  return {
    title: "Error",
    message: "Failed to update dossier.",
    variant: "error",
  };
}

function DossierToastView(
  { toast, onClose }: { toast: DossierToast | null; onClose: () => void },
) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      <Toast {...toast} onClose={onClose} />
    </div>
  );
}
