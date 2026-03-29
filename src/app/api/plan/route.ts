// src/app/api/plan/route.ts
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import type { DegreePlan, SemesterPlan, PlanCourse } from "@/types/plan";
import {
  dropSupersededAlternatives,
  expandSubjectsForPlan,
  filterCsAutoplanExcludedCourses,
  isBlockedByRequirementAlternatives,
  normalizeCourseCode,
  normalizedPrereqs,
  planUsesCsRules,
  sortCoursesForSemester,
  type CourseDoc,
} from "@/lib/schedule-plan";
import {
  getCsEngineeringSuggestedPlan,
  shouldUseCsBulletinTemplate,
} from "@/data/cs-bulletin-suggested-plan";

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

function semesterSeason(label: string): "fall" | "spring" {
  return label.startsWith("Fall") ? "fall" : "spring";
}

function courseOfferedIn(doc: CourseDoc, season: "fall" | "spring"): boolean {
  const offered = doc.semesters_offered as string[] | undefined;
  if (!offered || offered.length === 0) return true;
  const normalised = offered.map((s) => s.toLowerCase());
  if (season === "fall") {
    return normalised.some((s) => s.includes("fall") || s.includes("autumn"));
  }
  return normalised.some((s) => s.includes("spring"));
}

export function buildPlan(
  courses: CourseDoc[],
  completedCodes: string[],
  maxCredits: number,
  variant: string,
  primarySubjects: string[],
): DegreePlan {
  const completedSet = new Set(completedCodes.map(normalizeCourseCode));
  const codeToId = (code: string) => code.replace(/\s+/g, "-").toLowerCase();

  let remaining = courses.filter(
    (c) => !completedSet.has(normalizeCourseCode(c.course_code as string)),
  );

  if (variant === "experimental") {
    remaining = [...remaining].sort(() => Math.random() - 0.49);
  }

  const semesters: SemesterPlan[] = [];
  const scheduled = new Set(completedCodes.map(normalizeCourseCode));
  const primaryHasCs = planUsesCsRules(primarySubjects);
  remaining = dropSupersededAlternatives(remaining, scheduled, primaryHasCs);
  let semIdx = 0;
  let stallCount = 0;

  while (remaining.length > 0 && semIdx < SEMESTER_LABELS.length) {
    const season = semesterSeason(SEMESTER_LABELS[semIdx]);

    const available = sortCoursesForSemester(
      remaining.filter((c) => {
        const prereqs = normalizedPrereqs(c);
        const prereqsMet = prereqs.every((p) => scheduled.has(p));
        const offeredNow = courseOfferedIn(c, season);
        return prereqsMet && offeredNow;
      }),
      primarySubjects,
    );

    if (!available.length) {
      stallCount++;
      if (stallCount > 2) break;
      semIdx++;
      continue;
    }
    stallCount = 0;

    let credits = 0;
    const semCourses: PlanCourse[] = [];
    const toRemove: string[] = [];

    for (const course of available) {
      const codeNorm = normalizeCourseCode(course.course_code as string);
      if (isBlockedByRequirementAlternatives(codeNorm, scheduled, primaryHasCs)) continue;

      const cr = (course.credits as number) || 3;
      if (credits + cr <= maxCredits) {
        const id = codeToId(codeNorm);
        semCourses.push({
          id,
          code: codeNorm,
          title: (course.title as string) || "",
          credits: cr,
        });
        credits += cr;
        scheduled.add(codeNorm);
        toRemove.push(codeNorm);
      }
      if (credits >= maxCredits) break;
    }

    if (!semCourses.length) {
      semIdx++;
      continue;
    }

    const removeSet = new Set(toRemove);
    remaining = remaining.filter((c) => !removeSet.has(normalizeCourseCode(c.course_code as string)));
    remaining = dropSupersededAlternatives(remaining, scheduled, primaryHasCs);

    const warnings: { code: string; message: string }[] = [];
    if (credits > 18) {
      warnings.push({ code: "heavy-load", message: `Heavy load: ${credits} credits this semester.` });
    }

    semesters.push({
      id: `sem-${semIdx + 1}`,
      label: SEMESTER_LABELS[semIdx],
      courses: semCourses,
      creditsTotal: credits,
      warnings,
    });

    semIdx++;
  }

  if (remaining.length > 0) {
    const unscheduled = remaining.map((c) => c.course_code as string);
    const lastSem = semesters[semesters.length - 1];
    if (lastSem) {
      lastSem.warnings.push({
        code: "unscheduled",
        message: `${unscheduled.length} course(s) could not be scheduled: ${unscheduled.slice(0, 5).join(", ")}${unscheduled.length > 5 ? "…" : ""}`,
      });
    }
  }

  return { semesters };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const variant = searchParams.get("variant") || "saved";
    const subjectHeader = searchParams.get("subject") || "CMPSC";
    const subject = subjectHeader.toUpperCase();
    const primarySubjects = subject.split(",").map((s) => s.trim()).filter(Boolean);
    const completedCodes = (searchParams.get("completed") || "").split(",").filter(Boolean);
    const maxCredits = parseInt(searchParams.get("maxCredits") || "18", 10);

    // For the canonical \"give me a CS schedule\" case, serve the bulletin
    // template instead of trying to infer everything from catalog data.
    if (shouldUseCsBulletinTemplate(primarySubjects) && completedCodes.length === 0) {
      const template = getCsEngineeringSuggestedPlan("131");
      return NextResponse.json(template);
    }

    const c = await db();
    const subjectsExpanded = expandSubjectsForPlan(primarySubjects);
    const coursesRaw = await c.db("degreeflow_courses").collection("courses").find(
      { subject: { $in: subjectsExpanded }, level: "Undergraduate" },
      { projection: { course_code: 1, title: 1, credits: 1, prerequisites: 1, semesters_offered: 1 } }
    ).toArray();

    const primaryHasCs = planUsesCsRules(primarySubjects);
    const courses = filterCsAutoplanExcludedCourses(coursesRaw as CourseDoc[], primaryHasCs);

    const plan = buildPlan(
      courses as CourseDoc[],
      completedCodes,
      maxCredits,
      variant,
      primarySubjects,
    );

    return NextResponse.json(plan);
  } catch (err) {
    console.error("[Plan] Error:", err);
    return NextResponse.json({ semesters: [] }, { status: 500 });
  }
}

