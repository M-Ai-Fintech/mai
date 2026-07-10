import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ success: true, result: { zScore: 2.1, risk: 'Medium', message: 'ONNX Prediction mock.' } });
}
