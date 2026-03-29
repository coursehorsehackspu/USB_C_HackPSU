import { MongoClient } from "mongodb";
import {
  InternshipsBoard,
  type InternshipCourseDetails,
  type InternshipPosting,
} from "@/components/internships-board";

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

const postings: InternshipPosting[] = [
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
    ) as InternshipCourseDetails;
  } catch {
    return fallbackCourseCatalog;
  }
}

export default async function InternshipsPage() {
  const allCodes = [...new Set(postings.flatMap((posting) => posting.classes.map((course) => course.code)))] as CourseCode[];
  const courses = await loadCourses(allCodes);

  return <InternshipsBoard postings={postings} courses={courses} trackSummaries={trackSummaries} />;
}
