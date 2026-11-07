# Application architecture

LexiLearn is one Next.js application. Browser screens call same-origin API endpoints implemented in `src/app/api/**/route.ts`. Those handlers run on the **Node.js runtime** and delegate storage and adaptation work to server modules.

## Request flow

```text
Student interface
  ↓ same-origin fetch
Next.js route.ts handler
  ↓ validate the request
Material service / AI provider
  ↓
Local material repository
  ↓ typed response with source references
Student interface
```

The local repository is the starter's persistence layer. The AI-provider boundary is present, but live AI adaptation is not yet configured.

## Responsibilities

| Location | Responsibility | Team owner |
|---|---|---|
| `src/app` pages and `src/components` | Screens, reading controls, user feedback, keyboard behavior | Person 1 |
| `src/lib/client` | Browser state and API helpers | Person 1 |
| `src/app/api` | HTTP validation, response status, service orchestration | Person 2 |
| `src/server/materials.ts` | Prepare sections while retaining source text | Person 2 |
| `src/server/store.ts` | Material persistence | Person 2 |
| `src/server/ai` | Model integration, prompts, adaptation checks | Person 3 |
| `src/lib/contracts.ts` and `src/lib/validation.ts` | Shared payload contracts and runtime constraints | Coordinate all affected owners |

Keep model-provider secrets in server-side modules. Interface components should receive results and source references, never provider credentials.

## Material contract

The source of truth is `src/lib/contracts.ts`.

```ts
type Material = {
  id: string;
  title: string;
  course: string;
  sourceName: string;
  sourceText: string;
  sections: {
    id: string;
    title: string;
    text: string;
    sourceLabel: string;
  }[];
  createdAt: string;
  wordCount: number;
  isSample: boolean;
};
```

The starter groups source paragraphs into sections. It does not claim to improve wording or generate an AI adaptation. Original text remains available independently of the reader's presentation settings.

For future PDF extraction, preserve page-level references. Add new source metadata through a coordinated contract change rather than placing guessed citations in `sourceLabel`.

## HTTP contract

All routes return JSON. Error responses share this shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "A readable explanation."
  }
}
```

### List and read

- `GET /api/materials` → `{ "materials": Material[] }`
- `GET /api/materials/:materialId` → `{ "material": Material }`
- A missing material returns HTTP 404.

### Create a material

`POST /api/materials` accepts:

```json
{
  "title": "Introduction to classification",
  "course": "Machine learning",
  "sourceName": "lecture-notes.txt",
  "sourceText": "The original lecture text goes here."
}
```

Title and course are required; `sourceName` is optional. The starter allows a title of 1–120 characters, a course of 1–100 characters, a source name of up to 200 characters, and source text of 30–50,000 characters. Source text must still have at least 30 characters after trimming, but its original whitespace is preserved in storage. JSON request bodies are limited to 256,000 bytes. Check `src/lib/validation.ts` and `src/server/http.ts` for the authoritative runtime limits.

The `.txt` selection is read by the browser and sent as JSON text. This route is not a multipart PDF, audio, or video upload endpoint.

Success returns `{ "material": Material }` with HTTP 201.

### Adapt a section

`POST /api/materials/:materialId/adapt` accepts:

```json
{
  "sectionId": "a-valid-section-id",
  "mode": "plain-language"
}
```

Supported contract modes are `plain-language`, `steps`, and `terms`. Valid requests currently return HTTP 501 with `AI_NOT_CONFIGURED`; malformed requests and unknown material/section references should fail validation first.

The planned success shape is:

```ts
type AdaptationResponse = {
  adaptation: {
    text: string;
    sourceSectionIds: string[];
    warnings: string[];
    generatedAt: string;
  };
};
```

Person 3 implements the provider using this contract; Person 2 owns the thin route handler. Person 1 displays the result, warnings, and the referenced original passages.

## Reading preferences

Preferences are browser-local and include `fontSize`, `lineHeight`, `letterSpacing`, `fontFamily`, `theme`, `focusMode`, `sentenceGuide`, and `speechRate`. Existing saved preferences receive defaults for new fields. Speed ranges from 0.75× to 1.25×, with a default of 0.9×.

These settings change presentation, not source content. They are user choices, not evidence of a disability or a diagnostic profile. Load saved settings before persisting defaults, and handle unavailable or malformed browser storage gracefully.

## Reading progress and terminology notes

`ReadingProgressProvider` stores browser-local study state under `lexilearn.reading-progress.v1`, keyed by material ID. Each record contains:

- `lastSectionId`: the last opened section, used by the library's Continue action.
- `completedSectionIds`: sections explicitly marked as read, never inferred from visiting a page.
- `reviewSectionIds`: an independent list of sections the student wants to revisit.
- `glossary`: up to 100 student-authored entries with an ID, a term (80 characters), a meaning (500 characters), and a source section ID.

`src/lib/client/reading-progress.ts` validates saved data and filters missing or duplicated section references before display. Preferences and progress are restored after hydration and before saving; unavailable browser storage falls back to in-memory state for the current page session. There is no account synchronization or cross-tab conflict resolution in this version.

`src/lib/client/sentences.ts` uses English `Intl.Segmenter` to display smaller source fragments, retaining every character. Where segmentation is unavailable, the guide displays the full section as one fragment. Sentence position resets when opening a section. This is presentation logic, not AI simplification.

`ReadAloud` reads the displayed sentence, section, or original text through the browser speech API. It retains an utterance reference, supports pause/resume/stop, saves the chosen speed as a reading preference, and cancels playback on passage changes and unmount. Voice availability depends on the browser; automated control-flow checks can use a mock speech service, while audible playback needs a real-browser check.

The personal glossary is not an AI-generated or lecturer-approved dictionary. Its notes are stored with browser progress, rather than modifying the original material or the server's material contract.

## Storage and deployment boundary

The starter stores materials in `.data/materials.json`, or the directory configured by `LEXILEARN_DATA_DIR`. The seed material is labelled illustrative sample content. The repository allows up to 100 materials including the seed, serializes writes within its process, and replaces the JSON file atomically.

This file repository is suitable for local development in one process. A deployment with multiple users, multiple server processes, or ephemeral serverless storage needs durable database storage, access control, and a defined retention/deletion policy. These are follow-up tasks, not implemented guarantees.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

Also check the library → add material → reader flow in a browser, restore preferences after refresh, navigate using a keyboard, and confirm that the adaptation route reports its unconfigured state honestly.

Use the [team integration checklist](TEAM_TASKS.md#shared-integration-checklist) as the AI workflow is added.
