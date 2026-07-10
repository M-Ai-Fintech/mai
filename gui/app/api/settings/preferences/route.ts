import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ riskTolerance: 'Moderate', style: 'Collaborative' });
}

export async function PUT(request: Request) {
  const body = await request.json();
  return NextResponse.json({ success: true, savedPreferences: body.preferences });
}
