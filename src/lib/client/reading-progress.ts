import { z } from "zod";
import type { Material } from "../contracts";

export const glossaryEntrySchema = z.object({
  id: z.string().min(1).max(100),
  term: z.string().trim().min(1).max(80),
  meaning: z.string().trim().min(1).max(500),
  sectionId: z.string().min(1).max(100),
  sourceIds: z.array(z.string().max(100)).max(12).optional(),
  sectionTitle: z.string().max(300).optional(),
});

const sectionIdsSchema = z.array(z.string().max(100)).catch([]);
const progressSchema = z.object({
  lastSectionId: z.string().max(100).nullable().catch(null),
  completedSectionIds: sectionIdsSchema,
  reviewSectionIds: sectionIdsSchema,
  glossary: z.array(z.unknown()).catch([]).transform(entries => entries.flatMap(entry => {
    const result = glossaryEntrySchema.safeParse(entry);
    return result.success ? [result.data] : [];
  }).slice(0, 100)),
});

export type GlossaryEntry = z.infer<typeof glossaryEntrySchema>;
export type ReadingProgress = z.infer<typeof progressSchema>;
export type ReadingProgressStore = Record<string, ReadingProgress>;

export function parseProgressStore(value: unknown): ReadingProgressStore {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([id, entry]) => {
    const result = progressSchema.safeParse(entry);
    return result.success ? [[id, result.data]] : [];
  }));
}

/** Reject unbounded account payloads. Invalid entries inside the limit are dropped. */
export function acceptProgressStore(value: unknown): ReadingProgressStore {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Reading progress must be an object.");
  }
  const entries = Object.entries(value);
  if (entries.length > 100) throw new TypeError("Reading progress is limited to 100 lectures.");
  if (entries.some(([id]) => id.length < 1 || id.length > 100)) {
    throw new TypeError("A lecture id in reading progress is too long.");
  }
  return parseProgressStore(value);
}

/** Drop stale references so stored progress can never open a missing section. */
export function getMaterialProgress(material: Material, saved?: ReadingProgress): ReadingProgress {
  const progress = saved ?? progressSchema.parse({});
  const sectionIds = new Set(material.sections.map(section => section.id));
  const sourceIds = new Set(material.sources.map(source => source.id));
  const validIds = (ids: string[]) => [...new Set(ids)].filter(id => sectionIds.has(id));
  return {
    lastSectionId: progress.lastSectionId && sectionIds.has(progress.lastSectionId) ? progress.lastSectionId : null,
    completedSectionIds: validIds(progress.completedSectionIds),
    reviewSectionIds: validIds(progress.reviewSectionIds),
    glossary: progress.glossary.filter(entry => sectionIds.has(entry.sectionId) || entry.sourceIds?.some(id => sourceIds.has(id))),
  };
}

export function toggleSection(ids: string[], sectionId: string): string[] {
  return ids.includes(sectionId) ? ids.filter(id => id !== sectionId) : [...ids, sectionId];
}
