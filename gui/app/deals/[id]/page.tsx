"use client";

import { use } from "react";
import { DealPageClient } from "./deal-page-client";

export default function DealPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = use(params);
  return <DealPageClient dealId={id} />;
}
