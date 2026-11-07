import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { zipSync, strToU8 } from "fflate";
import { sourceInputSchema } from "../src/lib/validation";
import { compilationIsCurrent, looksLikeSlideText, readingMaterial, recordingLinkHelp } from "../src/lib/lecture";
import { getMaterialProgress } from "../src/lib/client/reading-progress";
import { createCompilationProvider } from "../src/server/ai/compilation";
import { HttpError } from "../src/server/http";
import { captionText, extractFile, extractSlides } from "../src/server/ingestion/extract";
import { createLecture, SAMPLE_COURSE, SAMPLE_MATERIAL } from "../src/server/materials";
import { MaterialStore } from "../src/server/store";

const lectureInput = { title: "Learning and memory", sources: [{ kind: "notes" as const, name: "My notes", text: "Memory is the process of encoding, storing, and retrieving information." }] };

test("saved courses survive reload and concurrent lectures receive consecutive course-local numbers", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lexilearn-courses-"));
  try {
    const path = join(directory, "materials.json");
    const store = new MaterialStore(path);
    const psychology = await store.createCourse({ name: "Psychology", code: "PSY 101", term: "Autumn" });
    const biology = await store.createCourse({ name: "Biology", code: "BIO 101" });
    const lectures = await Promise.all(Array.from({ length: 5 }, () => store.createLecture({ ...lectureInput, courseId: psychology.id })));
    assert.deepEqual(lectures.map(lecture => lecture.lectureNumber), [1, 2, 3, 4, 5]);
    const other = await store.createLecture({ ...lectureInput, courseId: biology.id });
    assert.equal(other.lectureNumber, 1);
    const courses = await new MaterialStore(path).listCourses();
    assert.equal(courses.find(course => course.id === psychology.id)?.nextLectureNumber, 6);
    assert.equal(courses.find(course => course.id === psychology.id)?.lectureCount, 5);
    assert.equal(courses.find(course => course.id === biology.id)?.code, "BIO 101");
    await assert.rejects(store.createCourse({ name: " psychology ", code: "NEW" }), (error: unknown) => error instanceof HttpError && error.status === 409);
    await assert.rejects(store.createLecture({ ...lectureInput, courseId: "missing" }), (error: unknown) => error instanceof HttpError && error.status === 404);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("example courses are read from the JSON catalog and stay out of the workspace file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lexilearn-examples-"));
  try {
    const path = join(directory, "materials.json");
    const store = new MaterialStore(path);
    const courses = await store.listCourses();
    assert.deepEqual(courses.map(course => course.code), ["CS 101", "PSY 210", "WRIT 150"]);
    assert.equal(courses.find(course => course.id === SAMPLE_COURSE.id)?.lectureCount, 3);
    const lectures = await store.list();
    assert.equal(lectures.find(lecture => lecture.id === SAMPLE_MATERIAL.id)?.sections[0].id, "section-1");
    assert.equal(lectures.some(lecture => lecture.compilation), true);
    assert.equal(lectures.some(lecture => lecture.sources.some(source => source.kind === "recording")), true);
    await assert.rejects(readFile(path, "utf8"));
    await store.createLecture({ ...lectureInput, courseId: SAMPLE_COURSE.id });
    const saved = JSON.parse(await readFile(path, "utf8")) as { courses: { id: string }[]; materials: unknown[] };
    assert.equal(saved.materials.length, 1);
    assert.equal(saved.courses.length, 1);
    assert.equal(saved.courses[0].id, SAMPLE_COURSE.id);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("legacy lecture arrays gain courses without changing original text, section IDs, or files until a write", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lexilearn-migration-"));
  try {
    const path = join(directory, "materials.json");
    const { courseId, lectureNumber, sources, compilation, ...legacy } = SAMPLE_MATERIAL;
    const raw = JSON.stringify([legacy]);
    await writeFile(path, raw);
    const store = new MaterialStore(path);
    const restored = (await store.list())[0];
    assert.equal(restored.id, legacy.id);
    assert.equal(restored.sourceText, legacy.sourceText);
    assert.deepEqual(restored.sections.map(section => section.id), legacy.sections.map(section => section.id));
    assert.equal(restored.sources[0].text, legacy.sourceText);
    assert.deepEqual(restored.sections[0].sourceIds, [restored.sources[0].id]);
    assert.equal(restored.lectureNumber, 1);
    assert.equal(await readFile(path, "utf8"), raw);
    const catalog = await store.listCourses();
    await store.createLecture({ ...lectureInput, courseId: catalog[0].id });
    assert.equal((await new MaterialStore(path).listCourses())[0].nextLectureNumber, 3);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("a link-only lecture can gain a transcript without losing its number or pretending the audio was read", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lexilearn-recording-"));
  try {
    const store = new MaterialStore(join(directory, "materials.json"));
    const lecture = await store.createLecture({ title: "Recorded lecture", courseId: SAMPLE_COURSE.id, sources: [{ kind: "recording", name: "Webex recording", url: "https://university.webex.com/recording/example", text: "" }] });
    assert.equal(lecture.sections.length, 0);
    assert.equal(lecture.wordCount, 0);
    const updated = await store.updateSource(lecture.id, lecture.sources[0].id, { ...lecture.sources[0], text: lectureInput.sources[0].text });
    assert.equal(updated.lectureNumber, lecture.lectureNumber);
    assert.equal(updated.sources[0].id, lecture.sources[0].id);
    assert.equal(updated.sourceText, lectureInput.sources[0].text);
    assert.equal(updated.sections[0].sourceIds?.[0], lecture.sources[0].id);
    await assert.rejects(store.addSources(lecture.id, Array.from({ length: 12 }, () => lectureInput.sources[0])), (error: unknown) => error instanceof HttpError && error.status === 400);
    assert.equal((await store.find(lecture.id))?.sources.length, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("recording source validation accepts references and transcripts but rejects unsafe link schemes", () => {
  const input = { kind: "recording", name: "Recording", text: "", url: "https://university.webex.com/recording/example" };
  assert.equal(sourceInputSchema.safeParse(input).success, true);
  assert.equal(sourceInputSchema.safeParse({ ...input, url: "javascript:alert(1)" }).success, false);
  assert.equal(sourceInputSchema.safeParse({ ...input, url: "https://user:password@example.com/recording" }).success, false);
  assert.equal(sourceInputSchema.safeParse({ kind: "notes", name: "Empty", text: " " }).success, false);
});

test("a university recording reference and slide text are not described as retrieved recording speech", () => {
  assert.match(recordingLinkHelp("https://elearning.unimib.it/mod/kalvidres/view.php?id=1706861"), /requires university sign-in/);
  assert.match(recordingLinkHelp("https://elearning.unimib.it/mod/kalvidres/view.php?id=1706861"), /does not import the recording/);
  assert.equal(looksLikeSlideText("Slide 1\nIdentity, digital identity and privacy\n\nSpeaker note: 1\n\nSlide 2\nToday’s agenda"), true);
  assert.equal(looksLikeSlideText("[00:00:01.000] The lecturer now discusses Slide 1.\n\n[00:00:04.000] Slide 2 introduces digital identity."), false);
});

test("caption file imports keep clean spoken words without timing syntax", () => {
  const vtt = "WEBVTT\n\ncue-1\n00:00:01.000 --> 00:00:04.000\n<v Lecturer>Encoding is the first step.</v>\n\ncue-2\n00:00:04.000 --> 00:00:07.000\nThen information is stored.\n";
  assert.equal(captionText(vtt), "Encoding is the first step.\n\nThen information is stored.");
  assert.equal(captionText("1\n00:01:02,000 --> 00:01:03,000\nUm, retrieval means, uh, recalling information."), "retrieval means, recalling information.");
});

test("PPTX extraction follows presentation order and retains speaker notes", async () => {
  const slide = (text: string) => `<p:sld xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;
  const files = {
    "ppt/presentation.xml": strToU8('<p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId r:id="rId2"/><p:sldId r:id="rId1"/></p:sldIdLst></p:presentation>'),
    "ppt/_rels/presentation.xml.rels": strToU8('<Relationships><Relationship Id="rId1" Target="slides/slide1.xml"/><Relationship Id="rId2" Target="slides/slide2.xml"/></Relationships>'),
    "ppt/slides/slide1.xml": strToU8(slide("Storage follows encoding.")),
    "ppt/slides/slide2.xml": strToU8(slide("Encoding comes first.")),
    "ppt/slides/_rels/slide2.xml.rels": strToU8('<Relationships><Relationship Id="notes" Type="http://schemas/notesSlide" Target="../notesSlides/notesSlide2.xml"/></Relationships>'),
    "ppt/notesSlides/notesSlide2.xml": strToU8(slide("Do not confuse encoding with retrieval.")),
  };
  const bytes = zipSync(files);
  const text = extractSlides(bytes);
  assert.ok(text.indexOf("Encoding comes first.") < text.indexOf("Storage follows encoding."));
  assert.match(text, /Speaker note: Do not confuse encoding with retrieval/);
  const result = await extractFile(new File([Buffer.from(bytes)], "lecture.pptx"));
  assert.equal(result.text, text);
  assert.ok(result.warnings.some(warning => warning.includes("Diagrams")));
});

test("PPTX extraction preserves word spacing across formatted runs and omits slide-number placeholders", () => {
  const slide = `<p:sld xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree>
    <p:sp><p:txBody><a:p>
      <a:r><a:t xml:space="preserve">Identity, digital identity and privacy in the </a:t></a:r>
      <a:r><a:t>onlife</a:t></a:r><a:r><a:t xml:space="preserve"> world</a:t></a:r>
    </a:p><a:p><a:r><a:t>I</a:t></a:r><a:r><a:t>CTs</a:t></a:r><a:r><a:t xml:space="preserve"> shape our personal identity.</a:t></a:r></a:p>
    <a:p><a:r><a:t>12</a:t></a:r></a:p></p:txBody></p:sp>
    <p:sp><p:nvSpPr><p:nvPr><p:ph type="sldNum"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:fld type="slidenum"><a:t>1</a:t></a:fld></a:p></p:txBody></p:sp>
  </p:spTree></p:cSld></p:sld>`;
  const notes = `<p:notes xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree>
    <p:sp><p:nvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr><p:txBody><a:p>
      <a:r><a:t xml:space="preserve">To be considered self-confident </a:t></a:r>
      <a:r><a:t>helps us feel self-confident.</a:t></a:r>
    </a:p></p:txBody></p:sp>
    <p:sp><p:nvSpPr><p:nvPr><p:ph type="sldNum"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:fld type="slidenum"><a:t>1</a:t></a:fld></a:p></p:txBody></p:sp>
    <p:sp><p:nvSpPr><p:nvPr><p:ph type="ftr"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>Template footer</a:t></a:r></a:p></p:txBody></p:sp>
  </p:spTree></p:cSld></p:notes>`;
  const text = extractSlides(zipSync({
    "ppt/slides/slide1.xml": strToU8(slide),
    "ppt/slides/_rels/slide1.xml.rels": strToU8('<Relationships><Relationship Id="notes" Type="http://schemas/notesSlide" Target="../notesSlides/notesSlide1.xml"/></Relationships>'),
    "ppt/notesSlides/notesSlide1.xml": strToU8(notes),
  }));
  assert.equal(text, "Slide 1\nIdentity, digital identity and privacy in the onlife world\n\nICTs shape our personal identity.\n\n12\n\nSpeaker note: To be considered self-confident helps us feel self-confident.");
});

test("PDF extraction reads actual uploaded page text", async () => {
  const stream = "BT /F1 16 Tf 50 750 Td (A lecture definition must retain its exception.) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const result = await extractFile(new File([pdf], "lecture.pdf"));
  assert.match(result.text, /Page 1/);
  assert.match(result.text, /A lecture definition must retain its exception/);
});

test("compilation combines readable sources, validates citations, and reports unprocessed recordings", async () => {
  const material = createLecture({ ...lectureInput, courseId: SAMPLE_COURSE.id, sources: [
    ...lectureInput.sources,
    { kind: "slides", name: "Slides", text: "Retrieval is the process of accessing stored information." },
    { kind: "recording", name: "Webex", url: "https://university.webex.com/recording/example", text: "" },
  ] }, SAMPLE_COURSE, 2);
  const output = {
    overview: "This lecture follows the three processes of memory.",
    sections: [{ title: "Encoding and retrieval", text: "Memory includes encoding, storage, and retrieval. Retrieval accesses stored information.", sourceIds: material.sources.slice(0, 2).map(source => source.id) }],
    keyTerms: [{ term: "Retrieval", meaning: "Accessing stored information.", sourceIds: [material.sources[1].id] }], warnings: [],
  };
  let sent: Record<string, unknown> = {};
  const provider = createCompilationProvider({ apiKey: "test-only", fetch: async (_url, options) => {
    sent = JSON.parse(options?.body as string);
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(output) } }] });
  } });
  const compilation = await provider.compile(material);
  assert.equal(compilation.sections[0].text, output.sections[0].text);
  assert.ok(compilation.warnings.some(warning => warning.includes("audio was not included")));
  assert.equal(compilationIsCurrent({ ...material, compilation }), true);
  assert.equal(readingMaterial({ ...material, compilation }).sections[0].title, "Encoding and retrieval");
  assert.ok(JSON.stringify(sent).includes("Retrieval is the process"));
  assert.ok(!JSON.stringify(sent).includes("https://university.webex.com"));
  const changed = { ...material, compilation, sources: material.sources.map((source, index) => index === 0 ? { ...source, updatedAt: "2027-01-01T00:00:00.000Z" } : source) };
  assert.equal(compilationIsCurrent(changed), false);
  for (const invalid of [
    { ...output, sections: [{ ...output.sections[0], sourceIds: ["invented-source"] }] },
    { ...output, sections: [{ ...output.sections[0], sourceIds: [material.sources[0].id] }] },
  ]) {
    const invalidProvider = createCompilationProvider({ apiKey: "test-only", fetch: async () => Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(invalid) } }] }) });
    await assert.rejects(invalidProvider.compile(material), (error: unknown) => error instanceof HttpError && error.code === "INVALID_SOURCE_REFERENCES");
  }
  await assert.rejects(createCompilationProvider({}).compile(material), (error: unknown) => error instanceof HttpError && error.code === "AI_NOT_CONFIGURED");
});

test("recompiling resets old section markers while retaining personal definitions linked to the original sources", () => {
  const material = { ...SAMPLE_MATERIAL, sections: [{ id: "new-compiled-section", title: "A new topic heading", text: "New presentation", sourceLabel: "Sample", sourceIds: [SAMPLE_MATERIAL.sources[0].id] }] };
  const glossary = [{ id: "my-term", term: "model", meaning: "My own definition.", sectionId: "previous-compiled-section", sourceIds: [SAMPLE_MATERIAL.sources[0].id] }];
  const restored = getMaterialProgress(material, { lastSectionId: "previous-compiled-section", completedSectionIds: ["previous-compiled-section"], reviewSectionIds: [], glossary });
  assert.equal(restored.lastSectionId, null);
  assert.deepEqual(restored.completedSectionIds, []);
  assert.deepEqual(restored.glossary, glossary);
});

test("compiling slide-like text attached to a recording retains its content and records that speech was not verified", async () => {
  const sourceText = "Slide 1\nPersonal identity in the onlife world\n\nSlide 2\nDigital identity distinguishes identification, authentication, and authorization.";
  const material = createLecture({ title: "Digital identity", courseId: SAMPLE_COURSE.id, sources: [{ kind: "recording", name: "UniMiB lecture", text: sourceText, url: "https://elearning.unimib.it/mod/kalvidres/view.php?id=1706861" }] }, SAMPLE_COURSE, 7);
  let sent = "";
  const provider = createCompilationProvider({ apiKey: "test-only", fetch: async (_url, options) => {
    sent = options?.body as string;
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({
      overview: "Two meanings of identity.", sections: [{ title: "Digital identity", text: "Identification, authentication, and authorization have different functions.", sourceIds: [material.sources[0].id] }], keyTerms: [], warnings: [],
    }) } }] });
  } });
  const compilation = await provider.compile(material);
  assert.ok(compilation.warnings.some(warning => warning.includes("not a verified recording transcript")));
  assert.ok(sent.includes("recording audio has not been retrieved or transcribed"));
  assert.equal(material.sources[0].text, sourceText);
});
