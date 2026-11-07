import assert from "node:assert/strict";
import test from "node:test";
import { createMaterial, SAMPLE_MATERIAL } from "../src/server/materials";
import { createExamPracticeProvider } from "../src/server/ai/exam-practice";
import { HttpError } from "../src/server/http";

const material = createMaterial({ title: "Biology", course: "Science", sourceText: "Photosynthesis uses light energy to make sugars from carbon dioxide and water." });
const question = {
  question: "What does photosynthesis use to make sugars?",
  options: ["Light energy", "Sound energy", "Magnetic energy", "Nuclear energy"],
  correctIndex: 0,
  explanation: "The notes say photosynthesis uses light energy.",
  sectionId: "section-1",
  evidence: "Photosynthesis uses light energy to make sugars from carbon dioxide and water.",
};

function provider(output: unknown, finish = "stop") {
  return createExamPracticeProvider({ apiKey: "test-key", fetch: async () => Response.json({ choices: [{ finish_reason: finish, message: { content: JSON.stringify(output) } }] }) });
}

test("the original sample has meaningful questions without an AI key", async () => {
  const result = await createExamPracticeProvider({}).generate(SAMPLE_MATERIAL);
  assert.equal(result.origin, "sample");
  assert.ok(result.questions.length > 0);
  for (const item of result.questions) {
    assert.equal(item.options.length, 4);
    assert.ok(SAMPLE_MATERIAL.sections.find(section => section.id === item.sectionId)?.text.includes(item.evidence));
    assert.ok(!item.options.some(option => /^section \d/i.test(option)));
  }
});

test("custom lectures require a configured provider", async () => {
  await assert.rejects(createExamPracticeProvider({}).generate(material), (error: unknown) => error instanceof HttpError && error.code === "AI_NOT_CONFIGURED");
});

test("generated questions use real choices and grounded quotations", async () => {
  const result = await provider({ questions: [question] }).generate(material);
  assert.deepEqual(result, { origin: "ai", questions: [question] });
});

test("rejects unsupported evidence, invalid references and duplicate choices", async () => {
  for (const bad of [{ ...question, evidence: "This was not in the lecture." }, { ...question, sectionId: "missing" }, { ...question, options: ["Light", "Light", "Sound", "Heat"] }, { ...question, correctIndex: 4 }]) {
    await assert.rejects(provider({ questions: [bad] }).generate(material), (error: unknown) => error instanceof HttpError && error.code === "INVALID_QUESTIONS");
  }
});

test("rejects incomplete provider output", async () => {
  await assert.rejects(provider({ questions: [question] }, "length").generate(material), (error: unknown) => error instanceof HttpError && error.code === "INVALID_QUESTIONS");
});
