"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, Input } from "@/components/ui";

export type InternshipCourse = {
  code: string;
  signal: "Core signal" | "Helpful";
};

export type InternshipPosting = {
  company: string;
  title: string;
  team: string;
  summary: string;
  classes: InternshipCourse[];
};

export type InternshipCourseDetails = Record<
  string,
  {
    title: string;
    description: string;
  }
>;

type TrackSummary = {
  lane: string;
  companies: string[];
  classes: string[];
};

type Props = {
  postings: InternshipPosting[];
  courses: InternshipCourseDetails;
  trackSummaries: TrackSummary[];
};

function badgeVariant(signal: InternshipCourse["signal"]) {
  return signal === "Core signal" ? "amber" : "default";
}

function shortenDescription(description: string) {
  const clean = description.replace(/\s+/g, " ").trim();
  if (clean.length <= 180) return { preview: clean, truncated: false };
  return { preview: `${clean.slice(0, 177).trimEnd()}...`, truncated: true };
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

function buildResumeBullets(posting: InternshipPosting, courses: InternshipCourseDetails) {
  const matchedCourses = posting.classes.map((course) => ({
    ...course,
    details: courses[course.code],
  }));

  const focusTerms = matchedCourses.flatMap(({ details }) =>
    details.description
      .split(/[.;,]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2),
  );

  return [
    `Built coursework-backed experience for ${posting.team.toLowerCase()} by connecting ${matchedCourses
      .map((course) => course.code)
      .join(", ")} to ${posting.summary.toLowerCase()}`,
    `Strengthened ${matchedCourses
      .map((course) => course.details.title.toLowerCase())
      .join(", ")} with emphasis on ${focusTerms.slice(0, 3).join(", ").toLowerCase()}.`,
    `Prepared to speak about ${posting.company} internship work using class projects tied to ${matchedCourses
      .map((course) => course.signal === "Core signal" ? course.code : null)
      .filter(Boolean)
      .join(" and ")}.`,
  ];
}

export function InternshipsBoard({ postings, courses, trackSummaries }: Props) {
  const [activePosting, setActivePosting] = useState<InternshipPosting | null>(null);
  const [activeDescriptionCode, setActiveDescriptionCode] = useState<string | null>(null);
  const [companyQuery, setCompanyQuery] = useState("");

  const activeDescription = activeDescriptionCode ? courses[activeDescriptionCode] : null;
  const resumeBullets = useMemo(
    () => (activePosting ? buildResumeBullets(activePosting, courses) : []),
    [activePosting, courses],
  );
  const normalizedQuery = companyQuery.trim().toLowerCase();
  const filteredPostings = useMemo(() => {
    if (!normalizedQuery) return postings;

    return postings.filter((posting) => {
      const searchable = [
        posting.company,
        posting.title,
        posting.team,
        posting.summary,
        ...posting.classes.map((course) => course.code),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [normalizedQuery, postings]);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Internships</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-stone-600">
            Explore internship roles through the lens of your coursework. Each posting connects
            real course descriptions from the catalog to the kinds of skills and experience
            companies want to see.
          </p>
        </div>

        <Card className="p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <Input
              id="company-search"
              label="Search companies or roles"
              placeholder="Try Capital One, NVIDIA, security, or backend"
              value={companyQuery}
              onChange={(e) => setCompanyQuery(e.target.value)}
              hint="Filters internship postings using the same coursework-to-role matching logic."
            />
            {companyQuery ? (
              <Button variant="ghost" onClick={() => setCompanyQuery("")}>
                Clear search
              </Button>
            ) : null}
          </div>
        </Card>

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
        {filteredPostings.length === 0 ? (
          <Card className="p-5">
            <p className="text-sm font-medium text-stone-900">
              No internship matches for “{companyQuery}”.
            </p>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">
              Try another company name, a role keyword like `security` or `systems`, or a course
              code such as `CMPSC 311`.
            </p>
          </Card>
        ) : null}

        {filteredPostings.map((posting) => {
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
                      const { preview, truncated } = shortenDescription(details.description);

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
                            {preview}
                          </p>
                          {truncated ? (
                            <button
                              type="button"
                              className="mt-2 text-xs font-medium text-amber-800 underline underline-offset-2"
                              onClick={() => setActiveDescriptionCode(course.code)}
                            >
                              Full description
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="w-full shrink-0 lg:w-56">
                  <Button variant="secondary" className="w-full" onClick={() => setActivePosting(posting)}>
                    Resume bullets
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {activePosting ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/25 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-2xl rounded-2xl border border-stone-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-stone-900">
                  Resume bullets for {activePosting.company}
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  {activePosting.title} · {activePosting.team}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                onClick={() => setActivePosting(null)}
              >
                Close
              </button>
            </div>
            <div className="space-y-3 px-5 py-4">
              {resumeBullets.map((bullet) => (
                <div
                  key={bullet}
                  className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-relaxed text-stone-700"
                >
                  • {bullet}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {activeDescription && activeDescriptionCode ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/25 p-4 backdrop-blur-[2px]">
          <div className="relative max-h-[min(80vh,640px)] w-full max-w-2xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-stone-900">
                  {activeDescriptionCode} full description
                </h3>
                <p className="mt-1 text-sm text-stone-500">{activeDescription.title}</p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                onClick={() => setActiveDescriptionCode(null)}
              >
                Close
              </button>
            </div>
            <div className="max-h-[calc(min(80vh,640px)-88px)] overflow-y-auto px-5 py-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-stone-700">
                {activeDescription.description}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
