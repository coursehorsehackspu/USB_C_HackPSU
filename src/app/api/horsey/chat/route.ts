// src/app/api/horsey/chat/route.ts
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CourseGraphPayload, CourseGraphNode, CourseGraphEdge } from "@/types/graph";
import type { DegreePlan, SemesterPlan, PlanCourse } from "@/types/plan";
import { getMajorRequirementsBulletin } from "@/data/major-requirements";
import {
  getCsEngineeringSuggestedPlan,
  shouldUseCsBulletinTemplate,
} from "@/data/cs-bulletin-suggested-plan";
import {
  dropSupersededAlternatives,
  expandSubjectsForPlan,
  filterCsAutoplanExcludedCourses,
  isBlockedByRequirementAlternatives,
  normalizeCourseCode,
  normalizedPrereqs,
  planUsesCsRules,
  sortCoursesForSemester,
  type CourseDoc as PlanCourseDoc,
} from "@/lib/schedule-plan";

const MONGO_URI = process.env.MONGO_URI!;
const GEMINI_KEY = process.env.GEMINI_API_KEY!;

let client: MongoClient | null = null;
async function db() {
  if (!client) { client = new MongoClient(MONGO_URI); await client.connect(); }
  return client;
}

type Msg = { role: "user" | "assistant"; content: string };
type Body = {
  messages?: Msg[];
  context?: { view?: string; selectedCourse?: { id: string; code: string }; major?: string };
};

/* ------------------------------------------------------------------ */
/*  Major → relevant subject affinity map                             */
/* ------------------------------------------------------------------ */

const SUBJECT_AFFINITY: Record<string, Set<string>> = {
  CMPSC: new Set(["CMPSC", "MATH", "STAT", "PHYS", "EE", "CMPEN", "IST", "DS", "CYBER", "SWENG", "ENGL"]),
  MATH:  new Set(["MATH", "STAT", "PHYS", "CMPSC", "ASTRO"]),
  PHYS:  new Set(["PHYS", "MATH", "CMPSC", "ASTRO", "CHEM"]),
  EE:    new Set(["EE", "CMPEN", "CMPSC", "MATH", "PHYS"]),
  IST:   new Set(["IST", "CMPSC", "CYBER", "SRA", "DS", "STAT", "MATH"]),
  CYBER: new Set(["CYBER", "IST", "CMPSC", "SRA", "MATH"]),
  DS:    new Set(["DS", "CMPSC", "STAT", "MATH", "IST"]),
  SWENG: new Set(["SWENG", "CMPSC", "MATH", "STAT"]),
  STAT:  new Set(["STAT", "MATH", "CMPSC", "DS", "ECON"]),
  CHEM:  new Set(["CHEM", "MATH", "PHYS", "BIOL"]),
  BIOL:  new Set(["BIOL", "CHEM", "MATH", "PHYS", "STAT"]),
  ECON:  new Set(["ECON", "MATH", "STAT", "ACCTG"]),
};

function resolveOneSubject(raw: string): string | null {
  const u = raw.toUpperCase().trim();
  if (SUBJECT_AFFINITY[u]) return u;
  if (u.includes("COMPUTER SCIENCE") || u.includes("COMP SCI")) return "CMPSC";
  if (u.includes("SOFTWARE")) return "SWENG";
  if (u.includes("DATA SCIENCE")) return "DS";
  if (u.includes("INFORMATION")) return "IST";
  if (u.includes("CYBERSECURITY")) return "CYBER";
  if (u.includes("ELECTRICAL")) return "EE";
  if (u.includes("MATHEMATICS") || u === "MATH") return "MATH";
  if (u.includes("PHYSICS")) return "PHYS";
  if (u.includes("BIOLOGY")) return "BIOL";
  if (u.includes("CHEMISTRY")) return "CHEM";
  if (u.includes("STATISTICS")) return "STAT";
  if (u.includes("ECONOMICS")) return "ECON";
  return null;
}

function getRelevantSubjects(major?: string): Set<string> | null {
  if (!major) return null;
  const parts = major.split(/[,;&\/]+/).map((s) => s.trim()).filter(Boolean);
  const merged = new Set<string>();
  for (const part of parts) {
    const key = resolveOneSubject(part);
    if (key && SUBJECT_AFFINITY[key]) {
      for (const s of SUBJECT_AFFINITY[key]) merged.add(s);
    }
  }
  return merged.size > 0 ? merged : null;
}

function courseSubject(code: string): string {
  return code.replace(/\s*\d+.*$/, "").trim();
}

/* ------------------------------------------------------------------ */
/*  Extract course code from user text + DB context                   */
/* ------------------------------------------------------------------ */

const COURSE_CODE_RE = /\b([A-Z]{2,6})\s*(\d{3}[A-Z]?)\b/;

function extractCourseCode(text: string): string | null {
  const m = text.toUpperCase().match(COURSE_CODE_RE);
  if (!m) return null;
  return `${m[1]} ${m[2]}`;
}

function extractCourseCodeFromContext(context: string): string | null {
  const m = context.match(/^COURSE:\s+([A-Z]{2,6}\s+\d{3}[A-Z]?)\s/m);
  return m ? m[1] : null;
}

/* ------------------------------------------------------------------ */
/*  RAG context builder                                               */
/* ------------------------------------------------------------------ */

async function buildContext(query: string): Promise<string> {
  const c = await db();
  const parts: string[] = [];

  const codeMatch = query.toUpperCase().match(COURSE_CODE_RE);
  if (codeMatch) {
    const code = `${codeMatch[1]} ${codeMatch[2]}`;
    const course = await c.db("degreeflow_courses").collection("courses").findOne(
      { course_code: code },
      { projection: { course_code: 1, title: 1, credits: 1, prerequisites: 1, prerequisites_raw: 1, description: 1, semesters_offered: 1 } }
    );
    if (course) {
      parts.push(
        `COURSE: ${course.course_code} — ${course.title}\n` +
        `Credits: ${course.credits ?? "N/A"}\n` +
        `Prerequisites: ${(course.prerequisites as string[])?.join(", ") || "None"}\n` +
        `Prereq detail: ${course.prerequisites_raw || "N/A"}\n` +
        `Offered: ${(course.semesters_offered as string[])?.join(", ") || "Unknown"}\n` +
        `Description: ${(course.description as string || "").slice(0, 500)}`
      );
    }
  }

  try {
    const pages = await c.db("degreeflow").collection("psu_pages")
      .find({ $text: { $search: query }, status: "success" },
        { projection: { score: { $meta: "textScore" }, title: 1, text_content: 1, url: 1, emails: 1, phones: 1 } })
      .sort({ score: { $meta: "textScore" } }).limit(3).toArray();
    for (const p of pages) {
      parts.push(
        `PAGE: ${p.title as string}\nURL: ${p.url as string}\n` +
        `${(p.text_content as string || "").slice(0, 500)}\n` +
        `${(p.emails as string[])?.[0] ? "Email: " + (p.emails as string[])[0] : ""}` +
        `${(p.phones as string[])?.[0] ? " | Phone: " + (p.phones as string[])[0] : ""}`
      );
    }
  } catch { /* text index may not exist */ }

  if (!codeMatch) {
    try {
      const courses = await c.db("degreeflow_courses").collection("courses")
        .find({ $text: { $search: query } },
          { projection: { score: { $meta: "textScore" }, course_code: 1, title: 1, credits: 1, prerequisites: 1, description: 1 } })
        .sort({ score: { $meta: "textScore" } }).limit(4).toArray();
      for (const course of courses) {
        parts.push(
          `COURSE: ${course.course_code as string} — ${course.title as string}\n` +
          `Credits: ${course.credits ?? "N/A"}\n` +
          `Prerequisites: ${(course.prerequisites as string[])?.join(", ") || "None"}\n` +
          `Description: ${(course.description as string || "").slice(0, 300)}`
        );
      }
    } catch { /* text index may not exist */ }
  }

  return parts.join("\n\n---\n\n") || "No specific results found.";
}

/* ------------------------------------------------------------------ */
/*  Recursive prerequisite graph builder                              */
/* ------------------------------------------------------------------ */

async function buildPrereqGraph(
  target: { type: "course"; code: string } | { type: "subject"; subject: string },
  completedIds: string[] = [],
  relevantSubjects: Set<string> | null = null,
): Promise<CourseGraphPayload> {
  const c = await db();
  const col = c.db("degreeflow_courses").collection("courses");

  const visited = new Map<string, Record<string, unknown>>();

  function isRelevant(code: string): boolean {
    if (!relevantSubjects) return true;
    return relevantSubjects.has(courseSubject(code));
  }

  async function crawl(code: string, depth: number) {
    if (depth > 6 || visited.has(code)) return;
    if (depth > 0 && !isRelevant(code)) return;
    const doc = await col.findOne(
      { course_code: code },
      { projection: { course_code: 1, title: 1, credits: 1, prerequisites: 1, description: 1 } },
    );
    if (!doc) return;
    visited.set(code, doc);
    const prereqs = (doc.prerequisites as string[]) || [];
    for (const p of prereqs) {
      await crawl(p, depth + 1);
    }
  }

  if (target.type === "course") {
    await crawl(target.code, 0);
  } else {
    const subjects = target.subject.split(",").map((s) => s.trim()).filter(Boolean);
    for (const subj of subjects) {
      const docs = await col.find(
        { subject: subj, level: "Undergraduate" },
        { projection: { course_code: 1, title: 1, credits: 1, prerequisites: 1, description: 1 } },
      ).toArray();
      for (const d of docs) {
        visited.set(d.course_code as string, d);
      }
    }
    for (const [, d] of visited) {
      for (const p of ((d.prerequisites as string[]) || [])) {
        if (!visited.has(p) && isRelevant(p)) await crawl(p, 1);
      }
    }
  }

  const codeToId = (code: string) => code.replace(/\s+/g, "-").toLowerCase();

  const nodes: CourseGraphNode[] = [];
  const edges: CourseGraphEdge[] = [];

  for (const [code, doc] of visited) {
    const id = codeToId(code);
    const prereqs = (doc.prerequisites as string[]) || [];
    const isCompleted = completedIds.includes(id);
    const allDone = prereqs.every((p: string) => completedIds.includes(codeToId(p)));
    nodes.push({
      id,
      code,
      title: (doc.title as string) || "",
      credits: (doc.credits as number) || 3,
      status: isCompleted ? "completed" : (allDone || prereqs.length === 0 ? "available" : "locked"),
      description: ((doc.description as string) || "").slice(0, 200),
    });
    for (const p of prereqs) {
      const sourceId = codeToId(p);
      if (visited.has(p) && sourceId !== id) {
        edges.push({ id: `${sourceId}→${id}`, source: sourceId, target: id });
      }
    }
  }

  return { nodes, edges };
}

/* ------------------------------------------------------------------ */
/*  Schedule plan builder                                             */
/* ------------------------------------------------------------------ */

const SEMESTER_LABELS = [
  "Fall 2025", "Spring 2026", "Fall 2026", "Spring 2027",
  "Fall 2027", "Spring 2028", "Fall 2028", "Spring 2029",
  "Fall 2029", "Spring 2030", "Fall 2030", "Spring 2031",
];

type CourseDoc = PlanCourseDoc;

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

async function buildSchedulePlan(
  target: { type: "subject"; subject: string } | { type: "course"; code: string },
  completedCodes: string[] = [],
  maxCredits = 18,
  relevantSubjects: Set<string> | null = null,
): Promise<DegreePlan> {
  const c = await db();
  const col = c.db("degreeflow_courses").collection("courses");

  function isRelevant(code: string): boolean {
    if (!relevantSubjects) return true;
    return relevantSubjects.has(courseSubject(code));
  }

  const primarySubjects =
    target.type === "subject"
      ? target.subject.split(",").map((s) => s.trim()).filter(Boolean)
      : [courseSubject(target.code)];

  // If this is the canonical \"build me a CS schedule\" case — single-subject
  // CMPSC and no completed overrides — return the bulletin template directly.
  if (
    target.type === "subject" &&
    shouldUseCsBulletinTemplate(primarySubjects) &&
    completedCodes.length === 0
  ) {
    return getCsEngineeringSuggestedPlan("131");
  }

  let courses: CourseDoc[];
  if (target.type === "subject") {
    const subjectsExpanded = expandSubjectsForPlan(primarySubjects);
    courses = await col.find(
      { subject: { $in: subjectsExpanded }, level: "Undergraduate" },
      { projection: { course_code: 1, title: 1, credits: 1, prerequisites: 1, semesters_offered: 1 } },
    ).toArray() as CourseDoc[];
  } else {
    const visited = new Map<string, CourseDoc>();
    async function crawl(code: string, depth: number) {
      if (depth > 6 || visited.has(code)) return;
      if (depth > 0 && !isRelevant(code)) return;
      const doc = await col.findOne(
        { course_code: code },
        { projection: { course_code: 1, title: 1, credits: 1, prerequisites: 1, semesters_offered: 1 } },
      );
      if (!doc) return;
      visited.set(code, doc as CourseDoc);
      for (const p of ((doc.prerequisites as string[]) || [])) {
        await crawl(p, depth + 1);
      }
    }
    await crawl(target.code, 0);
    courses = [...visited.values()];
  }

  const primaryHasCs = planUsesCsRules(primarySubjects);
  courses = filterCsAutoplanExcludedCourses(courses, primaryHasCs);

  const completedSet = new Set(completedCodes.map(normalizeCourseCode));
  const codeToId = (code: string) => code.replace(/\s+/g, "-").toLowerCase();

  let remaining = courses.filter(
    (c) => !completedSet.has(normalizeCourseCode(c.course_code as string)),
  );

  const semesters: SemesterPlan[] = [];
  const scheduled = new Set(completedCodes.map(normalizeCourseCode));
  remaining = dropSupersededAlternatives(remaining, scheduled, primaryHasCs);
  let semIdx = 0;
  let stallCount = 0;

  while (remaining.length > 0 && semIdx < SEMESTER_LABELS.length) {
    const season = semesterSeason(SEMESTER_LABELS[semIdx]);

    const available = sortCoursesForSemester(
      remaining.filter((c) => {
        const prereqs = normalizedPrereqs(c);
        return prereqs.every((p: string) => scheduled.has(p)) && courseOfferedIn(c, season);
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
        semCourses.push({
          id: codeToId(codeNorm),
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

    if (!semCourses.length) { semIdx++; continue; }

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

/* ------------------------------------------------------------------ */
/*  Parse Gemini response for action tags                             */
/* ------------------------------------------------------------------ */

const GRAPH_TAG_RE = /<<GRAPH_ACTION:([\s\S]*?)>>/;
const PLAN_TAG_RE = /<<PLAN_ACTION:([\s\S]*?)>>/;

type GraphAction =
  | { type: "course"; code: string }
  | { type: "subject"; subject: string };

type PlanAction =
  | { type: "subject"; subject: string; maxCredits?: number }
  | { type: "course"; code: string; maxCredits?: number };

function parseActions(text: string): {
  cleaned: string;
  graphAction: GraphAction | null;
  planAction: PlanAction | null;
} {
  let cleaned = text;
  let graphAction: GraphAction | null = null;
  let planAction: PlanAction | null = null;

  const gm = cleaned.match(GRAPH_TAG_RE);
  if (gm) {
    try { graphAction = JSON.parse(gm[1]) as GraphAction; } catch { /* skip */ }
    cleaned = cleaned.replace(GRAPH_TAG_RE, "");
  }

  const pm = cleaned.match(PLAN_TAG_RE);
  if (pm) {
    try { planAction = JSON.parse(pm[1]) as PlanAction; } catch { /* skip */ }
    cleaned = cleaned.replace(PLAN_TAG_RE, "");
  }

  return { cleaned: cleaned.trim(), graphAction, planAction };
}

/**
 * Safety net: if the user's message mentions a specific course code but Gemini
 * emitted type:"subject" (dumping the whole department), correct it to
 * type:"course" so only the prereq chain is shown.
 */
function correctAction<T extends GraphAction | PlanAction>(
  action: T | null,
  userText: string,
  dbContext: string,
): T | null {
  if (!action) return null;

  if (action.type === "subject") {
    const isMulti = (action as { subject: string }).subject.includes(",");
    if (isMulti) return action;

    const codeFromUser = extractCourseCode(userText);
    const codeFromDb = extractCourseCodeFromContext(dbContext);
    const bestCode = codeFromUser ?? codeFromDb;
    if (bestCode) {
      return { ...action, type: "course", code: bestCode } as unknown as T;
    }
  }

  return action;
}

/* ------------------------------------------------------------------ */
/*  POST handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const messages: Msg[] = body.messages || [];
    const ctx = body.context;
    const major = ctx?.major || undefined;
    const relevantSubjects = getRelevantSubjects(major);
    const lastUser = [...messages].reverse().find((m) => m.role === "user");

    if (!lastUser) {
      return NextResponse.json({
        role: "assistant" as const,
        content: "Hey — I'm Horsey, your AI academic counselor. Ask me anything about your courses or degree plan!",
      });
    }

    const ragContext = await buildContext(lastUser.content);
    const majorReqBlock = getMajorRequirementsBulletin(major);
    const context = [majorReqBlock, ragContext].filter(Boolean).join("\n");

    const history = messages.slice(-8)
      .map((m) => `${m.role === "user" ? "Student" : "Horsey"}: ${m.content}`)
      .join("\n");

    const majorHint = major
      ? `The student's major is: ${major}. When DATABASE CONTEXT includes "MAJOR REQUIREMENTS", treat that block as the degree structure (prescribed courses, electives buckets, suggested plan) from the Penn State Undergraduate Bulletin — prioritize it over generic course lists. For prerequisite chains only, still use course RAG data. Filter prerequisite graphs to subjects relevant to this major.`
      : "The student has NOT set their major yet.";

    const contextHint = ctx?.selectedCourse
      ? `The student is viewing course: ${ctx.selectedCourse.code}.`
      : ctx?.view ? `The student is on the ${ctx.view} page of DegreeFlow.` : "";

    const prompt = `You are Horsey, a friendly AI academic counselor built into DegreeFlow for Penn State University students.
Help with course prerequisites, degree planning, registration deadlines, financial aid, and campus life.
Be concise, friendly, and accurate. Cite source URLs when available. Use **bold** for course codes.
${contextHint}
${majorHint}

IMPORTANT: If the student asks you to build a graph or schedule but has NOT set their major, ask them what major they are BEFORE using a tool tag. You need to know their major to show relevant prerequisite paths. Once they tell you, proceed with the tool.

TOOLS — You have two tools. Include EXACTLY ONE tag at the END of your response when the student asks to build/show/visualize something.

TOOL 1 — BUILD PREREQUISITE GRAPH:
Shows an interactive graph of a course and every prerequisite it depends on.

CRITICAL: If the student mentions ANY specific course — by code (MATH 230), by name ("Vector Calculus"), by nickname ("Calc 3"), or from the DATABASE CONTEXT — you MUST use type "course" with that course's code. This clears the graph and shows ONLY that course and its prerequisite chain.

Use type "subject" when the student asks for ALL courses in one or more departments. For MULTIPLE subjects (e.g. double major), use a COMMA-SEPARATED list in the subject field.

Examples:
- "Show prereqs for MATH 230" → <<GRAPH_ACTION:{"type":"course","code":"MATH 230"}>>
- "Build the prereq graph for Calc Vector" → (look up in DATABASE CONTEXT, it's MATH 230) → <<GRAPH_ACTION:{"type":"course","code":"MATH 230"}>>
- "prereq tree for CMPSC 132" → <<GRAPH_ACTION:{"type":"course","code":"CMPSC 132"}>>
- "show me all the CS courses" → <<GRAPH_ACTION:{"type":"subject","subject":"CMPSC"}>>
- "graph for my CS and Math double major" → <<GRAPH_ACTION:{"type":"subject","subject":"CMPSC,MATH"}>>
- "show all EE and CMPSC prerequisites" → <<GRAPH_ACTION:{"type":"subject","subject":"EE,CMPSC"}>>

TOOL 2 — BUILD SCHEDULE / SEMESTER PLAN:
Generates a semester-by-semester plan. Same rules apply. For double/multiple majors, combine subjects with commas. Courses from all listed subjects are merged into one integrated schedule respecting prereqs and credit caps. If MAJOR REQUIREMENTS lists a suggested academic plan, mention that the generated schedule is an automated prereq ordering — not a substitute for the bulletin’s suggested plan or LionPATH.

Examples:
- "Plan out semesters for MATH 230" → <<PLAN_ACTION:{"type":"course","code":"MATH 230"}>>
- "Build me a CS schedule" → <<PLAN_ACTION:{"type":"subject","subject":"CMPSC"}>>
- "Schedule for Calc Vector" → <<PLAN_ACTION:{"type":"course","code":"MATH 230"}>>
- "Build a schedule for CS and Math double major" → <<PLAN_ACTION:{"type":"subject","subject":"CMPSC,MATH"}>>
- "Plan my CMPSC, MATH, and STAT courses" → <<PLAN_ACTION:{"type":"subject","subject":"CMPSC,MATH,STAT"}>>

You can optionally include maxCredits (default 18):
<<PLAN_ACTION:{"type":"subject","subject":"CMPSC,MATH","maxCredits":16}>>

TAG FORMAT RULES:
- course_code is ALWAYS "SUBJ NNN" with a space (e.g. "CMPSC 132", "MATH 140").
- subject is ALWAYS uppercase department prefix(es), comma-separated for multiple (e.g. "CMPSC", "MATH", "CMPSC,MATH").
- Only ONE tag per response, on its own line, at the very end.
- Only include a tag when the student explicitly asks to build/show/create/visualize. Normal prereq questions get text answers only.
- If you can't determine the course code, check the DATABASE CONTEXT below — it will have the exact code.
- NEVER refuse a double/multi-major request. Always combine the subjects with commas.

DATABASE CONTEXT:
${context}

${history ? `CONVERSATION:\n${history}\n` : ""}Student: ${lastUser.content}
Horsey:`;

    const genai = new GoogleGenerativeAI(GEMINI_KEY);
    const model = genai.getGenerativeModel({ model: "gemini-2.5-pro" });
    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    let { cleaned, graphAction, planAction } = parseActions(raw);

    graphAction = correctAction(graphAction, lastUser.content, context);
    planAction = correctAction(planAction, lastUser.content, context);

    const response: Record<string, unknown> = {
      role: "assistant",
      content: cleaned,
    };

    if (graphAction) {
      response.graphAction = await buildPrereqGraph(graphAction, [], relevantSubjects);
    }

    if (planAction) {
      const maxCredits = planAction.maxCredits ?? 18;
      response.planAction = await buildSchedulePlan(planAction, [], maxCredits, relevantSubjects);
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("[Horsey] Error:", err);
    return NextResponse.json(
      { role: "assistant" as const, content: "Sorry, I'm having trouble right now. Please try again!" },
      { status: 500 }
    );
  }
}
