export type PlanCourse = {
  id: string;
  code: string;
  title: string;
  credits: number;
  semesterId?: string;
};

export type SemesterPlan = {
  id: string;
  label: string;
  courses: PlanCourse[];
  creditsTotal: number;
  warnings: { code: string; message: string }[];
};

export type DegreePlan = {
  semesters: SemesterPlan[];
};
