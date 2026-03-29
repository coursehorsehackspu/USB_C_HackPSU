export type CourseDoc = Record<string, unknown>;

/** Prefer bulletin ordering for CMPSC plans. */
export const CS_SCHEDULE_ORDER: readonly string[] = [
  "CMPSC 131", "CMPSC 121", "CMPSC 150N", "MATH 140", "ENGL 15",
  "CMPSC 132", "CMPSC 122", "MATH 141", "PHYS 211",
  "CMPSC 221", "MATH 230", "MATH 220", "PHYS 212", "CAS 100A", "CAS 100B", "CAS 100C",
  "CMPSC 222", "CMPSC 360", "CMPEN 270", "CMPEN 271", "CMPEN 275",
  "CMPSC 315", "CMPSC 320", "CMPSC 465", "STAT 318", "STAT 414", "MATH 414",
  "CMPSC 316", "CMPSC 461", "STAT 319", "MATH 415", "ENGL 202C",
  "CMPSC 483W",
];

const PLAN_SUBJECT_EXPAND: Record<string, readonly string[]> = {
  CMPSC: ["CMPSC", "MATH", "STAT", "PHYS", "CMPEN", "ENGL", "CAS"],
  SWENG: ["SWENG", "CMPSC", "MATH", "STAT", "PHYS", "ENGL", "CAS"],
  DS: ["DS", "CMPSC", "MATH", "STAT", "PHYS", "CMPEN", "ENGL", "CAS"],
  CYBER: ["CYBER", "CMPSC", "IST", "MATH", "STAT", "ENGL", "CAS"],
  IST: ["IST", "CMPSC", "MATH", "STAT", "ENGL", "CAS"],
  EE: ["EE", "MATH", "PHYS", "CMPEN", "CMPSC", "ENGL", "CAS"],
  CMPEN: ["CMPEN", "CMPSC", "MATH", "PHYS", "ENGL", "CAS"],
  MATH: ["MATH", "STAT", "PHYS"],
  STAT: ["STAT", "MATH", "CMPSC"],
  PHYS: ["PHYS", "MATH", "CMPSC", "CHEM"],
  CHEM: ["CHEM", "MATH", "PHYS"],
  BIOL: ["BIOL", "CHEM", "MATH", "STAT"],
  ECON: ["ECON", "MATH", "STAT"],
};

export function normalizeCourseCode(code: string): string {
  return code.replace(/\s+/g, " ").trim().toUpperCase();
}

export function expandSubjectsForPlan(subjects: string[]): string[] {
  const out = new Set<string>();
  for (const s of subjects) {
    const u = s.toUpperCase().trim();
    if (!u) continue;
    out.add(u);
    const extra = PLAN_SUBJECT_EXPAND[u];
    if (extra) for (const x of extra) out.add(x);
  }
  return [...out];
}

function scheduleRank(code: string, primaryHasCs: boolean): number {
  const n = normalizeCourseCode(code);
  if (primaryHasCs) {
    const idx = CS_SCHEDULE_ORDER.indexOf(n);
    if (idx >= 0) return idx;
  }
  const m = n.match(/^([A-Z]+)\s+(\d+)/);
  if (!m) return 50_000;
  const num = parseInt(m[2].replace(/\D/g, ""), 10) || 0;
  const sub = m[1];
  return 10_000 + sub.charCodeAt(0) * 100 + num;
}

export function sortCoursesForSemester(courses: CourseDoc[], primarySubjects: string[]): CourseDoc[] {
  const prim = primarySubjects.map((s) => s.toUpperCase().trim());
  const primaryHasCs = prim.some((s) => s === "CMPSC");
  return [...courses].sort((a, b) => {
    const ca = normalizeCourseCode(String(a.course_code ?? ""));
    const cb = normalizeCourseCode(String(b.course_code ?? ""));
    const ra = scheduleRank(ca, primaryHasCs);
    const rb = scheduleRank(cb, primaryHasCs);
    if (ra !== rb) return ra - rb;
    return ca.localeCompare(cb);
  });
}

export function normalizedPrereqs(doc: CourseDoc): string[] {
  const raw = (doc.prerequisites as string[] | undefined) || [];
  return raw.map(normalizeCourseCode).filter(Boolean);
}

export const CS_CHOOSE_ONE_GROUPS: readonly (readonly string[])[] = [
  ["CAS 100A", "CAS 100B", "CAS 100C", "ENGL 138T"],
  ["CMPSC 121", "CMPSC 131"],
  ["CMPSC 122", "CMPSC 132"],
  ["ENGL 15", "ENGL 30H", "ENGL 137H"],
  ["MATH 140", "MATH 140H"],
  ["MATH 141", "MATH 141H"],
  ["MATH 220", "MATH 220H"],
  ["MATH 230", "MATH 230H"],
  ["STAT 318", "MATH 414", "MATH 418"],
  ["STAT 319", "MATH 415"],
];

export const CS_XOR_PATHS: string[][][] = [
  [["CMPEN 270"], ["CMPEN 271", "CMPEN 275"]],
  [["MATH 230", "MATH 230H"], ["MATH 231", "MATH 232"]],
];

export function planUsesCsRules(primarySubjects: string[]): boolean {
  return primarySubjects.some((s) => s.toUpperCase().trim() === "CMPSC");
}

const CS_AUTOSCHEDULE_EXCLUDE = new Set(
  [
    "CMPSC 100", "CMPSC 101", "CMPSC 102", "CMPSC 200", "CMPSC 201", "CMPSC 202", "CMPSC 302",
    "CMPSC 111", "MATH 110", "MATH 111",
  ].map(normalizeCourseCode),
);

export function filterCsAutoplanExcludedCourses(courses: CourseDoc[], primaryHasCs: boolean): CourseDoc[] {
  if (!primaryHasCs) return courses;
  return courses.filter((doc) => !CS_AUTOSCHEDULE_EXCLUDE.has(normalizeCourseCode(String(doc.course_code ?? ""))));
}

function normList(codes: readonly string[]): string[] {
  return codes.map((c) => normalizeCourseCode(c));
}

export function isBlockedByRequirementAlternatives(
  code: string,
  scheduled: Set<string>,
  primaryHasCs: boolean,
): boolean {
  if (!primaryHasCs) return false;
  const n = normalizeCourseCode(code);
  for (const group of CS_CHOOSE_ONE_GROUPS) {
    const norm = normList(group);
    if (!norm.includes(n)) continue;
    if (norm.some((g) => g !== n && scheduled.has(g))) return true;
  }
  for (const paths of CS_XOR_PATHS) {
    const p0 = normList(paths[0]);
    const p1 = normList(paths[1]);
    const has0 = p0.some((c) => scheduled.has(c));
    const has1 = p1.some((c) => scheduled.has(c));
    if (p0.includes(n) && has1) return true;
    if (p1.includes(n) && has0) return true;
  }
  return false;
}

export function dropSupersededAlternatives(
  remaining: CourseDoc[],
  scheduled: Set<string>,
  primaryHasCs: boolean,
): CourseDoc[] {
  if (!primaryHasCs) return remaining;
  const drop = new Set<string>();
  for (const group of CS_CHOOSE_ONE_GROUPS) {
    const norm = normList(group);
    const chosen = norm.find((g) => scheduled.has(g));
    if (chosen) for (const g of norm) if (g !== chosen) drop.add(g);
  }
  for (const paths of CS_XOR_PATHS) {
    const p0 = normList(paths[0]);
    const p1 = normList(paths[1]);
    if (p0.some((c) => scheduled.has(c))) for (const c of p1) drop.add(c);
    if (p1.some((c) => scheduled.has(c))) for (const c of p0) drop.add(c);
  }
  return remaining.filter((c) => !drop.has(normalizeCourseCode(String(c.course_code ?? ""))));
}

