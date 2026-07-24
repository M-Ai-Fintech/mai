"use client";

import { use } from "react";
import { AgenticWorkspace } from "@/components/screens/agentic/AgenticWorkspace";

export default function AgenticChatPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = use(params);
  return <AgenticWorkspace dealId={id} />;
}
