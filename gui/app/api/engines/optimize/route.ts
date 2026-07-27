import { NextResponse } from "next/server";

export async function POST() {
  const result = {
    optimalAllocation: 45000000,
    expectedROI: 16.5,
    message: "MILP Optimization mock.",
  };
  return NextResponse.json({
    success: true,
    result,
  });
}
