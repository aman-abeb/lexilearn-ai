# LexiLearn AI

**A calmer lecture workspace for university students with dyslexia.** Organize courses, bring a lecture's notes, slides, and recording transcript together, and work through one connected set of study notes at your own pace.

## The experience

**Course → numbered lecture → lecture sources → compiled study notes → comfortable reading, practice, and exam review.**

- **Saved courses:** Add a course name, optional code, and term once. Choose it whenever you add another lecture.
- **Automatic lecture numbers:** Lectures are numbered sequentially within each course, starting from 1. Numbers are assigned when saving, including simultaneous imports.
- **Two-step lecture setup:** Choose the course and title, then enter the lecture sources. Save & open lecture includes the source currently being edited; Add source is optional when collecting several inputs. Keep adding sources to the same lecture later.
- **Notes and slides:** Paste content or import TXT, MD, PDF, and PPTX files. Review the extracted text before adding it. PPTX extraction includes speaker notes.
- **YouTube videos:** Paste a YouTube link under Recording. Available published or automatic captions are imported as clean text without timestamps, filler sounds, or transcribed stutters, ready for Create study notes. Original caption words and timing can also be downloaded as VTT.
- **Other recordings:** Keep a Webex or university recording link with the lecture. Paste a transcript or import TXT, VTT, or SRT captions. A recording can be saved first and its transcript added later.
- **AI compilation:** With a server-side provider key, combine the available source text into topic-based full study notes, a brief overview, and key terms. Each section links back to the original sources. Recompile when sources change.
- **Comfortable reading:** One section or sentence at a time, a full-notes view, adjustable size and spacing, typeface, page colour, a reading guide, named arrangements, light or dark appearance, and a focus view that hides navigation.
- **Section help:** On a single section, ask for a plain-language explanation, a breakdown into steps, or the terms in that section. Each reply is labelled as generated, keeps its warnings, and links back to the original sources. The section itself stays on the page if the request fails.
- **Study with AI:** On a lecture, open **Ask AI** for a short summary, an analysis of how the ideas connect, or a conversation with Lexi. Questions can be typed or spoken. Replies stay as text, keep their warnings, and Lexi can speak them. The lecture stays available if a request fails. Summaries, analyses, and conversations are not saved on the server.
- **Practice problems:** From a lecture, try one problem before any answer appears. Ask for up to two hints, then check the attempt. Feedback is labelled on track, partly there, or revisit this idea. Worked steps appear only after a check. Problems are held in this server process for two hours and are not saved with the lecture.
- **Optional narration:** Lexi reads notes, questions, summaries, and feedback with a Grok voice. Choose a speed, then pause, resume, or stop. Changing the passage stops narration. Spoken study replies and oral replies use the same voice.
- **Personal study tools:** Resume the last section, explicitly mark sections as read, save passages to revisit, and maintain a personal glossary. Personal definitions keep their original-source links when compiled notes are regenerated.
- **Exam preparation:** From the sidebar, practice a saved lecture in writing, aloud, or with multiple-choice questions. Written answers are compared by the student with the lecture notes and are not graded or saved. Oral practice sends a spoken or typed attempt to an AI coach for that section; the conversation stays in the browser and clears when the question changes. Multiple-choice questions include an explanation and a supporting passage. Paste specific notes or drop a TXT, MD, PDF, or PPTX file to create questions, and optionally request a topic, difficulty, or style. Imported exam notes are not added to the library. The included sample has ready-made questions when no preferences are entered; generating questions from other notes or with custom preferences requires the AI key and sends the notes and preferences to the configured provider. AI questions can contain mistakes, so check the passage. Scores last only for the session.
- **Text export:** Download the lecture's study notes, key terms, and source notes as a plain-text file.

The interface uses clear labels, left-aligned text, restrained colours, generous spacing, and reading settings that stay out of the way until opened. Students choose what helps them; no font or setting is presented as universally suitable for dyslexia. Read markers are student-selected, not comprehension scores.

## Start locally

Use **Node.js 22.3 or newer** and npm.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Courses, lecture sources, and original-text reading work without an AI key.

Environment configuration is optional for local reading. Copy `.env.example` to `.env.local` to customize the data directory, enable AI study tools, or enable accounts. The default data directory is `.data` in this project.

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

Account storage needs `MONGODB_URI`, `AUTH_SECRET` (at least 32 characters), `GOOGLE_CLIENT_ID`, and the same web client ID in `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. Add iOS and Android client IDs in `GOOGLE_MOBILE_CLIENT_IDS` when the mobile app uses its own Google clients. Without those values, lectures still open and settings stay in the browser. The home page is a landing page. **Sign in** on the demo opens the dashboard without a Google account. When the values above are set, **Account** shows the Google button and stores preferences, arrangements, and progress for that account.

### How recording links work

YouTube video links automatically import available captions. Review the transcript, then choose **Create study notes** (requires the AI key). If YouTube has no accessible captions or blocks the request, the interface offers retry, transcript upload, or **Save link only**. This retrieves existing captions; it does not invent a transcript or transcribe captionless video audio.

A saved recording URL is a reference, **not a transcript**. Private Webex recordings and UniMiB Moodle/Kaltura lecture pages usually require university sign-in. This version does not sign in to these services, download arbitrary recording URLs, or transcribe audio automatically. The recording form explains this for UniMiB links and identifies slide-like text when it is supplied in place of a transcript.

To include the spoken lecture, export its transcript/captions and import the TXT, VTT, or SRT file. Use **Sources → Add transcript** on a saved recording, then compile the updated lecture. VTT and SRT imports remove timestamp labels and filler sounds. Links without transcripts are explicitly listed as not included in the compiled content.

Read aloud cleans existing transcript text, then Lexi speaks it through Grok using `XAI_API_KEY`. Long passages are divided at sentence boundaries, with the next passage prepared while the current one plays. Speeds are **0.5×, 0.75×, 1×, 1.25×, 1.5×, 1.75×, and 2×**, with **1×** as the default. Change speed while listening. Pause, resume, and cancel work during playback or audio generation. The key stays on the server; the browser receives MP3 audio. Audio is not stored on the server and is released from browser memory after use.

## Try the flow

1. Open the landing page, then **Sign in** to reach the dashboard.
2. Open **My courses**, add a course, and choose **Add lecture**.
3. Confirm the selected course and automatic lecture number. Give the lecture a title.
4. Add notes, slides, and a recording link or transcript.
5. Choose **Create study notes** with AI configured, or **Save & open lecture** to keep the originals together.
6. Read one section at a time. Open **Reading preferences**, try the sentence guide, a saved arrangement, or listen at your own pace.
7. With the AI key set, open **Practice** or **Ask AI** on the lecture. From the sidebar, open **Exam preparation** for written self-review, an oral coach, or multiple-choice questions.
8. Follow a section's source link to inspect its original text. Add missing transcripts or other sources and update the compiled notes.
9. Mark a section as read, save a term, and return to the lecture list. **Continue reading** restores your place.

The included lecture is explicitly labelled **illustrative sample content**, not a real university lecture. See [the demonstration guide](docs/DEMO.md) for the full walkthrough.

## Checks

```bash
npm run typecheck
npm test
npm run build
npm start
```

`npm start` serves the production build. Run development and production servers on different ports if using both.

Tests cover course persistence, concurrent lecture numbering, legacy-data migration, source updates, PDF/PPTX/caption extraction, YouTube captions, citation validation, compilation boundaries, source preservation, saved reading state, section help, study tools, exam questions, speech requests, and account session rules. Model-output tests use a controlled provider response; they do not establish the quality of a live model's notes.

## Project structure

```text
src/
  app/
    (marketing)/page.tsx                      # Landing page
    auth/page.tsx                             # Demo sign-in, then the dashboard
    (workspace)/dashboard/page.tsx            # Lecture library, search, course filter, resume
    (workspace)/materials/new/page.tsx        # Two-step lecture setup
    (workspace)/read/[materialId]/page.tsx    # Notes, practice, Ask AI, and sources
    (workspace)/exam-preparation/page.tsx     # Written, oral, and multiple-choice practice
    (workspace)/preferences/page.tsx          # Reading preferences and saved arrangements
    (workspace)/account/page.tsx              # Google account
    courses/page.tsx                          # Saved courses and course creation
    courses/[courseId]/page.tsx               # Course lectures in sequence
    api/                                      # Courses, lectures, study help, compilation, speech, auth
  components/                                 # Lecture builder, reader, practice, study companion, exam
  lib/
    contracts.ts                              # Shared payload types
    validation.ts                             # Runtime constraints
    lecture.ts                                # Reading view and compilation freshness helpers
    speech.ts                                 # Read-aloud voice names and length limit
    client/                                   # API, reading state, and sentence segmentation
  server/
    store.ts                                  # Atomic local course-and-lecture repository
    materials.ts                              # Source-preserving lecture preparation
    ingestion/extract.ts                      # PDF, PPTX, text, and captions
    ingestion/youtube.ts                      # YouTube caption retrieval
    ai/compilation.ts                         # Source-grounded study notes
    ai/provider.ts                            # Selected-section explanations
    ai/study.ts                               # Summary, analysis, conversation, practice, oral coach
    ai/exam-practice.ts                       # Multiple-choice questions
    ai/speech.ts                              # Lexi narration through Grok
tests/
docs/
  ARCHITECTURE.md
  DEMO.md
  TEAM_TASKS.md
```

The application uses **Next.js App Router, React, TypeScript, Zod, and Node.js route handlers**. PDF text extraction uses `pdf-parse`; PPTX text and speaker notes use `fflate` and `fast-xml-parser`. YouTube captions use `youtube-transcript-plus`. Google ID tokens use `jose`. Accounts use MongoDB.

## Backend routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Check service availability. Includes `aiConfigured` and `accountsConfigured`. |
| `POST` | `/api/auth/google` | Verify a Google ID token from the web app or a mobile app, then start a session |
| `GET` | `/api/auth/session` | Read the signed-in account, preferences, arrangements, and progress |
| `POST` | `/api/auth/sign-out` | End the current session on this account |
| `GET`, `PUT` | `/api/account/preferences` | Read or save reading preferences and arrangements for the signed-in account |
| `GET`, `PUT` | `/api/account/progress` | Read or save reading progress and glossary entries for the signed-in account |
| `GET`, `POST` | `/api/courses` | List or add saved courses |
| `GET`, `POST` | `/api/materials` | List or create lectures |
| `GET` | `/api/materials/:id` | Read one lecture and compilation availability |
| `POST` | `/api/materials/:id/sources` | Add sources to a lecture |
| `PATCH` | `/api/materials/:id/sources/:sourceId` | Update source text or attach a recording transcript |
| `POST` | `/api/materials/:id/compile` | Compile and store source-grounded study notes |
| `POST` | `/api/materials/:id/exam-questions` | Create multiple-choice questions from the lecture's readable sections |
| `POST` | `/api/exam-questions` | Create multiple-choice questions from supplied notes and optional preferences |
| `POST` | `/api/sources/extract` | Extract an uploaded file into reviewable text |
| `POST` | `/api/sources/youtube` | Retrieve original timed captions and a clean transcript |
| `POST` | `/api/speech` | Generate Lexi’s Grok MP3 narration for a bounded passage |
| `POST` | `/api/materials/:id/adapt` | Explain the current section in plain language, steps, or terms |
| `POST` | `/api/materials/:id/summarize` | Write a short recap of the lecture |
| `POST` | `/api/materials/:id/analyze` | Explain how the ideas connect, what is easy to mix up, and a review order |
| `POST` | `/api/materials/:id/converse` | Answer a question about this lecture |
| `POST` | `/api/materials/:id/practice` | Start one practice problem. The answer stays hidden |
| `POST` | `/api/materials/:id/practice/hint` | Reveal the next hint for a held problem |
| `POST` | `/api/materials/:id/practice/check` | Compare an attempt with the lecture and return feedback |
| `POST` | `/api/materials/:id/exam-oral` | Coach an oral answer for one section |

See [architecture and contracts](docs/ARCHITECTURE.md) for request examples.

## Data and current limits

- The local workspace is stored in `.data/materials.json`, configurable with `LEXILEARN_DATA_DIR`. Courses and lectures share one atomic file. Legacy lecture arrays are migrated without changing original text or section IDs. This directory is ignored by Git.
- This is a single-process local prototype, with up to 100 courses and 100 lectures including the sample. Do not use the local JSON repository as shared storage across serverless instances.
- A lecture can have 12 sources, 100,000 characters per source, and 160,000 characters combined. Uploaded files can be up to 10 MB; PDFs and slide decks can have up to 300 pages/slides.
- Original uploaded binaries are not retained. Extracted text, source names, recording links, extraction notes, and generated study notes are saved.
- Scanned pages, images, diagrams, and visual equations are not interpreted. Extraction feedback identifies empty pages and tells the student what needs checking.
- PPTX extraction preserves spaces between formatted text runs and omits template slide-number/header/footer placeholders. Previously imported text is not modified automatically; re-import the source file to use extraction fixes.
- AI compilation uses the available extracted text. Source coverage checks validate IDs, not the correctness or completeness of every generated sentence. No AI API key is needed to read lectures. Provider secrets stay server-side and must not use a `NEXT_PUBLIC_` prefix.
- Reading settings, named arrangements, section progress, revisit markers, and up to 100 personal glossary entries per lecture live in the current browser. If browser storage is unavailable, changes remain usable until reload.
- Practice problems are held in the server process for two hours, up to 40 at a time. Restarting the server drops them. Summaries, analyses, conversations, written exam answers, and oral coaching replies are not stored.
- With Google sign-in, preferences, arrangements, and progress are also stored in MongoDB for that account. The first sign-in keeps what is already in the browser. Later visits use the saved account copy. The web app uses an httpOnly cookie. A mobile app sends `X-LexiLearn-Client: mobile` on `POST /api/auth/google`, stores the returned `token`, and sends `Authorization: Bearer` on later account requests. Signing out ends that saved session for the account's other devices too. Course materials still use the local JSON file. Accounts do not yet control who can read a lecture.
- Sentence segmentation uses English `Intl.Segmenter`, falling back to the whole section where unavailable. Read-aloud uses Lexi’s Grok voice and does not highlight words in sync with the audio. Spoken study replies and oral replies use that same voice. Voice questions use the browser speech service; Chrome may send microphone audio to that service. Typing still works when the microphone is unavailable.

## Next milestones

1. Authorized Webex integration and audio transcription, so a recording link can supply its spoken content directly.
2. Save practice attempts and a recommended review section. Problems, explanations, summaries, and exam sessions currently last only for this process or the browser session.
3. Review of compiled notes against a real lecture, including definitions, exceptions, equations, and extraction gaps.
4. Feedback from dyslexic students, then durable lecture storage so an account controls who can read a lecture. Preferences, arrangements, and progress already sync for a signed-in account.

The [team plan](docs/TEAM_TASKS.md) describes ownership and follow-up work. The [product catalogue](README_LexiLearn_AI.md) describes the broader vision.
