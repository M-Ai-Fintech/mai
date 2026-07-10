import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ success: true, result: { optimalAllocation: 45000000, expectedROI: 16.5, message: 'MILP Optimization mock.' } });
}
