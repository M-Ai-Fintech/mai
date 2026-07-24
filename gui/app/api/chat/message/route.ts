import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({
    success: true,
    reply:
      `Broker Orchestrator Agent received your message about deal ${body.dealId}.`,
  });
}
