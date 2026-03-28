import { NextResponse } from "next/server";
import { mockDegreePlan } from "@/data/mock-plan";

export async function GET() {
  return NextResponse.json(mockDegreePlan);
}
