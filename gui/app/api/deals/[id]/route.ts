import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return NextResponse.json({
    id,
    title: "TechCorp Acquisition",
    targetValuation: 150000000,
    status: "Pending KYB",
  });
}
