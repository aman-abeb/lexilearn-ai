# LexiLearn AI

An accessible university reading workspace, with **students with dyslexia as the primary audience**. Students can work through a lecture one section or sentence at a time, listen at a comfortable pace, collect unfamiliar terms, and return to where they stopped. The source wording remains available throughout.

This repository is the application foundation. It uses **Next.js App Router for the interface and `route.ts` handlers running on Node.js for the backend**. There is no separate Express server.

## Start locally

Use Node.js 22 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

Environment configuration is optional. To customize the local data directory, copy `.env.example` to `.env.local` and set `LEXILEARN_DATA_DIR`. The default is `.data` in this project.

```bash
npm run typecheck
npm test
npm run build
npm start
```

`npm start` serves the production build after `npm run build`. Keep the development and production servers on separate ports if running both.

## What works now

- A material library with an explicitly labelled illustrative sample lecture.
- A form to add pasted course text or import a `.txt` file.
- API validation and local JSON storage for materials.
- A reader with paragraph sections, source labels, and access to the original text.
- Adjustable reading preferences saved in the current browser: text size, line height, letter spacing, font family, theme, and focus mode.
- A **sentence guide** that displays one sentence at a time, with previous/next controls and the full paragraph one toggle away.
- **Saved reading progress:** resume the last section from the library, explicitly mark sections as read, and jump directly to any section.
- A **revisit list** for passages the student wants to return to, independent of whether they marked them as read.
- A **personal glossary:** write or copy a definition, update or remove it, and return to the source section. Definitions are student-authored, not generated.
- Optional read-aloud using the browser's voice service, with **speed selection, pause, resume, and stop**. In sentence-guide mode, it reads the displayed sentence. Changing passages stops playback.
- A shared TypeScript contract between the interface and backend.
- An AI-provider extension point with an explicit `AI_NOT_CONFIGURED` response until a provider is implemented.

The sample is demonstration content, **not material from a real university course**. Replace it with material you have permission to use for the hackathon demonstration.

## A focused first version

The initial product is a **reading companion for dyslexic university students**. Each feature supports a concrete part of working through a lecture:

| Reading need | Current support |
|---|---|
| Dense passages feel difficult to start | Paragraph sections and an optional sentence guide |
| The default layout feels crowded | Adjustable size, spacing, typeface, background, and focus view |
| Hearing a passage is useful | Read-aloud with a student-selected pace and pause/resume |
| Unfamiliar terminology interrupts reading | A personal glossary with links back to the source |
| Returning after a break is difficult | Saved section position, read markers, and a revisit list |

These are options for students to try. Progress reflects their own reading markers, not a reading-speed score or a measure of comprehension.

### Try the first-commit demo

1. Open the sample lecture, or add your own pasted text / `.txt` lecture.
2. Adjust the reading settings, then turn on **Sentence guide** and move between sentences.
3. Choose a read-aloud speed and try **Pause reading** / **Resume reading** in a supported browser.
4. Mark a section as read and save another with **Revisit later**.
5. Open **My glossary**, add a term and its meaning, then use **Return to Part …** to find its source.
6. Return to the library and select **Continue**. Refresh to confirm that your last section, glossary, and reading preferences return.

The app works without an AI key. See [the demo and verification guide](docs/DEMO.md) for a short walkthrough and browser checks.

## What comes next

The next additions deepen the same reading flow:

1. **Source-grounded explanations:** clarify a difficult section in plain language or smaller steps, retaining technical terms and source links.
2. **Terminology assistance:** suggest definitions from the lecture for the student to review and add to their glossary.
3. **Short comprehension checks:** provide feedback and link to a relevant passage to revisit.
4. **Lecture-format support:** extract PDF or slide text while keeping reliable page references.

Audio transcription, account-synced progress, full lecturer dashboards, and broader file support remain later work. Paragraph and sentence grouping do not rewrite or simplify the source using AI.

The next milestone is one complete dyslexia-focused flow: **import one real lecture → choose reading preferences → request a source-grounded explanation → answer a short comprehension check → revisit the relevant passage**.

## Why dyslexia is the priority

The design focuses on difficulties some students experience with dense passages, crowded layouts, unfamiliar terminology, and keeping their place while reading. Smaller sections and adjustable presentation are starting options to test with students, not treatments or universally effective settings.

- Let the student choose; do not infer a diagnosis.
- Preserve necessary academic terminology and the original source.
- Avoid labelling one font or layout as suitable for every dyslexic student.
- Keep instructions short, controls labelled, and navigation usable by keyboard.
- Add terminology support and optional narration before expanding into unrelated learning tools.

Captions, transcripts, and broader accessibility features remain part of the product roadmap, with the initial demonstration centered on reading.

## Project structure

```text
src/
  app/
    page.tsx                       # Material library
    materials/new/page.tsx         # Add text material
    read/[materialId]/page.tsx     # Reader
    preferences/page.tsx           # Reading preferences
    api/
      health/route.ts
      materials/route.ts
      materials/[materialId]/route.ts
      materials/[materialId]/adapt/route.ts
  components/                     # Shared interface and reading controls
  lib/
    contracts.ts                  # Frontend/backend response and input types
    validation.ts                 # Runtime validation schemas
    client/                       # API, progress validation, and sentence segmentation
  server/
    materials.ts                  # Source-preserving material preparation
    store.ts                      # Local JSON repository
    ai/provider.ts                # Future model-provider integration
tests/                            # Backend, source preservation, and reading-state checks
docs/
  ARCHITECTURE.md
  DEMO.md
  TEAM_TASKS.md
```

## Backend routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Check service availability |
| `GET` | `/api/materials` | List materials |
| `POST` | `/api/materials` | Validate and store pasted/imported text |
| `GET` | `/api/materials/:materialId` | Read one material and its sections |
| `POST` | `/api/materials/:materialId/adapt` | Reserved adaptation workflow; valid requests currently return HTTP 501 with `AI_NOT_CONFIGURED` |

See [architecture and contracts](docs/ARCHITECTURE.md) for request and response details.

## Local data and current limits

- Materials are stored in `.data/materials.json` by default. This directory is ignored by Git.
- The starter accepts up to 100 materials including the seed. Text is limited to 50,000 characters per material.
- Reading preferences, the last opened section per material, read/revisit markers, and up to 100 glossary entries per material are stored in the current browser. They do not sync across devices; clearing site data removes them. If browser storage is unavailable, changes remain usable until reload.
- Sentence boundaries use the browser's English `Intl.Segmenter`; older browsers fall back to showing the full section. Sentence position restarts at the first sentence when reopening a section.
- Read-aloud availability and pause/resume behavior depend on the browser's speech service. Narration is optional and does not highlight words in sync with audio.
- The starter is a single-user, single-process local prototype. It does not provide accounts, access control, or a production database.
- Do not use this local JSON repository as shared storage across serverless instances. Person 2's storage task covers the next persistence layer.
- No AI API key is needed to run the starter. Future provider secrets must stay server-side and must not use a `NEXT_PUBLIC_` prefix.

## Work for three people

| Person | Ownership | Main outcome |
|---|---|---|
| 1 | Interface and accessibility | A readable, configurable end-to-end student experience |
| 2 | Ingestion, storage, and route handlers | Reliable course material, source references, and persisted learning actions |
| 3 | AI adaptation and evaluation | Source-grounded explanations and comprehension checks with tested boundaries |

Start with the [three-person task plan](docs/TEAM_TASKS.md). It defines file ownership, shared interfaces, handoffs, and acceptance checks.

The [product feature catalogue](README_LexiLearn_AI.md) describes the longer-term vision; it is not a list of completed features.
