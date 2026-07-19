"use client";

import { use } from "react";
import { EntityDetail } from "@/components/screens/entities/EntityDetail";

export default function EntityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <EntityDetail entityId={id} />;
}
