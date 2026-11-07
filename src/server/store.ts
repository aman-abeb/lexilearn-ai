import { mkdir, readFile, rename, writeFile, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { CompiledNotes, Course, CourseSummary, CreateCourseInput, CreateLectureInput, LectureSourceInput, Material } from "../lib/contracts";
import { sourceListSchema, storedMaterialsSchema, storedWorkspaceSchema } from "../lib/validation";
import { courseIdForName, createLecture, createSource, SAMPLE_COURSE, SAMPLE_MATERIAL, withSources } from "./materials";
import { HttpError } from "./http";

type Workspace = { version: 2; courses: Course[]; materials: Material[] };
type StoredMaterial = ReturnType<typeof storedMaterialsSchema.parse>[number];

/** Upgrade legacy notes in memory, preserving IDs, original text, and reading progress. */
function restoreWorkspace(materials: StoredMaterial[], courses: Course[] = []): Workspace {
  const restoredCourses = [...courses];
  const numbers = new Map<string, number>();
  const restored = [...materials].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(material => {
    const courseId = material.courseId ?? courseIdForName(material.course);
    if (!restoredCourses.some(course => course.id === courseId)) {
      restoredCourses.push({ id: courseId, name: material.course, code: "", term: "", createdAt: material.createdAt, isSample: material.isSample });
    }
    const lectureNumber = material.lectureNumber ?? (numbers.get(courseId) ?? 0) + 1;
    numbers.set(courseId, Math.max(numbers.get(courseId) ?? 0, lectureNumber));
    const sources = material.sources ?? [{ id: `${material.id}-original`, kind: "notes" as const, name: material.sourceName, text: material.sourceText, addedAt: material.createdAt }];
    const sourceIds = new Set(sources.map(source => source.id));
    return {
      ...material, courseId, lectureNumber, sources, compilation: material.compilation ?? null,
      sections: material.sections.map(section => {
        const references = section.sourceIds?.filter(id => sourceIds.has(id));
        return { ...section, sourceIds: references?.length ? references : [sources[0].id] };
      }),
    } satisfies Material;
  });
  return { version: 2, courses: restoredCourses, materials: restored.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
}

/** One atomic workspace file keeps course creation and lecture numbering consistent. */
export class MaterialStore {
  private writes: Promise<unknown> = Promise.resolve();
  constructor(private readonly filePath: string) {}

  private async readWorkspace(): Promise<Workspace> {
    try {
      const data: unknown = JSON.parse(await readFile(this.filePath, "utf8"));
      if (Array.isArray(data)) return restoreWorkspace(storedMaterialsSchema.parse(data));
      const stored = storedWorkspaceSchema.parse(data);
      return restoreWorkspace(stored.materials, stored.courses);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { version: 2, courses: [structuredClone(SAMPLE_COURSE)], materials: [structuredClone(SAMPLE_MATERIAL)] };
      }
      throw error;
    }
  }

  private mutate<T>(update: (workspace: Workspace) => T): Promise<T> {
    const write = this.writes.then(async () => {
      const workspace = await this.readWorkspace();
      const result = update(workspace);
      await mkdir(dirname(this.filePath), { recursive: true });
      const temporaryFile = `${this.filePath}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporaryFile, JSON.stringify(workspace, null, 2), "utf8");
        await rename(temporaryFile, this.filePath);
      } finally {
        await unlink(temporaryFile).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
      }
      return result;
    });
    this.writes = write.catch(() => undefined);
    return write;
  }

  async list(): Promise<Material[]> { await this.writes; return (await this.readWorkspace()).materials; }
  async find(id: string): Promise<Material | undefined> { return (await this.list()).find(material => material.id === id); }

  async listCourses(): Promise<CourseSummary[]> {
    await this.writes;
    const workspace = await this.readWorkspace();
    return workspace.courses.map(course => this.summarize(course, workspace));
  }

  private summarize(course: Course, workspace: Workspace): CourseSummary {
    const lectures = workspace.materials.filter(material => material.courseId === course.id);
    return { ...course, lectureCount: lectures.length, nextLectureNumber: Math.max(0, ...lectures.map(lecture => lecture.lectureNumber)) + 1 };
  }

  createCourse(input: CreateCourseInput): Promise<CourseSummary> {
    return this.mutate(workspace => {
      const normalized = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
      if (workspace.courses.some(course => normalized(course.name) === normalized(input.name) || (input.code && course.code && normalized(course.code) === normalized(input.code)))) {
        throw new HttpError(409, "COURSE_EXISTS", "This course is already saved. Choose it from your courses.");
      }
      if (workspace.courses.length >= 100) throw new HttpError(409, "COURSE_LIMIT", "This workspace can hold up to 100 courses.");
      const course: Course = { id: randomUUID(), name: input.name, code: input.code ?? "", term: input.term ?? "", createdAt: new Date().toISOString(), isSample: false };
      workspace.courses.push(course);
      return this.summarize(course, workspace);
    });
  }

  createLecture(input: CreateLectureInput): Promise<Material> {
    return this.mutate(workspace => {
      const course = workspace.courses.find(course => course.id === input.courseId);
      if (!course) throw new HttpError(404, "COURSE_NOT_FOUND", "Choose a saved course before adding this lecture.");
      this.checkMaterialLimit(workspace);
      const material = createLecture(input, course, this.summarize(course, workspace).nextLectureNumber);
      workspace.materials.unshift(material);
      return material;
    });
  }

  /** Compatibility with the original pasted-text endpoint. */
  add(material: Material): Promise<Material> {
    return this.mutate(workspace => {
      this.checkMaterialLimit(workspace);
      let course = workspace.courses.find(course => course.name.trim().toLowerCase() === material.course.trim().toLowerCase());
      if (!course) {
        if (workspace.courses.length >= 100) throw new HttpError(409, "COURSE_LIMIT", "This workspace can hold up to 100 courses.");
        course = { id: courseIdForName(material.course), name: material.course, code: "", term: "", createdAt: material.createdAt, isSample: material.isSample };
        workspace.courses.push(course);
      }
      const numbered = { ...material, courseId: course.id, lectureNumber: this.summarize(course, workspace).nextLectureNumber };
      workspace.materials.unshift(numbered);
      return numbered;
    });
  }

  addSources(id: string, inputs: LectureSourceInput[]): Promise<Material> {
    return this.mutate(workspace => {
      const index = workspace.materials.findIndex(material => material.id === id);
      if (index < 0) throw new HttpError(404, "MATERIAL_NOT_FOUND", "This lecture could not be found.");
      const material = workspace.materials[index];
      const result = sourceListSchema.safeParse([...material.sources, ...inputs].map(({ kind, name, text, url, warnings, transcript }) => ({ kind, name, text, warnings, transcript, ...(url ? { url } : {}) })));
      if (!result.success) throw new HttpError(400, "SOURCE_LIMIT", result.error.issues[0].message);
      const updated = withSources(material, [...material.sources, ...inputs.map(createSource)]);
      // Keep IDs from older imports stable when appending a source.
      updated.sections = [...material.sections, ...updated.sections.filter(section => !material.sources.some(source => section.sourceIds?.includes(source.id)))];
      workspace.materials[index] = updated;
      return updated;
    });
  }

  saveCompilation(id: string, compilation: CompiledNotes): Promise<Material> {
    return this.mutate(workspace => {
      const material = workspace.materials.find(material => material.id === id);
      if (!material) throw new HttpError(404, "MATERIAL_NOT_FOUND", "This lecture could not be found.");
      // A new source may have arrived during the model request; retain it and
      // let the UI show that the saved compilation needs refreshing.
      material.compilation = compilation;
      return material;
    });
  }

  updateSource(id: string, sourceId: string, input: LectureSourceInput): Promise<Material> {
    return this.mutate(workspace => {
      const index = workspace.materials.findIndex(material => material.id === id);
      if (index < 0) throw new HttpError(404, "MATERIAL_NOT_FOUND", "This lecture could not be found.");
      const material = workspace.materials[index];
      const previous = material.sources.find(source => source.id === sourceId);
      if (!previous) throw new HttpError(404, "SOURCE_NOT_FOUND", "This lecture source could not be found.");
      const updatedAt = new Date(Math.max(Date.now(), Date.parse(previous.updatedAt ?? previous.addedAt) + 1)).toISOString();
      const sources = material.sources.map(source => source.id === sourceId ? { ...input, id: source.id, addedAt: source.addedAt, updatedAt } : source);
      const result = sourceListSchema.safeParse(sources.map(({ kind, name, text, url, warnings, transcript }) => ({ kind, name, text, url, warnings, transcript })));
      if (!result.success) throw new HttpError(400, "SOURCE_LIMIT", result.error.issues[0].message);
      const updated = withSources(material, sources);
      updated.sections = sources.flatMap(source => source.id === sourceId ? updated.sections.filter(section => section.sourceIds?.includes(source.id)) : material.sections.filter(section => section.sourceIds?.includes(source.id)));
      workspace.materials[index] = updated;
      return updated;
    });
  }

  private checkMaterialLimit(workspace: Workspace) {
    if (workspace.materials.length >= 100) throw new Error("MATERIAL_LIMIT_REACHED");
  }
}

const globalStore = globalThis as typeof globalThis & { lexilearnStore?: MaterialStore };
export const materialStore = globalStore.lexilearnStore ??= new MaterialStore(resolve(process.env.LEXILEARN_DATA_DIR ?? ".data", "materials.json"));
