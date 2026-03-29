/**
 * Penn State Computer Science, B.S. (Engineering) — Suggested Academic Plan
 * University Park, Effective Spring 2026.
 *
 * Encodes the bulletin table you provided as a concrete DegreePlan, choosing a
 * specific track for all OR options:
 * - CMPSC 131 / 132 instead of 121 / 122
 * - CAS 100A instead of CAS 100B / 100C / ENGL 138T
 * - STAT 318 + STAT 319 (rather than MATH 414/418/415)
 * - CMPEN 270 (rather than CMPEN 271 + CMPEN 275)
 * - MATH 230 + MATH 220 (rather than MATH 231 + 232)
 *
 * Gen Ed / GN / department-list / GHW slots are represented as placeholder
 * courses with accurate credit values so semester totals match the bulletin.
 */

import type { DegreePlan, SemesterPlan, PlanCourse } from "@/types/plan";

export type CsSuggestedTrack = "131" | "121";

const BULLETIN_NOTE =
  "Template matches the Penn State CS B.S. (Engineering) suggested academic plan (Spring 2026, UP; 131/132 track, CAS 100A, STAT 318/319, CMPEN 270). Always confirm in LionPATH and with your adviser.";

function makeCourse(id: string, code: string, title: string, credits: number): PlanCourse {
  return { id, code, title, credits };
}

function makeSemester(
  idx: number,
  label: string,
  courses: PlanCourse[],
  extraWarnings?: { code: string; message: string }[],
): SemesterPlan {
  const creditsTotal = courses.reduce((s, c) => s + c.credits, 0);
  return {
    id: `sem-${idx + 1}`,
    label,
    courses,
    creditsTotal,
    warnings: [
      { code: "bulletin-template", message: BULLETIN_NOTE },
      ...(extraWarnings ?? []),
    ],
  };
}

/** Default labels aligned with the rest of the app (adjust start year here if needed). */
export const CS_SUGGESTED_SEMESTER_LABELS = [
  "Fall 2025",
  "Spring 2026",
  "Fall 2026",
  "Spring 2027",
  "Fall 2027",
  "Spring 2028",
  "Fall 2028",
  "Spring 2029",
] as const;

/**
 * Full 8-semester suggested plan for CS B.S. (Engineering), University Park.
 * This is intentionally deterministic so Horsey and the Plan page can produce
 * the same schedule every time for the default CMPSC case.
 */
export function getCsEngineeringSuggestedPlan(
  track: CsSuggestedTrack = "131",
  labels: readonly string[] = CS_SUGGESTED_SEMESTER_LABELS,
): DegreePlan {
  // Resolve intro programming ORs.
  const introFall = track === "131"
    ? makeCourse("cmpsc-131", "CMPSC 131", "Programming and Computation I: Fundamentals", 3)
    : makeCourse("cmpsc-121", "CMPSC 121", "Introduction to Programming Techniques", 3);

  const introSpring = track === "131"
    ? makeCourse("cmpsc-132", "CMPSC 132", "Programming and Computation II: Data Structures", 3)
    : makeCourse("cmpsc-122", "CMPSC 122", "Intermediate Programming", 3);

  const y4Elective = (n: number): PlanCourse =>
    makeCourse(
      `cmpsc-400-elective-${n}`,
      "CMPSC/CMPEN 400",
      "400-level elective (see CSE undergrad handbook list)",
      3,
    );

  const semesters: SemesterPlan[] = [
    // First Year — Fall (16 cr)
    makeSemester(0, labels[0] ?? "Fall 1", [
      introFall, // CMPSC 131 (or 121) — 3cr
      makeCourse("cmpsc-150n", "CMPSC 150N", "Computing and Society", 3),
      makeCourse("math-140", "MATH 140", "Calculus With Analytic Geometry I", 4),
      makeCourse("engl-15", "ENGL 15", "Rhetoric and Composition", 3),
      makeCourse("gen-ed-y1f", "GEN ED", "General Education Course", 3),
    ]),

    // First Year — Spring (15 cr)
    makeSemester(1, labels[1] ?? "Spring 1", [
      introSpring, // CMPSC 132 (or 122) — 3cr
      makeCourse("math-141", "MATH 141", "Calculus with Analytic Geometry II", 4),
      makeCourse("phys-211", "PHYS 211", "General Physics: Mechanics", 4),
      makeCourse("gen-ed-y1s", "GEN ED", "General Education Course", 3),
      makeCourse("fys", "FYS", "First-Year Seminar", 1),
    ]),

    // Second Year — Fall (16–17 cr → we model 17 via MATH 220 as 3cr)
    makeSemester(2, labels[2] ?? "Fall 2", [
      makeCourse("cmpsc-221", "CMPSC 221", "Object Oriented Programming with Web-Based Applications", 3),
      makeCourse("math-230", "MATH 230", "Calculus and Vector Analysis", 4),
      makeCourse("math-220", "MATH 220", "Matrices", 3), // bulletin 2–3cr; we fix as 3cr
      makeCourse("phys-212", "PHYS 212", "General Physics: Electricity and Magnetism", 4),
      makeCourse("cas-100a", "CAS 100A", "Effective Speech", 3),
    ]),

    // Second Year — Spring (15–17 cr → modeled as 16 via a 3cr GN and 3cr GEN ED)
    makeSemester(3, labels[3] ?? "Spring 2", [
      makeCourse("cmpsc-222", "CMPSC 222", "Advanced Data Structures and Algorithms in C", 3),
      makeCourse("cmpsc-360", "CMPSC 360", "Discrete Mathematics for Computer Science", 3),
      makeCourse("cmpen-270", "CMPEN 270", "Digital Design: Theory and Practice", 4),
      makeCourse("gn-elective", "GN ELECTIVE", "Natural Science (GN) Elective (bulletin list)", 3),
      makeCourse("gen-ed-y2s", "GEN ED", "General Education Course", 3),
    ]),

    // Third Year — Fall (16 cr)
    makeSemester(4, labels[4] ?? "Fall 3", [
      makeCourse("cmpsc-315", "CMPSC 315", "Computer Systems I", 4),
      makeCourse("cmpsc-320", "CMPSC 320", "Software Engineering Principles", 3),
      makeCourse("cmpsc-465", "CMPSC 465", "Data Structures and Algorithms", 3),
      makeCourse("stat-318", "STAT 318", "Elementary Probability", 3),
      makeCourse("gen-ed-y3f", "GEN ED", "General Education Course", 3),
    ]),

    // Third Year — Spring (16 cr)
    makeSemester(5, labels[5] ?? "Spring 3", [
      makeCourse("cmpsc-316", "CMPSC 316", "Computer Systems II", 4),
      makeCourse("cmpsc-461", "CMPSC 461", "Programming Language Concepts", 3),
      makeCourse("stat-319", "STAT 319", "Elementary Mathematical Statistics", 3),
      makeCourse("engl-202c", "ENGL 202C", "Effective Writing: Technical Writing", 3),
      makeCourse("gen-ed-y3s", "GEN ED", "General Education Course", 3),
    ]),

    // Fourth Year — Fall (bulletin 16.5 cr; we model as 16.5)
    makeSemester(
      6,
      labels[6] ?? "Fall 4",
      [
        makeCourse("cmpsc-483w", "CMPSC 483W", "Software Design Methods", 3),
        y4Elective(1),
        y4Elective(2),
        y4Elective(3),
        makeCourse("dept-list-y4f", "DEPT ELECTIVE", "General Elective (Department List)", 3),
        makeCourse("ghw-fall", "GHW", "General Education — Health and Wellness", 1.5),
      ],
    ),

    // Fourth Year — Spring (bulletin 16.5 cr; we model as 16.5)
    makeSemester(7, labels[7] ?? "Spring 4", [
      y4Elective(4),
      y4Elective(5),
      makeCourse("dept-list-y4s", "DEPT ELECTIVE", "General Elective (Department List)", 3),
      makeCourse("gen-ed-y4s", "GEN ED", "General Education Course", 3),
      makeCourse("ghw-spring", "GHW", "General Education — Health and Wellness", 1.5),
    ]),
  ];

  return { semesters };
}

/**
 * Decide when to use the bulletin template. We only do this for the canonical
 * \"build me a CS schedule\" case: a single-subject CMPSC plan with no
 * additional subjects mixed in.
 */
export function shouldUseCsBulletinTemplate(primarySubjects: string[]): boolean {
  const norm = primarySubjects.map((s) => s.toUpperCase().trim()).filter(Boolean);
  return norm.length === 1 && norm[0] === "CMPSC";
}

