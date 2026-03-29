// src/app/api/schedule/route.ts
import { NextResponse } from "next/server";
import { generateSchedule, parseMajorsFromQuery } from "@/lib/schedule_generator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      majors,
      query,
      completedCodes = [],
      maxCreditsPerSemester = 18,
      maxCoursesPerSemester = 6,
      numYears = 4,
      startSemester = "fall",
    } = body;

    // Resolve majors from query if not provided directly
    const resolvedMajors = majors?.length > 0
      ? majors
      : query ? parseMajorsFromQuery(query) : [];

    if (resolvedMajors.length === 0) {
      return NextResponse.json({
        error: "Please specify at least one major.",
        plan: { semesters: [] },
      }, { status: 400 });
    }

    const result = await generateSchedule({
      majors: resolvedMajors,
      completedCodes,
      maxCreditsPerSemester,
      maxCoursesPerSemester,
      numYears,
      startSemester,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Schedule] Error:", err);
    return NextResponse.json({ error: "Failed to generate schedule." }, { status: 500 });
  }
}