import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([
    { id: 'sample-deal', title: 'TechCorp Acquisition', status: 'Pending KYB' }
  ]);
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ success: true, deal: { id: 'new-deal', ...body } });
}
