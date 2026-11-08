import type { Course, Material } from "../src/lib/contracts";
import { storedWorkspaceSchema } from "../src/lib/validation";
import sampleWorkspaceFile from "./fixtures/sample-workspace.json";

const sampleWorkspace = storedWorkspaceSchema.parse(sampleWorkspaceFile);

function sampleMaterial(material: (typeof sampleWorkspace.materials)[number]): Material {
  return {
    ...material,
    courseId: material.courseId ?? "",
    lectureNumber: material.lectureNumber ?? 1,
    sources: material.sources ?? [],
    compilation: material.compilation ?? null,
  };
}

function requiredSample<T extends { id: string }>(items: T[], id: string): T {
  const found = items.find(item => item.id === id);
  if (!found) throw new Error(`Missing sample fixture ${id}`);
  return found;
}

/** Lecture text used by tests. The running app does not load this catalog. */
export const SAMPLE_COURSE: Course = requiredSample(sampleWorkspace.courses, "course-sample-computer-science");
export const SAMPLE_MATERIAL: Material = requiredSample(sampleWorkspace.materials.map(sampleMaterial), "sample-machine-learning");
