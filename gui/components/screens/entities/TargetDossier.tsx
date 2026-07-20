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

export function TargetDossier({ entityId }: { entityId: string }) {
  const [dossier, setDossier] = useState<DossierType | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<DossierType>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{title: string, message: string, variant: "success" | "error"} | null>(null);

  useEffect(() => {
    ApiClient.getTargetDossier(entityId)
      .then((data) => setDossier(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [entityId]);

  if (loading) {
    return <Skeleton variant="rectangular" height={200} />;
  }

  if (!dossier) {
    return <Card className="p-4"><p>Failed to load dossier.</p></Card>;
  }

  const openEdit = () => {
    setForm(dossier);
    setEditing(true);
  };

  const closeEdit = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await ApiClient.updateTargetDossier(entityId, {
        executiveSummary: form.executiveSummary,
        corporateStructure: form.corporateStructure,
        financialHealth: form.financialHealth,
        litigationRisks: form.litigationRisks,
        marketPosition: form.marketPosition,
        version: dossier.version
      });
      setDossier(updated);
      setEditing(false);
      setToast({ title: "Saved", message: "Target Dossier updated successfully.", variant: "success" });
    } catch (e) {
      setToast({ title: "Error", message: "Failed to update dossier.", variant: "error" });
    }
    setSaving(false);
  };

  return (
    <Card variant="default" className="mt-6 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Target Dossier (Sourcing Report)</h2>
        <Button variant="secondary" onClick={openEdit}>Edit</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold">Executive Summary</h3>
          <p className="text-sm text-slate-gray">{dossier.executiveSummary || "No data"}</p>
        </div>
        <div>
          <h3 className="font-semibold">Corporate Structure</h3>
          <p className="text-sm text-slate-gray">{dossier.corporateStructure || "No data"}</p>
        </div>
        <div>
          <h3 className="font-semibold">Financial Health</h3>
          <p className="text-sm text-slate-gray">{dossier.financialHealth || "No data"}</p>
        </div>
        <div>
          <h3 className="font-semibold">Litigation Risks</h3>
          <p className="text-sm text-slate-gray">{dossier.litigationRisks || "No data"}</p>
        </div>
        <div>
          <h3 className="font-semibold">Market Position</h3>
          <p className="text-sm text-slate-gray">{dossier.marketPosition || "No data"}</p>
        </div>
      </div>

      <Modal
        isOpen={editing}
        onClose={closeEdit}
        title="Edit Target Dossier"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeEdit} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label="Executive Summary">
            <Input value={form.executiveSummary || ""} onChange={(e) => setForm({...form, executiveSummary: e.target.value})} />
          </FormField>
          <FormField label="Corporate Structure">
            <Input value={form.corporateStructure || ""} onChange={(e) => setForm({...form, corporateStructure: e.target.value})} />
          </FormField>
          <FormField label="Financial Health">
            <Input value={form.financialHealth || ""} onChange={(e) => setForm({...form, financialHealth: e.target.value})} />
          </FormField>
          <FormField label="Litigation Risks">
            <Input value={form.litigationRisks || ""} onChange={(e) => setForm({...form, litigationRisks: e.target.value})} />
          </FormField>
          <FormField label="Market Position">
            <Input value={form.marketPosition || ""} onChange={(e) => setForm({...form, marketPosition: e.target.value})} />
          </FormField>
        </div>
      </Modal>
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60]">
          <Toast {...toast} onClose={() => setToast(null)} />
        </div>
      )}
    </Card>
  );
}
