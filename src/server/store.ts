import { mkdir, readFile, rename, writeFile, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { ClientSession, Collection } from "mongodb";
import type { CompiledNotes, Course, CourseSummary, CreateCourseInput, CreateLectureInput, LectureSourceInput, Material } from "../lib/contracts";
import { sourceListSchema, storedMaterialsSchema, storedWorkspaceSchema } from "../lib/validation";
import { getDb } from "./db";
import { courseIdForName, createLecture, createSource, withSources } from "./materials";
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

type WorkspacePersistence = {
  read: () => Promise<Workspace>;
  write: (workspace: Workspace) => Promise<void>;
};

function workspaceFromUnknown(data: unknown): Workspace {
  if (Array.isArray(data)) return restoreWorkspace(storedMaterialsSchema.parse(data));
  const stored = storedWorkspaceSchema.parse(data);
  return restoreWorkspace(stored.materials, stored.courses);
}

function filePersistence(filePath: string): WorkspacePersistence {
  return {
    async read() {
      try {
        return workspaceFromUnknown(JSON.parse(await readFile(filePath, "utf8")));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 2, courses: [], materials: [] };
        throw error;
      }
    },
    async write(workspace) {
      await mkdir(dirname(filePath), { recursive: true });
      const temporaryFile = `${filePath}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporaryFile, JSON.stringify(workspace, null, 2), "utf8");
        await rename(temporaryFile, filePath);
      } finally {
        await unlink(temporaryFile).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
      }
    },
  };
}

type CourseDocument = Course & { _id: string };
type MaterialDocument = Material & { _id: string };
type MetaDocument = { _id: "workspace"; ready: boolean };
const WORKSPACE_META_ID = "workspace" as const;

function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function withoutMongoId<T extends { _id?: unknown }>(document: T): Omit<T, "_id"> {
  const { _id, ...rest } = document;
  return rest;
}

let workspaceIndexes: Promise<void> | null = null;

async function workspaceCollections() {
  const db = await getDb();
  const courses = db.collection<CourseDocument>("courses");
  const materials = db.collection<MaterialDocument>("materials");
  const meta = db.collection<MetaDocument>("workspace_meta");
  if (!workspaceIndexes) {
    workspaceIndexes = Promise.all([
      courses.createIndex({ id: 1 }, { unique: true }),
      materials.createIndex({ id: 1 }, { unique: true }),
      materials.createIndex({ courseId: 1 }),
    ]).then(() => undefined).catch((error: unknown) => {
      workspaceIndexes = null;
      throw error;
    });
  }
  await workspaceIndexes;
  return { db, courses, materials, meta };
}

async function readLegacyFile(): Promise<Workspace | null> {
  try {
    return workspaceFromUnknown(JSON.parse(await readFile(resolve(process.env.LEXILEARN_DATA_DIR ?? ".data", "materials.json"), "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function transactionsUnsupported(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return /replica set|Transaction numbers are only allowed/i.test(message);
}

async function replaceWorkspace(courses: Collection<CourseDocument>, materials: Collection<MaterialDocument>, meta: Collection<MetaDocument>, workspace: Workspace, session?: ClientSession) {
  const options = session ? { session } : {};
  const saved = plain(workspace);
  await courses.deleteMany({}, options);
  await materials.deleteMany({}, options);
  if (saved.courses.length) await courses.insertMany(saved.courses.map(course => ({ ...course, _id: course.id })), options);
  if (saved.materials.length) await materials.insertMany(saved.materials.map(material => ({ ...material, _id: material.id })), options);
  await meta.updateOne({ _id: WORKSPACE_META_ID }, { $set: { ready: true } }, { upsert: true, ...options });
}

async function saveWorkspace(workspace: Workspace) {
  const { db, courses, materials, meta } = await workspaceCollections();
  const session = db.client.startSession();
  try {
    try {
      await session.withTransaction(async () => replaceWorkspace(courses, materials, meta, workspace, session));
    } catch (error) {
      if (!transactionsUnsupported(error)) throw error;
      await replaceWorkspace(courses, materials, meta, workspace);
    }
  } finally {
    await session.endSession();
  }
}

async function loadWorkspace(): Promise<Workspace> {
  const { courses, materials } = await workspaceCollections();
  const [courseDocs, materialDocs] = await Promise.all([
    courses.find().sort({ createdAt: 1, id: 1 }).toArray(),
    materials.find().toArray(),
  ]);
  try {
    return workspaceFromUnknown({ version: 2, courses: courseDocs.map(withoutMongoId), materials: materialDocs.map(withoutMongoId) });
  } catch {
    throw new HttpError(500, "WORKSPACE_INVALID", "Saved courses could not be read. The database was left unchanged.");
  }
}

let legacyImport: Promise<void> | null = null;

async function importLegacyWorkspace(): Promise<void> {
  const { courses, materials, meta } = await workspaceCollections();
  const marker = await meta.findOne({ _id: WORKSPACE_META_ID });
  if (marker?.ready) return;
  if (await courses.countDocuments() || await materials.countDocuments()) {
    await meta.updateOne({ _id: WORKSPACE_META_ID }, { $set: { ready: true } }, { upsert: true });
    return;
  }
  const legacy = await readLegacyFile();
  if (legacy && (legacy.courses.length || legacy.materials.length)) await saveWorkspace(legacy);
  else await meta.updateOne({ _id: WORKSPACE_META_ID }, { $set: { ready: true } }, { upsert: true });
}

function ensureLegacyImport(): Promise<void> {
  legacyImport ??= importLegacyWorkspace().catch((error: unknown) => {
    legacyImport = null;
    throw error;
  });
  return legacyImport;
}

async function withWorkspaceDatabase<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof HttpError && error.code === "MONGODB_NOT_CONFIGURED") {
      throw new HttpError(503, "MONGODB_NOT_CONFIGURED", "Add MONGODB_URI to save courses and lectures.");
    }
    if (error instanceof HttpError && error.code === "DATABASE_UNAVAILABLE") {
      throw new HttpError(503, "DATABASE_UNAVAILABLE", "The database is unavailable. Courses and lectures could not be saved.");
    }
    if (error instanceof HttpError && error.code === "WORKSPACE_INVALID") throw error;
    console.error("LexiLearn database failed:", error instanceof Error ? error.name : "UnknownError");
    throw new HttpError(503, "DATABASE_UNAVAILABLE", "The database is unavailable. Courses and lectures could not be saved.");
  }
}

function mongoPersistence(): WorkspacePersistence {
  return {
    read: () => withWorkspaceDatabase(async () => {
      await ensureLegacyImport();
      return loadWorkspace();
    }),
    write: workspace => withWorkspaceDatabase(async () => {
      await ensureLegacyImport();
      await saveWorkspace(workspace);
    }),
  };
}

/** Courses and lectures stay consistent across a serialized read-modify-write. */
export class MaterialStore {
  private writes: Promise<unknown> = Promise.resolve();
  private readonly persistence: WorkspacePersistence;
  constructor(filePath: string | WorkspacePersistence) {
    this.persistence = typeof filePath === "string" ? filePersistence(filePath) : filePath;
  }

  private readWorkspace(): Promise<Workspace> {
    return this.persistence.read();
  }

  private requireCourse(workspace: Workspace, courseId: string): Course {
    const course = workspace.courses.find(item => item.id === courseId);
    if (!course) throw new HttpError(404, "COURSE_NOT_FOUND", "Choose a saved course before adding this lecture.");
    return course;
  }

  private requireMaterial(workspace: Workspace, id: string): Material {
    const material = workspace.materials.find(item => item.id === id);
    if (!material) throw new HttpError(404, "MATERIAL_NOT_FOUND", "This lecture could not be found.");
    return material;
  }

  private mutate<T>(update: (workspace: Workspace) => T): Promise<T> {
    const write = this.writes.then(async () => {
      const workspace = await this.readWorkspace();
      const result = update(workspace);
      await this.persistence.write(workspace);
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
      const course = this.requireCourse(workspace, input.courseId);
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
      const normalized = material.course.trim().toLowerCase();
      let course = workspace.courses.find(item => item.name.trim().toLowerCase() === normalized);
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
      const material = this.requireMaterial(workspace, id);
      const index = workspace.materials.findIndex(item => item.id === material.id);
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
      const material = this.requireMaterial(workspace, id);
      // A new source may have arrived during the model request; retain it and
      // let the UI show that the saved compilation needs refreshing.
      material.compilation = compilation;
      return material;
    });
  }

  updateSource(id: string, sourceId: string, input: LectureSourceInput): Promise<Material> {
    return this.mutate(workspace => {
      const material = this.requireMaterial(workspace, id);
      const index = workspace.materials.findIndex(item => item.id === material.id);
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
export const materialStore = globalStore.lexilearnStore ??= new MaterialStore(mongoPersistence());
