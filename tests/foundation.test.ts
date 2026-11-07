import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createMaterialSchema } from "../src/lib/validation";
import { createAdaptationProvider } from "../src/server/ai/provider";
import { HttpError, readJson } from "../src/server/http";
import { createMaterial, SAMPLE_MATERIAL } from "../src/server/materials";
import { MaterialStore } from "../src/server/store";

const input = {
  title: "Learning notes",
  course: "Computer science",
  sourceText: "  A condition must remain part of this definition.\r\n\r\nThe original equation is x = y + 2.  ",
};

test("import keeps the exact source and gives each paragraph an inspectable reference", () => {
  const material = createMaterial(createMaterialSchema.parse(input));
  assert.equal(material.sourceText, input.sourceText);
  assert.equal(material.sections.length, 2);
  assert.equal(material.sections[1].text, "The original equation is x = y + 2.");
  assert.match(material.sections[1].sourceLabel, /paragraph 2/);
  assert.equal(material.isSample, false);
});

test("material validation rejects blank and oversized sources and unknown fields", () => {
  for (const sourceText of [" ".repeat(40), "too short", "x".repeat(50_001)]) {
    assert.equal(createMaterialSchema.safeParse({ ...input, sourceText }).success, false);
  }
  assert.equal(createMaterialSchema.safeParse({ ...input, title: " " }).success, false);
  assert.equal(createMaterialSchema.safeParse({ ...input, filename: "unexpected" }).success, false);
});

test("JSON endpoint boundary rejects malformed, oversized, and cross-origin writes", async () => {
  const request = (body: string, headers: Record<string, string> = {}) => new Request("http://localhost:3000/api/materials", {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body,
  });
  await assert.rejects(readJson(request("{"), createMaterialSchema), (error: unknown) =>
    error instanceof HttpError && error.status === 400 && error.code === "INVALID_JSON");
  await assert.rejects(readJson(request(JSON.stringify(input), { Origin: "https://unrelated.example" }), createMaterialSchema),
    (error: unknown) => error instanceof HttpError && error.status === 403);
  await assert.rejects(readJson(request("x".repeat(256_001)), createMaterialSchema),
    (error: unknown) => error instanceof HttpError && error.status === 413);
  assert.deepEqual(await readJson(request(JSON.stringify(input)), createMaterialSchema), input);
});

test("local store persists simultaneous imports and reloads them from disk", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lexilearn-test-"));
  try {
    const path = join(directory, "materials.json");
    const store = new MaterialStore(path);
    const materials = Array.from({ length: 6 }, (_, index) => createMaterial({ ...input, title: `Notes ${index}` }));
    await Promise.all(materials.map((material) => store.add(material)));
    const restored = await new MaterialStore(path).list();
    assert.equal(restored.length, 7);
    for (const material of materials) {
      assert.equal(restored.find(({ id }) => id === material.id)?.sourceText, input.sourceText);
    }
    assert.equal(await store.find("not-present"), undefined);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("same-origin imports use the browser's host after Next.js normalizes loopback URLs", async () => {
  const request = (origin: string) => new Request("http://localhost:3107/api/materials", {
    method: "POST",
    headers: { "Content-Type": "application/json", Host: "127.0.0.1:3107", Origin: origin },
    body: JSON.stringify(input),
  });
  assert.deepEqual(await readJson(request("http://127.0.0.1:3107"), createMaterialSchema), input);
  for (const origin of ["https://unrelated.example", "http://127.0.0.1:3108", "http://localhost:3107", "null"]) {
    await assert.rejects(readJson(request(origin), createMaterialSchema),
      (error: unknown) => error instanceof HttpError && error.status === 403);
  }
});

test("a corrupted store is surfaced instead of overwritten", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lexilearn-test-"));
  try {
    const path = join(directory, "materials.json");
    await writeFile(path, "corrupted", "utf8");
    const store = new MaterialStore(path);
    await assert.rejects(store.add(createMaterial(input)));
    assert.equal(await readFile(path, "utf8"), "corrupted");
    await assert.rejects(store.list());
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("unconfigured AI returns an explicit boundary rather than fabricated output", async () => {
  const provider = createAdaptationProvider({});
  assert.equal(provider.configured, false);
  await assert.rejects(provider.adapt({
    material: SAMPLE_MATERIAL, section: SAMPLE_MATERIAL.sections[0], mode: "steps",
  }), (error: unknown) => error instanceof HttpError && error.status === 501 && error.code === "AI_NOT_CONFIGURED");
});
