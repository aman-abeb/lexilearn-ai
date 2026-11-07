# LexiLearn AI

**A calmer lecture workspace for university students with dyslexia.** Organize courses, bring a lecture's notes, slides, and recording transcript together, and work through one connected set of study notes at your own pace.

## The experience

**Course → numbered lecture → lecture sources → compiled study notes → comfortable reading.**

- **Saved courses:** Add a course name, optional code, and term once. Choose it whenever you add another lecture.
- **Automatic lecture numbers:** Lectures are numbered sequentially within each course, starting from 1. Numbers are assigned when saving, including simultaneous imports.
- **Two-step lecture setup:** Choose the course and title, then enter the lecture sources. Save & open lecture includes the source currently being edited; Add source is optional when collecting several inputs. Keep adding sources to the same lecture later.
- **Notes and slides:** Paste content or import TXT, MD, PDF, and PPTX files. Review the extracted text before adding it. PPTX extraction includes speaker notes.
- **YouTube videos:** Paste a YouTube link under Recording. Available published or automatic captions are imported into a timestamped transcript, ready for Create study notes. Captions can also be downloaded as VTT.
- **Other recordings:** Keep a Webex or university recording link with the lecture. Paste a transcript or import TXT, VTT, or SRT captions. A recording can be saved first and its transcript added later.
- **AI compilation:** With a server-side provider key, combine the available source text into topic-based full study notes, a brief overview, and key terms. Each section links back to the original sources. Recompile when sources change.
- **Comfortable reading:** One section or sentence at a time, a full-notes view, adjustable size and spacing, warm/white/dark pages, and a focus view that hides navigation.
- **Optional narration:** Choose a speed, pause, resume, or stop. Changing the passage stops narration.
- **Personal study tools:** Resume the last section, explicitly mark sections as read, save passages to revisit, and maintain a personal glossary. Personal definitions keep their original-source links when compiled notes are regenerated.
- **Text export:** Download the lecture's study notes, key terms, and source notes as a plain-text file.

The interface uses clear labels, left-aligned text, restrained colours, generous spacing, and reading settings that stay out of the way until opened. Students choose what helps them; no font or setting is presented as universally suitable for dyslexia. Read markers are student-selected, not comprehension scores.

## Start locally

Use **Node.js 22.3 or newer** and npm.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Courses, lecture sources, and original-text reading work without an AI key.

### Enable compiled study notes

Copy `.env.example` to `.env.local` and set:

```dotenv
OPENAI_API_KEY=your-server-side-key
OPENAI_MODEL=gpt-4.1-mini
```

Restart the server. Use **Create study notes** during lecture setup or **Compile study notes** in an existing lecture. The provider uses the Chat Completions API with JSON output; `OPENAI_BASE_URL` can point to a compatible API root. The model needs to support JSON responses and the supplied input length. Provider settings never use a `NEXT_PUBLIC_` prefix.

Without a key, the interface explains that compilation is not connected and keeps original-text reading available. Compilation errors preserve previously saved notes and all lecture sources.

### How recording links work

YouTube video links automatically import available captions. Review the transcript, then choose **Create study notes** (requires the AI key). If YouTube has no accessible captions or blocks the request, the interface offers retry, transcript upload, or **Save link only**. This retrieves existing captions; it does not invent a transcript or transcribe captionless video audio.

A saved recording URL is a reference, **not a transcript**. Private Webex recordings and UniMiB Moodle/Kaltura lecture pages usually require university sign-in. This version does not sign in to these services, download arbitrary recording URLs, or transcribe audio automatically. The recording form explains this for UniMiB links and identifies slide-like text when it is supplied in place of a transcript.

To include the spoken lecture, export its transcript/captions and import the TXT, VTT, or SRT file. Use **Sources → Add transcript** on a saved recording, then compile the updated lecture. Timestamp labels remain in imported captions. Links without transcripts are explicitly listed as not included in the compiled content.

## Try the flow

1. Open **My courses**, add a course, and choose **Add lecture**.
2. Confirm the selected course and automatic lecture number. Give the lecture a title.
3. Add notes, slides, and a recording link or transcript.
4. Choose **Create study notes** with AI configured, or **Save & open lecture** to keep the originals together.
5. Read one section at a time. Open **Reading settings**, try the sentence guide, or listen at your own pace.
6. Follow a section's source link to inspect its original text. Add missing transcripts or other sources and update the compiled notes.
7. Mark a section as read, save a term, and return to the lecture list. **Continue reading** restores your place.

The included lecture is explicitly labelled **illustrative sample content**, not a real university lecture. See [the demonstration guide](docs/DEMO.md) for the full walkthrough.

## Checks

```bash
npm run typecheck
npm test
npm run build
npm start
```

`npm start` serves the production build. Run development and production servers on different ports if using both.

Tests cover course persistence, concurrent lecture numbering, legacy-data migration, source updates, PDF/PPTX/caption extraction, citation validation, compilation boundaries, source preservation, and saved reading state. Model-output tests use a controlled provider response; they do not establish the quality of a live model's notes.

## Project structure

```text
src/
  app/
    page.tsx                       # Lecture library, search, course filter, resume
    courses/page.tsx               # Saved courses and course creation
    courses/[courseId]/page.tsx     # Course lectures in sequence
    materials/new/page.tsx          # Two-step lecture setup
    read/[materialId]/page.tsx      # Study notes and original sources
    preferences/page.tsx           # Reading settings and preview
    api/                           # Next.js Node.js route handlers
  components/                      # Lecture builder, source collection, and reader
  lib/
    contracts.ts                   # Shared payload types
    validation.ts                  # Runtime constraints
    lecture.ts                     # Reading view and compilation freshness helpers
    client/                        # API, reading state, and sentence segmentation
  server/
    store.ts                       # Atomic local course-and-lecture repository
    materials.ts                   # Source-preserving lecture preparation
    ingestion/extract.ts           # PDF, PPTX, text, and captions
    ai/compilation.ts              # Configurable source-grounded compilation
    ai/provider.ts                 # Future selected-section adaptation
tests/
docs/
  ARCHITECTURE.md
  DEMO.md
  TEAM_TASKS.md
```

The application uses **Next.js App Router, React, TypeScript, Zod, and Node.js route handlers**. PDF text extraction uses `pdf-parse`; PPTX text and speaker notes use `fflate` and `fast-xml-parser`.

## Backend routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Check availability |
| `GET`, `POST` | `/api/courses` | List or add saved courses |
| `GET`, `POST` | `/api/materials` | List or create lectures |
| `GET` | `/api/materials/:id` | Read one lecture and compilation availability |
| `POST` | `/api/materials/:id/sources` | Add sources to a lecture |
| `PATCH` | `/api/materials/:id/sources/:sourceId` | Update source text or attach a recording transcript |
| `POST` | `/api/materials/:id/compile` | Compile and store source-grounded study notes |
| `POST` | `/api/sources/extract` | Extract an uploaded file into reviewable text |
| `POST` | `/api/sources/youtube` | Retrieve YouTube captions and a timestamped transcript |
| `POST` | `/api/materials/:id/adapt` | Future selected-section adaptation; currently HTTP 501 |

See [architecture and contracts](docs/ARCHITECTURE.md) for request examples.

## Data and current limits

- The local workspace is stored in `.data/materials.json`, configurable with `LEXILEARN_DATA_DIR`. Courses and lectures share one atomic file. Legacy lecture arrays are migrated without changing original text or section IDs.
- This is a single-user, single-process local prototype, with up to 100 courses and 100 lectures including the sample. Shared deployment needs a database and accounts.
- A lecture can have 12 sources, 100,000 characters per source, and 160,000 characters combined. Uploaded files can be up to 10 MB; PDFs and slide decks can have up to 300 pages/slides.
- Original uploaded binaries are not retained. Extracted text, source names, recording links, extraction notes, and generated study notes are saved.
- Scanned pages, images, diagrams, and visual equations are not interpreted. Extraction feedback identifies empty pages and tells the student what needs checking.
- PPTX extraction preserves spaces between formatted text runs and omits template slide-number/header/footer placeholders. Previously imported text is not modified automatically; re-import the source file to use extraction fixes.
- AI compilation uses the available extracted text. Source coverage checks validate IDs, not the correctness or completeness of every generated sentence.
- Reading settings, section progress, revisit markers, and up to 100 personal glossary entries per lecture live in the current browser. They do not sync between devices. Blocked storage falls back to the current session.
- Sentence segmentation uses English `Intl.Segmenter`, falling back to the whole section where unavailable. Browser narration depends on the available voice service.

## Next milestones

1. Authorized Webex integration and audio transcription, so a recording link can supply its spoken content directly.
2. Source-grounded clarification of a selected passage and short comprehension checks.
3. Review of compiled notes against a real lecture, including definitions, exceptions, equations, and extraction gaps.
4. Feedback from dyslexic students, followed by durable storage and account-synced study progress.

The [team plan](docs/TEAM_TASKS.md) describes ownership and follow-up work. The [product catalogue](README_LexiLearn_AI.md) describes the broader vision.
