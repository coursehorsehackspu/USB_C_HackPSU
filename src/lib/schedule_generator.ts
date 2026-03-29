// src/lib/schedule-generator.ts
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
];
const SEMESTER_TYPES = [
  "fall","spring","fall","spring","fall","spring","fall","spring"
];

export type ScheduleOptions = {
  majors: string[];
  completedCodes?: string[];
  maxCreditsPerSemester?: number;
  maxCoursesPerSemester?: number;
  numYears?: number;
};

export type ScheduleResult = {
  plan: DegreePlan;
  summary: string;
  totalCourses: number;
  totalCredits: number;
  warnings: string[];
};

interface CourseDoc {
  course_code: string;
  title: string;
  credits: number;
  prerequisites: string[];
  semesters_offered: string[];
}

function normalizeMajor(major: string): string {
  return major.trim()
    .replace(/\bmaths?\b/i, "mathematics")
    .replace(/\bcs\b/i, "computer science")
    .replace(/\bece\b/i, "electrical engineering")
    .replace(/\bist\b/i, "information sciences and technology")
    .replace(/\bme\b/i, "mechanical engineering");
}

export async function generateSchedule(opts: ScheduleOptions): Promise<ScheduleResult> {
  const {
    majors,
    completedCodes = [],
    maxCreditsPerSemester = 18,
    maxCoursesPerSemester = 6,
    numYears = 4,
  } = opts;

  const warnings: string[] = [];
  const c = await db();

  // 1. Get required courses for each major
  const requiredCodesSet = new Set<string>();
  for (const major of majors) {
    const normalized = normalizeMajor(major);
    const program = await c.db("degreeflow_courses").collection("programs").findOne(
      { program_name: { $regex: `^${normalized}`, $options: "i" } },
      { projection: { required_courses: 1, program_name: 1 } }
    );
    if (program?.required_courses?.length > 0) {
      (program.required_courses as string[]).forEach(code => requiredCodesSet.add(code));
    } else {
      warnings.push(`Program not found: "${major}"`);
    }
  }

  if (requiredCodesSet.size === 0) {
    return { plan: { semesters: [] }, summary: "No programs found.", totalCourses: 0, totalCredits: 0, warnings };
  }

  // 2. Fetch course details
  const courses = await c.db("degreeflow_courses").collection("courses").find(
    { course_code: { $in: Array.from(requiredCodesSet) } },
    { projection: { course_code: 1, title: 1, credits: 1, prerequisites: 1, semesters_offered: 1 } }
  ).toArray() as unknown as CourseDoc[];

  // 3. Deduplicate — one per base code, prefer exact match
  const completedSet = new Set(completedCodes.map(c => c.toUpperCase()));
  const seen = new Map<string, CourseDoc>();
  for (const course of courses) {
    const base = course.course_code.replace(/[A-Z]$/, "").trim();
    if (!seen.has(base)) seen.set(base, course);
  }
  const allCourses = Array.from(seen.values()).filter(c => !completedSet.has(c.course_code));

  // 4. Only check prereqs that are within our required set
  const ourCodes = new Set(allCourses.map(c => c.course_code));

  // 5. Topological sort — order courses by level
  const sorted: CourseDoc[] = [];
  const inSorted = new Set<string>();

  function canAdd(course: CourseDoc): boolean {
    const prereqs = (course.prerequisites || []).filter(p => ourCodes.has(p));
    return prereqs.every(p => inSorted.has(p));
  }

  let remaining = [...allCourses];
  let maxIter = 1000;
  while (remaining.length > 0 && maxIter-- > 0) {
    const before = remaining.length;
    const next = remaining.filter(canAdd);
    if (next.length === 0) {
      // Force add remaining (circular deps)
      sorted.push(...remaining);
      remaining = [];
      break;
    }
    for (const c of next) {
      sorted.push(c);
      inSorted.add(c.course_code);
    }
    remaining = remaining.filter(c => !inSorted.has(c.course_code));
    if (remaining.length === before) {
      sorted.push(...remaining);
      remaining = [];
    }
  }

  // 6. Distribute into 8 semesters evenly
  const totalSemesters = numYears * 2;
  const semesters: SemesterPlan[] = Array.from({ length: totalSemesters }, (_, i) => ({
    id: `sem-${i + 1}`,
    label: SEMESTER_LABELS[i] || `Semester ${i + 1}`,
    courses: [],
    creditsTotal: 0,
    warnings: [],
  }));

  for (const course of sorted) {
    const cr = course.credits || 3;
    const semType = SEMESTER_TYPES;

    // Check semester offering preference
    const offered = (course.semesters_offered || []).map(s => s.toLowerCase());
    const fallOnly = offered.length > 0 && offered.every(s => s.includes("fall")) && !offered.some(s => s.includes("spring"));
    const springOnly = offered.length > 0 && offered.every(s => s.includes("spring")) && !offered.some(s => s.includes("fall"));

    // Find best semester: prefer offering match, then least loaded
    const candidate = semesters
      .filter(sem => {
        if (sem.courses.length >= maxCoursesPerSemester) return false;
        if (sem.creditsTotal + cr > maxCreditsPerSemester) return false;
        const idx = semesters.indexOf(sem);
        if (fallOnly && semType[idx] !== "fall") return false;
        if (springOnly && semType[idx] !== "spring") return false;
        return true;
      })
      .sort((a, b) => a.creditsTotal - b.creditsTotal)[0];

    if (candidate) {
      candidate.courses.push({
        id: course.course_code.replace(/\s+/g, "-").toLowerCase(),
        code: course.course_code,
        title: course.title || "",
        credits: cr,
      });
      candidate.creditsTotal += cr;
    }
  }

  // 7. Add warnings for heavy semesters
  const filled = semesters.filter(s => s.courses.length > 0);
  filled.forEach(sem => {
    if (sem.creditsTotal > 18) sem.warnings.push({ code: "heavy", message: `Heavy load: ${sem.creditsTotal} credits` });
  });

  const totalCredits = filled.reduce((s, sem) => s + sem.creditsTotal, 0);
  const totalCourses = filled.reduce((s, sem) => s + sem.courses.length, 0);

  return {
    plan: { semesters: filled },
    summary: `Generated an 8-semester plan for ${majors.join(" + ")} with ${totalCourses} courses (${totalCredits} credits).`,
    totalCourses,
    totalCredits,
    warnings,
  };
}

export function parseMajorsFromQuery(query: string): string[] {
  const known = [
    "computer science", "mathematics", "maths", "statistics",
    "computer engineering", "electrical engineering", "data sciences",
    "information sciences and technology", "accounting", "finance",
    "economics", "psychology", "biology", "nursing",
    "mechanical engineering", "physics", "chemistry",
    "marketing", "management", "sociology", "english",
    "history", "political science", "communications",
  ];
  const q = query.toLowerCase();
  const sorted = [...known].sort((a, b) => b.length - a.length);
  const found: string[] = [];
  let remaining = q;
  for (const m of sorted) {
    if (remaining.includes(m)) {
      found.push(m);
      remaining = remaining.replace(m, "");
    }
  }
  return found;
}

export function isScheduleRequest(query: string): boolean {
  return /make.*schedule|build.*schedule|create.*schedule|plan.*schedule|schedule for|my schedule|degree plan|4.year|four.year/i.test(query);
}