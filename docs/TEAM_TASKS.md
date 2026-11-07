# Three-person implementation plan

The application foundation is shared. Divide the next work into three areas so each person can progress without repeatedly changing the same files.

**First milestone:** A student with dyslexia can import one real lecture, choose reading preferences, request an explanation of a difficult section, answer a short comprehension check, and return to the relevant source.

Use student-selected preferences. Do not infer a diagnosis or promise that one font, color, or layout will suit everyone.

**Current baseline:** Saved courses, atomic course-local lecture numbering, multi-source lecture setup, PDF/PPTX/text/caption extraction, and configurable whole-lecture AI compilation are implemented. The study workspace includes original-source links, a sentence guide, read/revisit markers, resume position, a personal glossary, narration controls, and text export. Read markers are student-selected rather than comprehension results. Automatic Webex access, audio transcription, selected-passage adaptation, quizzes, and account-synced progress remain follow-up work.

## Person 1 — Student interface and accessibility

**Own:** `src/components/`, `src/lib/client/`, page files under `src/app/`, and `src/app/globals.css`. API routes are owned by Person 2.

**Suggested branch:** `codex/person-1-reading-experience`

### Tasks, in order

1. Review the library, import form, reader, and preferences with a student who finds dense text difficult to read. Record specific feedback rather than collecting diagnoses.
2. Improve reading controls: clear labels, sensible ranges, reset behavior, comfortable reading width, focus mode, and settings that survive refresh.
3. Add a section action for “Explain simply,” “Break into steps,” or “Explain terms,” using the shared adaptation contract. Show loading, failure, retry, and unconfigured-provider states.
4. Display generated explanations alongside their source links and warnings. Keep original text one action away.
5. Build the short comprehension-check interface after Persons 2 and 3 agree its payload. Let students answer before seeing feedback.
6. Add or refine optional browser narration. Always retain a text equivalent and handle unsupported browsers visibly.

### Acceptance checks

- [ ] The complete reading flow is usable with a keyboard and has a visible focus indicator.
- [ ] Controls have readable labels; errors and loading states are announced appropriately.
- [ ] The reader works at mobile widths and with larger text without horizontal page scrolling.
- [ ] Refresh restores reading preferences without overwriting them with defaults.
- [ ] A student can inspect original text for each generated explanation.
- [ ] AI failure does not remove access to the source material.
- [ ] Narration, if enabled, stops when the student leaves or changes the passage.

**Handoff:** A complete UI using shared API contracts, plus a short list of observations from accessibility checks. Coordinate new payload fields with Persons 2 and 3 before changing contracts.

## Person 2 — Material ingestion, storage, and backend routes

**Own:** `src/app/api/`, `src/server/store.ts`, `src/server/materials.ts`, `src/server/ingestion/`, and backend persistence tests.

**Suggested branch:** `codex/person-2-content-backend`

### Tasks, in order

1. Agree the real lecture with the team and verify its PDF/PPTX extraction and caption import. Add an authorized Webex/transcription connector if the demonstration requires automatic recording access; retain transcript import as a working fallback.
2. Preserve source references during extraction. Keep page/section identifiers stable so explanations can link back to the correct original passage.
3. Define upload size/type limits and clear extraction errors. Avoid silently dropping equations, diagrams, or pages that cannot be read.
4. Connect the adaptation route to Person 3's provider. Keep validation, status codes, and error responses consistent.
5. Add storage and route handlers for comprehension attempts and a recommended review section, using the jointly agreed quiz contract.
6. Decide whether the demo needs shared deployment. If it does, replace local JSON persistence with durable storage and add appropriate access controls before sharing student materials.

### Acceptance checks

- [ ] Valid material can be imported and read again after an application restart.
- [ ] Invalid, empty, oversized, and unsupported inputs receive useful errors.
- [ ] Extracted passages retain inspectable source references.
- [ ] An unknown material or section cannot be passed to the model as valid input.
- [ ] Concurrent requests do not lose stored changes within the chosen storage architecture.
- [ ] A submitted practice attempt and its review recommendation are persisted.
- [ ] No provider secrets or local filesystem paths appear in browser responses.

**Handoff:** A real course fixture with stable references, documented route payloads, and reliable storage. Person 3 receives source sections; Person 1 receives API examples and error cases.

## Person 3 — AI adaptation, comprehension, and evaluation

**Own:** `src/server/ai/`, future `tests/fixtures/` and `tests/evaluations/`, and the demo's example interactions. Coordinate the test runner with the team before adding a separate evaluation command.

**Suggested branch:** `codex/person-3-ai-learning`

### Tasks, in order

1. Configure and evaluate the existing compilation provider on the real lecture. Check full topic coverage, retained exceptions/equations, output length, and valid source links; the provider already handles timeout, JSON validation, and missing configuration.
2. Implement the three agreed adaptation modes: plain-language explanation, smaller steps, and terminology explanation. Use the selected source section and necessary surrounding context.
3. Preserve definitions, equations, conditions, and exceptions. Return warnings when the source is ambiguous or insufficient, and validate every returned source ID.
4. Create a small source-grounded comprehension check with expected answers and explanatory feedback. Agree its request/result types with Persons 1 and 2 before wiring it into the app.
5. Build a small evaluation set: normal passage, technical definition, crucial exception, insufficient source, misleading instruction inside uploaded text, and a request to complete assessed work.
6. Prepare the live demo and a boundary example using the selected real lecture. Collect human review of adaptations and report limitations honestly.

### Acceptance checks

- [ ] AI text is labelled as generated and links to valid source sections.
- [ ] A crucial condition in the source survives the adaptation or is explicitly flagged for review.
- [ ] Uploaded document instructions cannot override the application's tutoring rules.
- [ ] Missing evidence produces an uncertainty response rather than an invented lecture claim.
- [ ] Provider timeout or invalid output gives a controlled error; original reading remains available.
- [ ] Practice feedback explains reasoning and suggests a relevant source section.
- [ ] Evaluation results include failures and uncertainty, not only successful examples.

**Handoff:** A provider that meets the shared contract, reviewed demo examples, and a short explanation of why its adaptations are useful for the target students.

## Coordination and handoffs

| When | All three agree | Then work in parallel |
|---|---|---|
| Before feature work | One real lecture, input format, demo story, and current contracts | Person 1 improves reading; Person 2 prepares source material; Person 3 implements adaptation |
| First integration | A source section can be adapted and opened from the UI | Person 1 polishes controls; Person 2 persists actions; Person 3 builds practice/evaluations |
| Before adding quizzes | Question, attempt, feedback, and review-reference payloads | Each owner implements their side of the agreed contract |
| Before presentation | Working flow, unresolved limitations, and evidence to show | Rehearse the demo and one boundary case |

`src/lib/contracts.ts` and `src/lib/validation.ts` are shared boundaries. Agree changes before editing, and update request producers and consumers together. Keep one root lockfile; coordinate dependency additions rather than maintaining separate package files.

Do not make new page routes compete with API ownership: Person 1 owns UI pages, Person 2 owns `route.ts` endpoints, and Person 3 owns the service called by the adaptation endpoint.

## Shared integration checklist

- [ ] `npm run typecheck`, `npm test`, and `npm run build` succeed.
- [ ] The demonstration uses actual university material with permission, not the illustrative seed lecture.
- [ ] The whole flow works from a fresh browser session.
- [ ] Changes to preferences affect presentation without changing the source text.
- [ ] Generated explanations retain visible links to their original passages.
- [ ] The application performs a learning action: scoring and storing an attempt, then choosing a relevant review section.
- [ ] The team demonstrates an insufficient-source or assessed-work boundary.
- [ ] A network/model failure leaves the uploaded material readable.
- [ ] No medical diagnosis is requested or inferred.
- [ ] The README accurately separates completed behavior from the roadmap.

## Keep for later

Broad multimodal ingestion, synchronized video captions, lecturer analytics, extensive knowledge graphs, and multi-agent orchestration can follow the completed core flow. They are not prerequisites for this three-person milestone.
