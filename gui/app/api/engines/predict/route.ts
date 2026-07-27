import { NextResponse } from "next/server";

export async function POST() {
  const result = {
    zScore: 2.1,
    risk: "Medium",
    message: "ONNX Prediction mock.",
  };
  return NextResponse.json({
    success: true,
    result,
  });
}
