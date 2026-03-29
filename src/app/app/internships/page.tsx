import { MongoClient } from "mongodb";
import { Badge, Button, Card } from "@/components/ui";

const MONGO_URI = process.env.MONGO_URI;

type CourseCode =
  | "CMPSC 221"
  | "CMPSC 311"
  | "CMPSC 360"
  | "CMPSC 431W"
  | "CMPSC 447"
  | "CMPSC 460"
  | "CMPSC 461"
  | "CMPSC 465"
  | "CMPSC 473";

type CourseRecord = {
  course_code?: string;
  title?: string;
  description?: string;
};

type Posting = {
  company: string;
  title: string;
  team: string;
  summary: string;
  classes: Array<{ code: CourseCode; signal: "Core signal" | "Helpful" }>;
};

const fallbackCourseCatalog: Record<CourseCode, { title: string; description: string }> = {
  "CMPSC 221": {
    title: "Object-Oriented Programming with Web-Based Applications",
    description:
      "Builds object-oriented software and web-based applications, which makes it a believable signal for product engineering internships.",
  },
  "CMPSC 311": {
    title: "Introduction to Systems Programming",
    description:
      "Introduces low-level programming, debugging, and systems thinking that map well to backend and infrastructure work.",
  },
  "CMPSC 360": {
    title: "Discrete Mathematics for Computer Science",
    description:
      "Strengthens formal reasoning and problem solving, which helps support technical interviews and security-minded work.",
  },
  "CMPSC 431W": {
    title: "Database Management Systems",
    description:
      "Covers database design and data-backed systems, making it a strong fit for application and platform internship roles.",
  },
  "CMPSC 447": {
    title: "Introduction to Machine Learning",
    description:
      "Provides a practical machine learning angle for internships touching data products, ranking, or personalization.",
  },
  "CMPSC 460": {
    title: "Secure Programming",
    description:
      "Focuses on defensive engineering and secure software practices, which makes it a natural fit for security postings.",
  },
  "CMPSC 461": {
    title: "Programming Language Concepts",
    description:
      "Develops deeper understanding of abstraction and language behavior, which helps make systems and tooling roles feel more grounded.",
  },
  "CMPSC 465": {
    title: "Data Structures and Algorithms",
    description:
      "Signals core problem solving and interview readiness for a wide range of software engineering internships.",
  },
  "CMPSC 473": {
    title: "Operating Systems Design",
    description:
      "Supports systems-level and infrastructure roles through concurrency, OS concepts, and low-level debugging.",
  },
};

const postings: Posting[] = [
  {
    company: "Capital One",
    title: "Software Engineering Intern",
    team: "Card Platforms",
    summary:
      "Support internal APIs and customer-facing services with backend implementation, production debugging, and data-backed feature work.",
    classes: [
      { code: "CMPSC 311", signal: "Core signal" },
      { code: "CMPSC 431W", signal: "Core signal" },
      { code: "CMPSC 465", signal: "Helpful" },
    ],
  },
  {
    company: "NVIDIA",
    title: "Systems Software Intern",
    team: "Developer Technology",
    summary:
      "Work on performance-sensitive tooling and runtime behavior for engineering teams working close to the machine.",
    classes: [
      { code: "CMPSC 311", signal: "Core signal" },
      { code: "CMPSC 473", signal: "Core signal" },
      { code: "CMPSC 461", signal: "Helpful" },
    ],
  },
  {
    company: "JPMorgan Chase",
    title: "Software Engineer Program Intern",
    team: "Payments Engineering",
    summary:
      "Ship product-facing features connected to data systems and contribute to engineering work with clear business impact.",
    classes: [
      { code: "CMPSC 221", signal: "Core signal" },
      { code: "CMPSC 431W", signal: "Core signal" },
      { code: "CMPSC 465", signal: "Helpful" },
    ],
  },
  {
    company: "Palo Alto Networks",
    title: "Product Security Intern",
    team: "Cloud Security",
    summary:
      "Investigate vulnerabilities, support secure development practices, and improve defensive engineering across product teams.",
    classes: [
      { code: "CMPSC 460", signal: "Core signal" },
      { code: "CMPSC 311", signal: "Helpful" },
      { code: "CMPSC 360", signal: "Helpful" },
    ],
  },
  {
    company: "Duolingo",
    title: "Machine Learning Intern",
    team: "Personalization",
    summary:
      "Prototype ranking or recommendation ideas and work with engineers on data-informed product improvements.",
    classes: [
      { code: "CMPSC 447", signal: "Core signal" },
      { code: "CMPSC 431W", signal: "Helpful" },
      { code: "CMPSC 221", signal: "Helpful" },
    ],
  },
];

const trackSummaries = [
  {
    lane: "Backend and fintech",
    companies: ["Capital One", "JPMorgan Chase", "Toast"],
    classes: ["CMPSC 311", "CMPSC 431W", "CMPSC 465"],
  },
  {
    lane: "Systems and infrastructure",
    companies: ["NVIDIA", "Cisco", "Datadog"],
    classes: ["CMPSC 311", "CMPSC 473", "CMPSC 461"],
  },
  {
    lane: "Security and reliability",
    companies: ["Palo Alto Networks", "Cloudflare", "Lockheed Martin"],
    classes: ["CMPSC 460", "CMPSC 311", "CMPSC 360"],
  },
] satisfies Array<{ lane: string; companies: string[]; classes: CourseCode[] }>;

function badgeVariant(signal: Posting["classes"][number]["signal"]) {
  return signal === "Core signal" ? "amber" : "default";
}

function shortenDescription(description: string) {
  const clean = description.replace(/\s+/g, " ").trim();
  if (clean.length <= 180) return clean;
  return `${clean.slice(0, 177).trimEnd()}...`;
}

function alignReason(company: string, summary: string, descriptions: string[]) {
  const material = [summary, ...descriptions].join(" ").toLowerCase();

  if (material.includes("database") || material.includes("data")) {
    return `${company} feels aligned here because the matched classes emphasize data systems, which makes the posting read like a real application/backend internship.`;
  }
  if (material.includes("security") || material.includes("vulner")) {
    return `${company} feels aligned here because the matched classes point toward secure software and defensive engineering work.`;
  }
  if (material.includes("runtime") || material.includes("systems") || material.includes("operating")) {
    return `${company} feels aligned here because the matched classes read like solid preparation for systems-heavy internship work.`;
  }
  if (material.includes("machine learning") || material.includes("ranking") || material.includes("recommend")) {
    return `${company} feels aligned here because the matched classes support experimentation, product implementation, and data-driven features.`;
  }
  return `${company} feels aligned here because the matched classes support shipping software, solving technical problems, and speaking credibly about your coursework in interviews.`;
}

let client: MongoClient | null = null;
async function db() {
  if (!MONGO_URI) {
    throw new Error("Missing MONGO_URI");
  }
  if (!client) {
    client = new MongoClient(MONGO_URI);
    await client.connect();
  }
  return client;
}

async function loadCourses(codes: CourseCode[]) {
  try {
    const mongo = await db();
    const records = (await mongo
      .db("degreeflow_courses")
      .collection("courses")
      .find(
        { course_code: { $in: codes } },
        { projection: { course_code: 1, title: 1, description: 1 } },
      )
      .toArray()) as CourseRecord[];

    const fromDb = new Map<CourseCode, { title: string; description: string }>();
    for (const record of records) {
      const code = record.course_code as CourseCode | undefined;
      if (!code) continue;
      fromDb.set(code, {
        title: record.title || fallbackCourseCatalog[code].title,
        description: record.description?.trim() || fallbackCourseCatalog[code].description,
      });
    }

    return Object.fromEntries(
      codes.map((code) => [code, fromDb.get(code) || fallbackCourseCatalog[code]]),
    ) as Record<CourseCode, { title: string; description: string }>;
  } catch {
    return fallbackCourseCatalog;
  }
}

export default async function InternshipsPage() {
  const allCodes = [...new Set(postings.flatMap((posting) => posting.classes.map((course) => course.code)))];
  const courses = await loadCourses(allCodes);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Internships</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-stone-600">
            Mock internship postings, but grounded in real course descriptions from your
            database. Each posting stays lightweight while its class alignment is anchored in
            actual catalog text.
          </p>
        </div>

        <Card variant="warning" className="grid gap-3 md:grid-cols-3">
          {trackSummaries.map((track) => (
            <div key={track.lane} className="space-y-2">
              <p className="text-sm font-semibold text-stone-900">{track.lane}</p>
              <p className="text-xs leading-relaxed text-stone-600">
                Example companies: {track.companies.join(", ")}
              </p>
              <div className="flex flex-wrap gap-1">
                {track.classes.map((course) => (
                  <Badge key={course} variant="amber">
                    {course}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </Card>
      </div>

      <div className="space-y-4">
        {postings.map((posting) => {
          const descriptions = posting.classes.map((course) => courses[course.code].description);
          const reason = alignReason(posting.company, posting.summary, descriptions);

          return (
            <Card key={`${posting.company}-${posting.title}`} className="p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-stone-900">{posting.company}</h2>
                      <Badge variant="amber">{posting.title}</Badge>
                      <Badge>{posting.team}</Badge>
                    </div>
                    <p className="text-sm text-stone-600">{posting.summary}</p>
                  </div>

                  <p className="text-sm leading-relaxed text-stone-500">{reason}</p>

                  <div className="grid gap-2 sm:grid-cols-3">
                    {posting.classes.map((course) => {
                      const details = courses[course.code];
                      return (
                        <div
                          key={course.code}
                          className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-stone-900">
                              {course.code}
                            </span>
                            <Badge variant={badgeVariant(course.signal)}>{course.signal}</Badge>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-stone-600">
                            {details.title}
                          </p>
                          <p className="mt-2 text-xs leading-relaxed text-stone-500">
                            {shortenDescription(details.description)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="w-full shrink-0 lg:w-52">
                  <Button variant="secondary" className="w-full">
                    Build internship angle
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
