"use client";

import { use } from "react";
import { ApiClient } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { EnginesWorkbenchView } from "./engine-workbench-view";
import { useEnginesWorkbench } from "./use-engines-workbench";

export default function EnginesPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { t } = useTranslation();
  const { id } = use(params);
  const workbench = useEnginesWorkbench({ client: ApiClient, t });
  return <EnginesWorkbenchView dealId={id} t={t} workbench={workbench} />;
}
