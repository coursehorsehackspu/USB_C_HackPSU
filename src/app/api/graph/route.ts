import { NextResponse } from "next/server";
import { mockCourseGraph } from "@/data/mock-graph";

export async function GET() {
  return NextResponse.json(mockCourseGraph);
}
