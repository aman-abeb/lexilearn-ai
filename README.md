# LexiLearn AI

**A calmer lecture workspace for university students with dyslexia.** Organize courses, bring a lecture's notes, slides, and recording transcript together, and work through one connected set of study notes at your own pace.

## Contents

- [Overview](#overview)
- [Features](#features)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Importing lecture sources](#importing-lecture-sources)
- [Audio and voice](#audio-and-voice)
- [Study walkthrough](#study-walkthrough)
- [Development and verification](#development-and-verification)
- [Architecture and project structure](#architecture-and-project-structure)
- [Backend routes](#backend-routes)
- [Roadmap](#roadmap)
- [Further documentation](#further-documentation)

## Overview

LexiLearn brings course organization, source collection, accessible reading, and study activities into one workspace. Students can start with original lecture text and enable AI tools when they want compiled notes, explanations, or practice feedback.

The included lecture provides illustrative sample content for exploring the interface. The implementation described here is the current local application.

## Features

### Course and lecture organization

**Course → numbered lecture → lecture sources → compiled study notes → comfortable reading, practice, and exam review.**

- **Saved courses:** Add a course name, optional code, and term once. Choose it whenever you add another lecture.
- **Automatic lecture numbers:** Lectures are numbered sequentially within each course, starting from 1. Numbers are assigned when saving, including simultaneous imports.
- **Two-step lecture setup:** Choose the course and title, then enter the lecture sources. Save & open lecture includes the source currently being edited; Add source is optional when collecting several inputs. Keep adding sources to the same lecture later.

### Source collection and study notes

- **Notes and slides:** Paste content or import TXT, MD, PDF, and PPTX files. Review the extracted text before adding it. PPTX extraction includes speaker notes.
- **YouTube videos:** Paste a YouTube link under Recording. Available published or automatic captions are imported as clean text without timestamps, filler sounds, or transcribed stutters, ready for Create study notes. Original caption words and timing can also be downloaded as VTT.
- **Other recordings:** Keep a Webex or university recording link with the lecture. Paste a transcript or import TXT, VTT, or SRT captions. A recording can be saved first and its transcript added later.
- **AI compilation:** With a server-side provider key, combine the available source text into topic-based full study notes, a brief overview, and key terms. Each section links back to the original sources. Recompile when sources change.

### Reading and accessibility

- **Comfortable reading:** One section or sentence at a time, a full-notes view, adjustable size and spacing, typeface, page colour, a reading guide, named arrangements, light or dark appearance, and a focus view that hides navigation.
- **Section help:** On a single section, ask for a plain-language explanation, a breakdown into steps, or the terms in that section. Each reply is labelled as generated, keeps its warnings, and links back to the original sources. The section itself stays on the page if the request fails.
- **Optional narration:** Choose a speed, pause, resume, or stop. Changing the passage stops narration.
- **Personal study tools:** Resume the last section, explicitly mark sections as read, save passages to revisit, and maintain a personal glossary. Personal definitions keep their original-source links when compiled notes are regenerated.

The interface uses clear labels, left-aligned text, restrained colours, generous spacing, and reading settings that stay out of the way until opened. Students choose what helps them; no font or setting is presented as universally suitable for dyslexia. Read markers are student-selected, not comprehension scores.

### AI study companion and guided practice

- **Ask AI:** Generate a short summary, analyse the main ideas and likely points of confusion, or discuss the lecture by typing or speaking. Analysis includes connections and a suggested review order. Conversation replies can be spoken with Lexi’s Grok voice.
- **Guided practice:** Generate a problem from the whole lecture or a chosen section, request up to two hints, and submit a written attempt for AI feedback. Expected points and worked steps appear after checking an attempt. Open the relevant section from the feedback; a “Revisit this idea” result also marks it for review.

Study tools use the lecture's readable sections as context. Generated replies retain any returned warnings, and requests leave the original lecture available while processing. Guided practice offers three feedback labels: **On track**, **Partly there**, and **Revisit this idea**.

### Knowledge map and exports

- **Knowledge map:** Trace Course → Lecture → Source → Concept relationships with quotations from original source text. Concepts come from compiled key terms or the sample vocabulary and are included only when a source contains the term. Add or hide terms for the current session, trace their sources, and export the graph as JSON with its evidence and provenance. Source tracing runs locally without an AI request.
- **Text export:** Download the lecture's study notes, key terms, and source notes as a plain-text file.

The graph records where a concept appears in source text. Select a concept or ask where it is mentioned to see the course, lecture, source, and supporting quotation. Graph exports include relationship types, source identifiers, quotations, and provenance.

### Exam preparation

- **Exam preparation:** Choose written self-review, an AI oral coach, or multiple-choice questions with answers and supporting passages. The oral coach responds to spoken or typed attempts using the selected lecture section. Paste specific notes or drop a TXT, MD, PDF, or PPTX file to create multiple-choice questions, and optionally request a topic, difficulty, or style. Imported exam notes are not added to the library. The included sample has ready-made questions; generating questions from other notes or with custom preferences requires the AI key and sends the notes and preferences to the configured provider. Practice results last for the session; written exam practice uses self-review against the notes.

| Format | How it works |
|---|---|
| Written | Write an explanation in your own words, then reveal the lecture section for comparison. |
| Oral | Speak or type an attempt and receive a short AI coaching reply grounded in the selected section. |
| Multiple choice | Choose an answer, check the explanation and supporting passage, and track the score for the session. |

## Quick start

### Requirements

Use **Node.js 22.3 or newer** and npm.

### Install and run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Courses, lecture sources, and original-text reading work without an AI key.

## Configuration

### Environment file

Environment configuration is optional for local reading. Copy `.env.example` to `.env.local` to customize the data directory, enable AI study tools, or enable accounts. Courses, extracted source text, recording links, and compiled notes are saved in `.data/materials.json`; set `LEXILEARN_DATA_DIR` to change the directory. Uploaded binaries are not retained. Reading preferences, saved arrangements, progress, revisit markers, and personal glossary entries are saved in the browser, with optional account sync.

Copy the example using the command for your shell:

**PowerShell**

```powershell
Copy-Item .env.example .env.local
```

**Bash**

```bash
cp .env.example .env.local
```

### Environment variables

| Variable | Purpose | Default or requirement |
|---|---|---|
| `LEXILEARN_DATA_DIR` | Directory for local course and lecture storage | `.data` |
| `XAI_API_KEY` | Enables Grok study tools and Lexi narration | Optional for original-text reading |
| `XAI_MODEL` | Model used by Grok text study tools | `grok-4.7` |
| `XAI_BASE_URL` | Grok-compatible API root | `https://api.x.ai/v1` |
| `OPENAI_API_KEY` | Fallback for text tools when the Grok key is empty | Optional |
| `OPENAI_MODEL` | Fallback text model when the Grok key is empty | `gpt-4.1-mini` |
| `OPENAI_BASE_URL` | Fallback API root when the Grok key is empty | `https://api.openai.com/v1` |
| `MONGODB_URI` | Database connection for accounts and synced reading state | Required for accounts |
| `AUTH_SECRET` | Signs account session tokens | At least 32 characters for accounts |
| `GOOGLE_CLIENT_ID` | Google web client ID accepted by the server | Required for accounts |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google web client ID used in the browser | Same value as `GOOGLE_CLIENT_ID` |
| `GOOGLE_MOBILE_CLIENT_IDS` | Additional accepted iOS and Android Google client IDs | Optional comma-separated list |

### Enable AI study tools

Set:

```dotenv
XAI_API_KEY=your-server-side-grok-key
XAI_MODEL=grok-4.7
XAI_BASE_URL=https://api.x.ai/v1
```

Restart the server. Use **Create study notes** during lecture setup or **Compile study notes** in an existing lecture. Study tools call Grok’s OpenAI-compatible Chat Completions API and ask for JSON. The model needs to support JSON responses and the supplied input length. Provider settings never use a `NEXT_PUBLIC_` prefix.

That key enables section help, lecture summaries and analysis, study conversation, practice problems, the oral coach, exam questions, and Lexi’s read-aloud voice. If `XAI_API_KEY` is empty, the study tools use `OPENAI_API_KEY`, `OPENAI_MODEL`, and the optional `OPENAI_BASE_URL` instead. Read-aloud still needs the Grok key.

Without a key, those AI actions stay unavailable and the interface says so. Original-text reading, courses, and comparing a written answer with the lecture notes still work. Compilation errors preserve previously saved notes and all lecture sources.

### Enable Google sign-in

Account storage needs `MONGODB_URI`, `AUTH_SECRET` (at least 32 characters), `GOOGLE_CLIENT_ID`, and the same web client ID in `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. Add iOS and Android client IDs in `GOOGLE_MOBILE_CLIENT_IDS` when a mobile client uses its own Google clients. Without those values, lectures still open and settings stay in the browser. The home page is a landing page, and **Sign in** on the demo opens the dashboard directly. Use **Account** for actual Google sign-in.

Signed-in preferences, arrangements, progress, and glossary entries sync to MongoDB. The first sign-in keeps the browser's existing settings and progress; later visits use the saved account copy. Web sessions use an httpOnly cookie. A mobile client sends `X-LexiLearn-Client: mobile` on `POST /api/auth/google`, stores the returned `token`, and sends `Authorization: Bearer <token>` on later account requests. Signing out also ends the account's saved session on other devices. Course materials continue to use the local JSON repository.

## Importing lecture sources

### Notes, slides, and captions

| Input | Import behavior |
|---|---|
| Pasted text, TXT, or MD | Adds readable lecture notes for review before saving. |
| PDF | Extracts available page text and reports extraction notes. |
| PPTX | Extracts slide text and speaker notes. |
| VTT or SRT | Converts caption text into a cleaned transcript. |
| YouTube link | Retrieves available published or automatic captions and offers the original timed VTT. |
| Other recording link | Saves the reference URL; add a supplied transcript to include spoken content in study notes. |

Sources remain available in the lecture's **Sources** tab. Add another source or update its text there, then update compiled notes to incorporate the change.

### YouTube captions

YouTube video links automatically import available captions. Review the transcript, then choose **Create study notes** (requires the AI key). If YouTube has no accessible captions or blocks the request, the interface offers retry, transcript upload, or **Save link only**. This retrieves existing captions; it does not invent a transcript or transcribe captionless video audio.

### University and other recording links

A saved recording URL is a reference, **not a transcript**. Private Webex recordings and UniMiB Moodle/Kaltura lecture pages usually require university sign-in. This version does not sign in to these services, download arbitrary recording URLs, or transcribe audio automatically. The recording form explains this for UniMiB links and identifies slide-like text when it is supplied in place of a transcript.

To include the spoken lecture, export its transcript/captions and import the TXT, VTT, or SRT file. Use **Sources → Add transcript** on a saved recording, then compile the updated lecture. VTT and SRT imports remove timestamp labels and filler sounds. Links without transcripts are explicitly listed as not included in the compiled content.

## Audio and voice

### Read-aloud narration

Read aloud cleans transcript text, then generates MP3 narration through Grok using the server's `XAI_API_KEY`. Long passages are divided at sentence boundaries, and the next passage is prepared while the current one plays. Speeds are **0.5×, 0.75×, 1×, 1.25×, 1.5×, 1.75×, and 2×**, with **1×** as the default. Change speed while listening, pause, resume, or stop playback and generation.

The provider key stays on the server. The browser receives MP3 audio, which is released from memory after use; generated audio is not stored on the server.

### Conversation and oral coaching

Voice input uses the browser's speech-recognition service where supported. Type a question or answer when microphone input is unavailable. Spoken study replies and oral coaching use Lexi's Grok voice, alongside the text conversation.

## Study walkthrough

### Create a lecture

1. Open the landing page, then **Sign in** to reach the dashboard.
2. Open **My courses**, add a course, and choose **Add lecture**.
3. Confirm the selected course and automatic lecture number. Give the lecture a title.
4. Add notes, slides, and a recording link or transcript.
5. Choose **Create study notes** with AI configured, or **Save & open lecture** to keep the originals together.

### Read and personalize

1. Read one section at a time. Open **Reading settings**, try the sentence guide, a saved arrangement, or listen at your own pace.
2. Follow a section's source link to inspect its original text. Add missing transcripts or other sources and update the compiled notes.
3. Mark a section as read, save a term, and return to the lecture list. **Continue reading** restores your place.

### Practice and explore

1. With AI configured, open **Ask AI** for a summary, analysis, or conversation. Try **Practice** for a problem, hints, and feedback on your attempt.
2. Open **Knowledge map**, select a concept to trace its original sources, and export the graph if you want to keep your reviewed version.
3. Open **Exam preparation** to try written review, oral coaching, or multiple-choice questions from a saved lecture or imported notes.

The included lecture is explicitly labelled **illustrative sample content**, not a real university lecture. See [the demonstration guide](docs/DEMO.md) for the full walkthrough.

## Development and verification

### Available commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server on `127.0.0.1`. |
| `npm run typecheck` | Check TypeScript types without emitting files. |
| `npm test` | Run the Node test suite through `tsx`. |
| `npm run build` | Create the production build. |
| `npm start` | Serve an existing production build on `127.0.0.1`. |

### Verify a change

```bash
npm run typecheck
npm test
npm run build
npm start
```

`npm start` serves the production build. Run development and production servers on different ports if using both.

### Test coverage

Tests cover course persistence, concurrent lecture numbering, legacy-data migration, source updates, PDF/PPTX/caption extraction, citation validation, compilation boundaries, source preservation, saved reading state, and account session rules. Study-tool tests cover summaries, analysis, conversation, oral coaching, hints, feedback, and keeping practice answers hidden until an attempt is checked. Exam tests validate supporting quotations and generated choices; knowledge-graph tests check source evidence, valid relationships, and reviewed terms. Model-output tests use controlled provider responses.

## Architecture and project structure

### Request and data flow

1. React components collect source inputs and reading preferences.
2. Next.js route handlers validate requests using shared contracts and Zod schemas.
3. Ingestion services extract reviewable text; the local repository stores courses, lectures, sources, and compiled notes.
4. Server-side AI providers generate structured study responses or MP3 narration when configured.
5. Browser providers remember reading state and synchronize it with MongoDB when an account is signed in.

### Storage responsibilities

| Data | Storage |
|---|---|
| Courses, lectures, extracted sources, and compiled notes | Local JSON repository in `LEXILEARN_DATA_DIR` |
| Reading preferences, arrangements, progress, and glossary | Browser storage, with optional MongoDB account sync |
| Active guided-practice problems and hidden worked answers | Server memory for the active practice lifecycle |
| Conversation, exam results, and knowledge-map edits | Current interface session |
| Exported notes and knowledge graphs | Files downloaded by the student |

### Source layout

```text
src/
  app/
    (marketing)/page.tsx                 # Landing page
    auth/page.tsx                        # Demo sign-in, then the dashboard
    (workspace)/dashboard/page.tsx       # Lecture library, search, course filter, resume
    (workspace)/materials/new/page.tsx   # Two-step lecture setup
    (workspace)/read/[materialId]/page.tsx
    (workspace)/preferences/page.tsx     # Reading preferences and saved arrangements
    (workspace)/account/page.tsx         # Signed-in account
    (workspace)/exam-preparation/page.tsx # Written, oral, and multiple-choice practice
    courses/page.tsx                     # Saved courses and course creation
    courses/[courseId]/page.tsx          # Course lectures in sequence
    api/                                 # Courses, sources, AI study tools, speech, auth, and account
  components/                            # Lecture builder, reader, study companion, practice, and knowledge map
  lib/
    contracts.ts                   # Shared payload types
    validation.ts                  # Runtime constraints
    lecture.ts                     # Reading view and compilation freshness helpers
    knowledge-graph.ts             # Source-backed concept graph and local queries
    client/                        # API, reading state, and sentence segmentation
  server/
    store.ts                       # Atomic local course-and-lecture repository
    materials.ts                   # Source-preserving lecture preparation
    ingestion/extract.ts           # PDF, PPTX, text, and captions
    ingestion/youtube.ts           # Published and automatic YouTube captions
    ai/config.ts                   # Grok settings and OpenAI-compatible fallback
    ai/compilation.ts              # Configurable source-grounded compilation
    ai/provider.ts                 # Selected-section explanations, steps, and terms
    ai/study.ts                    # Summary, analysis, conversation, oral coaching, and guided practice
    ai/exam-practice.ts             # Multiple-choice generation and evidence validation
    ai/speech.ts                    # Server-side MP3 speech generation
    account-store.ts               # MongoDB-backed preferences and progress
    auth/                          # Google token verification and session handling
tests/
docs/
  ARCHITECTURE.md
  DEMO.md
  TEAM_TASKS.md
```

The application uses **Next.js App Router, React, TypeScript, Zod, and Node.js route handlers**. PDF text extraction uses `pdf-parse`; PPTX text and speaker notes use `fflate` and `fast-xml-parser`. YouTube captions use `youtube-transcript-plus`. Optional accounts use MongoDB and `jose` for signed sessions.

## Backend routes

### Service and accounts

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Check service availability, `aiConfigured`, and `accountsConfigured` |
| `POST` | `/api/auth/google` | Verify a Google ID token from the web app or a mobile app, then start a session |
| `GET` | `/api/auth/session` | Read the signed-in account, preferences, arrangements, and progress |
| `POST` | `/api/auth/sign-out` | End the current session on this account |
| `GET`, `PUT` | `/api/account/preferences` | Read or save reading preferences and arrangements for the signed-in account |
| `GET`, `PUT` | `/api/account/progress` | Read or save reading progress and glossary entries for the signed-in account |

### Courses and lecture sources

| Method | Route | Purpose |
|---|---|---|
| `GET`, `POST` | `/api/courses` | List or add saved courses |
| `GET`, `POST` | `/api/materials` | List or create lectures |
| `GET` | `/api/materials/:id` | Read one lecture and compilation availability |
| `POST` | `/api/materials/:id/sources` | Add sources to a lecture |
| `PATCH` | `/api/materials/:id/sources/:sourceId` | Update source text or attach a recording transcript |

### AI study and practice

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/materials/:id/compile` | Compile and store source-grounded study notes |
| `POST` | `/api/materials/:id/summarize` | Generate a short lecture recap and takeaways |
| `POST` | `/api/materials/:id/analyze` | Explain main ideas, connections, confusion points, and review order |
| `POST` | `/api/materials/:id/converse` | Reply to a lecture-grounded conversation |
| `POST` | `/api/materials/:id/practice` | Start a practice problem for the lecture or a selected section |
| `POST` | `/api/materials/:id/practice/hint` | Reveal the next hint for an active practice problem |
| `POST` | `/api/materials/:id/practice/check` | Check an attempt and return feedback, expected points, and worked steps |
| `POST` | `/api/materials/:id/exam-oral` | Coach an oral-practice conversation using the selected section |
| `POST` | `/api/materials/:id/exam-questions` | Create multiple-choice questions from the lecture's readable sections |
| `POST` | `/api/exam-questions` | Create multiple-choice questions from supplied notes and optional preferences |
| `POST` | `/api/materials/:id/adapt` | Explain the current section in plain language, steps, or terms |

### Extraction and speech

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/sources/extract` | Extract an uploaded file into reviewable text |
| `POST` | `/api/sources/youtube` | Retrieve original timed captions and a clean transcript |
| `POST` | `/api/speech` | Generate Lexi’s Grok MP3 narration for a bounded passage |

See [architecture and contracts](docs/ARCHITECTURE.md) for request examples.

## Roadmap

1. Authorized Webex integration and audio transcription, so a recording link can supply its spoken content directly.
2. Durable practice history and saved knowledge-map edits, building on the existing guided practice and source tracing.
3. Review of compiled notes against a real lecture, including definitions, exceptions, equations, and extraction gaps.
4. Feedback from dyslexic students and shared durable storage for course materials. Reading preferences and progress already support account sync.

## Further documentation

- [Architecture and API contracts](docs/ARCHITECTURE.md): implementation boundaries, persistence, and request examples.
- [Demonstration guide](docs/DEMO.md): a course-to-lecture walkthrough and browser acceptance checks.
- [Team plan](docs/TEAM_TASKS.md): ownership, coordination, and follow-up tasks.
- [Environment example](.env.example): configuration template for local development.
