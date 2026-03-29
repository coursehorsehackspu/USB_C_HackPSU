// src/app/api/plan/route.ts
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import type { DegreePlan, SemesterPlan, PlanCourse } from "@/types/plan";

const MONGO_URI = process.env.MONGO_URI!;
let client: MongoClient | null = null;
async function db() {
  if (!client) { client = new MongoClient(MONGO_URI); await client.connect(); }
  return client;
}

const SEMESTER_LABELS = [
  "Fall 2025", "Spring 2026", "Fall 2026", "Spring 2027",
  "Fall 2027", "Spring 2028", "Fall 2028", "Spring 2029",
  "Fall 2029", "Spring 2030", "Fall 2030", "Spring 2031",
];

function buildPlan(
  courses: Record<string, unknown>[],
  completedIds: string[],
  maxCredits: number,
  variant: string
): DegreePlan {
  const completedSet = new Set(completedIds);
  const codeToId = new Map<string, string>();
  courses.forEach((c) =>
    codeToId.set(c.course_code as string, (c.course_code as string).replace(/\s+/g, "-").toLowerCase())
  );

  // Filter out already completed
  let remaining = courses.filter((c) => !completedSet.has(c.course_code as string));

  // Experimental: shuffle slightly for variety
  if (variant === "experimental") {
    remaining = [...remaining].sort(() => Math.random() - 0.49);
  }

  const semesters: SemesterPlan[] = [];
  const scheduled = new Set(completedIds);
  let semIdx = 0;

  while (remaining.length > 0 && semIdx < 12) {
    // Find courses whose prereqs are all scheduled
    const available = remaining.filter((c) => {
      const prereqs = (c.prerequisites as string[]) || [];
      return prereqs.every((p) => scheduled.has(p));
    });

    if (!available.length) break;

    let credits = 0;
    const semCourses: PlanCourse[] = [];
    const toRemove: string[] = [];

    for (const course of available) {
      const cr = (course.credits as number) || 3;
      if (credits + cr <= maxCredits) {
        const id = codeToId.get(course.course_code as string)!;
        semCourses.push({
          id,
          code: course.course_code as string,
          title: (course.title as string) || "",
          credits: cr,
        });
        credits += cr;
        scheduled.add(course.course_code as string);
        toRemove.push(course.course_code as string);
      }
      if (credits >= maxCredits) break;
    }

    if (!semCourses.length) break;

    // Remove scheduled from remaining
    const toRemoveSet = new Set(toRemove);
    remaining = remaining.filter((c) => !toRemoveSet.has(c.course_code as string));

    semesters.push({
      id: `sem-${semIdx + 1}`,
      label: SEMESTER_LABELS[semIdx] ?? `Semester ${semIdx + 1}`,
      courses: semCourses,
      creditsTotal: credits,
      warnings: credits > 18
        ? [{ code: "heavy-load", message: `Heavy load: ${credits} credits this semester.` }]
        : [],
    });

    semIdx++;
  }

  return { semesters };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const variant = searchParams.get("variant") || "saved";

    // Read student onboarding from cookie or default to CMPSC
    const subjectHeader = searchParams.get("subject") || "CMPSC";
    const subject = subjectHeader.toUpperCase();
    const completedIds = (searchParams.get("completed") || "").split(",").filter(Boolean);
    const maxCredits = parseInt(searchParams.get("maxCredits") || "18", 10);

    const c = await db();
    const courses = await c.db("degreeflow_courses").collection("courses").find(
      { subject, level: "Undergraduate" },
      { projection: { course_code: 1, title: 1, credits: 1, prerequisites: 1 } }
    ).toArray();

    const plan = buildPlan(
      courses as Record<string, unknown>[],
      completedIds,
      maxCredits,
      variant
    );

    return NextResponse.json(plan);
  } catch (err) {
    console.error("[Plan] Error:", err);
    return NextResponse.json({ semesters: [] }, { status: 500 });
  }
}
