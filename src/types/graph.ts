import type { CourseStatus } from "./student";

export type CourseGraphNode = {
  id: string;
  code: string;
  title: string;
  credits: number;
  status: CourseStatus;
  skills?: string[];
  description?: string;
};

export type CourseGraphEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type CourseGraphPayload = {
  nodes: CourseGraphNode[];
  edges: CourseGraphEdge[];
};
