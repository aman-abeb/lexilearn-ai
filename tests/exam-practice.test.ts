import assert from "node:assert/strict";
import test from "node:test";
import { createMaterial, SAMPLE_MATERIAL } from "../src/server/materials";
import { createExamPracticeProvider } from "../src/server/ai/exam-practice";
import { HttpError } from "../src/server/http";
import { notesQuestionSchema } from "../src/lib/validation";

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

test("custom notes and preferences reach the model and evidence references the supplied text", async () => {
  let requestBody: { messages: { role: string; content: string }[] } | undefined;
  const custom = createExamPracticeProvider({ apiKey: "test-key", fetch: async (_url, init) => {
    requestBody = JSON.parse(String(init?.body));
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ questions: [{ ...question, sectionId: "provided-notes" }] }) } }] });
  } });
  const result = await custom.generateFromNotes(material.sourceText, "Focus on definitions");
  assert.equal(result.questions[0].sectionId, "provided-notes");
  const payload = JSON.parse(requestBody!.messages.find(message => message.role === "user")!.content);
  assert.equal(payload.questionPreferences, "Focus on definitions");
  assert.equal(payload.sections[0].text, material.sourceText);
});

test("rejects missing or excessive notes and prompt", () => {
  assert.equal(notesQuestionSchema.safeParse({ notes: "short" }).success, false);
  assert.equal(notesQuestionSchema.safeParse({ notes: "x".repeat(100_001) }).success, false);
  assert.equal(notesQuestionSchema.safeParse({ notes: material.sourceText, prompt: "x".repeat(1001) }).success, false);
  assert.equal(notesQuestionSchema.safeParse({ notes: material.sourceText }).success, true);
});

test("a prompt for the sample needs AI instead of silently returning unrelated stock questions", async () => {
  await assert.rejects(createExamPracticeProvider({}).generate(SAMPLE_MATERIAL, "Focus on accuracy"), (error: unknown) => error instanceof HttpError && error.code === "AI_NOT_CONFIGURED");
});

test("keeps valid questions when other questions fail and tells the learner", async () => {
  const result = await provider({ questions: [question, { ...question, evidence: "An unsupported claim appears here." }], extra: true }).generate(material);
  assert.deepEqual(result.questions, [question]);
  assert.match(result.warning ?? "", /1 generated question was omitted/);
});

test("matches harmless quote and whitespace differences but returns the source wording", async () => {
  const notes = "A “model”\n  uses data to make predictions about new examples.";
  const output = { ...question, sectionId: "provided-notes", evidence: '"A "model" uses data to make predictions"' };
  const result = await provider({ questions: [output] }).generateFromNotes(notes);
  assert.equal(result.questions[0].evidence, "A “model”\n  uses data to make predictions");
});

test("retries once when no questions pass validation", async () => {
  let calls = 0;
  const custom = createExamPracticeProvider({ apiKey: "test-key", fetch: async () => {
    calls++;
    const item = calls === 1 ? { ...question, evidence: "An unsupported claim appears here." } : question;
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ questions: [item] }) } }] });
  } });
  const result = await custom.generate(material);
  assert.equal(calls, 2);
  assert.deepEqual(result.questions, [question]);
});

test("does not accept paraphrases or passages joined by ellipses", async () => {
  const fabricated = { ...question, evidence: "Photosynthesis uses light energy ... carbon dioxide and water." };
  await assert.rejects(provider({ questions: [fabricated] }).generate(material), (error: unknown) => error instanceof HttpError && error.code === "INVALID_QUESTIONS");
});
