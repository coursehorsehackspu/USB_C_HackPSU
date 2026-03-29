import type { DegreePlan } from "@/types/plan";

export const mockDegreePlan: DegreePlan = {
  semesters: [
    {
      id: "2026-spring",
      label: "Spring 2026",
      creditsTotal: 15,
      warnings: [],
      courses: [
        {
          id: "cs-201",
          code: "CS 201",
          title: "Data Structures",
          credits: 4,
          semesterId: "2026-spring",
        },
        {
          id: "math-241",
          code: "MATH 241",
          title: "Calculus III",
          credits: 4,
          semesterId: "2026-spring",
        },
        {
          id: "eng-105",
          code: "ENG 105",
          title: "Technical Writing",
          credits: 3,
          semesterId: "2026-spring",
        },
        {
          id: "phys-212",
          code: "PHYS 212",
          title: "Electricity & Magnetism",
          credits: 4,
          semesterId: "2026-spring",
        },
      ],
    },
    {
      id: "2026-fall",
      label: "Fall 2026",
      creditsTotal: 16,
      warnings: [
        {
          code: "credit_cap",
          message:
            "One credit over your typical cap — Horsey can help trim an elective.",
        },
      ],
      courses: [
        {
          id: "cs-301",
          code: "CS 301",
          title: "Algorithms",
          credits: 3,
          semesterId: "2026-fall",
        },
        {
          id: "cs-340",
          code: "CS 340",
          title: "Databases",
          credits: 3,
          semesterId: "2026-fall",
        },
        {
          id: "stat-400",
          code: "STAT 400",
          title: "Statistics",
          credits: 3,
          semesterId: "2026-fall",
        },
        {
          id: "gen-ed-1",
          code: "HIST 220",
          title: "Modern Europe",
          credits: 4,
          semesterId: "2026-fall",
        },
        {
          id: "elec-ml",
          code: "CS 447",
          title: "Intro to ML",
          credits: 3,
          semesterId: "2026-fall",
        },
      ],
    },
    {
      id: "2027-spring",
      label: "Spring 2027",
      creditsTotal: 15,
      warnings: [],
      courses: [
        {
          id: "cs-425",
          code: "CS 425",
          title: "Distributed Systems",
          credits: 3,
          semesterId: "2027-spring",
        },
        {
          id: "cs-450",
          code: "CS 450",
          title: "Software Engineering",
          credits: 3,
          semesterId: "2027-spring",
        },
        {
          id: "gen-ed-2",
          code: "PHIL 102",
          title: "Ethics",
          credits: 3,
          semesterId: "2027-spring",
        },
        {
          id: "capstone",
          code: "CS 498",
          title: "Capstone",
          credits: 6,
          semesterId: "2027-spring",
        },
      ],
    },
  ],
};
