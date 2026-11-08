import assert from "node:assert/strict";
import test from "node:test";
import { getMaterialProgress, parseProgressStore } from "../src/lib/client/reading-progress";
import { splitSentences } from "../src/lib/client/sentences";
import { SAMPLE_MATERIAL } from "./sample";

test("sentence presentation keeps every character, including equations, decimals, and whitespace", () => {
  const source = "  A score of 0.95 is not always enough.\r\nThe equation is x = y + 2.\n\nAsk: ‘Does this hold for every case?’  Keep the exception.  ";
  const sentences = splitSentences(source);
  assert.ok(sentences.length > 1);
  assert.equal(sentences.join(""), source);
  assert.ok(sentences.some(sentence => sentence.includes("0.95")));
  assert.ok(sentences.some(sentence => sentence.includes("x = y + 2")));
  assert.deepEqual(splitSentences(""), []);
  assert.deepEqual(splitSentences("A heading without punctuation"), ["A heading without punctuation"]);
});

test("restoring browser progress keeps valid notes and recovers from malformed fields", () => {
  const store = parseProgressStore({
    [SAMPLE_MATERIAL.id]: {
      lastSectionId: "section-2",
      completedSectionIds: "not-an-array",
      reviewSectionIds: ["section-3"],
      glossary: [
        { id: "term-1", term: "  label  ", meaning: "A known answer.", sectionId: "section-2" },
        { id: "term-2", term: " ", meaning: "Empty term", sectionId: "section-2" },
        { id: "term-3", term: "model", meaning: "x".repeat(501), sectionId: "section-1" },
        null,
      ],
    },
    broken: null,
  });
  const restored = getMaterialProgress(SAMPLE_MATERIAL, store[SAMPLE_MATERIAL.id]);
  assert.equal(restored.lastSectionId, "section-2");
  assert.deepEqual(restored.completedSectionIds, []);
  assert.deepEqual(restored.reviewSectionIds, ["section-3"]);
  assert.deepEqual(restored.glossary, [{ id: "term-1", term: "label", meaning: "A known answer.", sectionId: "section-2" }]);
  assert.equal(store.broken, undefined);
});

test("removed or repeated section references cannot inflate progress or leave broken glossary links", () => {
  const restored = getMaterialProgress(SAMPLE_MATERIAL, {
    lastSectionId: "section-removed",
    completedSectionIds: ["section-1", "section-1", "section-removed"],
    reviewSectionIds: ["section-removed", "section-2", "section-2"],
    glossary: [{ id: "old-term", term: "old", meaning: "An earlier note", sectionId: "section-removed" }],
  });
  assert.equal(restored.lastSectionId, null);
  assert.deepEqual(restored.completedSectionIds, ["section-1"]);
  assert.deepEqual(restored.reviewSectionIds, ["section-2"]);
  assert.deepEqual(restored.glossary, []);
});

test("missing or corrupt browser data starts with no completed reading", () => {
  for (const value of [null, [], "invalid", 42]) assert.deepEqual(parseProgressStore(value), {});
  const restored = getMaterialProgress(SAMPLE_MATERIAL);
  assert.equal(restored.lastSectionId, null);
  assert.deepEqual(restored.completedSectionIds, []);
  assert.deepEqual(restored.reviewSectionIds, []);
  assert.deepEqual(restored.glossary, []);
});
