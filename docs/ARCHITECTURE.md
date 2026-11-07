# Application architecture

LexiLearn is one Next.js App Router application. Browser components call same-origin `route.ts` handlers on the Node.js runtime. Courses, lecture metadata, original extracted text, and compiled notes share one local JSON repository.

## Main flow

```text
Saved course
  → lecture title + automatically assigned course-local number
  → notes, slides, recording reference, and transcript
  → extracted text reviewed by the student
  → original-text reader OR configured AI compilation
  → topic-based notes + source links + key terms + extraction/missing-source notes
  → adjustable reader + browser-local progress and personal glossary
```

## Code ownership

| Location | Responsibility |
|---|---|
| `src/app` pages and `src/components` | Course library, lecture setup, source collection, and study workspace |
| `src/lib/client` | API helpers, validated browser study state, and sentence presentation |
| `src/lib/contracts.ts`, `src/lib/validation.ts` | Shared payloads and runtime constraints |
| `src/app/api` | Same-origin checks, request limits, validation, and service orchestration |
| `src/server/materials.ts` | Lecture creation and source-preserving reading sections |
| `src/server/store.ts` | Atomic course and lecture persistence, numbering, and legacy migration |
| `src/server/ingestion/extract.ts` | PDF/PPTX/text/caption extraction |
| `src/server/ai/compilation.ts` | OpenAI-compatible lecture compilation and output/source validation |
| `src/server/ai/provider.ts` | Reserved selected-section adaptation interface |

## Courses and lectures

`Course` stores `id`, `name`, `code`, `term`, `createdAt`, and `isSample`. Course list responses add `lectureCount` and `nextLectureNumber`.

The `Material` contract is retained for compatibility, but now represents a lecture. It adds:

- `courseId`: a reference to a saved course.
- `lectureNumber`: an integer assigned inside the serialized repository write, using the course's current maximum plus one.
- `sources`: independently identified notes, slides, transcripts, and recording links.
- `compilation`: nullable generated overview, sections, key terms, source notes, model, timestamp, and source versions.

`sourceText` and `sections` retain the original extracted input. `readingMaterial()` selects compiled sections only for the study view. Original input is never overwritten by generated content.

Each source has a stable `id`, `kind`, `name`, `text`, optional HTTPS `url`, optional extraction `warnings`, `addedAt`, and optional `updatedAt`. A recording can contain a link without text; other sources require readable text. A recording's transcript is attached by updating that source, preserving its ID.

## HTTP examples

All errors return `{ "error": { "code": "…", "message": "…" } }`.

### Courses

`GET /api/courses` returns `{ courses: CourseSummary[], compilationAvailable: boolean }`.

`POST /api/courses`:

```json
{ "name": "Psychology", "code": "PSY 101", "term": "Autumn 2026" }
```

Returns `{ course: CourseSummary }` with HTTP 201. Duplicate names/codes return 409.

### Create a lecture

`POST /api/materials`:

```json
{
  "title": "Memory and learning",
  "courseId": "saved-course-id",
  "sources": [
    { "kind": "notes", "name": "My notes", "text": "The original course text…" },
    { "kind": "recording", "name": "Webex recording", "text": "", "url": "https://university.webex.com/recording/…" }
  ]
}
```

Returns `{ material: Material }` with HTTP 201. The client displays a preview number, but the server assigns the authoritative number. An unknown course returns 404. The old `{ title, course, sourceName?, sourceText }` input remains supported and creates/reuses a course.

`GET /api/materials` returns `{ materials: Material[] }`. `GET /api/materials/:id` returns `{ material, compilationAvailable }`.

### Add or update sources

- `POST /api/materials/:id/sources`: `{ sources: LectureSourceInput[] }` adds sources.
- `PATCH /api/materials/:id/sources/:sourceId`: one `LectureSourceInput` updates a source, including adding a recording's transcript.
- Both return `{ material }`. New or edited sources make a previous compilation stale; the old notes remain readable until a new compilation succeeds.

Lecture JSON is limited to 1,000,000 bytes; source updates to 600,000 bytes. The aggregate content limits are 12 sources, 100,000 characters per source, and 160,000 characters per lecture. The legacy source field retains its 50,000-character limit. See the Zod schemas for the authoritative rules.

### File extraction

`POST /api/sources/extract` accepts `multipart/form-data` with a `file` field. It bounds the streamed body before parsing multipart data and returns `{ name, text, warnings }` for review in the source composer.

- TXT / MD: UTF-8 text.
- VTT / SRT: caption content with start-time labels; format metadata and cue markup are removed.
- PDF: selectable page text using `pdf-parse`, with page labels and empty-page feedback.
- PPTX: slide order from the presentation relationships, plus slide text and linked speaker notes. Spaces inside text runs are preserved without importing XML indentation; template header/footer/date/slide-number placeholders are omitted. Only relevant XML entries are expanded, with expansion limits.

Files are limited to 10 MB. Empty/scanned inputs and unsupported formats fail explicitly. Visual content is not analyzed. Original binaries are not retained.

### YouTube captions

`POST /api/sources/youtube` accepts `{ url }`. Recognized YouTube video links are normalized to a video ID; the server retrieves available captions through `youtube-transcript-plus`, with a 25-second timeout, bounded response sizes, and restricted upstream destinations. It automatically chooses an available caption track, returns a timestamped recording source and downloadable VTT, and preserves caption provenance with the saved source. The recording form starts importing after a link is pasted; direct save/compile also waits for captions. Missing or blocked captions receive an explicit error and an optional link-only fallback. Existing manually supplied text is retained unless the student chooses to replace it. AI compilation consumes the imported transcript through the existing source contract.

### Compile notes

`POST /api/materials/:id/compile` accepts `{}` and returns `{ material }` after storing a valid compilation.

`OPENAI_API_KEY` enables compilation; `OPENAI_MODEL` defaults to `gpt-4.1-mini`, and `OPENAI_BASE_URL` defaults to `https://api.openai.com/v1`. The provider calls `/chat/completions` with JSON output and a 90-second timeout. The route allows up to 120 seconds and prevents overlapping compilation requests for the same lecture within its process.

The prompt asks for comprehensive topic-based notes from all readable sources, short paragraphs, retained terminology, equations, examples, conditions, and exceptions. Uploaded text is treated as source data, not application instructions. URLs are not fetched or sent as a substitute for recording content.

The model returns an overview, sections, key terms, and source notes. Validation rejects malformed/truncated output, unknown source IDs, missing coverage of readable sources, and excessive output. Recording links without transcripts and extraction feedback are added to the source notes by application logic. These checks do not establish factual or semantic correctness.

Source IDs and version timestamps allow `compilationIsCurrent()` to detect subsequent edits. An edit during compilation is retained and leaves the resulting notes visibly out of date. Compilation failure never replaces the old result.

The source composer can submit directly through the lecture-level Save/Create study notes buttons using native HTML form association. The current validated draft is appended once before saving, alongside previously added sources; empty extra editors are skipped. In-progress file imports disable saving with an explanatory message. Slide-like recording text is identified in the UI and compilation source notes, so extracted slides are not labelled as verified recording speech.

### Reserved adaptation

`POST /api/materials/:id/adapt` retains `{ sectionId, mode: "plain-language" | "steps" | "terms" }`. It validates references and returns HTTP 501 / `AI_NOT_CONFIGURED`. Whole-lecture compilation is implemented separately from this future selected-passage feature.

## Browser state and reading

`ReadingPreferencesProvider` restores size, spacing, typeface, page colour, sentence guide, focus mode, and speech speed before persisting defaults. Focus view hides global navigation while retaining Exit focus. Reading settings are collapsed by default.

`ReadingProgressProvider` stores state under `lexilearn.reading-progress.v1`, keyed by lecture ID:

- Last section, student-selected read markers, and an independent revisit list.
- Up to 100 personal glossary entries with term, meaning, section ID, and original source IDs.

New compilations use fresh section IDs so old read markers are not applied to different content. Personal glossary entries retain original-source references; the interface can open the source when the old compiled section no longer exists. Existing glossary notes are enriched with source references before replacing the compilation in the active workspace.

Sentence grouping uses English `Intl.Segmenter` without changing wording. Browser narration reads the displayed sentence/section or full notes, supports speed and pause/resume/stop, and cancels on passage changes or unmount. Blocked browser storage falls back to in-memory state. There is no account synchronization or cross-tab conflict resolution.

## Persistence

`.data/materials.json` now stores `{ version: 2, courses, materials }`. Legacy material arrays are upgraded in memory: original text and section IDs are preserved, course records are derived, and numbers are assigned chronologically. A subsequent write stores the upgraded workspace atomically. Corrupt files are surfaced rather than overwritten.

One serialized write queue covers courses, numbering, source edits, and compilation results. The prototype supports one local server process, up to 100 courses and 100 lectures. Shared/serverless deployment requires a database and user-level storage.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

Tests include concurrent numbering, persistence/migration, recording transcript updates, actual PDF/PPTX parsing, caption timing, output/source validation, and personal-note preservation. Browser checks cover the course-to-lecture workflow, compilation with a controlled model response, keyboard interactions, refresh, focus, source navigation, and mobile layouts. Live-model quality and audible voice behavior need review with the actual lecture and demonstration device.
